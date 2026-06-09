"""
Henter FINN- og hjem.no-annonser for Kvamskogen og lagrer som JSON til src/data/.
Kjøres av GitHub Actions.
"""
import json
import re
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

OUTPUT_PATH = Path(__file__).parent.parent / "src" / "data" / "finn_kvamskogen.json"

FINN_TORGET_URL = "https://www.finn.no/recommerce/forsale/search?q=kvamskogen"
HJEMNO_URL = "https://hjem.no/list?keywords=Kvamskogen&sorting=relevance&address=vestland%2Ckvam"

# ---------- Hjelpefunksjoner ----------

def parse_price(text):
    if not text:
        return None
    cleaned = re.sub(r"[^\d]", "", str(text))
    return int(cleaned) if cleaned else None


def get_finn_coordinates(finnkode, type_path, session):
    """Henter koordinater fra FINN-detaljside via window.__remixContext."""
    url = f"https://www.finn.no/realestate/{type_path}/ad.html?finnkode={finnkode}"
    try:
        time.sleep(0.4)
        resp = session.get(url, headers=HEADERS, timeout=12)
        if resp.status_code != 200:
            return None, None
        soup = BeautifulSoup(resp.text, "lxml")
        script = soup.find("script", string=re.compile(r"window\.__remixContext"))
        if not script:
            return None, None
        raw = script.string.replace("window.__remixContext = ", "").rstrip(";")
        data = json.loads(raw)
        loader = data.get("state", {}).get("loaderData", {})
        for key, val in loader.items():
            if "objectData" in val:
                pos = (
                    val["objectData"]
                    .get("ad", {})
                    .get("location", {})
                    .get("position", {})
                )
                if "lat" in pos and "lng" in pos:
                    return pos["lat"], pos["lng"]
    except Exception:
        pass
    return None, None


# ---------- FINN fritidsbolig ----------

def _parse_finn_fritidsbolig_remix(soup, seen):
    """Prøver å hente annonser fra window.__remixContext på søkesiden."""
    results = []
    script = soup.find("script", string=re.compile(r"window\.__remixContext"))
    if not script:
        return results
    try:
        raw = script.string.replace("window.__remixContext = ", "").rstrip(";")
        data = json.loads(raw)
        loader = data.get("state", {}).get("loaderData", {})

        docs = []
        for val in loader.values():
            if isinstance(val, dict):
                # FINN søk: state.loaderData["routes/..."].searchResult.docs
                docs = (
                    val.get("docs")
                    or val.get("searchResult", {}).get("docs")
                    or val.get("adList")
                    or []
                )
                if docs:
                    break

        for doc in docs:
            finnkode = str(doc.get("id") or doc.get("finnkode") or "")
            if not finnkode or finnkode in seen:
                continue
            seen.add(finnkode)

            price_data = doc.get("price") or {}
            price_val = price_data.get("amount") if isinstance(price_data, dict) else parse_price(str(price_data))
            price_text = price_data.get("amount_text", "") if isinstance(price_data, dict) else ""

            pos = doc.get("location", {}).get("position", {}) if isinstance(doc.get("location"), dict) else {}
            lat = pos.get("lat")
            lon = pos.get("lng") or pos.get("lon")

            images = doc.get("images") or doc.get("image") or []
            image_url = None
            if isinstance(images, list) and images:
                first = images[0]
                image_url = first.get("url") or first.get("src") if isinstance(first, dict) else None
            elif isinstance(images, dict):
                image_url = images.get("url") or images.get("src")

            results.append({
                "finnkode": finnkode,
                "source": "finn",
                "type": "fritidsbolig",
                "title": doc.get("heading") or doc.get("title") or "",
                "address": (doc.get("location") or {}).get("name", "") if isinstance(doc.get("location"), dict) else str(doc.get("location") or ""),
                "price": price_val,
                "price_text": price_text,
                "size": doc.get("area") or doc.get("size"),
                "lat": float(lat) if lat else None,
                "lon": float(lon) if lon else None,
                "image": image_url,
                "url": f"https://www.finn.no/realestate/leisuresale/ad.html?finnkode={finnkode}",
            })
    except Exception as e:
        print(f"  remix-kontekst-parsing for søkeside feilet: {e}")
    return results


