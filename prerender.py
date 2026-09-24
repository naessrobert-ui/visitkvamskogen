"""
prerender.py  -  gjør visitkvamskogen.no synlig for Google, Bing og AI-crawlere

Kjøres ETTER `npm run build`. Skriptet:
  1. starter en lokal server for dist/ (med SPA-fallback)
  2. åpner forsiden i en headless nettleser og følger alle interne lenker
  3. lagrer ferdig rendret HTML som dist/<sti>/index.html
  4. legger inn meta description, canonical og Open Graph hvis de mangler
  5. lager dist/sitemap.xml og dist/robots.txt

Oppsett (én gang):
    pip install playwright
    playwright install chromium

Bruk:
    npm run build
    python prerender.py
    (last opp dist/ som vanlig)
"""

from __future__ import annotations

import datetime as dt
import functools
import html
import http.server
import re
import socketserver
import threading
from pathlib import Path
from urllib.parse import urljoin, urlparse

from playwright.sync_api import sync_playwright

# ---------------------------------------------------------------- innstillinger
SITE = "https://visitkvamskogen.no"
DIST = Path("dist")
PORT = 4173
EXCLUDE_PREFIXES = ("/vel", "/assets", "/api")   # innlogging og filer skal ikke med
EXTRA_ROUTES: list[str] = []                      # sider som ikke lenkes fra andre sider
MAX_PAGES = 500
DEFAULT_DESCRIPTION = (
    "Kvamskogen er fjellet en time fra Bergen: turer, toppturer, preparerte skiløyper, "
    "alpinbakker, føre, vær og praktisk info for hytteeiere og besøkende."
)
AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot",
           "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended"]
# ------------------------------------------------------------------------------


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    """Serverer filer fra dist/, og index.html for ukjente stier (som hosten din)."""

    def __init__(self, *args, shell: bytes, **kwargs):
        self.shell = shell
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        target = DIST / path.lstrip("/")
        if path != "/" and not target.exists() and "." not in Path(path).name:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(self.shell)
            return
        if path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(self.shell)
            return
        super().do_GET()

    def log_message(self, *args):
        pass


def normalize(path: str) -> str:
    path = path.split("#")[0].split("?")[0] or "/"
    if path != "/" and path.endswith("/"):
        path = path[:-1]
    return path


def wanted(path: str) -> bool:
    if any(path == p or path.startswith(p + "/") for p in EXCLUDE_PREFIXES):
        return False
    return not re.search(r"\.[a-z0-9]{2,5}$", path, re.I)  # hopp over .pdf, .jpg osv.


def add_head_tags(page_html: str, path: str) -> str:
    """Legger til SEO-tagger i <head> hvis appen ikke allerede har dem."""
    url = SITE + path
    title_m = re.search(r"<title>(.*?)</title>", page_html, re.S)
    title = html.unescape(title_m.group(1).strip()) if title_m else "Kvamskogen"

    desc_m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', page_html)
    if desc_m:
        desc = html.unescape(desc_m.group(1))
    else:
        # bruk første fornuftige avsnitt på siden, ellers standardtekst
        p = next((re.sub(r"<[^>]+>", "", m).strip()
                  for m in re.findall(r"<p[^>]*>(.*?)</p>", page_html, re.S)
                  if len(re.sub(r"<[^>]+>", "", m).strip()) > 60), DEFAULT_DESCRIPTION)
        desc = html.unescape(p)[:160]

    tags = []
    if not desc_m:
        tags.append(f'<meta name="description" content="{html.escape(desc)}">')
    if 'rel="canonical"' not in page_html:
        tags.append(f'<link rel="canonical" href="{url}">')
    if 'property="og:title"' not in page_html:
        tags += [
            f'<meta property="og:title" content="{html.escape(title)}">',
            f'<meta property="og:description" content="{html.escape(desc)}">',
            f'<meta property="og:url" content="{url}">',
            '<meta property="og:type" content="website">',
            '<meta property="og:locale" content="nb_NO">',
        ]
    if not tags:
        return page_html
    return page_html.replace("</head>", "  " + "\n  ".join(tags) + "\n</head>", 1)


def main() -> None:
    shell_file = DIST / "index.html"
    if not shell_file.exists():
        raise SystemExit("Fant ikke dist/index.html. Kjør `npm run build` først.")
    shell = shell_file.read_bytes()  # original skall-HTML, brukes som fallback

    handler = functools.partial(SPAHandler, shell=shell)
    socketserver.TCPServer.allow_reuse_address = True
    server = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{PORT}"

    queue = ["/"] + [normalize(r) for r in EXTRA_ROUTES]
    seen: set[str] = set()
    rendered: dict[str, str] = {}

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        while queue and len(seen) < MAX_PAGES:
            path = queue.pop(0)
            if path in seen or not wanted(path):
                continue
            seen.add(path)
            try:
                page.goto(base + path, wait_until="domcontentloaded", timeout=30_000)
                page.wait_for_selector("#root *", timeout=15_000)
            except Exception as e:
                print(f"  ! {path}: {e.__class__.__name__}, hoppet over")
                continue
            # Sider med webkamera/vær poller hele tiden og blir aldri "networkidle".
            # Vent på ro i inntil 10 s, men bruk innholdet uansett.
            try:
                page.wait_for_load_state("networkidle", timeout=10_000)
            except Exception:
                print(f"  . {path}: ikke networkidle etter 10 s, bruker innholdet likevel")

            if page.url.startswith(base) and normalize(urlparse(page.url).path) != path:
                print(f"  ~ {path} videresender til {urlparse(page.url).path}, hoppet over")
                continue

            rendered[path] = page.content()
            text_len = len(page.inner_text("#root"))
            print(f"  ok {path}  ({text_len} tegn tekst)")

            for href in page.eval_on_selector_all("a[href]", "els => els.map(e => e.getAttribute('href'))"):
                abs_url = urljoin(base + path, href)
                if abs_url.startswith(base):
                    p = normalize(urlparse(abs_url).path)
                    if p not in seen and wanted(p):
                        queue.append(p)
        browser.close()
    server.shutdown()

    # skriv filene etter at crawlingen er ferdig, så fallbacken ikke blandes
    for path, content in rendered.items():
        out = DIST / "index.html" if path == "/" else DIST / path.lstrip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(add_head_tags(content, path), encoding="utf-8")

    # Sider i EXTRA_ROUTES/menyen som ikke ble rendret får SPA-skallet, så
    # rewrite-regelen /:page -> /:page/index.html aldri peker på en tom fil.
    for path in seen - set(rendered):
        if not wanted(path) or path == "/":
            continue
        out = DIST / path.lstrip("/") / "index.html"
        if not out.exists():
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(shell)
            print(f"  ! {path}: skrev SPA-skall som reserve")

    # SPA-fallback for /vel og ukjente sider (hvis hosten bruker 200.html / 404.html)
    (DIST / "200.html").write_bytes(shell)

    today = dt.date.today().isoformat()
    urls = "\n".join(
        f"  <url><loc>{SITE}{p}</loc><lastmod>{today}</lastmod></url>"
        for p in sorted(rendered)
    )
    (DIST / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{urls}\n</urlset>\n", encoding="utf-8")

    bots = "\n".join(f"User-agent: {b}\nAllow: /\nDisallow: /vel/\n" for b in AI_BOTS)
    (DIST / "robots.txt").write_text(
        "User-agent: *\nAllow: /\nDisallow: /vel/\n\n"
        f"{bots}\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")

    print(f"\nFerdig: {len(rendered)} sider rendret, sitemap.xml og robots.txt skrevet.")


if __name__ == "__main__":
    main()
