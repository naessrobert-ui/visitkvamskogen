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
    const moderatorEmail = Deno.env.get('MODERATOR_EMAIL') || Deno.env.get('ADMIN_EMAIL');

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !moderatorEmail) {
      return new Response(JSON.stringify({
        error: 'Moderasjonsfunksjonen mangler miljovariabler.',
        missing: {
          supabaseUrl: !supabaseUrl,
          serviceRoleKey: !serviceRoleKey,
          resendApiKey: !resendApiKey,
          moderatorEmail: !moderatorEmail,
        },
      }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const listingResponse = await fetch(`${supabaseUrl}/rest/v1/marketplace_listings?id=eq.${listingId}&select=id,title,category,listing_type,price,area,address,map_url,description,contact_name,contact_email,contact_phone,status,moderation_token,created_at`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const listings = await listingResponse.json();
    const listing = listings?.[0];

    if (!listing || !listing.moderation_token) {
      return new Response(JSON.stringify({ error: 'Fant ikke annonse for moderering.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // Varsle kun for annonser som faktisk venter på godkjenning. Hindrer misbruk.
    if (listing.status !== 'pending') {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: jsonHeaders,
      });
    }

    const approveUrl = new URL(origin);
    approveUrl.searchParams.set('moderer', listing.id);
    approveUrl.searchParams.set('token', listing.moderation_token);
    approveUrl.searchParams.set('handling', 'godkjenn');

    const rejectUrl = new URL(origin);
    rejectUrl.searchParams.set('moderer', listing.id);
    rejectUrl.searchParams.set('token', listing.moderation_token);
    rejectUrl.searchParams.set('handling', 'avvis');

    const emailResponse = await sendEmail({
      resendApiKey,
      fromEmail,
      to: moderatorEmail,
      subject: `Ny annonse til godkjenning: ${listing.title}`,
      html: `
        <h1>Ny annonse venter på godkjenning</h1>
        <p>En annonse er bekreftet via e-post og venter nå på moderering før den publiseres på Kvamskogen Marked.</p>
        <p>
          <a href="${approveUrl.toString()}" style="display:inline-block;padding:10px 18px;background:#1f7a3d;color:#fff;border-radius:6px;text-decoration:none;margin-right:8px;">Godkjenn og publiser</a>
          <a href="${rejectUrl.toString()}" style="display:inline-block;padding:10px 18px;background:#b23a2e;color:#fff;border-radius:6px;text-decoration:none;">Avvis</a>
        </p>
        <hr>
        <p><strong>Tittel:</strong> ${escapeHtml(listing.title)}</p>
        <p><strong>Kategori:</strong> ${escapeHtml(listing.category)}</p>
        <p><strong>Pris:</strong> ${escapeHtml(listing.price || 'Ikke oppgitt')}</p>
        <p><strong>Område:</strong> ${escapeHtml(listing.area || 'Ikke oppgitt')}</p>
        <p><strong>Adresse:</strong> ${escapeHtml(listing.address || 'Ikke oppgitt')}</p>
        <p><strong>Beskrivelse:</strong><br>${escapeHtml(listing.description)}</p>
        <p><strong>Kontakt:</strong> ${escapeHtml(listing.contact_name)} — ${escapeHtml(listing.contact_email)}${listing.contact_phone ? ` — ${escapeHtml(listing.contact_phone)}` : ''}</p>
        ${listing.map_url ? `<p><a href="${escapeHtml(listing.map_url)}">Åpne adressen i Google Maps</a></p>` : ''}
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
