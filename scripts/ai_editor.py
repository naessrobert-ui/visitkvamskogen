#!/usr/bin/env python3
"""Lag redaksjonell prioritering for Aktuelt.

Scriptet bruker OpenAI API når OPENAI_API_KEY finnes. Uten nøkkel skriver det
en deterministisk fallback basert på eksisterende kilde- og viktighetsscore.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DEFAULT_MODEL = "gpt-5.4-mini"

EDITOR_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["generated_at", "model", "source", "summary", "rotation_seed", "lead_story", "featured_stories", "quick_notes"],
    "properties": {
        "generated_at": {"type": "string"},
        "model": {"type": "string"},
        "source": {"type": "string"},
        "summary": {"type": "string"},
        "rotation_seed": {"type": "integer"},
        "lead_story": {
            "type": "object",
            "additionalProperties": False,
            "required": ["title", "url", "source", "reason", "angle", "priority_score"],
            "properties": {
                "title": {"type": "string"},
                "url": {"type": "string"},
                "source": {"type": "string"},
                "reason": {"type": "string"},
                "angle": {"type": "string"},
                "priority_score": {"type": "integer"},
            },
        },
        "featured_stories": {
            "type": "array",
            "minItems": 0,
            "maxItems": 4,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "url", "source", "reason", "angle", "priority_score"],
                "properties": {
                    "title": {"type": "string"},
                    "url": {"type": "string"},
                    "source": {"type": "string"},
                    "reason": {"type": "string"},
                    "angle": {"type": "string"},
                    "priority_score": {"type": "integer"},
                },
            },
        },
        "quick_notes": {
            "type": "array",
            "minItems": 0,
            "maxItems": 3,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["label", "title", "text"],
                "properties": {
                    "label": {"type": "string"},
                    "title": {"type": "string"},
                    "text": {"type": "string"},
                },
            },
        },
    },
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_articles(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError(f"{path} må inneholde en JSON-liste")
    return [item for item in data if isinstance(item, dict)]


def item_date(item: dict[str, Any]) -> datetime | None:
    value = str(item.get("published_at") or item.get("found_date") or "")
    if not value:
      return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            return datetime.fromisoformat(f"{value}T12:00:00+00:00")
        except ValueError:
            return None


def article_age_days(item: dict[str, Any]) -> int:
    published = item_date(item)
    if not published:
        return 999
    if published.tzinfo is None:
        published = published.replace(tzinfo=timezone.utc)
    return max(0, (datetime.now(timezone.utc) - published).days)


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def story_fingerprint(item: dict[str, Any]) -> str:
    value = str(item.get("title") or item.get("snippet") or "").casefold()
    value = re.sub(r"\s+-\s+[^-]+$", "", value)
    value = re.sub(r"[^a-z0-9æøå]+", " ", value)
    value = re.sub(r"\b(bt|ba|nrk|hf|no|com|bergen tidende|bergensavisen)\b", " ", value)
    return clean_text(value)


def unique_articles(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for item in articles:
        key = story_fingerprint(item) or str(item.get("url") or "")
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def is_embedded_in_story(container: dict[str, Any], candidate: dict[str, Any]) -> bool:
    key = story_fingerprint(candidate)
    haystack = story_fingerprint({
        "title": f"{container.get('title', '')} {container.get('snippet', '')}",
    })
    return bool(key and key != story_fingerprint(container) and key in haystack)


def article_score(item: dict[str, Any]) -> tuple[int, str]:
    source_score = int(item.get("importance_score") or 0)
    age_days = article_age_days(item)
    recency = max(0, 28 - age_days * 4)
    stale_penalty = 45 + (age_days - 7) * 12 if age_days > 7 else 0
    score = source_score * 8 + recency - stale_penalty
    published = str(item.get("published_at") or item.get("found_date") or "")
    return score, published


def story_from_article(item: dict[str, Any], reason_prefix: str = "Prioritert") -> dict[str, Any]:
    title = str(item.get("title") or "Ny sak om Kvamskogen")
    source = str(item.get("source") or "ukjent kilde")
    snippet = str(item.get("snippet") or "Saken er hentet fra mediesøket og bør kontrolleres mot kilden.")
    priority_score = int(item.get("importance_score") or 0)
    reason = str(item.get("importance_reason") or f"{reason_prefix} etter kilde, dato og lokale temaord.")
    return {
        "title": title,
        "url": str(item.get("url") or ""),
        "source": source,
        "reason": reason,
        "angle": snippet[:260],
        "priority_score": priority_score,
    }


def fallback_plan(articles: list[dict[str, Any]], model: str, source: str = "heuristikk") -> dict[str, Any]:
    sorted_articles = sorted(unique_articles(articles), key=article_score, reverse=True)
    lead = sorted_articles[0] if sorted_articles else {}
    featured = [item for item in sorted_articles[1:] if not is_embedded_in_story(lead, item)][:4]
    rotation_seed = int(datetime.now(timezone.utc).strftime("%Y%j"))
    return {
        "generated_at": now_iso(),
        "model": model,
        "source": source,
        "summary": "Redaktørfilen er laget fra kilde, dato og viktighetsscore. Legg inn OPENAI_API_KEY for språk- og vinklingsvurdering.",
        "rotation_seed": rotation_seed,
        "lead_story": story_from_article(lead) if lead else {
            "title": "Aktuelt venter på nye mediesaker",
            "url": "",
            "source": "visitkvamskogen.no",
            "reason": "Ingen eksterne saker var tilgjengelige da redaktørfilen ble laget.",
            "angle": "Siden viser faste saker og værdata til nyhetsjobben finner nye treff.",
            "priority_score": 0,
        },
        "featured_stories": [story_from_article(item) for item in featured],
        "quick_notes": [
            {
                "label": "Redaksjon",
                "title": "Kildekontroll først",
                "text": "Eksterne saker vises med lenke til originalkilden og bør ikke omskrives som egne fakta uten kontroll.",
            },
            {
                "label": "Rullering",
                "title": "Forsiden får daglig variasjon",
                "text": "Når flere saker har lik score, brukes dagens dato som rotasjon slik at mindre saker ikke alltid havner nederst.",
            },
        ],
    }


def compact_articles(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    chosen = sorted(unique_articles(articles), key=article_score, reverse=True)[:14]
    return [
        {
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "source": item.get("source", ""),
            "snippet": item.get("snippet", ""),
            "published_at": item.get("published_at", ""),
            "found_date": item.get("found_date", ""),
            "importance_score": item.get("importance_score", 0),
            "importance_reason": item.get("importance_reason", ""),
            "source_group": item.get("source_group", ""),
        }
        for item in chosen
    ]


def extract_output_text(response: dict[str, Any]) -> str:
    if isinstance(response.get("output_text"), str):
        return response["output_text"]
    for output in response.get("output", []):
        for content in output.get("content", []):
            if isinstance(content.get("text"), str):
                return content["text"]
    raise ValueError("Fant ikke tekst i OpenAI-responsen")


def call_openai(articles: list[dict[str, Any]], model: str, api_key: str) -> dict[str, Any]:
    payload = {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": (
                    "Du er AI-redaktør for visitkvamskogen.no. Velg saker for en lokal nettavis. "
                    "Ikke finn på fakta, ikke skriv at noe har skjedd uten dekning i input, og behold kilde-URL. "
                    "Hovedsak og støttesaker skal helst være ferske. Saker eldre enn 7 dager skal bare løftes hvis de er klart viktigere enn alle ferske alternativer. "
                    "Skriv norsk bokmål, selv om kilden er nynorsk."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "oppgave": "Velg hovedsak, inntil fire støttesaker og korte redaksjonelle notiser.",
                        "prioriter": ["vær/føre", "vei/trafikk", "plan og hytteutvikling", "løyper/friluft", "lokale arrangement og tilbud"],
                        "artikler": compact_articles(articles),
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "kvamskogen_ai_editor",
                "schema": EDITOR_SCHEMA,
                "strict": True,
            }
        },
    }
    request = Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "visitkvamskogen-ai-editor/1.0",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI svarte med HTTP {error.code}: {details}") from error
    except (TimeoutError, URLError) as error:
        raise RuntimeError(f"Klarte ikke å kontakte OpenAI API: {error}") from error

    plan = json.loads(extract_output_text(data))
    plan["generated_at"] = plan.get("generated_at") or now_iso()
    plan["model"] = model
    plan["source"] = "openai"
    return plan


def write_plan(plan: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lag AI-redaktørfil for Aktuelt.")
    parser.add_argument("--input", default="public/data/kvamskogen_news.json", help="Nyhets-JSON fra mediesøket.")
    parser.add_argument("--output", default="public/data/kvamskogen_editor.json", help="Redaktør-JSON som leses av frontend.")
    parser.add_argument("--model", default=os.getenv("OPENAI_MODEL", DEFAULT_MODEL), help=f"OpenAI-modell. Standard: {DEFAULT_MODEL}.")
    parser.add_argument("--no-openai", action="store_true", help="Bruk heuristisk fallback selv om OPENAI_API_KEY finnes.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    articles = load_articles(Path(args.input))
    api_key = os.getenv("OPENAI_API_KEY", "").strip()

    if api_key and not args.no_openai:
        try:
            plan = call_openai(articles, args.model, api_key)
        except Exception as error:
            print(f"Advarsel: AI-redaktør feilet, bruker fallback: {error}", file=sys.stderr)
            plan = fallback_plan(articles, args.model, source="fallback etter API-feil")
    else:
        plan = fallback_plan(articles, args.model)

    write_plan(plan, Path(args.output))
    print(f"Skrev redaktørfil til {Path(args.output).resolve()} ({plan['source']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
