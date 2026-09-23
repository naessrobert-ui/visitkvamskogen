import { useEffect, useState } from 'react';
import { loadVelEvent, signUpForVelEvent, submitVelEventInput } from '../lib/velEvents.js';

export const MEDLEMSMOTE_SLUG = 'medlemsmote-2026-10-24';

// Vises før API-et har svart, og er det søkemotorer og prerender ser.
const FALLBACK = {
  title: 'Medlemsmøte: Hva skal Vel\'et jobbe med?',
  starts_at: '2026-10-24T16:00:00+02:00',
  location: 'Eikedalen',
  signup_open: true,
};

const INTRO = [
  'Styret inviterer til medlemsmøte i Eikedalen lørdag 24. oktober kl. 16.00 til 18.00. Dette er ikke et årsmøte. Vi forteller kort hva styret har jobbet med, viser frem den nye nettsiden med webkamera, og bruker resten av tiden på å høre hva dere mener Vel\'et skal prioritere fremover. Det blir enkel servering med kaffe og te.',
];

const HIGHLIGHT = {
  title: 'Vel\'et har lagt tre millioner kroner i lavlandsløypa, flere års samlede inntekter.',
  text: 'Det er den typen løft vi kan gjøre når vi står samlet. Nå vil vi vite hva som står øverst på listen deres.',
};

const END_TIME = '18.00';

const PROGRAM = [
  { time: '16.00', title: 'Velkommen. Hva kontingenten går til' },
  { time: '16.10', title: 'Ny nettside og webkamera' },
  { time: '16.30', title: 'Året som gikk: løyper, parkering, plansaker, trafikksikkerhet', text: 'Med resultatene fra fartsmålingene langs RV49.' },
  { time: '16.50', title: 'Reguleringsplaner og kommunedelplan for Kvamskogen – status' },
  { time: '17.00', title: 'Vedlikehold av lavlandsløypa', text: 'Dugnad – og bør vi samordne løypepreparering og vedlikehold av lavlandsløypene, for eksempel i et eget sti- og løypelag?' },
  { time: '17.15', title: 'Ordet fritt. Hva skal Vel\'et jobbe med?' },
  { time: '17.45', title: 'Oppsummering og veien videre' },
  { time: '18.00', title: 'Slutt' },
];

const WELCOME = 'Møtet er åpent for alle hytteeiere og campingvogneiere på Kvamskogen, også dere som ikke er medlemmer i dag. Er du glad i Kvamskogen på annen måte, er du også velkommen. Ta gjerne med en nabo.';
const TIP = 'En liten oppfordring fra styret: Hjelp oss å holde stiene farbare – ta gjerne med en greinsaks i sekken neste gang du er på tur.';

const EMPTY_SIGNUP = { name: '', email: '', peopleCount: 1, website: '' };
const EMPTY_INPUT = { name: '', email: '', body: '', website: '' };

