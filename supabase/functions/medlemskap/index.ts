const encoder = new TextEncoder();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const belopOre = 40000;
const env = (key: string) => Deno.env.get(key) || '';
const site = new URL(env('MEDLEMSKAP_SITE_URL') || 'https://visitkvamskogen.no');
const kontingentar = Number(env('MEDLEMSKAP_KONTINGENTAR'));
const vippsBase = env('MEDLEMSKAP_VIPPS_BASE_URL').replace(/\/$/, '');
const vippsHeaders = {
  'Ocp-Apim-Subscription-Key': env('MEDLEMSKAP_VIPPS_SUBSCRIPTION_KEY'),
  'Merchant-Serial-Number': env('MEDLEMSKAP_VIPPS_MSN'),
  'Vipps-System-Name': 'visitkvamskogen',
};
const clientId = env('MEDLEMSKAP_VIPPS_CLIENT_ID');
const clientSecret = env('MEDLEMSKAP_VIPPS_CLIENT_SECRET');
const webhookSecret = env('MEDLEMSKAP_VIPPS_WEBHOOK_SECRET');
const resendKey = env('RESEND_API_KEY');
const resendFrom = env('RESEND_FROM_EMAIL') || 'Kvamskogen Vel <noreply@visitkvamskogen.no>';
const supabaseUrl = env('SUPABASE_URL');
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const webhookUrl = new URL(env('MEDLEMSKAP_WEBHOOK_URL')
  || new URL('/functions/v1/medlemskap/webhook', supabaseUrl || 'http://localhost'));
const vippsConfigured = /^https:\/\/(api|apitest)\.(vipps\.no|vippsmobilepay\.com)$/.test(vippsBase)
  && Boolean(clientId && clientSecret && vippsHeaders['Ocp-Apim-Subscription-Key'] && vippsHeaders['Merchant-Serial-Number']);
const kampanjeApen = Number.isInteger(kontingentar) && kontingentar >= 2026 && kontingentar <= 2099
  && vippsConfigured && Boolean(webhookSecret && resendKey && supabaseUrl && serviceKey);

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

type Innmelding = {
  id: string;
  fornavn: string;
  etternavn: string;
  mobil: string;
  epost: string;
  stedstype: string;
  hjemmeadresse: string | null;
  postnummer: string | null;
  poststed: string | null;
  hytteadresse: string | null;
  vognadresse: string | null;
  kontingentar: number;
  belop_ore: number;
  vipps_referanse: string;
  vipps_url: string | null;
  status: 'venter' | 'betalt' | 'avbrutt' | 'refundert';
  medlemsnummer: number | null;
  epost_sendt_at: string | null;
};

type Amount = { currency: string; value: number };
type Payment = {
  reference: string;
  amount: Amount;
  state: string;
  aggregate: {
    authorizedAmount?: Amount;
    cancelledAmount?: Amount;
    capturedAmount?: Amount;
    refundedAmount?: Amount;
  };
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': site.origin,
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  },
});

async function database(path: string, method = 'GET', body?: unknown, prefer?: string) {
  const headers = new Headers({
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  });
  if (prefer) headers.set('Prefer', prefer);
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Medlemsregister: ${response.status}`);
  if (response.status !== 204 && !prefer?.includes('return=minimal')) return await response.json();
}

const innmeldingPath = (id: string) => `medlemskampanje?id=eq.${id}`;

async function finnInnmelding(id: string): Promise<Innmelding | undefined> {
  const rows = await database(innmeldingPath(id));
  return rows[0];
}

async function endreInnmelding(id: string, filter: string, data: Partial<Innmelding>) {
  await database(`${innmeldingPath(id)}&${filter}`, 'PATCH', data, 'return=minimal');
}

async function vippsToken() {
  const response = await fetch(`${vippsBase}/accesstoken/get`, {
    method: 'POST',
    headers: { ...vippsHeaders, client_id: clientId, client_secret: clientSecret },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Vipps-tilgang: ${response.status}`);
  const { access_token } = await response.json();
  if (!access_token) throw new Error('Vipps returnerte ikke et tilgangstoken');
  return access_token as string;
}

