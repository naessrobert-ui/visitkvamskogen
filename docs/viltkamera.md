# Viltkamera på Visit Kvamskogen

Webkamerasiden kan vise siste bilde fra viltkameraet når miljøvariabelen `VITE_WILDLIFE_CAMERA_URL` peker til en offentlig bildeadresse.

Eksempel:

```env
VITE_WILDLIFE_CAMERA_URL=https://example.com/viltkamera/latest.jpg
```

Frontend legger automatisk til en tidsparameter og forsøker å hente bildet på nytt hvert femte minutt, slik at nettleserbuffer ikke viser et gammelt bilde.

## Neste steg

Hunter Delta 4G støtter FTP/e-post, men ikke direkte HTTPS-opplasting til Vite-appen. Bildet må derfor først havne i en stabil lagringsløsning med offentlig URL. Aktuelle løsninger er:

1. FTP-mottak som kopierer siste bilde til en offentlig adresse.
2. E-postmottak som henter vedlegg og lagrer siste bilde.
3. En separat liten tjeneste eller lagringsbøtte foran nettsiden.

Render sin lokale disk bør ikke brukes som permanent bildelager uten vedvarende disk, fordi filer ellers kan forsvinne ved ny deploy eller omstart.
