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

Skriptet skriver resultatene til `public/data/` som standard:
- `public/data/kvamskogen_news.json`
- `public/data/kvamskogen_news.csv`
- `public/data/kvamskogen_news.md`

JSON-filen blir lest av Aktuelt-siden (`/data/kvamskogen_news.json`) og eksterne mediesaker blandes inn med de faste værsakene, aktivitetssakene og administrerte basissakene. Markdown-filen er laget for rask redaksjonell bruk på Kvamskogen Vel / Kvamskogen-informasjon, med seksjonene `Viktig nå` og `Siste saker`.

### Sette API-nøkler

Nøklene skal ikke ligge i React-koden eller i filer som publiseres til `public/`. Legg dem som miljøvariabler der skriptet kjøres.

Lokalt er det enklest å kopiere `.env.example` til en privat `.env`-fil i repo-roten:

```bash
cp .env.example .env
```

Fyll deretter inn verdiene i `.env`:

```bash
GOOGLE_API_KEY="din-google-api-key"
GOOGLE_CSE_ID="din-custom-search-engine-id"
```

`.env` og `.env.local` er ignorert av Git og skal ikke committes. Skriptet leser automatisk `.env.local` og `.env` før det sjekker miljøvariablene.

Hvis du har klonet repoet på nytt, finnes ikke `.env.local` fra før fordi den er privat. Lag den på nytt lokalt slik:

```bash
cp .env.example .env.local
```

Fyll inn de ekte nøklene i `.env.local`, og kjør deretter:

```bash
python kvamskogen_news_search.py --days 30
```

Du kan også sette variablene direkte i terminalen før du kjører skriptet:

```bash
export GOOGLE_API_KEY="din-google-api-key"
export GOOGLE_CSE_ID="din-custom-search-engine-id"
```

På Windows PowerShell:

```powershell
$env:GOOGLE_API_KEY="din-google-api-key"
$env:GOOGLE_CSE_ID="din-custom-search-engine-id"
```

