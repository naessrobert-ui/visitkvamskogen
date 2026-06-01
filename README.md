# Kvamskogen.no

Presentasjonsside for Kvamskogen — turforslag, vêr, løypestatus, og etter hvert
brukerinnsendte aktiviteter og næringsdrivende-tilbud. Se [CLAUDE.md](CLAUDE.md)
for fase-plan og overordnet kontekst.

## Komme i gang

Trengs: Node 18+ og npm.

```bash
npm install        # første gang
npm run dev        # start lokalt på http://localhost:5173
npm run build      # produksjons-build til dist/
npm run preview    # server dist/ lokalt for røyktest av build
```

`npm run dev` gir hot reload. Endringer i `src/` synes umiddelbart i nettleseren.

## Filstruktur

```
src/
├── components/    # React-komponenter (Header, Hero, ActivityGrid, …)
├── styles/        # kit.css, colors_and_type.css
├── App.jsx
└── main.jsx       # Vite entry
public/
└── assets/photos/ # Statiske bilder, kopieres direkte til dist/
index.html         # Vite-rotmal — laster /src/main.jsx
vite.config.js
package.json
```

Bilder under `public/` serveres på rot (`/assets/photos/...`) både i dev og prod.

## Deploy

Push til `main` → Render bygger og deployer automatisk.

Render-innstillinger:
- Build Command: `npm run build`
- Publish Directory: `dist`

## Komponenter

Sidens innhold er bygd av:
- `Header`, `Footer` — sidekrom
- `Hero` — full-bredde hero med vær-strip dokket nederst
- `WeatherStrip` — live vêr (henter fra `/ver/api/...`; faller tilbake til "henter…" hvis endepunktet ikke svarer)
- `YearStrip`, `MoodBlock` — sesongkollasjer
- `WinterCollage`, `SummerCollage` — bildekollasjer per sesong
- `ActivityGrid`, `ActivityCard` — aktiviteter med sesongfilter
- `TrailList` — løypeliste med prepareringsstatus
- `MapBlock` — kart-frame med pins (foreløpig statisk)
- `AddActivityModal` — "legg til aktivitet"-skjema (Fase 2: sender til Supabase)
- `Brand`, `Icons` — wordmark og inline-SVG ikonsett

## Nyhetssøk for Kvamskogen

`kvamskogen_news_search.py` finner nyere artikler og nettsider om Kvamskogen fra et fast sett med kilder. Skriptet bygger Google-spørringer med automatisk datogrense, søker via Google Custom Search JSON API når API-nøkler finnes, dedupliserer treff på URL og scorer sakene etter kilde og temaord som plan, vei, løyper, hytte, natur og utbygging.

Kjernekilder:
- `bt.no`
- `ba.no`
- `hf.no`
- `nrk.no`
- `bergen.kommune.no`

Bonus-kilder:
- `vg.no`
- `tv2.no`

Skriptet skriver resultatene til:
- `kvamskogen_news.json`
- `kvamskogen_news.csv`
- `kvamskogen_news.md`

Markdown-filen er laget for rask redaksjonell bruk på Kvamskogen Vel / Kvamskogen-informasjon, med seksjonene `Viktig nå` og `Siste saker`.

### Sette API-nøkler

Lag en Google Custom Search Engine og sett disse miljøvariablene før du kjører skriptet:

```bash
export GOOGLE_API_KEY="din-google-api-key"
export GOOGLE_CSE_ID="din-custom-search-engine-id"
```

På Windows PowerShell:

```powershell
$env:GOOGLE_API_KEY="din-google-api-key"
$env:GOOGLE_CSE_ID="din-custom-search-engine-id"
```

Hvis nøklene mangler, feiler ikke skriptet. Da skriver det i stedet ut manuelle Google-søkelenker for alle kildene, for eksempel:

```text
"Kvamskogen" site:bt.no after:YYYY-MM-DD
```

### Kjøre skriptet

Standard er 30 dager tilbake:

```bash
python kvamskogen_news_search.py
```

Velg en annen periode:

```bash
python kvamskogen_news_search.py --days 90
```

Skriv output-filene til en egen mappe:

```bash
python kvamskogen_news_search.py --days 30 --output-dir src/data
```

Test uten å skrive filer når API-nøkler er satt:

```bash
python kvamskogen_news_search.py --no-write
```

### Endre kilder og scoring

Kildene ligger øverst i `kvamskogen_news_search.py`:

```python
CORE_SITES = [...]
BONUS_SITES = [...]
```

Kildescore kan justeres i `SOURCE_SCORES`, og temaordene som gir ekstra poeng kan endres i `THEME_KEYWORDS`.

### Hvorfor vi ikke scraper Google direkte

Google-resultatsider er ikke laget for automatisert scraping, og direkte scraping kan være ustabilt, bryte med vilkår og gi blokkering eller feil data. Derfor bruker skriptet Google Custom Search JSON API når nøkler finnes. Uten API-nøkler lager det bare vanlige Google-lenker som et menneske kan åpne manuelt.
