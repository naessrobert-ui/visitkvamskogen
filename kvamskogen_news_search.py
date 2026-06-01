#!/usr/bin/env python3
"""Finn nylige Kvamskogen-saker via Google News RSS, Google Alerts RSS og utvalgte kildesider.

Dette skriptet bruker RSS-feeder og enkel kildeskanning i stedet for Google Custom Search JSON API.
Det betyr at det ikke trenger GOOGLE_API_KEY eller GOOGLE_CSE_ID.
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

CORE_SITES = ["bt.no", "ba.no", "hf.no", "nrk.no", "bergen.kommune.no"]
BONUS_SITES = ["vg.no", "tv2.no"]
ALL_SITES = [*CORE_SITES, *BONUS_SITES]

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
    "kommunedelplan",
    "reguleringsplan",
    "planforslag",
    "høring",
    "høyring",
    "Tokagjelet",
    "tunnel",
    "Fv. 49",
    "vei",
    "veg",
    "løype",
    "lavlandsløypa",
    "skiløype",
    "preparering",
    "Kvamskogen Vel",
    "Kvamskogen Næringslag",
    "hytte",
    "utbygging",
    "natur",
    "deponi",
    "masser",
]

GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search"
GOOGLE_ALERTS_RSS_URLS = [
    "https://www.google.com/alerts/feeds/11539036791314402374/8207854698679613186",
]

# Hordaland Folkeblad dukker ikke alltid opp i Google News/Alerts, selv når vanlige
# Google-treff finner ferske saker. Derfor skanner vi også utvalgte HF-sider direkte.
SOURCE_PAGE_URLS = [
    ("Hordaland Folkeblad nyhende", "https://www.hf.no/tag/nyhende", "hf.no"),
    ("Hordaland Folkeblad forside", "https://www.hf.no/", "hf.no"),
]

USER_AGENT = "visitkvamskogen-news-search/2.3"


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


def cutoff_date(days_back: int = 30) -> date:
    """Returnerer datoen som brukes som nedre grense lokalt."""
    return date.today() - timedelta(days=days_back)


def build_news_query(days_back: int = 30) -> str:
    """Lag Google News-query."""
    return f"Kvamskogen when:{days_back}d"


def build_google_news_rss_url(days_back: int = 30) -> str:
    params = urlencode(
        {
            "q": build_news_query(days_back),
            "hl": "no",
            "gl": "NO",
            "ceid": "NO:no",
        }
    )
    return f"{GOOGLE_NEWS_RSS_URL}?{params}"


def feed_urls(days_back: int = 30) -> list[tuple[str, str]]:
    urls = [("Google News RSS", build_google_news_rss_url(days_back))]
    urls.extend(("Google Alerts RSS", url) for url in GOOGLE_ALERTS_RSS_URLS)
    return urls


def fetch_url(url: str, source_name: str) -> str:
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html",
        },
    )

    try:
        with urlopen(request, timeout=20) as response:
            return response.read().decode("utf-8")
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{source_name} svarte med HTTP {error.code}: {details}") from error
    except (URLError, TimeoutError) as error:
        raise RuntimeError(f"Klarte ikke å kontakte {source_name}: {error}") from error


def fetch_kvamskogen_news(days_back: int = 30) -> list[dict[str, Any]]:
    """Hent, normaliser, dedupliser og score Kvamskogen-nyheter."""
    min_date = cutoff_date(days_back)
    found_date = datetime.now(timezone.utc).date().isoformat()

    results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    normalized_titles_by_source: dict[str, set[str]] = {}

    def add_items(items: list[dict[str, str]], feed_name: str) -> None:
        for item in items:
            title = clean_google_news_title(item.get("title", ""))
            snippet = clean_text(item.get("snippet", ""))
            raw_url = item.get("url", "")
            url = canonicalize_url(unwrap_google_url(raw_url))
            source_url = item.get("source_url", "")
            source_name = clean_text(item.get("source_name", ""))
            published_at = item.get("published_at", "")
            published_date = parse_iso_date(published_at)

            if published_date and published_date < min_date:
                continue
            if not url or url in seen_urls:
                continue
            if "kvamskogen" not in f"{title} {snippet}".casefold():
                continue

            source = detect_source(url=url, source_url=source_url, source_name=source_name)
            title_key = normalize_title(title)
            title_sources = normalized_titles_by_source.setdefault(title_key, set())
            similar_title = bool(title_key and title_sources and source not in title_sources)
            title_sources.add(source)

            importance_score, importance_reason = calculate_importance(
                title=title,
                snippet=snippet,
                source=source,
                similar_title=similar_title,
            )

            seen_urls.add(url)
            results.append(
                {
                    "title": title or "Uten tittel",
                    "url": url,
                    "source": source,
                    "snippet": snippet,
                    "found_date": found_date,
                    "published_at": published_at,
                    "source_group": source_group(source),
                    "feed_source": feed_name,
                    "importance_score": importance_score,
                    "importance_reason": importance_reason,
                }
            )

    for feed_name, url in feed_urls(days_back):
        feed_xml = fetch_url(url, feed_name)
        add_items(parse_feed(feed_xml, feed_name), feed_name)

    for page_name, page_url, source_site in SOURCE_PAGE_URLS:
        page_html = fetch_url(page_url, page_name)
        add_items(parse_source_page(page_html, page_url, source_site), page_name)

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
    parsed_items: list[dict[str, str]] = []
    channel = find_child(root, "channel")
    if channel is None:
        return parsed_items

    for item in find_children(channel, "item"):
        title = get_child_text(item, "title")
        link = get_child_text(item, "link")
        description = get_child_text(item, "description")
        pub_date = get_child_text(item, "pubDate")
        source_node = find_child(item, "source")
        source_name = clean_text(source_node.text or "") if source_node is not None else ""
        source_url = source_node.attrib.get("url", "") if source_node is not None else ""

        parsed_items.append(
            {
                "title": title,
                "url": link,
                "source_name": source_name,
                "source_url": source_url,
                "snippet": description_to_text(description),
                "published_at": parse_rss_datetime(pub_date),
            }
        )

    return parsed_items


def parse_atom(root: ET.Element) -> list[dict[str, str]]:
    parsed_items: list[dict[str, str]] = []

    for entry in find_children(root, "entry"):
        title = get_child_text(entry, "title")
        content = get_child_text(entry, "content") or get_child_text(entry, "summary")
        published = get_child_text(entry, "published") or get_child_text(entry, "updated")
        source_name = atom_source_name(entry)
        source_url = atom_source_url(entry)
        link = atom_link(entry)

        parsed_items.append(
            {
                "title": title,
                "url": link,
                "source_name": source_name,
                "source_url": source_url,
                "snippet": description_to_text(content),
                "published_at": parse_atom_datetime(published),
            }
        )

    return parsed_items


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
        items.append(
            {
                "title": title,
                "url": url,
                "source_name": source_site,
                "source_url": f"https://www.{source_site}/",
                "snippet": title,
                "published_at": "",
            }
        )

    return items


def is_article_url(url: str, source_site: str) -> bool:
    parsed = urlparse(url)
    hostname = parsed.netloc.lower().removeprefix("www.")
    if hostname != source_site:
        return False
    path = parsed.path.strip("/")
    if not path or path.startswith("tag/"):
        return False
    return bool(re.search(r"/\d{4,}$", parsed.path)) or "/nyhende/" in parsed.path


def atom_link(entry: ET.Element) -> str:
    for child in list(entry):
        if local_name(child.tag) != "link":
            continue
        href = child.attrib.get("href", "")
        if href:
            return href
    return ""


def atom_source_name(entry: ET.Element) -> str:
    source = find_child(entry, "source")
    if source is None:
        return ""
    return get_child_text(source, "title")


def atom_source_url(entry: ET.Element) -> str:
    source = find_child(entry, "source")
    if source is None:
        return ""
    for child in list(source):
        if local_name(child.tag) == "link" and child.attrib.get("href"):
            return child.attrib["href"]
    return ""


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def find_child(element: ET.Element, name: str) -> ET.Element | None:
    for child in list(element):
        if local_name(child.tag) == name:
            return child
    return None


def find_children(element: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in list(element) if local_name(child.tag) == name]


def get_child_text(item: ET.Element, tag: str) -> str:
    node = find_child(item, tag)
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
    cleaned = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(cleaned)
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
    # Google News-titler er ofte "Tittel - Kilde". Kilden har vi separat.
    return re.sub(r"\s+-\s+[^-]+$", "", clean_text(title)).strip()


def sorted_news(results: list[dict[str, Any]], sorting: str) -> list[dict[str, Any]]:
    if sorting == "latest":
        return sorted(
            results,
            key=lambda item: (item.get("published_at", ""), item.get("found_date", "")),
            reverse=True,
        )
    if sorting == "important":
        return sorted(
            results,
            key=lambda item: (int(item.get("importance_score", 0)), item.get("published_at", "")),
            reverse=True,
        )
    raise ValueError(f"Ukjent sortering: {sorting}")


def unwrap_google_url(url: str) -> str:
    if not url:
        return ""
    parsed = urlparse(url)
    hostname = parsed.netloc.lower().removeprefix("www.")
    if hostname != "google.com":
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


def detect_source(url: str, source_url: str = "", source_name: str = "") -> str:
    for candidate in [source_url, url]:
        hostname = urlparse(candidate).netloc.lower().removeprefix("www.")
        for site in ALL_SITES:
            if hostname == site or hostname.endswith(f".{site}"):
                return site
        if hostname and hostname not in {"news.google.com", "google.com"}:
            return hostname

    normalized_name = normalize_source_name(source_name)
    if normalized_name in SOURCE_NAME_ALIASES:
        return SOURCE_NAME_ALIASES[normalized_name]
    return source_name or "ukjent"


def normalize_source_name(source_name: str) -> str:
    return clean_text(source_name.casefold().replace("–", "-").replace("—", "-"))


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

    matched_keywords = []
    for keyword in THEME_KEYWORDS:
        if keyword.casefold() in haystack:
            matched_keywords.append(keyword)

    if matched_keywords:
        score += len(matched_keywords)
        reasons.append("Temaord: " + ", ".join(matched_keywords))

    if similar_title:
        reasons.append("Tittelen ligner på en sak fra en annen kilde")

    return score, "; ".join(reasons)


def write_json(results: list[dict[str, Any]], output_path: Path) -> None:
    output_path.write_text(
        json.dumps(results, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_csv(results: list[dict[str, Any]], output_path: Path) -> None:
    fieldnames = [
        "title",
        "url",
        "source",
        "snippet",
        "found_date",
        "published_at",
        "source_group",
        "feed_source",
        "importance_score",
        "importance_reason",
    ]
    with output_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)


def write_markdown(results: list[dict[str, Any]], output_path: Path) -> None:
    important = sorted_news(results, "important")[:5]
    latest = sorted_news(results, "latest")
    lines = ["# Kvamskogen i media", "", "## Viktig nå", ""]

    lines.extend(format_markdown_items(important, empty_text="Ingen saker funnet."))
    lines.extend(["", "## Siste saker", ""])
    lines.extend(format_markdown_items(latest, empty_text="Ingen saker funnet."))
    output_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def format_markdown_items(items: list[dict[str, Any]], empty_text: str) -> list[str]:
    if not items:
        return [empty_text]

    lines: list[str] = []
    for item in items:
        published_at = item.get("published_at") or "Ukjent publiseringstidspunkt"
        feed_source = item.get("feed_source") or "Ukjent feed"
        lines.extend(
            [
                f"### {item['title']}",
                f"- Kilde: {item['source']}",
                f"- Feed: {feed_source}",
                f"- Publisert: {published_at}",
                f"- Lenke: {item['url']}",
                f"- Kort sammendrag/snippet: {item['snippet'] or 'Mangler snippet fra søkeresultatet.'}",
                f"- Viktighetsscore: {item['importance_score']}",
                f"- Hvorfor saken ble vurdert som viktig: {item['importance_reason']}",
                "",
            ]
        )
    return lines


def write_outputs(results: list[dict[str, Any]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    latest_results = sorted_news(results, "latest")
    write_json(latest_results, output_dir / "kvamskogen_news.json")
    write_csv(latest_results, output_dir / "kvamskogen_news.csv")
    write_markdown(latest_results, output_dir / "kvamskogen_news.md")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Hent nylige nyhetssaker om Kvamskogen via RSS og utvalgte kildesider.",
    )
    parser.add_argument("--days", type=int, default=30, help="Antall dager tilbake i tid. Standard: 30.")
    parser.add_argument(
        "--output-dir",
        default="public/data",
        help="Mappe for kvamskogen_news.json/csv/md. Standard: public/data.",
    )
    parser.add_argument(
        "--no-write",
        action="store_true",
        help="Ikke skriv output-filer, bare hent og skriv kort status.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.days < 1:
        print("--days må være 1 eller høyere", file=sys.stderr)
        return 2

    try:
        results = fetch_kvamskogen_news(days_back=args.days)
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 1

    if not args.no_write:
        write_outputs(results, Path(args.output_dir))
        print(f"Skrev {len(results)} saker til {Path(args.output_dir).resolve()}")
    else:
        print(f"Fant {len(results)} saker. Output-filer ble ikke skrevet (--no-write).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
