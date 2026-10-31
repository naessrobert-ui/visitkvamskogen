# Føremeldinger fra telefon på /loype

Siden leser publiserte meldinger fra telefonserverens
`GET /api/kvamskogen/reports`. Den oppdaterer hvert minutt og viser
observasjonstid og publiseringstid i Europe/Oslo. Meldinger eldre enn ett døgn
merkes tydelig. Tidligere meldinger beholdes som historikk; de er ikke en
samlet fasit for alle løypene på Kvamskogen.

## Aktivering

1. Rull ut Kvamskogen-endringen i `naessrobert-ui/ecocar-voice`.
2. Sett `KVAMSKOGEN_REPORT_CODE` på telefonserveren i Render til den avtalte
   koden. Kontroller at `DATABASE_PATH` peker på varig disk. Koden skal aldri
   ligge i Visit Kvamskogens kode, byggvariabler eller offentlige filer.
3. Åpne telefonserverens `/api/kvamskogen/reports`. Den skal svare med JSON,
   eksempelvis `{"reports":[]}` før første melding er publisert.
4. I dette GitHub-repoet: Settings → Secrets and variables → Actions →
   **Variables** → New repository variable. Navn: `VITE_LOYPE_API_URL`.
   Verdi: telefonserverens HTTPS-grunnadresse, uten avsluttende `/api/...`.
   Dette er en offentlig adresse, ingen nøkkel.
5. Rull ut denne endringen på `main`, eller kjør workflowen «Bygg og prerender
   for søkemotorer» på nytt når variabelen er satt. Den bygger til `render-dist`,
   som Render publiserer fra. Ved direkte Render-bygg må variabelen i stedet
   settes i Render før nytt bygg.
6. Åpne `https://visitkvamskogen.no/loype`. Kontroller tomtilstanden, ring dagens
   nummer og prøv en melding med opplesing og bekreftelse. Verifiser at teksten
   vises og at ingen rapport kommer til Ecocar.

Lokalt settes `VITE_LOYPE_API_URL` i en privat `.env.local`, og `npm run dev`
brukes. Ingen PIN eller andre hemmeligheter kreves for å lese meldinger.

Meldingene publiseres ved at agenten lager utkast, leser teksten ordrett og
får en ny tydelig bekreftelse. Feil trekkes tilbake gjennom telefonserverens
beskyttede admin-API. Det offentlige lese-API-et gir aldri tilgang til
innringernummer, samtaletranskripsjoner, kode eller Ecocars kunderegister.
