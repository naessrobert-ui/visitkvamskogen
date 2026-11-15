# Innmeldingskampanje for Kvamskogen Vel

`/bli-medlem` tar imot innmeldinger og engangsbetaling på 400 kr. Forsiden oppgir kontingentåret fra serveren. Kvitteringen viser medlemsnummer så snart Vipps har bekreftet trekket. Kvamskogen Vel sender samme nummer på e-post via Resend.

## Oppsett i testmiljø

1. Kjør [`supabase/medlemskampanje.sql`](../supabase/medlemskampanje.sql) i prosjektets SQL Editor etter at `vel_styrerom.sql` er installert. Bruk en egen testdatabase til Vipps-tester, slik at testinnmeldinger får sin egen nummerserie.
2. Distribuer Supabase Edge Function `medlemskap` til testprosjektet. Den bruker funksjonsoppsettet i `supabase/config.toml`. Sett `MEDLEMSKAP_SITE_URL` til adressen til testnettsiden, `MEDLEMSKAP_VIPPS_BASE_URL` til `https://apitest.vipps.no` og `MEDLEMSKAP_VIPPS_CLIENT_ID`, `MEDLEMSKAP_VIPPS_CLIENT_SECRET`, `MEDLEMSKAP_VIPPS_SUBSCRIPTION_KEY` og `MEDLEMSKAP_VIPPS_MSN` til verdiene for salgsenheten i Vipps' testmiljø. E-post bruker `RESEND_API_KEY` og `RESEND_FROM_EMAIL` fra prosjektet.
3. Registrer Vipps-webhooken på `https://<prosjekt>.supabase.co/functions/v1/medlemskap/webhook`. Bruk hendelsene `epayments.payment.authorized.v1`, `epayments.payment.captured.v1`, `epayments.payment.aborted.v1`, `epayments.payment.expired.v1`, `epayments.payment.cancelled.v1`, `epayments.payment.terminated.v1` og `epayments.payment.refunded.v1`. Lagre `secret` fra registreringen som `MEDLEMSKAP_VIPPS_WEBHOOK_SECRET`. Sett `MEDLEMSKAP_WEBHOOK_URL` hvis den registrerte URL-en avviker fra prosjektets standardadresse.
4. Sett `MEDLEMSKAP_KONTINGENTAR` til året medlemskapet skal dekke. Denne innstillingen åpner Vipps-innmelding når betalings- og e-postinnstillingene er på plass. Fjern den for å stenge nye betalinger. Webhook og kvitteringer fortsetter å behandle eksisterende betalinger. Det ordinære innmeldingsskjemaet er tilgjengelig når Vipps-innmelding er stengt.
5. Test vellykket og avbrutt betaling, gjentatt bekreftelse og betaling der nettleseren lukkes før retur. Sjekk at første betalte testinnmelding får 1500 og én e-post. Logg inn i styrerommet som administrator. Velg **Styret → Innmeldingskampanje → Last ned CSV for Excel**. Kontroller at filen bare inneholder innmeldinger med fullt innbetalt kontingent.

## Overføring til StyreWeb

- Hold av medlemsnumrene fra 1500 oppover mens kampanjen pågår. Kontroller serien i StyreWeb før Vipps åpnes for reelle innmeldinger.
- Sammenlign eksporten med StyreWeb-registeret for å fange opp personer som er eller har vært medlemmer. Avstem beløp og Vipps-referanser mot oppgjøret før overføring. Refunderte betalinger tas ut av neste eksport, så avstem også refusjoner som kommer etter at en fil er lastet ned.
- Prøv import med en ny innmelding og en tidligere medlemspost. Verifiser medlemsnummer og betalingsstatus for riktig kontingentår. Manuell registrering av medlemsnummer er allerede prøvd. Samlet import av medlemsnummer og betaling avhenger av StyreWeb.