def scrape_finn_fritidsbolig(session, url, max_pages=5):
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
            # FINN har sannsynlegvis endra HTML — prøv Remix-kontekst
            remix_results = _parse_finn_fritidsbolig_remix(soup, seen)
            if remix_results:
                results.extend(remix_results)
            # Ingen fleire sider å hente om første side er tom
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

            totalpris = None
            details_el = ad.select_one("div.text-xs.s-text-subtle")
            if details_el:
                m = re.search(r"Totalpris:\s*([\d\s.,]+)", details_el.get_text())
                if m:
                    totalpris = parse_price(m.group(1))

            results.append({
                "finnkode": finnkode,
                "source": "finn",
                "type": "fritidsbolig",
                "title": title.get_text(strip=True) if title else "",
                "address": address.get_text(strip=True) if address else "",
                "price": totalpris or parse_price(price_raw),
                "price_text": price_raw,
                "size": parse_price(size_raw),
                "lat": None,
                "lon": None,
                "image": img_el.get("src") if img_el else None,
                "url": f"https://www.finn.no/realestate/leisuresale/ad.html?finnkode={finnkode}",
            })
    return results


# ---------- FINN torget ----------

def scrape_finn_torget(session, url, max_pages=3):
    results = []
    seen = set()
    for page in range(1, max_pages + 1):
        time.sleep(0.6)
        page_url = f"{url}&page={page}" if page > 1 else url
        resp = session.get(page_url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            break
        soup = BeautifulSoup(resp.text, "lxml")

        # FINN torget bruker sf-search-ad likeins som fritidsbolig
        ads = soup.select("article.sf-search-ad")
        if not ads:
            # Prøv JSON i __NEXT_DATA__ som fallback
            script = soup.find("script", id="__NEXT_DATA__")
            if script:
                try:
                    data = json.loads(script.string)
                    def find_docs(obj, depth=0):
                        if depth > 8: return []
                        if isinstance(obj, list) and obj and isinstance(obj[0], dict) and ("id" in obj[0] or "finnkode" in obj[0]):
                            return obj
                        if isinstance(obj, dict):
                            for v in obj.values():
                                found = find_docs(v, depth + 1)
                                if found: return found
                        return []
                    docs = find_docs(data)
                    for doc in docs:
                        finnkode = str(doc.get("id") or doc.get("finnkode") or "")
                        if not finnkode or finnkode in seen: continue
                        seen.add(finnkode)
                        price_data = doc.get("price", {})
                        results.append({
                            "finnkode": finnkode, "source": "finn", "type": "torget",
                            "title": doc.get("heading") or doc.get("title") or "",
                            "address": doc.get("location") or doc.get("address") or "",
                            "price": price_data.get("amount") if isinstance(price_data, dict) else parse_price(str(price_data)),
                            "price_text": price_data.get("amount_text", "") if isinstance(price_data, dict) else "",
                            "size": None, "lat": None, "lon": None,
                            "image": (doc.get("image") or {}).get("url"),
                            "url": f"https://www.finn.no/recommerce/forsale/item/{finnkode}",
                        })
                except Exception as e:
                    print(f"  torget JSON-fallback feilet: {e}")
            break

        for ad in ads:
            link = ad.select_one("a.sf-search-ad-link, a[href*='finnkode']")
            if not link: continue
            finnkode = link.get("id", "") or re.search(r"finnkode=(\d+)", link.get("href", "") or "")
            if hasattr(finnkode, "group"): finnkode = finnkode.group(1)
            if not finnkode or finnkode in seen: continue
            seen.add(finnkode)

            title = ad.select_one("h2, h3, [class*='heading']")
            price_el = ad.select_one("div.font-bold, [class*='price']")
            img_el = ad.select_one("img")
            loc_el = ad.select_one("span.text-s, [class*='location'], [class*='subtitle']")
            results.append({
                "finnkode": finnkode, "source": "finn", "type": "torget",
                "title": title.get_text(strip=True) if title else "",
                "address": loc_el.get_text(strip=True) if loc_el else "",
                "price": parse_price(price_el.get_text() if price_el else ""),
                "price_text": price_el.get_text(strip=True) if price_el else "",
                "size": None, "lat": None, "lon": None,
                "image": img_el.get("src") if img_el else None,
                "url": f"https://www.finn.no/recommerce/forsale/item/{finnkode}",
            })
    return results


# ---------- hjem.no ----------

def scrape_hjemno(session, max_pages=3):
    results = []
    seen = set()
    base_url = HJEMNO_URL
    for page in range(1, max_pages + 1):
        time.sleep(0.7)
        url = base_url if page == 1 else f"{base_url}&page={page}"
        resp = session.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"  hjem.no: status {resp.status_code}, hopper over")
            break
        soup = BeautifulSoup(resp.text, "lxml")

        # hjem.no bruker Next.js — sjekk __NEXT_DATA__
        script = soup.find("script", id="__NEXT_DATA__")
        if script:
            try:
                data = json.loads(script.string)
                # Naviger frem til annonselisten (strukturen kan variere)
                page_props = data.get("props", {}).get("pageProps", {})
                listings_raw = (
                    page_props.get("listings")
                    or page_props.get("searchResult", {}).get("listings")
                    or page_props.get("initialData", {}).get("listings")
                    or []
                )
                if not listings_raw:
                    # Prøv å finne det dypere
                    def find_listings(obj, depth=0):
                        if depth > 6 or not isinstance(obj, (dict, list)):
                            return []
                        if isinstance(obj, list) and len(obj) > 0 and isinstance(obj[0], dict) and "id" in obj[0]:
                            return obj
                        if isinstance(obj, dict):
                            for v in obj.values():
                                found = find_listings(v, depth + 1)
                                if found:
                                    return found
                        return []
                    listings_raw = find_listings(page_props)

                if not listings_raw:
                    break

                for item in listings_raw:
                    ad_id = str(item.get("id") or item.get("adId") or "")
                    if not ad_id or ad_id in seen:
                        continue
                    seen.add(ad_id)

                    price_raw = item.get("price") or item.get("askingPrice") or {}
                    price_val = price_raw.get("amount") if isinstance(price_raw, dict) else parse_price(str(price_raw))

                    loc = item.get("location") or item.get("coordinates") or {}
                    lat = loc.get("lat") or loc.get("latitude")
                    lon = loc.get("lng") or loc.get("longitude") or loc.get("lon")

                    images = item.get("images") or item.get("media") or []
                    image_url = None
                    if images and isinstance(images[0], dict):
                        image_url = images[0].get("url") or images[0].get("src")

                    slug = item.get("slug") or item.get("url") or ad_id
                    ad_url = slug if slug.startswith("http") else f"https://www.hjem.no/eiendom/{slug}"

                    results.append({
                        "finnkode": ad_id,
                        "source": "hjemno",
                        "type": "fritidsbolig",
                        "title": item.get("title") or item.get("heading") or "",
                        "address": item.get("address") or item.get("streetAddress") or "",
                        "price": price_val,
                        "price_text": "",
                        "size": item.get("size") or item.get("primaryRoomArea") or item.get("usableArea"),
                        "lat": float(lat) if lat else None,
                        "lon": float(lon) if lon else None,
                        "image": image_url,
                        "url": ad_url,
                    })
                continue
            except Exception as e:
                print(f"  hjem.no JSON-parsing feilet: {e}")

        # Fallback: HTML-parsing
        ads = soup.select("article, [class*='PropertyCard'], [class*='listing-card']")
        if not ads:
            break
        for ad in ads:
            link = ad.select_one("a[href]")
            if not link:
                continue
            href = link.get("href", "")
            ad_id = re.sub(r"[^a-z0-9-]", "", href.split("/")[-1])[:40]
            if not ad_id or ad_id in seen:
                continue
            seen.add(ad_id)
            title = ad.select_one("h2, h3, [class*='title']")
            price_el = ad.select_one("[class*='price'], [class*='Price']")
            img_el = ad.select_one("img")
            results.append({
                "finnkode": ad_id,
                "source": "hjemno",
                "type": "fritidsbolig",
                "title": title.get_text(strip=True) if title else "",
                "address": "",
                "price": parse_price(price_el.get_text() if price_el else ""),
                "price_text": "",
                "size": None,
                "lat": None,
                "lon": None,
                "image": img_el.get("src") if img_el else None,
                "url": f"https://www.hjem.no{href}" if href.startswith("/") else href,
            })
    return results


