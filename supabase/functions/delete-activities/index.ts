const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json; charset=utf-8',
};

type RequestBody = {
  activityIds?: string[];
  code?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { activityIds, code } = await req.json() as RequestBody;
    const adminCode = Deno.env.get('ADMIN_ACTIVITY_DELETE_CODE');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!adminCode || !supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Slettefunksjonen mangler miljovariabler.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    if (!code || code !== adminCode) {
      return new Response(JSON.stringify({ error: 'Feil adminkode.' }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const ids = [...new Set(activityIds || [])].filter((id) => uuidPattern.test(id));
    if (!ids.length) {
      return new Response(JSON.stringify({ error: 'Ingen gyldige aktiviteter valgt.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const encodedIds = ids.map((id) => encodeURIComponent(id)).join(',');
    const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/activities?id=in.(${encodedIds})`, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'return=representation',
      },
    });

    if (!deleteResponse.ok) {
      const text = await deleteResponse.text();
      return new Response(JSON.stringify({ error: 'Kunne ikke slette aktiviteter.', details: text }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const deleted = await deleteResponse.json();
    return new Response(JSON.stringify({
      ok: true,
      deletedIds: deleted.map((activity: { id: string }) => activity.id),
    }), {
      headers: jsonHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Ukjent feil.' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
