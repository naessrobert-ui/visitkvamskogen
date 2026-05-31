const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json; charset=utf-8',
};

type RequestBody = {
  activityId?: string;
  token?: string;
  origin?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { activityId, token, origin } = await req.json() as RequestBody;
    if (!activityId || !token || !origin) {
      return new Response(JSON.stringify({ error: 'Mangler aktivitet, token eller origin.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Visit Kvamskogen <noreply@visitkvamskogen.no>';

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: 'E-postfunksjonen mangler miljøvariabler.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const activityResponse = await fetch(`${supabaseUrl}/rest/v1/activities?id=eq.${activityId}&select=id,title,email,organizer_verification_token,status`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const activities = await activityResponse.json();
    const activity = activities?.[0];

    if (!activity || activity.organizer_verification_token !== token || !activity.email) {
      return new Response(JSON.stringify({ error: 'Fant ikke aktivitet for bekreftelse.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const verifyUrl = new URL(origin);
    verifyUrl.searchParams.set('bekreft', activity.id);
    verifyUrl.searchParams.set('token', token);

    const organizerUrl = new URL(origin);
    organizerUrl.searchParams.set('arrangor', activity.id);
    organizerUrl.searchParams.set('token', token);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: activity.email,
        subject: `Bekreft aktivitet: ${activity.title}`,
        html: `
          <h1>Bekreft aktiviteten din</h1>
          <p>Trykk på lenken under for å publisere aktiviteten på Visit Kvamskogen.</p>
          <p><a href="${verifyUrl.toString()}">Bekreft og publiser aktiviteten</a></p>
          <p>Etterpå kan du bruke arrangørlenken til å se påmeldinger og svare på spørsmål:</p>
          <p><a href="${organizerUrl.toString()}">${organizerUrl.toString()}</a></p>
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