const formatDay = (iso) => {
  const day = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Oslo' }).format(new Date(iso));
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}`;
};

const formatStart = (iso) => new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' }).format(new Date(iso)).replace(':', '.');

const formatCount = (value) => (Number.isFinite(value) && value > 0 ? value.toLocaleString('nb-NO') : '–');

const Honeypot = ({ value, onChange }) => (
  <input className="mm-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={value} onChange={onChange} />
);

const Medlemsmote = () => {
  const [event, setEvent] = useState(null);
  const [signup, setSignup] = useState(EMPTY_SIGNUP);
  const [input, setInput] = useState(EMPTY_INPUT);
  const [signupState, setSignupState] = useState({ busy: false, ok: '', error: '' });
  const [inputState, setInputState] = useState({ busy: false, ok: '', error: '' });

  const refresh = () => loadVelEvent(MEDLEMSMOTE_SLUG).then(setEvent).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const shown = event || FALLBACK;
  const open = shown.signup_open !== false;
  const update = (setter) => (field) => (e) => setter((current) => ({ ...current, [field]: e.target.value }));

  const submitSignup = async (e) => {
    e.preventDefault();
    setSignupState({ busy: true, ok: '', error: '' });
    try {
      const result = await signUpForVelEvent(MEDLEMSMOTE_SLUG, signup);
      setEvent((current) => (current ? { ...current, signup_count: result.signup_count } : current));
      setSignup(EMPTY_SIGNUP);
      setSignupState({ busy: false, ok: 'Takk, du er påmeldt! Meld deg på igjen med samme e-post hvis antallet endrer seg.', error: '' });
    } catch (err) {
      setSignupState({ busy: false, ok: '', error: err.message });
    }
  };

  const submitInput = async (e) => {
    e.preventDefault();
    setInputState({ busy: true, ok: '', error: '' });
    try {
      await submitVelEventInput(MEDLEMSMOTE_SLUG, input);
      setInput(EMPTY_INPUT);
      setInputState({ busy: false, ok: 'Takk! Innspillet er sendt til styret.', error: '' });
    } catch (err) {
      setInputState({ busy: false, ok: '', error: err.message });
    }
  };

  const setS = update(setSignup);
  const setI = update(setInput);

  return (
    <section className="section plansaker-page medlemsmote-page">
      <div className="container plansaker-container">
        <header className="plansaker-hero">
          <div>
            <div className="eyebrow spring"><span className="dot"/>Kvamskogen Vel · Innkalling</div>
            <h1>{shown.title}</h1>
            {INTRO.map((paragraph) => <p className="lede mm-lede" key={paragraph}>{paragraph}</p>)}
            <div className="plansaker-actions">
              <a className="btn btn-primary" href="#pamelding">Meld deg på møtet</a>
              <a className="btn btn-ghost" href="#innspill">Send inn en sak</a>
            </div>
          </div>
          <aside className="plansaker-status mm-when" aria-label="Tid og sted">
            <dl>
              <div><dt>Dato</dt><dd>{formatDay(shown.starts_at)}</dd></div>
              <div><dt>Tid</dt><dd>{formatStart(shown.starts_at)}–{END_TIME}</dd></div>
              <div><dt>Sted</dt><dd>{shown.location}</dd></div>
            </dl>
          </aside>
        </header>

        <blockquote className="mm-highlight">
          <p><strong>{HIGHLIGHT.title}</strong> {HIGHLIGHT.text}</p>
        </blockquote>

        <section className="mm-program" aria-labelledby="mm-program-title">
          <div className="newspaper-kicker">Program</div>
          <h2 id="mm-program-title">Slik blir møtet</h2>
          <ol>
            {PROGRAM.map((item) => (
              <li key={item.time}>
                <time>{item.time}</time>
                <div>
                  <b>{item.title}</b>
                  {item.text && <span>{item.text}</span>}
                </div>
              </li>
            ))}
          </ol>
          <p className="mm-welcome">{WELCOME}</p>
          <p className="mm-tip">{TIP}</p>
          <p className="mm-signoff">Vel møtt! <span>Styret i Kvamskogen Vel</span></p>
        </section>

        <div className="mm-counters" aria-live="polite">
          <div><strong>{formatCount(event?.invited_count)}</strong><span>medlemmer varslet</span></div>
          <div><strong>{event ? event.signup_count.toLocaleString('nb-NO') : '–'}</strong><span>påmeldte så langt</span></div>
        </div>

        <div className="mm-grid">
          <form id="pamelding" className="mm-card" onSubmit={submitSignup}>
            <div className="newspaper-kicker">Påmelding</div>
            <h2>Meld deg på møtet</h2>
            {open ? (
              <>
                <div className="field">
                  <label htmlFor="mm-s-name">Navn</label>
                  <input id="mm-s-name" required autoComplete="name" value={signup.name} onChange={setS('name')} />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="mm-s-email">E-post</label>
                    <input id="mm-s-email" required type="email" autoComplete="email" value={signup.email} onChange={setS('email')} />
                  </div>
                  <div className="field">
                    <label htmlFor="mm-s-people">Antall personer</label>
                    <input id="mm-s-people" required type="number" min="1" max="10" value={signup.peopleCount} onChange={setS('peopleCount')} />
                  </div>
                </div>
                <Honeypot value={signup.website} onChange={setS('website')} />
                <button className="btn btn-primary mm-submit" type="submit" disabled={signupState.busy}>
                  {signupState.busy ? 'Melder på…' : 'Meld meg på'}
                </button>
                {signupState.ok && <p className="mm-message is-ok" role="status">{signupState.ok}</p>}
                {signupState.error && <p className="mm-message is-error" role="alert">{signupState.error}</p>}
                <p className="mm-privacy">Navn og e-post brukes bare til å planlegge møtet og slettes etterpå.</p>
              </>
            ) : (
              <p className="mm-closed">Påmeldingen er stengt.</p>
            )}
          </form>

          <form id="innspill" className="mm-card" onSubmit={submitInput}>
            <div className="newspaper-kicker">Innspill</div>
            <h2>Send inn en sak eller et innspill</h2>
            <p className="mm-help">Har du en sak du ønsker at styret tar opp? Send den her. Det er også fullt mulig å ta den opp direkte på møtet. Utvalgte innspill publiseres nedenfor med fornavn etter at styret har sett gjennom dem.</p>
            <div className="field-row">
              <div className="field">
                <label htmlFor="mm-i-name">Navn</label>
                <input id="mm-i-name" required autoComplete="name" value={input.name} onChange={setI('name')} />
              </div>
              <div className="field">
                <label htmlFor="mm-i-email">E-post</label>
                <input id="mm-i-email" required type="email" autoComplete="email" value={input.email} onChange={setI('email')} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="mm-i-body">Innspill (10–2000 tegn)</label>
              <textarea id="mm-i-body" required rows={6} minLength={10} maxLength={2000} value={input.body} onChange={setI('body')} />
            </div>
            <Honeypot value={input.website} onChange={setI('website')} />
            <button className="btn btn-primary mm-submit" type="submit" disabled={inputState.busy}>
              {inputState.busy ? 'Sender…' : 'Send innspill til styret'}
            </button>
            {inputState.ok && <p className="mm-message is-ok" role="status">{inputState.ok}</p>}
            {inputState.error && <p className="mm-message is-error" role="alert">{inputState.error}</p>}
            <p className="mm-privacy">Navn og e-post brukes bare til å følge opp saken din.</p>
          </form>
        </div>

        <section className="mm-input-list" aria-labelledby="mm-input-title">
          <div className="newspaper-kicker">Fra medlemmene</div>
          <h2 id="mm-input-title">Innkomne innspill så langt</h2>
          {event?.input?.length ? (
            <ul>
              {event.input.map((item) => (
                <li key={item.id}>
                  <small>{item.first_name}</small>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mm-empty">Ingen innspill er publisert ennå. Bli den første!</p>
          )}
        </section>
      </div>
    </section>
  );
};

export default Medlemsmote;
