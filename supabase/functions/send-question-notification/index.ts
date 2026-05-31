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
  questionId?: string;
  origin?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { activityId, questionId, origin } = await req.json() as RequestBody;
    if (!activityId || !questionId || !origin) {
      return new Response(JSON.stringify({ error: 'Mangler aktivitet, spørsmål eller origin.' }), {
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

    const questionResponse = await fetch(`${supabaseUrl}/rest/v1/activity_questions?id=eq.${questionId}&activity_id=eq.${activityId}&select=id,question,asker_name`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const questions = await questionResponse.json();
    const question = questions?.[0];

    if (!activity || activity.status !== 'published' || !activity.email || !question) {
      return new Response(JSON.stringify({ error: 'Fant ikke aktivitet eller spørsmål for varsling.' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const organizerUrl = new URL(origin);
    organizerUrl.searchParams.set('arrangor', activity.id);
    organizerUrl.searchParams.set('token', activity.organizer_verification_token);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: activity.email,
        subject: `Nytt spørsmål: ${activity.title}`,
        html: `
          <h1>Nytt spørsmål til aktiviteten din</h1>
          <p><strong>${question.asker_name || 'En bruker'} spør:</strong></p>
          <p>${question.question}</p>
          <p>Du kan svare i arrangørpanelet:</p>
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