async function vippsRequest<T>(token: string, path: string, body?: unknown, key?: string): Promise<T> {
  const headers = new Headers({ ...vippsHeaders, Authorization: `Bearer ${token}` });
  if (key) headers.set('Idempotency-Key', key);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${vippsBase}/epayment/v1/payments${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Vipps-betaling: ${response.status}`);
  return await response.json() as T;
}

function lesTekst(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  const clean = value.trim().replace(/\s+/g, ' ');
  return clean.length <= max ? clean : '';
}

function lesValgfriAdresse(value: unknown) {
  if (value == null || (typeof value === 'string' && !value.trim())) return null;
  const adresse = lesTekst(value, 160);
  if (!adresse) throw new RequestError(400, 'Hytte- og vognadresse kan ha inntil 160 tegn hver.');
  return adresse;
}

async function startInnmelding(body: Record<string, unknown>) {
  if (!kampanjeApen) throw new RequestError(503, 'Vipps-innmeldingen er ikke åpen.');
  const id = typeof body.id === 'string' ? body.id : '';
  const fornavn = lesTekst(body.fornavn, 80);
  const etternavn = lesTekst(body.etternavn, 80);
  const mobil = lesTekst(body.mobil, 24).replace(/\s/g, '');
  const epost = lesTekst(body.epost, 254).toLowerCase();
  const hjemmeadresse = lesTekst(body.hjemmeadresse, 160);
  const postnummer = lesTekst(body.postnummer, 4);
  const poststed = lesTekst(body.poststed, 80);
  if (!uuid.test(id) || !fornavn || !etternavn || !/^(?:\+47)?[0-9]{8}$/.test(mobil)
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost)
      || !hjemmeadresse || !/^[0-9]{4}$/.test(postnummer) || !poststed) {
    throw new RequestError(400, 'Kontroller navn, hjemmeadresse, postnummer, poststed, e-post og norsk telefonnummer.');
  }
  if (body.kontingentar !== kontingentar || body.belopOre !== belopOre) {
    throw new RequestError(409, 'Kontingenten har endret seg. Last siden på nytt før du betaler.');
  }

  const hytteadresse = lesValgfriAdresse(body.hytteadresse);
  const vognadresse = lesValgfriAdresse(body.vognadresse);
  const stedstype = hytteadresse && vognadresse ? 'Begge' : hytteadresse ? 'Hytte' : vognadresse ? 'Campingvogn' : 'Annet';
  const fields = {
    fornavn, etternavn, mobil: mobil.startsWith('+47') ? mobil : `+47${mobil}`,
    epost, hjemmeadresse, postnummer, poststed, stedstype,
    hytteadresse, vognadresse,
    kontingentar, belop_ore: belopOre,
  };
  await database('medlemskampanje?on_conflict=id', 'POST', { id, ...fields }, 'resolution=ignore-duplicates,return=minimal');
  const row = await finnInnmelding(id);
  if (!row) throw new Error('Innmeldingen ble ikke lagret');
  if (Object.entries(fields).some(([key, value]) => row[key as keyof Innmelding] !== value) || row.status !== 'venter') {
    throw new RequestError(409, 'Innmeldingen er allerede startet. Last siden på nytt ved behov.');
  }
  if (row.vipps_url) return { redirectUrl: row.vipps_url };

  const returnUrl = new URL('/bli-medlem', site);
  returnUrl.searchParams.set('betaling', row.id);
  const { redirectUrl } = await vippsRequest<{ redirectUrl: string }>(await vippsToken(), '', {
    amount: { currency: 'NOK', value: row.belop_ore },
    paymentMethod: { type: 'WALLET' },
    reference: row.vipps_referanse,
    returnUrl: returnUrl.href,
    userFlow: 'WEB_REDIRECT',
    paymentDescription: `Kvamskogen Vel medlemskap ${row.kontingentar}`,
  }, `opprett-${row.id}`);
  if (!redirectUrl || new URL(redirectUrl).protocol !== 'https:') throw new Error('Vipps returnerte ingen sikker betalingslenke');
  await endreInnmelding(id, 'vipps_url=is.null', { vipps_url: redirectUrl });
  return { redirectUrl };
}

async function sendVelkomst(row: Innmelding) {
  if (row.epost_sendt_at) return;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `medlemskap/${row.id}`,
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [row.epost],
      reply_to: 'kasserer@kvamskogen-vel.no',
      subject: 'Velkommen til Kvamskogen Vel',
      text: `Takk for innmeldingen i Kvamskogen Vel!\n\nMedlemsnummer: ${row.medlemsnummer}\nKontingentår: ${row.kontingentar}\nBetalt med Vipps: ${row.belop_ore / 100} kr\n\nMedlemsfordeler: ${new URL('/medlemsfordeler', site)}\n\nHilsen Kvamskogen Vel`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Velkomstmail: ${response.status}`);
  await endreInnmelding(row.id, 'epost_sendt_at=is.null', { epost_sendt_at: new Date().toISOString() });
}

function betalingsbelop(amount?: Amount) {
  if (!amount) return 0;
  if (amount.currency !== 'NOK' || !Number.isSafeInteger(amount.value) || amount.value < 0) {
    throw new Error('Ugyldig beløp fra Vipps');
  }
  return amount.value;
}

