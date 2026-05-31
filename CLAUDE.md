# visitkvamskogen.no

Presentasjonsside for Kvamskogen — turforslag, webkameraer, vær, og etter hvert en plattform der næringsdrivende legger inn tilbud og brukere foreslår aktiviteter.

## Status
- **Fase 1 (pågår):** statisk presentasjon
- **Fase 2:** brukerinnsendte aktiviteter (Supabase, ingen pålogging — Cloudflare Turnstile mot spam)
- **Fase 3:** næringsdrivende-pålogging og tilbud (Supabase auth)
- **Fase 4:** lett moderasjonskø

## Tech-stack
- **Frontend:** React + Vite, statisk hosting
- **Hosting:** Render Static Site (gratis), auto-deploy fra `main`
- **Backend/data:** Supabase (Postgres + auth + storage) når Fase 2 starter
- **Data-jobber:** Python-scripts i `scripts/`, kjøres av GitHub Actions, committer JSON til `src/data/`
- **Domene:** visitkvamskogen.no (DNS hos Domeneshop, A-record `@` → `216.24.57.1`, CNAME `www` → `visitkvamskogen.onrender.com`)

## Filstruktur (etter Vite-migrering)
```
visitkvamskogen/
├── src/
│   ├── components/    # React-komponenter (Header, Hero, ActivityGrid, ...)
│   ├── pages/         # Hovedsider når routing trengs
│   ├── lib/           # Supabase-klient, fetch-helpers, utils
│   ├── data/          # Genererte JSON-filer (loyper.json, vaer.json)
│   ├── styles/        # kit.css, colors_and_type.css
│   ├── App.jsx
│   └── main.jsx       # Vite entry
├── public/
│   └── assets/photos/ # Statiske bilder (kopieres direkte til dist/)
├── scripts/           # Python-scripts som henter data
│   └── requirements.txt
├── .github/workflows/
│   └── oppdater-data.yml  # Cron-jobb som kjører Python-scripts
├── index.html
├── package.json
├── vite.config.js
└── CLAUDE.md
```

## Konvensjoner
- Norsk (bokmål) i UI-tekst, kommentarer, commits
- Komponenter: PascalCase-filer, én komponent per fil
- Styling: vanlig CSS med variabler i `src/styles/colors_and_type.css`. Ingen Tailwind, ingen CSS-in-JS
- Ingen kommentarer på *hva* koden gjør — kun *hvorfor* når det ikke er åpenbart
- Test endringer lokalt med `npm run dev` før push

## Deploy
- Push til `main` → Render bygger og deployer automatisk
- Render-innstillinger: Build Command `npm run build`, Publish Directory `dist`

## Eksterne avhengigheter (oppdater etterhvert)
- **Render Static Site:** visitkvamskogen.onrender.com
- **GitHub repo:** github.com/naessrobert-ui/visitkvamskogen
- **Supabase-prosjekt:** (legg inn URL når opprettet)
- **Datakilder (planlagt):** MET/yr.no (vær), Skisporet.no (preparering), Statens kartverk (kart-tiles)

## Når du starter en ny sesjon
1. Les siste commits: `git log --oneline -10`
2. Sjekk hvilken fase vi er i (over)
3. Spør brukeren om mål for sesjonen før du endrer kode