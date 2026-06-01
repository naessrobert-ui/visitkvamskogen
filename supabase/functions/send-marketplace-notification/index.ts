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
    const adminEmail = Deno.env.get('MARKETPLACE_ADMIN_EMAIL') || Deno.env.get('ADMIN_EMAIL');

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !adminEmail) {
      return new Response(JSON.stringify({ error: 'E-postfunksjonen mangler miljøvariabler.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const listingResponse = await fetch(`${supabaseUrl}/rest/v1/marketplace_listings?id=eq.${listingId}&select=id,title,category,listing_type,price,area,address,description,contact_name,contact_email,contact_phone,status,created_at`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const listings = await listingResponse.json();
    const listing = listings?.[0];

    if (!listing || listing.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Fant ikke annonse for varsling.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const marketUrl = new URL(origin);
    marketUrl.hash = 'marked';

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: adminEmail,
        subject: `Ny markedsannonse: ${listing.title}`,
        html: `
          <h1>Ny annonse på Kvamskogen Marked</h1>
          <p><strong>Tittel:</strong> ${escapeHtml(listing.title)}</p>
          <p><strong>Kategori:</strong> ${escapeHtml(listing.category)}</p>
          <p><strong>Type:</strong> ${escapeHtml(listing.listing_type)}</p>
          <p><strong>Pris:</strong> ${escapeHtml(listing.price || 'Ikke oppgitt')}</p>
          <p><strong>Område:</strong> ${escapeHtml(listing.area || 'Ikke oppgitt')}</p>
          <p><strong>Adresse:</strong> ${escapeHtml(listing.address || 'Ikke oppgitt')}</p>
          <p><strong>Beskrivelse:</strong><br>${escapeHtml(listing.description)}</p>
          <hr>
          <p><strong>Innsender:</strong> ${escapeHtml(listing.contact_name)}</p>
          <p><strong>E-post:</strong> ${escapeHtml(listing.contact_email)}</p>
          <p><strong>Telefon:</strong> ${escapeHtml(listing.contact_phone || 'Ikke oppgitt')}</p>
          <p>Godkjenn annonsen i Supabase ved å sette status til <code>published</code>.</p>
          <p><a href="${marketUrl.toString()}">Åpne Kvamskogen Marked</a></p>
        `,
      }),
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
