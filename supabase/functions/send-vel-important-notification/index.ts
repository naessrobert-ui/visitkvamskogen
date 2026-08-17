const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' };

type RequestBody = { caseId?: string; notificationKey?: string; origin?: string };
type Member = { id: string; email: string; name: string; active: boolean };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });
const escapeHtml = (value: unknown) => String(value || '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const trustedOrigin = (value?: string) => {
  try {
    const url = new URL(value || '');
    const trusted = url.hostname === 'visitkvamskogen.no'
      || url.hostname === 'www.visitkvamskogen.no'
      || url.hostname.endsWith('.onrender.com')
      || url.hostname === 'localhost'
      || url.hostname === '127.0.0.1';
    return trusted ? url.origin : 'https://visitkvamskogen.no';
  } catch (_) {
    return 'https://visitkvamskogen.no';
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metoden er ikke tillatt.' }, 405);

  try {
    const { caseId, notificationKey: rawKey, origin } = await req.json() as RequestBody;
    if (!caseId) return json({ error: 'Mangler saks-ID.' }, 400);
    const notificationKey = /^[a-z0-9-]{1,80}$/.test(rawKey || '') ? rawKey! : 'important';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Kvamskogen Vel <noreply@visitkvamskogen.no>';
    const authorization = req.headers.get('Authorization');
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendApiKey) return json({ error: 'E-postfunksjonen mangler miljøvariabler.' }, 500);
    if (!authorization) return json({ error: 'Du må være innlogget.' }, 401);

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
    if (!userResponse.ok) return json({ error: 'Innloggingen er ikke gyldig.' }, 401);
    const user = await userResponse.json();

    const serviceHeaders = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
    const membersResponse = await fetch(`${supabaseUrl}/rest/v1/vel_members?active=eq.true&select=id,email,name,active`, { headers: serviceHeaders });
    if (!membersResponse.ok) return json({ error: 'Kunne ikke lese medlemslisten.' }, 500);
    const members = await membersResponse.json() as Member[];
    const sender = members.find((member) => member.email.toLowerCase() === String(user.email || '').toLowerCase());
    if (!sender) return json({ error: 'E-postadressen har ikke tilgang til styrerommet.' }, 403);

    const caseResponse = await fetch(`${supabaseUrl}/rest/v1/vel_cases?id=eq.${encodeURIComponent(caseId)}&select=id,title,description,priority,created_by`, { headers: serviceHeaders });
    if (!caseResponse.ok) return json({ error: 'Kunne ikke lese saken.' }, 500);
    const caseItem = (await caseResponse.json())?.[0];
    if (!caseItem) return json({ error: 'Fant ikke saken.' }, 404);
    if (caseItem.priority !== 'important') return json({ error: 'Bare viktige saker skal varsles.' }, 409);

    const existingResponse = await fetch(`${supabaseUrl}/rest/v1/vel_notifications?case_id=eq.${encodeURIComponent(caseId)}&notification_key=eq.${encodeURIComponent(notificationKey)}&select=id,delivery_status&limit=1`, { headers: serviceHeaders });
    const existing = existingResponse.ok ? await existingResponse.json() : [];
    if (existing.length) {
      if (existing[0].delivery_status === 'accepted') return json({ ok: true, alreadySent: true });
      return json({ error: 'Det finnes allerede et utsendingsforsøk i e-postloggen. Kontroller loggen før du prøver igjen.' }, 409);
    }

    const author = members.find((member) => member.id === caseItem.created_by) || sender;
    const caseUrl = new URL('/vel/', trustedOrigin(origin));
    caseUrl.searchParams.set('sak', caseItem.id);
    const excerpt = String(caseItem.description || '').trim().slice(0, 500);
    const subject = `Viktig sak: ${caseItem.title}`;
    const bodyText = `NY VIKTIG SAK · KVAMSKOGEN VEL\n\n${caseItem.title}\n\n${author.name} har publisert en viktig sak i styrerommet.\n\n${excerpt}${String(caseItem.description || '').length > 500 ? '…' : ''}\n\nÅpne saken: ${caseUrl.toString()}\n\nDu får denne e-posten fordi du er registrert som styre- eller varamedlem i Kvamskogen Vel.`;
    const html = `
      <div style="font-family:Arial,sans-serif;color:#14171a;line-height:1.6;max-width:620px;margin:auto">
        <p style="color:#8e2a1f;font-size:12px;font-weight:700;letter-spacing:.08em">NY VIKTIG SAK · KVAMSKOGEN VEL</p>
        <h1 style="color:#0f2a22;font-size:28px;line-height:1.2">${escapeHtml(caseItem.title)}</h1>
        <p>${escapeHtml(author.name)} har publisert en viktig sak i styrerommet.</p>
        <p style="padding:16px;background:#f4f1e9;border-left:3px solid #b23a2c">${escapeHtml(excerpt)}${String(caseItem.description || '').length > 500 ? '…' : ''}</p>
        <p><a href="${caseUrl.toString()}" style="display:inline-block;padding:12px 18px;background:#1e4d3f;color:white;text-decoration:none;border-radius:6px">Åpne saken</a></p>
        <p style="color:#5c6770;font-size:12px">Du får denne e-posten fordi du er registrert som styre- eller varamedlem i Kvamskogen Vel.</p>
      </div>`;

    const results = await Promise.all(members.map(async (member) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ from: fromEmail, to: member.email, subject, html }),
      });
      let providerId = '';
      try { providerId = String((await response.json())?.id || ''); } catch (_) { providerId = ''; }
      return { email: member.email, ok: response.ok, providerId };
    }));
    const accepted = results.filter((result) => result.ok);
    const failed = results.filter((result) => !result.ok);
    const deliveryStatus = failed.length ? (accepted.length ? 'partial' : 'failed') : 'accepted';

    const logResponse = await fetch(`${supabaseUrl}/rest/v1/vel_notifications?on_conflict=case_id,notification_key`, {
      method: 'POST',
      headers: { ...serviceHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        case_id: caseId,
        notification_key: notificationKey,
        recipient_count: accepted.length,
        subject,
        body_text: bodyText,
        recipient_emails: accepted.map((result) => result.email),
        failed_recipient_emails: failed.map((result) => result.email),
        provider_message_ids: accepted.map((result) => result.providerId).filter(Boolean),
        delivery_status: deliveryStatus,
      }),
    });
    if (!logResponse.ok && logResponse.status !== 409) return json({ error: 'E-posten ble sendt, men loggen kunne ikke oppdateres.' }, 500);
    if (failed.length) return json({ error: `${accepted.length} av ${members.length} e-poster ble godtatt. Kontroller e-postloggen.` }, 502);
    return json({ ok: true, recipients: accepted.length });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Ukjent feil.' }, 500);
  }
});
