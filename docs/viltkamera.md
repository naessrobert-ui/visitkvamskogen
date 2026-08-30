# Viltkamera på Visit Kvamskogen

Webkamerasiden viser to automatiske fjellkameraer:

- `Viltkamera` i avsenderfeltet lagres som `modalen` og vises som **Mødalen**.
- `Viltkamera2` i avsenderfeltet lagres som `byrkjefjell` og vises som **Mot Byrkjefjell**.

Kameraene sender e-post omtrent én gang i timen. GitHub Actions kontrollerer innboksen på minutt 13 og 43 hver time, lagrer nye bildevedlegg i Supabase Storage og registrerer metadata i `wildlife_camera_images`. Nettleseren kontrollerer Supabase på nytt hver halvtime mens webkamerasiden er åpen.

Mødalen-bildet korrigeres 1,5 grader med klokken i frontend. Verdien ligger i `WILDLIFE_CAMERA_DEFINITIONS` i `src/lib/wildlifeCameras.js`.

## Oppsett

1. Kjør `supabase/wildlife_camera.sql` i Supabase SQL Editor.
2. Legg Gmail-adresse, Google-app-passord, Supabase-URL og service role-nøkkel inn som GitHub Actions secrets slik README beskriver.
3. Legg `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` inn i Render.
4. Kjør workflowen `Hent viltkamerabilder` manuelt for første test.

Emnefeltet `VILTKAMERA: <kamera-id>` kan fortsatt brukes som en eksplisitt overstyring. Ukjente avsendere uten dette emnet legges på `kamera-01` og vises ikke offentlig før de er knyttet til et kjent kamera.

Jobben ser 30 dager tilbake og bruker kombinasjonen av e-postens Message-ID og vedleggsnummer for å unngå duplikater. Service role-nøkkelen brukes bare i GitHub Actions og skal aldri ligge i frontend eller Git-historikken.
