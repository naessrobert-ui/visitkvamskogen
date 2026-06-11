#!/usr/bin/env python3
"""Finn nylige Kvamskogen-saker.

Kilder:
- Google News RSS
- Google Alerts RSS
- enkel skanning av HF-sider
- faste HF-artikler som fallback når Google/HF ikke eksponerer dem i feed/html

Scriptet trenger ikke GOOGLE_API_KEY eller GOOGLE_CSE_ID.
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urljoin, urlparse
from urllib.request import Request, urlopen

GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search"
GOOGLE_ALERTS_RSS_URLS = [
    "https://www.google.com/alerts/feeds/11539036791314402374/8207854698679613186",
]
HJEM_PROPERTIES_API_URL = "https://apigw.hjem.no/search-backend/api/v2/properties"
SOURCE_PAGE_URLS = [
    ("Hordaland Folkeblad nyhende", "https://www.hf.no/tag/nyhende", "hf.no"),
    ("Hordaland Folkeblad forside", "https://www.hf.no/", "hf.no"),
]

CORE_SITES = ["bt.no", "ba.no", "hf.no", "nrk.no", "bergen.kommune.no"]
BONUS_SITES = ["vg.no", "tv2.no"]
ALL_SITES = [*CORE_SITES, *BONUS_SITES]

DOMAIN_ALIASES = {
    "hardanger-folkeblad.no": "hf.no",
    "www.hardanger-folkeblad.no": "hf.no",
    "hordaland-folkeblad.no": "hf.no",
    "www.hordaland-folkeblad.no": "hf.no",
    "hf.no": "hf.no",
    "www.hf.no": "hf.no",
}

SOURCE_NAME_ALIASES = {
    "bergens tidende": "bt.no",
    "bt": "bt.no",
    "bergensavisen": "ba.no",
    "ba": "ba.no",
    "hardanger folkeblad": "hf.no",
    "hordaland folkeblad": "hf.no",
    "hf": "hf.no",
    "nrk": "nrk.no",
    "bergen kommune": "bergen.kommune.no",
    "vg": "vg.no",
    "tv 2": "tv2.no",
    "tv2": "tv2.no",
}

SOURCE_SCORES = {
    "hf.no": 5,
    "bt.no": 5,
    "nrk.no": 5,
    "vg.no": 5,
    "tv2.no": 5,
    "ba.no": 4,
    "bergen.kommune.no": 4,
}

THEME_KEYWORDS = [
    "kommunedelplan", "reguleringsplan", "planforslag", "høring", "høyring",
    "Tokagjelet", "tunnel", "Fv. 49", "vei", "veg", "løype", "lavlandsløypa",
    "skiløype", "preparering", "Kvamskogen Vel", "Kvamskogen Næringslag",
    "hytte", "utbygging", "natur", "deponi", "masser", "fond",
]

# Disse to dukker opp i vanlig Google-søk, men ikke i Google News RSS / Google Alerts RSS.
# De legges inn uten å hente artikkelsiden, slik at det ikke stopper om HF blokkerer GitHub Actions.
EXTRA_ARTICLES = [
    {
        "title": "Vil dela ut 450 000 frå fond",
        "url": "https://www.hf.no/nyhende/vil-dela-ut-450-000-fra-fond/370211",
        "source": "hf.no",
        "snippet": "Den største tilrådde løyvinga går til Kvamskogen Vel, som har søkt om og ser ut til å få 150 000 kroner til vidare arbeid med låglandsløypa på Kvamskogen.",
        "published_at": "2026-05-02T00:00:00+00:00",
        "feed_source": "HF fallback",
    },
    {
        "title": "Vil prioritera gjennomføring av prosjektet som får godkjend reguleringsplan først",
        "url": "https://www.hardanger-folkeblad.no/vil-prioritera-gjennomforing-av-prosjektet-som-far-godkjend-reguleringsplan-forst/s/80-22-19875",
        "source": "hf.no",
        "snippet": "Kvamskogen: Fylket vil ha fart på dei to rassikringsprosjekta på fylkesveg 49 — men kva av dei kjem først i køen?",
        "published_at": "2026-05-11T00:00:00+00:00",
        "feed_source": "HF fallback",
    },
]

USER_AGENT = "visitkvamskogen-news-search/2.6"


class MetaImageExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.image_url = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.casefold() != "meta" or self.image_url:
            return
        attr_map = {key.casefold(): value or "" for key, value in attrs}
        name = (attr_map.get("property") or attr_map.get("name") or "").casefold()
        if name in {"og:image", "twitter:image", "twitter:image:src"}:
            self.image_url = attr_map.get("content", "")


class LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._stack: list[tuple[str, list[str]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.casefold() != "a":
            return
        attr_map = {key.casefold(): value or "" for key, value in attrs}
        href = attr_map.get("href", "")
        self._stack.append((href, []))

    def handle_data(self, data: str) -> None:
        if self._stack:
            self._stack[-1][1].append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.casefold() != "a" or not self._stack:
            return
        href, parts = self._stack.pop()
        text = clean_text(" ".join(parts))
        if href and text:
            self.links.append((href, text))


def cutoff_date(days_back: int) -> date:
    return date.today() - timedelta(days=days_back)


def google_news_url(days_back: int) -> str:
    params = urlencode({"q": f"Kvamskogen when:{days_back}d", "hl": "no", "gl": "NO", "ceid": "NO:no"})
    return f"{GOOGLE_NEWS_RSS_URL}?{params}"


def fetch_url(url: str, source_name: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html"})
    try:
        with urlopen(request, timeout=20) as response:
            return response.read().decode("utf-8", errors="replace")
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{source_name} svarte med HTTP {error.code}: {details}") from error
    except (URLError, TimeoutError) as error:
        raise RuntimeError(f"Klarte ikke å kontakte {source_name}: {error}") from error


def fetch_hjem_property(property_id: str) -> dict[str, Any] | None:
    query = urlencode({"ids[]": [property_id], "availability[]": ["ALL"]}, doseq=True)
    try:
        response = fetch_url(f"{HJEM_PROPERTIES_API_URL}?{query}", "Hjem.no")
        payload = json.loads(response)
    except (RuntimeError, json.JSONDecodeError):
        return None
    data = payload.get("data")
    if isinstance(data, list) and data and isinstance(data[0], dict):
        return data[0]
    return None


def resolve_hjem_url(url: str) -> str:
    parsed = urlparse(url)
    if normalize_hostname(parsed.netloc) != "hjem.no":
        return url

    path_parts = [part for part in parsed.path.split("/") if part]
    if len(path_parts) >= 3 and path_parts[0] == "property":
        return url
    if not path_parts:
        return url

    property_id = path_parts[-1]
    if not re.fullmatch(r"[a-f0-9]{24}", property_id, flags=re.IGNORECASE):
        return url

    property_data = fetch_hjem_property(property_id)
    agency = property_data.get("agency", {}) if property_data else {}
    external_id = agency.get("external_id") or agency.get("externalId")
    if external_id is None:
        return url

    agency_id = str(external_id).strip()
    if agency_id.isdigit():
        agency_id = agency_id.zfill(6)
    return f"https://hjem.no/property/{agency_id}/{property_id}"


def fetch_kvamskogen_news(days_back: int) -> list[dict[str, Any]]:
    min_date = cutoff_date(days_back)
    found_date = datetime.now(timezone.utc).date().isoformat()
    results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    title_sources: dict[str, set[str]] = {}

    def add_item(item: dict[str, str], default_feed: str) -> None:
        title = clean_google_news_title(item.get("title", ""))
        snippet = description_to_text(item.get("snippet", ""))
        url = resolve_hjem_url(canonicalize_url(unwrap_google_url(item.get("url", ""))))
        published_at = item.get("published_at", "")
        published_date = parse_iso_date(published_at)
        feed_source = item.get("feed_source") or default_feed

        if published_date and published_date < min_date:
            return
        if not url or url in seen_urls:
            return
        if feed_source != "HF fallback" and "kvamskogen" not in f"{title} {snippet}".casefold():
            return

        source = normalize_source(item.get("source", "")) or detect_source(
            url=url,
            source_url=item.get("source_url", ""),
            source_name=item.get("source_name", ""),
        )
        title_key = normalize_title(title)
        similar_title = bool(title_key and title_sources.get(title_key) and source not in title_sources[title_key])
        title_sources.setdefault(title_key, set()).add(source)
        importance_score, importance_reason = calculate_importance(title, snippet, source, similar_title)

        seen_urls.add(url)
        results.append(
            {
                "title": title or "Uten tittel",
                "url": url,
                "source": source,
                "snippet": snippet,
                "image_url": item.get("image_url", "") or fetch_article_image(url),
                "found_date": found_date,
                "published_at": published_at,
                "source_group": source_group(source),
                "feed_source": feed_source,
                "importance_score": importance_score,
                "importance_reason": importance_reason,
            }
        )

    feed_urls = [("Google News RSS", google_news_url(days_back))]
    feed_urls.extend(("Google Alerts RSS", url) for url in GOOGLE_ALERTS_RSS_URLS)
    for feed_name, url in feed_urls:
        try:
            for item in parse_feed(fetch_url(url, feed_name), feed_name):
                add_item(item, feed_name)
        except RuntimeError as error:
            print(f"Advarsel: {error}", file=sys.stderr)

    for page_name, page_url, source_site in SOURCE_PAGE_URLS:
        try:
            for item in parse_source_page(fetch_url(page_url, page_name), page_url, source_site):
                add_item(item, page_name)
        except RuntimeError as error:
            print(f"Advarsel: {error}", file=sys.stderr)

    for item in EXTRA_ARTICLES:
        add_item(item, item.get("feed_source", "HF fallback"))

    return results


def parse_feed(feed_xml: str, feed_name: str) -> list[dict[str, str]]:
    try:
        root = ET.fromstring(feed_xml)
    except ET.ParseError as error:
        raise RuntimeError(f"{feed_name} svarte ikke med gyldig XML") from error
    if local_name(root.tag) == "rss":
        return parse_rss(root)
    if local_name(root.tag) == "feed":
        return parse_atom(root)
    return []


def parse_rss(root: ET.Element) -> list[dict[str, str]]:
    channel = find_child(root, "channel")
    if channel is None:
        return []
    items: list[dict[str, str]] = []
    for item in find_children(channel, "item"):
        source_node = find_child(item, "source")
        items.append(
            {
                "title": get_child_text(item, "title"),
                "url": get_child_text(item, "link"),
                "source_name": clean_text(source_node.text or "") if source_node is not None else "",
                "source_url": source_node.attrib.get("url", "") if source_node is not None else "",
                "snippet": description_to_text(get_child_text(item, "description")),
                "published_at": parse_rss_datetime(get_child_text(item, "pubDate")),
                "image_url": rss_image_url(item),
            }
        )
    return items


def parse_atom(root: ET.Element) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for entry in find_children(root, "entry"):
        items.append(
            {
                "title": get_child_text(entry, "title"),
                "url": atom_link(entry),
                "source_name": atom_source_name(entry),
                "source_url": atom_source_url(entry),
                "snippet": description_to_text(get_child_text(entry, "content") or get_child_text(entry, "summary")),
                "published_at": parse_atom_datetime(get_child_text(entry, "published") or get_child_text(entry, "updated")),
                "image_url": atom_image_url(entry),
            }
        )
    return items


def parse_source_page(page_html: str, base_url: str, source_site: str) -> list[dict[str, str]]:
    extractor = LinkExtractor()
    extractor.feed(page_html)
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for href, title in extractor.links:
        url = canonicalize_url(urljoin(base_url, href))
        if url in seen or not is_article_url(url, source_site):
            continue
        seen.add(url)
        items.append({"title": title, "url": url, "source": source_site, "source_name": source_site, "source_url": f"https://www.{source_site}/", "snippet": title, "published_at": ""})
    return items


def is_article_url(url: str, source_site: str) -> bool:
    parsed = urlparse(url)
    hostname = normalize_hostname(parsed.netloc)
    wanted = normalize_hostname(source_site)
    path = parsed.path.strip("/")
    return hostname == wanted and bool(path) and not path.startswith("tag/") and (bool(re.search(r"/\d{4,}$", parsed.path)) or "/nyhende/" in parsed.path)


def atom_link(entry: ET.Element) -> str:
    for child in list(entry):
        if local_name(child.tag) == "link" and child.attrib.get("href"):
            return child.attrib["href"]
    return ""


def atom_source_name(entry: ET.Element) -> str:
    source = find_child(entry, "source")
    return get_child_text(source, "title") if source is not None else ""


def atom_source_url(entry: ET.Element) -> str:
    source = find_child(entry, "source")
    if source is None:
        return ""
    for child in list(source):
        if local_name(child.tag) == "link" and child.attrib.get("href"):
            return child.attrib["href"]
    return ""


def rss_image_url(item: ET.Element) -> str:
    for child in list(item):
        name = local_name(child.tag)
        if name in {"content", "thumbnail"} and child.attrib.get("url"):
            return child.attrib["url"]
        if name == "enclosure" and child.attrib.get("type", "").startswith("image/") and child.attrib.get("url"):
            return child.attrib["url"]
    return ""


def atom_image_url(entry: ET.Element) -> str:
    for child in list(entry):
        if local_name(child.tag) == "link" and child.attrib.get("href") and child.attrib.get("type", "").startswith("image/"):
            return child.attrib["href"]
    return ""


def fetch_article_image(url: str) -> str:
    parsed = urlparse(url)
    hostname = normalize_hostname(parsed.netloc)
    if not parsed.scheme.startswith("http") or hostname in {"news.google.com", "google.com"}:
        return ""
    try:
        page_html = fetch_url(url, f"bilde fra {hostname}")
    except RuntimeError:
        return ""
    extractor = MetaImageExtractor()
    extractor.feed(page_html[:200000])
    return canonicalize_url(urljoin(url, extractor.image_url)) if extractor.image_url else ""


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def find_child(element: ET.Element | None, name: str) -> ET.Element | None:
    if element is None:
        return None
    for child in list(element):
        if local_name(child.tag) == name:
            return child
    return None


def find_children(element: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in list(element) if local_name(child.tag) == name]


def get_child_text(element: ET.Element | None, tag: str) -> str:
    node = find_child(element, tag)
    return clean_text(node.text or "") if node is not None else ""


def parse_rss_datetime(value: str) -> str:
    if not value:
        return ""
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return ""
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def parse_atom_datetime(value: str) -> str:
    if not value:
        return ""
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return parse_rss_datetime(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def parse_iso_date(value: str) -> date | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        return None


def description_to_text(value: str) -> str:
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    return clean_text(value)


def clean_google_news_title(title: str) -> str:
    return re.sub(r"\s+-\s+[^-]+$", "", description_to_text(title)).strip()


def unwrap_google_url(url: str) -> str:
    if not url:
        return ""
    parsed = urlparse(url)
    if normalize_hostname(parsed.netloc) != "google.com":
        return url
    query = parse_qs(parsed.query)
    for key in ["url", "q"]:
        value = query.get(key, [""])[0]
        if value.startswith("http"):
            return value
    return url


def canonicalize_url(url: str) -> str:
    if not url:
        return ""
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return url
    return parsed._replace(fragment="").geturl().rstrip("/")


def normalize_hostname(hostname: str) -> str:
    cleaned = hostname.lower().removeprefix("www.")
    return DOMAIN_ALIASES.get(cleaned, cleaned)


def normalize_source(source: str) -> str:
    if not source:
        return ""
    return DOMAIN_ALIASES.get(source, source)


def detect_source(url: str, source_url: str = "", source_name: str = "") -> str:
    for candidate in [source_url, url]:
        hostname = normalize_hostname(urlparse(candidate).netloc)
        for site in ALL_SITES:
            if hostname == site or hostname.endswith(f".{site}"):
                return site
        if hostname and hostname not in {"news.google.com", "google.com"}:
            return hostname
    normalized_name = clean_text(source_name.casefold().replace("–", "-").replace("—", "-"))
    return SOURCE_NAME_ALIASES.get(normalized_name, source_name or "ukjent")


def source_group(source: str) -> str:
    if source in CORE_SITES:
        return "core"
    if source in BONUS_SITES:
        return "bonus"
    return "other"


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_title(title: str) -> str:
    normalized = title.casefold()
    normalized = re.sub(r"[^\wæøå]+", " ", normalized, flags=re.IGNORECASE)
    return clean_text(normalized)


def calculate_importance(title: str, snippet: str, source: str, similar_title: bool = False) -> tuple[int, str]:
    score = SOURCE_SCORES.get(source, 3)
    reasons = [f"Kildescore {score} for {source}"]
    haystack = f"{title} {snippet}".casefold()
    matched = [keyword for keyword in THEME_KEYWORDS if keyword.casefold() in haystack]
    if matched:
        score += len(matched)
        reasons.append("Temaord: " + ", ".join(matched))
    if similar_title:
        reasons.append("Tittelen ligner på en sak fra en annen kilde")
    return score, "; ".join(reasons)


def sorted_news(results: list[dict[str, Any]], sorting: str) -> list[dict[str, Any]]:
    if sorting == "latest":
        return sorted(results, key=lambda item: (item.get("published_at", ""), item.get("found_date", "")), reverse=True)
    if sorting == "important":
        return sorted(results, key=lambda item: (int(item.get("importance_score", 0)), item.get("published_at", "")), reverse=True)
    raise ValueError(f"Ukjent sortering: {sorting}")


def write_json(results: list[dict[str, Any]], output_path: Path) -> None:
    output_path.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv(results: list[dict[str, Any]], output_path: Path) -> None:
    fieldnames = ["title", "url", "source", "snippet", "found_date", "published_at", "image_url", "source_group", "feed_source", "importance_score", "importance_reason"]
    with output_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)


def write_markdown(results: list[dict[str, Any]], output_path: Path) -> None:
    lines = ["# Kvamskogen i media", "", "## Viktig nå", ""]
    lines.extend(format_markdown_items(sorted_news(results, "important")[:5], "Ingen saker funnet."))
    lines.extend(["", "## Siste saker", ""])
    lines.extend(format_markdown_items(sorted_news(results, "latest"), "Ingen saker funnet."))
    output_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def format_markdown_items(items: list[dict[str, Any]], empty_text: str) -> list[str]:
    if not items:
        return [empty_text]
    lines: list[str] = []
    for item in items:
        lines.extend([
            f"### {item['title']}",
            f"- Kilde: {item['source']}",
            f"- Feed: {item.get('feed_source') or 'Ukjent feed'}",
            f"- Publisert: {item.get('published_at') or 'Ukjent publiseringstidspunkt'}",
            f"- Lenke: {item['url']}",
            f"- Bilde: {item.get('image_url') or 'Mangler bilde fra kilde'}",
            f"- Kort sammendrag/snippet: {item['snippet'] or 'Mangler snippet fra søkeresultatet.'}",
            f"- Viktighetsscore: {item['importance_score']}",
            f"- Hvorfor saken ble vurdert som viktig: {item['importance_reason']}",
            "",
        ])
    return lines


def write_outputs(results: list[dict[str, Any]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    latest = sorted_news(results, "latest")
    write_json(latest, output_dir / "kvamskogen_news.json")
    write_csv(latest, output_dir / "kvamskogen_news.csv")
    write_markdown(latest, output_dir / "kvamskogen_news.md")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Hent nylige nyhetssaker om Kvamskogen.")
    parser.add_argument("--days", type=int, default=30, help="Antall dager tilbake i tid. Standard: 30.")
    parser.add_argument("--output-dir", default="public/data", help="Mappe for kvamskogen_news.json/csv/md. Standard: public/data.")
    parser.add_argument("--no-write", action="store_true", help="Ikke skriv output-filer, bare hent og skriv kort status.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.days < 1:
        print("--days må være 1 eller høyere", file=sys.stderr)
        return 2
    results = fetch_kvamskogen_news(days_back=args.days)
    if args.no_write:
        print(f"Fant {len(results)} saker. Output-filer ble ikke skrevet (--no-write).")
    else:
        write_outputs(results, Path(args.output_dir))
        print(f"Skrev {len(results)} saker til {Path(args.output_dir).resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
