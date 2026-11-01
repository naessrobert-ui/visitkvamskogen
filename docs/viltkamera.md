# Fjellkamera – tre kameraer fra 1. november 2026

| Avsender | Kamera-ID | Visningsnavn |
| --- | --- | --- |
| getpic (og eldre Viltkamera) | modalen | Utsikt mot Såta |
| viltkamera2 | byrkjefjell | Kvamskogen mot Steinskvanndalen |
| suntekcam / emne CAM004_… | moddalen | Møddalen mot Såta |

Ingen av kameraene beskrives som plassert i Steinskvanndalen. Det opprinnelige Såta-bildet beholder rotasjon på 1,5 grader. Det nye Møddalen-kameraet har ingen rotasjon.

Raspberry Pi henter bilder hver time kl. 06:10–23:10 norsk tid. GitHub Actions er manuell reserve. Nettleseren oppdaterer bildene hver halvtime.

## Aktivering av tredje kamera

Kodeendringen alene oppdaterer ikke Raspberry Pi eller databasens lesepolicy.

Kontroller eksisterende policy i riktig Supabase-prosjekt:

```sql
select policyname, roles, cmd, qual from pg_policies
where schemaname = 'public' and tablename = 'wildlife_camera_images';
```

Utvid den navngitte lesepolicyen fra repoets oppsett:

```sql
alter policy "Offentlig lesing av fjellkamerabilder"
on public.wildlife_camera_images
using (camera_id in ('modalen', 'byrkjefjell', 'moddalen'));
```

Bare kjente kameraer blir synlige. Kolonnerettighetene og RLS beholdes. Ved nytt oppsett brukes `supabase/wildlife_camera.sql`.

Oppdater bildehenteren på Raspberry Pi etter `docs/raspberry-viltkamera.md`. Allerede importerte suntekcam-bilder kan ligge under `byrkjefjell` eller `kamera-01`. Etterkontroll med oppdatert bildehenter retter dem basert på e-postens avsender/emne, uten å laste opp bildene på nytt.

En separat etterkontroll må bruke `/usr/bin/env` etter systemd-miljøfilen for å overstyre `IMAP_STATE_FILE`, `GMAIL_INITIAL_LOOKBACK_DAYS` og `WILDLIFE_RECLASSIFY_SINCE`. `--setenv` alene overstyres av miljøfilen. Velg en startdato som passer kameraets flytting; ikke omklassifiser eldre historikk uten å kontrollere plasseringen.

Ukjente kameraer lagres som `kamera-01`. Nøkler skal bare ligge i den private miljøfilen på Pi-en eller i GitHub Actions secrets, aldri i frontend eller Git-historikken.
