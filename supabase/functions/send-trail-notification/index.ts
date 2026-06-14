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

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: 'E-postfunksjonen mangler miljovariabler.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const suggestionResponse = await fetch(`${supabaseUrl}/rest/v1/trail_suggestions?id=eq.${suggestionId}&select=id,title,area,season,level,duration,distance,description,contact_name,contact_email,status,contact_verification_token,created_at`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const suggestions = await suggestionResponse.json();
    const suggestion = suggestions?.[0];

    if (!suggestion || !suggestion.contact_email || !suggestion.contact_verification_token) {
      return new Response(JSON.stringify({ error: 'Fant ikke turforslag for varsling.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const verifyUrl = new URL(origin);
    verifyUrl.searchParams.set('bekreft-tur', suggestion.id);
    verifyUrl.searchParams.set('token', suggestion.contact_verification_token);

    const emailResponse = await sendEmail({
      resendApiKey,
      fromEmail,
      to: suggestion.contact_email,
      subject: `Bekreft turforslag: ${suggestion.title}`,
      html: `
        <h1>Bekreft turforslaget ditt</h1>
        <p>Trykk på lenken under for å bekrefte e-postadressen din. Turforslaget blir gjennomgått av en moderator før det publiseres på Visit Kvamskogen.</p>
        <p><a href="${verifyUrl.toString()}">Bekreft turforslaget</a></p>
        <hr>
        <p><strong>Tittel:</strong> ${escapeHtml(suggestion.title)}</p>
        <p><strong>Startsted:</strong> ${escapeHtml(suggestion.area || 'Ikke oppgitt')}</p>
        <p><strong>Sesong:</strong> ${escapeHtml(suggestion.season || 'Ikke oppgitt')}</p>
        <p><strong>Vanskelighetsgrad:</strong> ${escapeHtml(suggestion.level || 'Ikke oppgitt')}</p>
        <p><strong>Lengde:</strong> ${escapeHtml(suggestion.distance || 'Ikke oppgitt')}</p>
        <p><strong>Tidsbruk:</strong> ${escapeHtml(suggestion.duration || 'Ikke oppgitt')}</p>
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
