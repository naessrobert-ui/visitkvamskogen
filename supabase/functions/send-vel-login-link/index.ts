import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' };
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
    const body = await req.json() as { email?: string; origin?: string; mode?: 'link' | 'code' };
    const email = String(body.email || '').trim().toLowerCase();
    const mode = body.mode === 'code' ? 'code' : 'link';
    if (!email || !email.includes('@')) return json({ error: 'Oppgi en gyldig e-postadresse.' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Kvamskogen Vel <noreply@visitkvamskogen.no>';
    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) return json({ error: 'Innloggingstjenesten er ikke konfigurert.' }, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: member, error: memberError } = await admin
      .from('vel_members')
      .select('id, name, email')
      .eq('email', email)
      .eq('active', true)
      .maybeSingle();
    if (memberError) return json({ error: 'Kunne ikke kontrollere medlemslisten.' }, 500);

    if (!member) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return json({ ok: true });
    }

    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from('vel_login_requests')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', member.id)
      .gte('requested_at', since);
    if (countError) return json({ error: 'Kunne ikke kontrollere utsendingsgrensen.' }, 500);
    if ((count || 0) >= 3) return json({ error: 'Det er allerede sendt flere lenker. Vent 15 minutter før du prøver igjen.' }, 429);

    const redirectTo = new URL('/vel/', trustedOrigin(body.origin)).toString();
    const codePage = new URL('/vel/?kode=1', trustedOrigin(body.origin)).toString();
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: member.email,
      options: { redirectTo },
    });
    const actionLink = linkData?.properties?.action_link;
    const emailOtp = linkData?.properties?.email_otp;
    if (linkError || !actionLink || (mode === 'code' && !emailOtp)) return json({ error: 'Kunne ikke opprette innloggingen.' }, 500);

    const emailSubject = mode === 'code'
      ? 'Din innloggingskode – Kvamskogen Vel'
      : 'Din innloggingslenke – Kvamskogen Vel';
    const loginContent = mode === 'code'
      ? `
            <p>Skriv inn koden under på innloggingssiden. Koden kan bare brukes én gang.</p>
            <p style="background:#eef4f1;border:1px solid #cbdcd5;border-radius:8px;color:#0f2a22;font-size:30px;font-weight:700;letter-spacing:.2em;padding:14px 18px;text-align:center">${escapeHtml(emailOtp)}</p>
            <p><a href="${codePage}" style="display:inline-block;padding:12px 18px;background:#1e4d3f;color:white;text-decoration:none;border-radius:6px">Åpne innloggingssiden</a></p>
            <p style="color:#5c6770;font-size:12px">Knappen åpner bare innloggingssiden og bruker ikke opp koden. Hvis du ikke ba om denne e-posten, kan du se bort fra den.</p>`
      : `
            <p>Trykk på knappen under for å logge inn i det lukkede styrerommet.</p>
            <p><a href="${actionLink}" style="display:inline-block;padding:12px 18px;background:#1e4d3f;color:white;text-decoration:none;border-radius:6px">Logg inn i styrerommet</a></p>
            <p style="color:#5c6770;font-size:12px">Lenken er personlig og skal ikke videresendes. Hvis du ikke ba om denne e-posten, kan du se bort fra den.</p>`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        from: fromEmail,
        to: member.email,
        subject: emailSubject,
        html: `
          <div style="font-family:Arial,sans-serif;color:#14171a;line-height:1.6;max-width:620px;margin:auto">
            <p style="color:#1e4d3f;font-size:12px;font-weight:700;letter-spacing:.08em">KVAMSKOGEN VEL · DIGITALT STYREROM</p>
            <h1 style="color:#0f2a22;font-size:28px;line-height:1.2">Hei ${escapeHtml(member.name)}</h1>
            ${loginContent}
          </div>`,
      }),
    });
    if (!emailResponse.ok) return json({ error: 'E-posten kunne ikke sendes.' }, 502);

    const { error: logError } = await admin.from('vel_login_requests').insert({ member_id: member.id });
    if (logError) return json({ error: 'E-posten ble sendt, men utsendingsloggen feilet.' }, 500);
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Ukjent feil.' }, 500);
  }
});
