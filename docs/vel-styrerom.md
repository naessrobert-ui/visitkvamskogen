# Kvamskogen Vel – digitalt styrerom

Styrerommet ligger som en egen, isolert inngang på `/vel/`. Forsiden og de øvrige Visit Kvamskogen-funksjonene bruker fortsatt samme bygg og påvirkes ikke av styrerommet.

## Før løsningen tas i bruk

1. Kjør `supabase/vel_styrerom.sql` i SQL Editor i Supabase-prosjektet.
2. Legg `https://visitkvamskogen.no/vel/` til som tillatt redirect-URL under Authentication → URL Configuration.
3. Deploy Edge Functions `send-vel-important-notification` og `send-vel-login-link`.
4. Kontroller at funksjonen har `RESEND_API_KEY` og `RESEND_FROM_EMAIL`. De øvrige Supabase-variablene legges til automatisk.
5. Bygg og deploy nettstedet som normalt.

SQL-filen oppretter en privat Storage-bucket for vedlegg, alle tabellene og tilgangsreglene, og legger inn de sju aktive styre-/varamedlemmene fra den eksisterende styrelisten. Robert er administrator. Administratoren kan redigere medlemslisten direkte fra «Styremedlemmer» i styrerommet.

## Tilgang og sikkerhet

- Supabase oppretter engangslenken, mens den eksisterende Resend-tjenesten leverer e-posten og Supabase oppretter økten når lenken åpnes.
- Innloggingsfunksjonen svarer likt for ukjente adresser og begrenser en godkjent adresse til tre utsendinger per 15 minutter.
- Alle dataoperasjoner sjekkes på serversiden mot e-postadressen i `vel_members`.
- En innlogget bruker som ikke står i medlemslisten får ingen rader fra databasen og ingen tilgang til vedlegg.
- Vedlegg ligger i en privat bucket og åpnes med kortlivede, signerte lenker.
- E-postfunksjonen bekrefter både innlogging, medlemskap og at saken faktisk er merket Viktig før den sender.
- Samme Viktig-hendelse logges og sendes bare én gang.

## Første versjon

- Magic-link-innlogging for forhåndsgodkjente e-postadresser
- Saksoversikt med Normal/Viktig
- Kommentarer og private vedlegg på sak og kommentar
- Automatisk e-post ved ny viktig sak eller når en sak endres til Viktig
- Styremøter med dato, tid, sted og innmeldingsfrist
- Automatisk agenda fra saker som er knyttet til møtet
- Status og konklusjon/vedtak på hver sak
- Oppgaver med ansvarlig, frist og ferdigmarkering
- Administratorvisning for å legge til, redigere, aktivere og deaktivere styremedlemmer
- Mobiltilpasset navigasjon og skjemaer