async function avstem(row: Innmelding) {
  const token = await vippsToken();
  const path = `/${row.vipps_referanse}`;
  const hentBetaling = async () => {
    const payment = await vippsRequest<Payment>(token, path);
    if (payment.reference !== row.vipps_referanse || betalingsbelop(payment.amount) !== row.belop_ore || !payment.aggregate) {
      throw new Error('Vipps-betalingen stemmer ikke med innmeldingen');
    }
    return payment;
  };
  let payment = await hentBetaling();
  const { authorizedAmount, cancelledAmount, capturedAmount, refundedAmount } = payment.aggregate;
  if (payment.state === 'AUTHORIZED' && betalingsbelop(authorizedAmount) === row.belop_ore
    && betalingsbelop(cancelledAmount) === 0 && betalingsbelop(capturedAmount) === 0
    && betalingsbelop(refundedAmount) === 0 && row.status === 'venter') {
    try {
      await vippsRequest(token, `${path}/capture`, {
        modificationAmount: { currency: 'NOK', value: row.belop_ore },
      }, `trekk-${row.id}`);
    } catch {
      // Vipps kan ha trukket beløpet selv om svaret kom bort.
    }
    payment = await hentBetaling();
  }

  if (betalingsbelop(payment.aggregate.refundedAmount) > 0) {
    await endreInnmelding(row.id, 'status=neq.refundert', { status: 'refundert' });
    return { ...row, status: 'refundert' } as Innmelding;
  }
  if (betalingsbelop(payment.aggregate.capturedAmount) === row.belop_ore) {
    const result = await database('rpc/fullfor_medlemsinnmelding', 'POST', { innmelding_id: row.id });
    return (Array.isArray(result) ? result[0] : result) as Innmelding;
  }
  if (['ABORTED', 'EXPIRED', 'TERMINATED', 'CANCELLED', 'FAILED'].includes(payment.state)
    || betalingsbelop(payment.aggregate.cancelledAmount) === row.belop_ore) {
    await endreInnmelding(row.id, 'status=eq.venter', { status: 'avbrutt' });
    return await finnInnmelding(row.id) || row;
  }
  return row;
}

const base64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

async function gyldigWebhook(headers: Headers, body: ArrayBuffer) {
  const date = headers.get('x-ms-date');
  const hash = base64(await crypto.subtle.digest('SHA-256', body));
  const signature = /^HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=([A-Za-z0-9+/]{43}=)$/.exec(headers.get('authorization') || '');
  if (!webhookSecret || !date || !signature || headers.get('x-ms-content-sha256') !== hash) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const message = `POST\n${webhookUrl.pathname}${webhookUrl.search}\n${date};${webhookUrl.host};${hash}`;
  return crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(signature[1]), (c) => c.charCodeAt(0)), encoder.encode(message));
}

async function behandleWebhook(req: Request) {
  const raw = await req.arrayBuffer();
  if (!await gyldigWebhook(req.headers, raw)) return json({ error: 'Ugyldig signatur.' }, 401);
  const { reference, name, success, msn } = JSON.parse(new TextDecoder().decode(raw));
  const id = typeof reference === 'string' && reference.startsWith('medlem-') ? reference.slice(7) : '';
  if (!uuid.test(id) || msn !== vippsHeaders['Merchant-Serial-Number'] || success === false) return json({ ok: true });
  const row = await finnInnmelding(id);
  if (!row) return json({ ok: true });
  const current = await avstem(row);
  if (current.status === 'venter' && ['AUTHORIZED', 'CAPTURED'].includes(name)) {
    return json({ error: 'Venter på bekreftelse fra Vipps.' }, 503);
  }
  if (current.status === 'betalt') await sendVelkomst(current);
  return json({ ok: true });
}

async function lesKvittering(id: unknown) {
  if (typeof id !== 'string' || !uuid.test(id)) throw new RequestError(404, 'Fant ikke innmeldingen.');
  const row = await finnInnmelding(id);
  if (!row) throw new RequestError(404, 'Fant ikke innmeldingen.');
  const current = row.status === 'venter' && row.vipps_url ? await avstem(row) : row;
  let epostSendt = Boolean(current.epost_sendt_at);
  if (current.status === 'betalt' && !epostSendt) {
    try {
      await sendVelkomst(current);
      epostSendt = true;
    } catch (error) {
      console.error('Medlemskap: velkomstmail venter', error instanceof Error ? error.message : 'Ukjent feil');
    }
  }
  return {
    status: current.status,
    medlemsnummer: current.status === 'betalt' ? current.medlemsnummer : null,
    kontingentar: current.kontingentar,
    belopOre: current.belop_ore,
    epostSendt,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(null);
  if (req.method !== 'POST') return json({ error: 'Kun POST.' }, 405);
  try {
    if (new URL(req.url).pathname.endsWith('/webhook')) return await behandleWebhook(req);
    const origin = req.headers.get('origin');
    if (origin && origin !== site.origin) return json({ error: 'Ugyldig opprinnelse.' }, 403);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'Ugyldig forespørsel.' }, 400);
    if (body.action === 'info') return json({ open: kampanjeApen, kontingentar: kampanjeApen ? kontingentar : null, belopOre });
    if (body.action === 'start') return json(await startInnmelding(body));
    if (body.action === 'kvittering') return json(await lesKvittering(body.id));
    return json({ error: 'Ukjent handling.' }, 400);
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status);
    console.error('Medlemskap:', error instanceof Error ? error.message : 'Ukjent feil');
    return json({ error: 'Tjenesten kunne ikke fullføre forespørselen. Prøv igjen om litt.' }, 503);
  }
});
