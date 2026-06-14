const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json; charset=utf-8',
};

type RequestBody = {
  suggestionId?: string;
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
    const { suggestionId, origin } = await req.json() as RequestBody;
    if (!suggestionId || !origin) {
      return new Response(JSON.stringify({ error: 'Mangler turforslag eller origin.' }), {
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

    const suggestionResponse = await fetch(`${supabaseUrl}/rest/v1/trail_suggestions?id=eq.${suggestionId}&select=id,title,area,season,level,duration,distance,elevation,description,tips,gpx_path,contact_name,contact_email,contact_phone,status,moderation_token,created_at`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const suggestions = await suggestionResponse.json();
    const suggestion = suggestions?.[0];

    if (!suggestion || !suggestion.moderation_token) {
      return new Response(JSON.stringify({ error: 'Fant ikke turforslag for moderering.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // Varsle kun for turforslag som faktisk venter på godkjenning. Hindrer misbruk.
    if (suggestion.status !== 'pending') {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: jsonHeaders,
      });
    }

    const approveUrl = new URL(origin);
    approveUrl.searchParams.set('moderer-tur', suggestion.id);
    approveUrl.searchParams.set('token', suggestion.moderation_token);
    approveUrl.searchParams.set('handling', 'godkjenn');

    const rejectUrl = new URL(origin);
    rejectUrl.searchParams.set('moderer-tur', suggestion.id);
    rejectUrl.searchParams.set('token', suggestion.moderation_token);
    rejectUrl.searchParams.set('handling', 'avvis');

    const gpxUrl = suggestion.gpx_path
      ? `${supabaseUrl}/storage/v1/object/public/trail-gpx/${suggestion.gpx_path}`
      : '';

    const emailResponse = await sendEmail({
      resendApiKey,
      fromEmail,
      to: moderatorEmail,
      subject: `Nytt turforslag til godkjenning: ${suggestion.title}`,
      html: `
        <h1>Nytt turforslag venter på godkjenning</h1>
        <p>Et turforslag er bekreftet via e-post og venter nå på moderering før det publiseres på Visit Kvamskogen.</p>
        <p>
          <a href="${approveUrl.toString()}" style="display:inline-block;padding:10px 18px;background:#1f7a3d;color:#fff;border-radius:6px;text-decoration:none;margin-right:8px;">Godkjenn og publiser</a>
          <a href="${rejectUrl.toString()}" style="display:inline-block;padding:10px 18px;background:#b23a2e;color:#fff;border-radius:6px;text-decoration:none;">Avvis</a>
        </p>
        <hr>
        <p><strong>Tittel:</strong> ${escapeHtml(suggestion.title)}</p>
        <p><strong>Startsted:</strong> ${escapeHtml(suggestion.area || 'Ikke oppgitt')}</p>
        <p><strong>Sesong:</strong> ${escapeHtml(suggestion.season || 'Ikke oppgitt')}</p>
        <p><strong>Vanskelighetsgrad:</strong> ${escapeHtml(suggestion.level || 'Ikke oppgitt')}</p>
        <p><strong>Lengde:</strong> ${escapeHtml(suggestion.distance || 'Ikke oppgitt')}</p>
        <p><strong>Tidsbruk:</strong> ${escapeHtml(suggestion.duration || 'Ikke oppgitt')}</p>
        <p><strong>Stigning:</strong> ${escapeHtml(suggestion.elevation || 'Ikke oppgitt')}</p>
        <p><strong>Beskrivelse:</strong><br>${escapeHtml(suggestion.description)}</p>
        ${suggestion.tips ? `<p><strong>Tips:</strong><br>${escapeHtml(suggestion.tips)}</p>` : ''}
        <p><strong>Kontakt:</strong> ${escapeHtml(suggestion.contact_name)} — ${escapeHtml(suggestion.contact_email)}${suggestion.contact_phone ? ` — ${escapeHtml(suggestion.contact_phone)}` : ''}</p>
        ${gpxUrl ? `<p><a href="${escapeHtml(gpxUrl)}">Last ned GPX-spor</a></p>` : '<p>Ingen GPX-spor lastet opp.</p>'}
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
