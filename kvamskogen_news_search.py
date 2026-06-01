#!/usr/bin/env python3
"""Finn nylige Kvamskogen-saker via Google Custom Search JSON API."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote_plus, urlencode, urlparse
from urllib.request import Request, urlopen

CORE_SITES = ["bt.no", "ba.no", "hf.no", "nrk.no", "bergen.kommune.no"]
BONUS_SITES = ["vg.no", "tv2.no"]

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

GOOGLE_CUSTOM_SEARCH_URL = "https://www.googleapis.com/customsearch/v1"
GOOGLE_SEARCH_URL = "https://www.google.com/search"
USER_AGENT = "visitkvamskogen-news-search/1.0"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def load_local_env() -> None:
    load_env_file(Path(".env.local"))
    load_env_file(Path(".env"))


def configured_env_value(name: str) -> str | None:
    value = os.getenv(name, "").strip()
    if not value or value.startswith("legg-inn-"):
        return None
    return value


def extract_google_cse_id(value: str) -> str:
    """Hent ut ren cx/Search engine ID selv om brukeren limer inn hele CSE-snippetet."""
    cleaned = value.strip().strip('"').strip("'")
    cx_match = re.search(r"[?&]cx=([^&\s\"'<>]+)", cleaned)
    if cx_match:
        return cx_match.group(1).strip()

    assignment_match = re.search(r"\bcx\s*[=:]\s*[\"']?([^\s\"'<>]+)", cleaned)
    if assignment_match:
        return assignment_match.group(1).strip()

    return cleaned


def validate_google_custom_config(api_key: str, cse_id: str) -> None:
    if not api_key.startswith("AIza"):
        raise RuntimeError(
            "GOOGLE_API_KEY ser ikke ut som en Google Cloud API key for Custom Search. "
            "Den skal normalt starte med AIza. En verdi som starter med AQ.Ab er ikke riktig nøkkeltype her. "
            "Bruk en API key fra Google Cloud, ikke OAuth Client ID, OAuth-token, servicekonto-JSON eller Search engine ID."
        )
    if len(cse_id) < 10:
        raise RuntimeError("GOOGLE_CSE_ID er uvanlig kort. Bruk Search engine ID fra Programmable Search Engine.")
    if re.search(r"\s|<|>", cse_id) or not re.fullmatch(r"[A-Za-z0-9:_-]+", cse_id):
        raise RuntimeError(
            "GOOGLE_CSE_ID må være bare selve Search engine ID / cx-verdien, ikke hele HTML-snippetet. "
            "Hvis Google viser en kode som cse.js?cx=46facffde794d46e3, skal secret-verdien være 46facffde794d46e3."
        )


@dataclass(frozen=True)
class SiteConfig:
    site: str
    source_group: str


def cutoff_date(days_back: int = 30) -> date:
    """Returnerer datoen Google-spørringen skal bruke som nedre grense."""
    return date.today() - timedelta(days=days_back)


def build_query(term: str, site: str, days_back: int = 30) -> str:
    """Lag Google-query med automatisk after-dato."""
    return f'"{term}" site:{site} after:{cutoff_date(days_back).isoformat()}'


def build_google_search_url(query: str) -> str:
    """Lag en vanlig Google-søkelenke for manuell kontroll."""
    return f"{GOOGLE_SEARCH_URL}?q={quote_plus(query)}"


def search_google_custom(query: str, api_key: str, cse_id: str) -> list[dict[str, Any]]:
    """Søk via Google Custom Search JSON API og returner rå treff."""
    params = urlencode(
        {
            "key": api_key,
            "cx": cse_id,
            "q": query,
            "num": 10,
            "safe": "active",
            "hl": "no",
            "lr": "lang_no",
        }
    )
    request = Request(
        f"{GOOGLE_CUSTOM_SEARCH_URL}?{params}",
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )

    try:
        with urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        help_text = build_google_error_help(error.code, details)
        raise RuntimeError(f"Google Custom Search svarte med HTTP {error.code}: {details}{help_text}") from error
    except (URLError, TimeoutError) as error:
        raise RuntimeError(f"Klarte ikke å kontakte Google Custom Search: {error}") from error
    except json.JSONDecodeError as error:
        raise RuntimeError("Google Custom Search svarte ikke med gyldig JSON") from error

    return payload.get("items", [])


def build_google_error_help(status_code: int, details: str) -> str:
    detail_text = details.casefold()
    if status_code == 403 and "does not have the access to custom search json api" in detail_text:
        return (
            "\nGoogle sier at dette prosjektet ikke har tilgang til Custom Search JSON API. "
            "Åpne Google Cloud Console for prosjektet som eier GOOGLE_API_KEY, aktiver "
            "Custom Search JSON API, vent noen minutter og kjør workflowen på nytt. "
            "Hvis API-en allerede er aktivert, er GOOGLE_API_KEY sannsynligvis fra et annet "
            "Google Cloud-prosjekt enn det du aktiverte API-en i."
        )

    if status_code in {401, 403}:
        return (
            "\nSjekk at GOOGLE_API_KEY er en Google Cloud API key som starter med AIza, "
            "at Custom Search JSON API er aktivert for samme prosjekt, og at GOOGLE_CSE_ID "
            "er Search engine ID fra Programmable Search Engine."
        )

    if status_code == 400:
        return (
            "\nHTTP 400 betyr ofte at GOOGLE_CSE_ID/cx er limt inn feil. "
            "Bruk bare selve ID-en, for eksempel 46facffde794d46e3 fra "
            "https://cse.google.com/cse.js?cx=46facffde794d46e3 — ikke hele <script>-koden."
        )

    return ""


def fetch_kvamskogen_news(days_back: int = 30) -> list[dict[str, Any]]:
    """Hent, normaliser, dedupliser og score Kvamskogen-nyheter."""
    load_local_env()
    api_key = configured_env_value("GOOGLE_API_KEY")
    cse_id_value = configured_env_value("GOOGLE_CSE_ID")
    cse_id = extract_google_cse_id(cse_id_value) if cse_id_value else None
    site_configs = [
        *(SiteConfig(site, "core") for site in CORE_SITES),
        *(SiteConfig(site, "bonus") for site in BONUS_SITES),
    ]

    if not api_key or not cse_id:
        print_manual_search_links(site_configs, days_back)
        return []

    validate_google_custom_config(api_key, cse_id)

    results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    normalized_titles_by_source: dict[str, set[str]] = {}
    found_date = datetime.now(timezone.utc).date().isoformat()

    for site_config in site_configs:
        query = build_query("Kvamskogen", site_config.site, days_back=days_back)
        raw_items = search_google_custom(query, api_key, cse_id)

        for item in raw_items:
            url = canonicalize_url(str(item.get("link", "")).strip())
            if not url or url in seen_urls:
                continue

            title = clean_text(str(item.get("title", "")).strip())
            snippet = clean_text(str(item.get("snippet", "")).strip())
            source = detect_source(url, site_config.site)
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
                    "source_group": site_config.source_group,
                    "importance_score": importance_score,
                    "importance_reason": importance_reason,
                }
            )

    return results


def sorted_news(results: list[dict[str, Any]], sorting: str) -> list[dict[str, Any]]:
    if sorting == "latest":
        return sorted(
            results,
            key=lambda item: item.get("found_date", ""),
            reverse=True,
        )
    if sorting == "important":
        return sorted(
            results,
            key=lambda item: (int(item.get("importance_score", 0)), item.get("found_date", "")),
            reverse=True,
        )
    raise ValueError(f"Ukjent sortering: {sorting}")


def print_manual_search_links(site_configs: list[SiteConfig], days_back: int) -> None:
    print("GOOGLE_API_KEY og/eller GOOGLE_CSE_ID mangler.")
    print("Skriptet scraper ikke Google direkte. Åpne disse søkene manuelt i stedet:\n")
    for site_config in site_configs:
        query = build_query("Kvamskogen", site_config.site, days_back=days_back)
        print(f"- {query}")
        print(f"  {build_google_search_url(query)}")


def canonicalize_url(url: str) -> str:
    if not url:
        return ""
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return url
    return parsed._replace(fragment="").geturl().rstrip("/")


def detect_source(url: str, fallback_site: str) -> str:
    hostname = urlparse(url).netloc.lower().removeprefix("www.")
    for site in [*CORE_SITES, *BONUS_SITES]:
        if hostname == site or hostname.endswith(f".{site}"):
            return site
    return fallback_site


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
        "source_group",
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
        lines.extend(
            [
                f"### {item['title']}",
                f"- Kilde: {item['source']}",
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
        description="Hent nylige nyhetssaker om Kvamskogen via Google Custom Search.",
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

    if not results:
        return 0

    if not args.no_write:
        write_outputs(results, Path(args.output_dir))
        print(f"Skrev {len(results)} saker til {Path(args.output_dir).resolve()}")
    else:
        print(f"Fant {len(results)} saker. Output-filer ble ikke skrevet (--no-write).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
