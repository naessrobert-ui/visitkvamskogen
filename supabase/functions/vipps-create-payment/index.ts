// Starter en Vipps ePayment-betaling for bro-kampanjen.
// Krever Vipps «Vipps på nett»-avtale. Miljøvariabler settes som Supabase-secrets:
//   VIPPS_BASE_URL            (test: https://apitest.vippsmobilepay.com, prod: https://api.vippsmobilepay.com)
//   VIPPS_CLIENT_ID
//   VIPPS_CLIENT_SECRET
//   VIPPS_SUBSCRIPTION_KEY    (Ocp-Apim-Subscription-Key)
//   VIPPS_MSN                 (Merchant Serial Number / salgsenhet)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json; charset=utf-8',
};

type RequestBody = {
  belop?: number;
  dekkerMedlemskap?: boolean;
  navn?: string | null;
  epost?: string | null;
  origin?: string;
};

const hentAccessToken = async (base: string, clientId: string, clientSecret: string, subKey: string) => {
  const res = await fetch(`${base}/accesstoken/get`, {
    method: 'POST',
    headers: {
      client_id: clientId,
      client_secret: clientSecret,
      'Ocp-Apim-Subscription-Key': subKey,
    },
  });
  if (!res.ok) throw new Error(`Vipps token feilet: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { belop, dekkerMedlemskap, navn, epost, origin } = await req.json() as RequestBody;

    const kroner = Math.round(Number(belop));
    if (!kroner || kroner < 1) {
      return new Response(JSON.stringify({ error: 'Ugyldig beløp.' }), { status: 400, headers: jsonHeaders });
    }
    if (!origin) {
      return new Response(JSON.stringify({ error: 'Mangler origin.' }), { status: 400, headers: jsonHeaders });
    }

    const base = Deno.env.get('VIPPS_BASE_URL');
    const clientId = Deno.env.get('VIPPS_CLIENT_ID');
    const clientSecret = Deno.env.get('VIPPS_CLIENT_SECRET');
    const subKey = Deno.env.get('VIPPS_SUBSCRIPTION_KEY');
    const msn = Deno.env.get('VIPPS_MSN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!base || !clientId || !clientSecret || !subKey || !msn || !supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Vipps-funksjonen mangler miljøvariabler.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const referanse = `bro-${crypto.randomUUID()}`;

    // Lagre donasjonen som «opprettet» før vi sender brukeren til Vipps.
    const insert = await fetch(`${supabaseUrl}/rest/v1/donasjoner`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        belop: kroner,
        dekker_medlemskap: Boolean(dekkerMedlemskap),
        giver_navn: navn || null,
        giver_epost: epost || null,
        status: 'opprettet',
        vipps_referanse: referanse,
      }),
    });
    if (!insert.ok) {
      return new Response(JSON.stringify({ error: 'Kunne ikke lagre donasjon.', details: await insert.text() }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const accessToken = await hentAccessToken(base, clientId, clientSecret, subKey);

    const returnUrl = new URL(origin);
    returnUrl.search = `?bro-takk=${referanse}`;
    returnUrl.hash = '#/loypebidrag';

    const paymentRes = await fetch(`${base}/epayment/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': subKey,
        'Merchant-Serial-Number': msn,
        'Idempotency-Key': crypto.randomUUID(),
        'Vipps-System-Name': 'visitkvamskogen',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: { currency: 'NOK', value: kroner * 100 },
        paymentMethod: { type: 'WALLET' },
        reference: referanse,
        returnUrl: returnUrl.toString(),
        userFlow: 'WEB_REDIRECT',
        paymentDescription: 'Bidrag til nye broer — Kvamskogen Vel',
      }),
    });

    if (!paymentRes.ok) {
      return new Response(JSON.stringify({ error: 'Vipps avviste betalingen.', details: await paymentRes.text() }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const payment = await paymentRes.json();
    return new Response(JSON.stringify({ redirectUrl: payment.redirectUrl, reference: referanse }), {
      headers: jsonHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Ukjent feil.' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
