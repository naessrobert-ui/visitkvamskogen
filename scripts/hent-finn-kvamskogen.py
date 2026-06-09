"""
Henter FINN-annonser for Kvamskogen og lagrer som JSON til src/data/.
Kjøres av GitHub Actions, basert på samme scrape-mønster som prisanalyse-scriptet.
"""
import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/114.0.0.0 Safari/537.36"
    )
}

SEARCHES = [
    {
        "type": "fritidsbolig",
        "label": "Fritidsbolig til salgs",
        "url": (
            "https://www.finn.no/realestate/leisuresale/search.html"
            "?location=1.22046.20236&leisure_situation=1&property_type=12"
            "&lat=60.379666&lon=5.990805&radius=5000"
        ),
        "max_pages": 5,
    },
    {
        "type": "torget",
        "label": "Torget – Kvamskogen",
        "url": (
            "https://www.finn.no/recommerce/forsale/search"
            "?category=0.67&geoLocationName=Kvamskogen+369"
            "&lat=60.38033&location=1.22046.20236&lon=5.991773"
            "&q=kvamskogen&radius=3000"
        ),
        "max_pages": 3,
    },
]

OUTPUT_PATH = Path(__file__).parent.parent / "src" / "data" / "finn_kvamskogen.json"


def parse_price(text):
    if not text:
        return None
    cleaned = re.sub(r"[^\d]", "", str(text))
    return int(cleaned) if cleaned else None


def scrape_fritidsbolig(session, url, label, max_pages):
    results = []
    seen = set()
    for page in range(1, max_pages + 1):
        time.sleep(0.6)
        resp = session.get(f"{url}&page={page}", headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            break
        soup = BeautifulSoup(resp.text, "lxml")
        ads = soup.select("article.sf-search-ad")
        if not ads:
            break
        for ad in ads:
            link = ad.select_one("a.sf-search-ad-link")
            if not link:
                continue
            finnkode = link.get("id", "")
            if not finnkode or finnkode in seen:
                continue
            seen.add(finnkode)

            title = ad.select_one("h2.sf-realestate-heading")
            address = ad.select_one("span.text-s.s-text-subtle")
            price_el = ad.select_one("div.font-bold.whitespace-nowrap")
            size_el = ad.select_one('span:-soup-contains("m²")')
            img_el = ad.select_one("img")

            price_raw = price_el.get_text(strip=True) if price_el else ""
            size_raw = size_el.get_text(strip=True) if size_el else ""

            # Totalpris fra detalj-tekst
            details_el = ad.select_one("div.text-xs.s-text-subtle")
            totalpris = None
            if details_el:
                m = re.search(r"Totalpris:\s*([\d\s.,]+)", details_el.get_text())
                if m:
                    totalpris = parse_price(m.group(1))

            results.append({
                "finnkode": finnkode,
                "type": "fritidsbolig",
                "label": label,
                "title": title.get_text(strip=True) if title else "",
                "address": address.get_text(strip=True) if address else "",
                "price": totalpris or parse_price(price_raw),
                "price_text": price_raw,
                "size": parse_price(size_raw),
                "image": img_el.get("src") if img_el else None,
                "url": f"https://www.finn.no/realestate/leisuresale/ad.html?finnkode={finnkode}",
            })
    return results


def scrape_torget(session, url, label, max_pages):
    results = []
    seen = set()
    for page in range(1, max_pages + 1):
        time.sleep(0.6)
        resp = session.get(f"{url}&page={page}", headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            break
        soup = BeautifulSoup(resp.text, "lxml")
        ads = soup.select("article[data-testid='ad-card'], article.sf-search-ad, article.ads__unit")
        if not ads:
            # Prøv JSON i __NEXT_DATA__
            script = soup.find("script", id="__NEXT_DATA__")
            if script:
                try:
                    data = json.loads(script.string)
                    docs = (
                        data.get("props", {})
                        .get("pageProps", {})
                        .get("initialProps", {})
                        .get("searchResult", {})
                        .get("docs", [])
                    )
                    for doc in docs:
                        finnkode = str(doc.get("id", ""))
                        if not finnkode or finnkode in seen:
                            continue
                        seen.add(finnkode)
                        results.append({
                            "finnkode": finnkode,
                            "type": "torget",
                            "label": label,
                            "title": doc.get("heading", ""),
                            "address": doc.get("location", ""),
                            "price": doc.get("price", {}).get("amount") if isinstance(doc.get("price"), dict) else parse_price(str(doc.get("price", ""))),
                            "price_text": doc.get("price", {}).get("amount_text", "") if isinstance(doc.get("price"), dict) else str(doc.get("price", "")),
                            "size": None,
                            "image": (doc.get("image", {}) or {}).get("url"),
                            "url": f"https://www.finn.no/recommerce/forsale/ad.html?finnkode={finnkode}",
                        })
                except Exception:
                    pass
            break
        for ad in ads:
            link = ad.select_one("a[href*='finnkode'], a[href*='/ad']")
            if not link:
                continue
            href = link.get("href", "")
            m = re.search(r"finnkode=(\d+)", href)
            finnkode = m.group(1) if m else ""
            if not finnkode or finnkode in seen:
                continue
            seen.add(finnkode)

            title = ad.select_one("h2, h3, [class*='heading']")
            price_el = ad.select_one("[class*='price'], [class*='Price']")
            img_el = ad.select_one("img")
            location_el = ad.select_one("[class*='location'], [class*='subtitle']")

            results.append({
                "finnkode": finnkode,
                "type": "torget",
                "label": label,
                "title": title.get_text(strip=True) if title else "",
                "address": location_el.get_text(strip=True) if location_el else "",
                "price": parse_price(price_el.get_text() if price_el else ""),
                "price_text": price_el.get_text(strip=True) if price_el else "",
                "size": None,
                "image": img_el.get("src") if img_el else None,
                "url": f"https://www.finn.no/recommerce/forsale/ad.html?finnkode={finnkode}",
            })
    return results


def main():
    all_results = []
    with requests.Session() as session:
        for search in SEARCHES:
            print(f"Henter {search['label']}…")
            if search["type"] == "fritidsbolig":
                ads = scrape_fritidsbolig(session, search["url"], search["label"], search["max_pages"])
            else:
                ads = scrape_torget(session, search["url"], search["label"], search["max_pages"])
            print(f"  → {len(ads)} annonser")
            all_results.extend(ads)

    output = {
        "oppdatert": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "annonser": all_results,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nLagret {len(all_results)} annonser → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