I GitHub legger du dem inn som repository secrets: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`. Bruk nøyaktig navnene `GOOGLE_API_KEY` og `GOOGLE_CSE_ID`.

Når secrets er lagt inn, kan du oppdatere datafilene i GitHub uten `.env.local` ved å gå til `Actions` → `Oppdater Kvamskogen-mediesaker` → `Run workflow`. Workflowen kjører skriptet med GitHub secrets og committer oppdaterte filer i `public/data/` tilbake til repoet.

#### Uten tilgang til lokal PC

Du trenger ikke vente på tilgang til lokal PC. Bruk GitHub i nettleseren:

1. Gå til repoet på GitHub.
2. Åpne `Settings` → `Secrets and variables` → `Actions`.
3. Opprett to repository secrets:
   - `GOOGLE_API_KEY`
   - `GOOGLE_CSE_ID`
4. Gå til `Actions` → `Oppdater Kvamskogen-mediesaker`.
5. Velg `Run workflow`, la `days` stå på `30` eller skriv inn et annet antall dager.
6. Når workflowen er ferdig, ligger oppdaterte mediesaker i `public/data/`, og Render vil bygge siden på nytt når committen pushes.

`.env.local` finnes bare på en lokal maskin. I GitHub er repository secrets erstatningen for `.env.local`, og de brukes av workflowen uten at nøklene blir synlige i repoet.

Hvis `Actions`-fanen viser `Get started with GitHub Actions` i stedet for workflowen, betyr det som regel at workflow-filen ikke ligger på `main` ennå. Da er neste steg å merge pull requesten som legger til `.github/workflows/oppdater-kvamskogen-nyheter.yml`. Etter merge: åpne `Actions` på nytt, velg `Oppdater Kvamskogen-mediesaker` og trykk `Run workflow`.

Hvis workflowen feiler med `HTTP 401`, `CREDENTIALS_MISSING` eller teksten `API keys are not supported by this API`, er secrets funnet, men Google godtar ikke nøkkelen for Custom Search. Sjekk da at:

- `GOOGLE_API_KEY` er en vanlig Google Cloud API key som normalt starter med `AIza`.
- Hvis nøkkelen starter med `AQ.Ab`, er det ikke riktig nøkkeltype for Google Custom Search JSON API. Lag en ny **API key** i Google Cloud i stedet.
- `GOOGLE_API_KEY` ikke er OAuth Client ID, OAuth Client secret, OAuth access token, servicekonto-JSON eller Search engine ID.
- `Custom Search JSON API` er aktivert i samme Google Cloud-prosjekt som API-nøkkelen tilhører.
- `GOOGLE_CSE_ID` er `Search engine ID` fra Google Programmable Search Engine. Hvis Google viser denne koden:

  ```html
  <script async src="https://cse.google.com/cse.js?cx=46facffde794d46e3"></script>
  <div class="gcse-search"></div>
  ```

  skal GitHub-secret `GOOGLE_CSE_ID` være bare `46facffde794d46e3`. Ikke lim inn hele `<script>`-snippetet i secret-feltet. Skriptet prøver å hente ut `cx` automatisk hvis hele snippetet er limt inn, men det tryggeste er å lagre bare ID-en.

Hvis workflowen feiler med `HTTP 400` og `INVALID_ARGUMENT`, skyldes det ofte at `GOOGLE_CSE_ID`/`cx` er feil formatert eller ikke finnes. Bruk bare ID-en fra `cx=...`, og kontroller at søkemotoren finnes i Google Programmable Search Engine.

Hvis workflowen feiler med `HTTP 403` og teksten `This project does not have the access to Custom Search JSON API`, er selve API-nøkkelen funnet, men Google Cloud-prosjektet som eier nøkkelen har ikke tilgang til API-en. Dette løses i Google Cloud, ikke i GitHub:

1. Gå til [Google Cloud Console](https://console.cloud.google.com/).
2. Øverst i Google Cloud Console: åpne prosjektvelgeren og velg prosjektet der `GOOGLE_API_KEY` ble laget. Hvis du er usikker, gå til `APIs & Services` → `Credentials`, finn API-nøkkelen og se hvilket prosjekt du står i når nøkkelen vises.
3. Gå til `APIs & Services` → `Library`.
4. Søk etter `Custom Search JSON API`.
5. Åpne API-et og trykk `Enable`. Hvis knappen heter `Manage`, er API-et allerede aktivert i akkurat dette prosjektet.
6. Gå deretter til `APIs & Services` → `Credentials`, åpne API-nøkkelen og sjekk eventuelle restriksjoner:
   - Under `API restrictions`: velg enten `Don't restrict key`, eller legg til `Custom Search JSON API` som tillatt API.
   - Under `Application restrictions`: unngå en restriksjon som blokkerer GitHub Actions. For server-jobben i GitHub er `None` enklest. HTTP referrer-restriksjoner er ment for nettleserbruk og passer dårlig for denne workflowen.
7. Vent 2–5 minutter etter endringene.
8. Gå tilbake til GitHub → `Actions` → `Oppdater Kvamskogen-mediesaker` → `Run workflow`.

Hvis du allerede har aktivert **Custom Search JSON API**, men fortsatt får samme `HTTP 403`, er det nesten alltid ett av disse problemene:

- API-nøkkelen i GitHub secret `GOOGLE_API_KEY` er laget i et annet Google Cloud-prosjekt enn prosjektet der API-et ble aktivert. Løsning: aktiver API-et i prosjektet som eier nøkkelen, eller lag en ny API-nøkkel i riktig prosjekt og oppdater GitHub-secret.
- API-nøkkelen har API-restriksjoner som ikke tillater `Custom Search JSON API`.
- API-nøkkelen har applikasjonsrestriksjoner som GitHub Actions ikke matcher.

Node.js 20-varselet i GitHub Actions løses ved at workflowen bruker `actions/checkout@v5` og `actions/setup-python@v6`, som kjører på Node 24. Hvis du fortsatt ser en feilmelding i steget `Hent mediesaker`, skyldes den Google-oppsettet, ikke Node-varselet.

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

Skriptet skriver som standard til `public/data`, slik at Vite publiserer JSON-filen sammen med nettsiden. Du kan overstyre mappe ved behov:

```bash
python kvamskogen_news_search.py --days 30 --output-dir public/data
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
