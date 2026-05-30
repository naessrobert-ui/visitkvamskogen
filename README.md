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
