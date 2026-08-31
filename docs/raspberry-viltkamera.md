# Viltkameraimport på Raspberry Pi

Raspberry Pi kjører bildehenteren kl. 06:10–23:10 norsk tid. Første kjøring undersøker de siste 30 dagene i innboksen. Deretter lagres siste behandlede Gmail-UID lokalt, slik at senere kjøringer bare laster ned nye e-poster.

## Forutsetninger

- Raspberry Pi OS med Python 3 og internettilgang
- tofaktorautentisering og et app-passord på Gmail-kontoen
- Supabase prosjekt-URL
- helst en egen Supabase secret key med navn som `raspberry-viltkamera`

Supabase secret key har full datatilgang og omgår RLS. Raspberry-en må være en enhet du kontrollerer fysisk. Nøkkelen skal bare ligge i den låste miljøfilen, aldri i repoet eller i terminalhistorikken.

## Installering

Klon repoet på Raspberry-en og installer filene:

```bash
git clone https://github.com/naessrobert-ui/visitkvamskogen.git
cd visitkvamskogen
sudo bash scripts/raspberry/install-viltkamera.sh
```

Åpne den private miljøfilen:

```bash
sudoedit /etc/visitkvamskogen/viltkamera.env
```

Fyll inn:

```ini
GMAIL_ADDRESS=visitkvamskogen.camera@gmail.com
GMAIL_APP_PASSWORD=app-passordet-uten-mellomrom
SUPABASE_URL=https://prosjekt-id.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

La de øvrige innstillingene stå. Dersom prosjektet ennå ikke har en `sb_secret_`-nøkkel, kan den gamle `SUPABASE_SERVICE_ROLE_KEY` brukes midlertidig.

Aktiver timeren:

```bash
sudo bash scripts/raspberry/install-viltkamera.sh --enable
```

Installeringen kopierer programfilene til `/opt/visitkvamskogen`, men overskriver aldri en eksisterende miljøfil.

## Test og drift

Kjør en import med én gang:

```bash
sudo systemctl start hent-viltkamerabilder.service
sudo journalctl -u hent-viltkamerabilder.service -n 100 --no-pager
```

Kontroller neste planlagte kjøring:

```bash
systemctl list-timers hent-viltkamerabilder.timer
```

Timeren har `Persistent=true`. Etter strømbrudd eller omstart kjøres en uteblitt import så snart maskinen er tilbake. Samme service kan ikke kjøre parallelt med seg selv.

Oppdater programmet senere med:

```bash
cd visitkvamskogen
git pull
sudo bash scripts/raspberry/install-viltkamera.sh --enable
```

## GitHub Actions som reserve

La den planlagte GitHub-jobben gå til Raspberry-en har kjørt stabilt i minst ett døgn. Deretter kan `schedule` og `push` fjernes fra `.github/workflows/hent-viltkamerabilder.yml`, mens `workflow_dispatch` beholdes for manuell reservekjøring.

Ikke la GitHub og Raspberry kjøre fast samtidig over tid. De beskytter mot duplikater, men samtidig opplasting av samme nye bilde kan likevel gi en midlertidig konflikt.

## Hvorfor ikke Gmail-push?

Pushvarselet i Gmail-appen kan ikke starte et program på Raspberry-en. Gmail API har en egen pushmekanisme gjennom Google Cloud Pub/Sub, men den krever OAuth, Cloud-oppsett og fornyelse av `watch` minst hver sjuende dag. Google anbefaler også periodisk synkronisering som reserve fordi varsler i sjeldne tilfeller kan forsinkes eller falle bort.

For bilder én gang i timen er systemd-timeren enklere, rimeligere og lettere å feilsøke. Dersom behovet senere blir bilder i sanntid, kan IMAP IDLE vurderes før Pub/Sub.

- [Gmail API push notifications](https://developers.google.com/workspace/gmail/api/guides/push)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