# ---------- Koordinater ----------

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {**HEADERS, "Accept-Language": "no"}


def geocode_address(address, session):
    """Geokoder ei adresse via Nominatim (OpenStreetMap). Returnerer (lat, lon) eller (None, None)."""
    if not address or not address.strip():
        return None, None
    try:
        time.sleep(1.1)  # Nominatim krev maks 1 req/sek
        resp = session.get(
            NOMINATIM_URL,
            params={"q": address, "format": "json", "limit": 1, "countrycodes": "no"},
            headers=NOMINATIM_HEADERS,
            timeout=10,
        )
        data = resp.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None, None


def load_coordinate_cache():
    """Les eksisterande koordinatar frå førre køyring."""
    if not OUTPUT_PATH.exists():
        return {}
    try:
        data = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        return {
            a["finnkode"]: {"lat": a["lat"], "lon": a["lon"]}
            for a in data.get("annonser", [])
            if a.get("lat") and a.get("lon")
        }
    except Exception:
        return {}


def enrich_with_coordinates(ads, session):
    """Fyller inn koordinater for alle annonser som manglar dei.

    Prioritet:
    1. Cache frå førre køyring
    2. FINN-detaljside (window.__remixContext) for fritidsbolig
    3. Nominatim-geokoding på adressa
    """
    cache = load_coordinate_cache()

    # 1. Cache
    for ad in ads:
        if ad["finnkode"] in cache:
            ad["lat"] = cache[ad["finnkode"]]["lat"]
            ad["lon"] = cache[ad["finnkode"]]["lon"]

    # 2. FINN-detaljside
    missing_finn = [
        a for a in ads
        if a["source"] == "finn" and a["type"] == "fritidsbolig" and a["lat"] is None
    ]
    if missing_finn:
        print(f"  Henter koordinatar frå FINN-detaljsider for {len(missing_finn)} annonsar…")
        for i, ad in enumerate(missing_finn, 1):
            lat, lon = get_finn_coordinates(ad["finnkode"], "leisuresale", session)
            ad["lat"] = lat
            ad["lon"] = lon
            if i % 5 == 0:
                print(f"    {i}/{len(missing_finn)}…")

    # 3. Nominatim-fallback for alle som framleis manglar koordinatar
    missing_all = [a for a in ads if a["lat"] is None and a.get("address")]
    if missing_all:
        print(f"  Geokoder {len(missing_all)} annonsar via Nominatim…")
        for i, ad in enumerate(missing_all, 1):
            lat, lon = geocode_address(ad["address"], session)
            ad["lat"] = lat
            ad["lon"] = lon
            if i % 5 == 0:
                print(f"    {i}/{len(missing_all)}…")

    med_koord = sum(1 for a in ads if a["lat"])
    print(f"  {med_koord}/{len(ads)} annonsar har koordinatar etter bereiking.")
    return ads


# ---------- Hovedfunksjon ----------

def main():
    all_results = []

    with requests.Session() as session:
        print("Henter FINN fritidsbolig…")
        finn_url = (
            "https://www.finn.no/realestate/leisuresale/search.html"
            "?location=1.22046.20236&leisure_situation=1&property_type=12"
            "&lat=60.379666&lon=5.990805&radius=5000"
        )
        fritid = scrape_finn_fritidsbolig(session, finn_url)
        print(f"  → {len(fritid)} annonser (fritidsbolig)")
        all_results.extend(fritid)

        print("Henter FINN torget…")
        torget = scrape_finn_torget(session, FINN_TORGET_URL)
        print(f"  → {len(torget)} annonser")
        all_results.extend(torget)

        print("Henter hjem.no…")
        hjem = scrape_hjemno(session)
        print(f"  → {len(hjem)} annonser")
        all_results.extend(hjem)

        print("Beriker med koordinatar…")
        all_results = enrich_with_coordinates(all_results, session)

    output = {
        "oppdatert": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "annonser": all_results,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nLagret {len(all_results)} annonser → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
