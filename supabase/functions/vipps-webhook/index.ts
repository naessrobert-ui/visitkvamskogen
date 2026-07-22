// Tar imot betalingsbekreftelse fra Vipps og oppdaterer donasjonen til «betalt».
// Registreres som webhook i Vipps (Webhooks API) mot payment-hendelser.
// Miljøvariabler (Supabase-secrets):
//   VIPPS_BASE_URL, VIPPS_CLIENT_ID, VIPPS_CLIENT_SECRET, VIPPS_SUBSCRIPTION_KEY, VIPPS_MSN
//   VIPPS_WEBHOOK_SECRET   (fra webhook-registreringen — brukes til å verifisere signatur)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// VIKTIG: signaturverifiseringen under MÅ ferdigstilles mot Vipps' faktiske
// webhook-signaturskjema før produksjon. Uten den kan hvem som helst kalle
// endepunktet og markere donasjoner som betalt.

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

const hentAccessToken = async (base: string, clientId: string, clientSecret: string, subKey: string) => {
  const res = await fetch(`${base}/accesstoken/get`, {
    method: 'POST',
    headers: {
      client_id: clientId,
      client_secret: clientSecret,
      'Ocp-Apim-Subscription-Key': subKey,
    },
  });
  if (!res.ok) throw new Error(`Vipps token feilet: ${res.status}`);
  return (await res.json()).access_token as string;
};

const oppdaterDonasjon = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  referanse: string,
  status: string,
) => {
  const body: Record<string, unknown> = { status };
  if (status === 'betalt') body.betalt_at = new Date().toISOString();
  body.updated_at = new Date().toISOString();

  await fetch(`${supabaseUrl}/rest/v1/donasjoner?vipps_referanse=eq.${referanse}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Kun POST.' }), { status: 405, headers: jsonHeaders });
  }

  try {
    const rå = await req.text();

    // TODO(produksjon): verifiser Vipps-signaturen med VIPPS_WEBHOOK_SECRET her,
    // og avvis med 401 hvis den ikke stemmer, før noe oppdateres.

    const event = JSON.parse(rå);
    const referanse: string | undefined = event.reference;
    const navn: string = String(event.name || event.eventType || '').toUpperCase();

    if (!referanse) {
      return new Response(JSON.stringify({ error: 'Mangler referanse.' }), { status: 400, headers: jsonHeaders });
    }

    const base = Deno.env.get('VIPPS_BASE_URL')!;
    const clientId = Deno.env.get('VIPPS_CLIENT_ID')!;
    const clientSecret = Deno.env.get('VIPPS_CLIENT_SECRET')!;
    const subKey = Deno.env.get('VIPPS_SUBSCRIPTION_KEY')!;
    const msn = Deno.env.get('VIPPS_MSN')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (navn.includes('AUTHORIZED')) {
      // Reserverte midler må trekkes (capture) for at pengene faktisk kommer inn.
      const token = await hentAccessToken(base, clientId, clientSecret, subKey);
      const detalj = await fetch(`${base}/epayment/v1/payments/${referanse}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Ocp-Apim-Subscription-Key': subKey,
          'Merchant-Serial-Number': msn,
        },
      });
      const info = await detalj.json();
      const value = info?.amount?.value;

      await fetch(`${base}/epayment/v1/payments/${referanse}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Ocp-Apim-Subscription-Key': subKey,
          'Merchant-Serial-Number': msn,
          'Idempotency-Key': crypto.randomUUID(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modificationAmount: { currency: 'NOK', value } }),
      });

      await oppdaterDonasjon(supabaseUrl, serviceRoleKey, referanse, 'betalt');
    } else if (navn.includes('ABORTED') || navn.includes('CANCELLED') || navn.includes('EXPIRED')) {
      await oppdaterDonasjon(supabaseUrl, serviceRoleKey, referanse, 'avbrutt');
    } else if (navn.includes('FAILED') || navn.includes('TERMINATED')) {
      await oppdaterDonasjon(supabaseUrl, serviceRoleKey, referanse, 'feilet');
    }

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Ukjent feil.' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
