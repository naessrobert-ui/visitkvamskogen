const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json; charset=utf-8',
};

type RequestBody = {
  listingId?: string;
  origin?: string;
};

const escapeHtml = (value: unknown) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const sendEmail = async ({
  resendApiKey,
  fromEmail,
  to,
  subject,
  html,
}: {
  resendApiKey: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
}) => fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${resendApiKey}`,
    'Content-Type': 'application/json; charset=utf-8',
  },
  body: JSON.stringify({
    from: fromEmail,
    to,
    subject,
    html,
  }),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { listingId, origin } = await req.json() as RequestBody;
    if (!listingId || !origin) {
      return new Response(JSON.stringify({ error: 'Mangler annonse eller origin.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Visit Kvamskogen <noreply@visitkvamskogen.no>';

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: 'E-postfunksjonen mangler miljovariabler.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const listingResponse = await fetch(`${supabaseUrl}/rest/v1/marketplace_listings?id=eq.${listingId}&select=id,title,category,listing_type,price,area,address,description,contact_name,contact_email,contact_phone,status,contact_verification_token,created_at`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const listings = await listingResponse.json();
    const listing = listings?.[0];

    if (!listing || !listing.contact_email || !listing.contact_verification_token) {
      return new Response(JSON.stringify({ error: 'Fant ikke annonse for varsling.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const verifyUrl = new URL(origin);
    verifyUrl.searchParams.set('bekreft-annonse', listing.id);
    verifyUrl.searchParams.set('token', listing.contact_verification_token);

    const editUrl = new URL(origin);
    editUrl.searchParams.set('annonse', listing.id);
    editUrl.searchParams.set('token', listing.contact_verification_token);

    const emailResponse = await sendEmail({
      resendApiKey,
      fromEmail,
      to: listing.contact_email,
      subject: `Bekreft annonse: ${listing.title}`,
      html: `
        <h1>Bekreft annonsen din</h1>
        <p>Trykk på lenken under for å bekrefte e-postadressen din og publisere annonsen på Kvamskogen Marked.</p>
        <p><a href="${verifyUrl.toString()}">Bekreft annonsen</a></p>
        <p>Du kan bruke denne private lenken for å endre annonsen senere:</p>
        <p><a href="${editUrl.toString()}">${editUrl.toString()}</a></p>
        <hr>
        <p><strong>Tittel:</strong> ${escapeHtml(listing.title)}</p>
        <p><strong>Kategori:</strong> ${escapeHtml(listing.category)}</p>
        <p><strong>Pris:</strong> ${escapeHtml(listing.price || 'Ikke oppgitt')}</p>
        <p><strong>Område:</strong> ${escapeHtml(listing.area || 'Ikke oppgitt')}</p>
        <p><strong>Adresse:</strong> ${escapeHtml(listing.address || 'Ikke oppgitt')}</p>
      `,
    });

    if (!emailResponse.ok) {
      const text = await emailResponse.text();
      return new Response(JSON.stringify({ error: 'Kunne ikke sende e-post.', details: text }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: jsonHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Ukjent feil.' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
