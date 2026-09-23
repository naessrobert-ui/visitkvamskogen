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
  'Styret i Kvamskogen Vel inviterer alle medlemmer til medlemsmøte. Vi vil høre fra dere som har hytte eller vogn på fjellet: Hva er viktigst for Kvamskogen de neste årene, og hva skal vellet bruke tid og penger på?',
  'Løypekjøring og broer, parkering, trafikksikkerhet langs RV49, plansaker og medlemsfordeler er noen av temaene på bordet. Har du en sak du vil at styret skal ta opp, kan du sende den inn på forhånd nedenfor.',
];

const EMPTY_SIGNUP = { name: '', email: '', peopleCount: 1, website: '' };
const EMPTY_INPUT = { name: '', email: '', body: '', website: '' };

const formatWhen = (iso) => {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Oslo' }).format(date);
  const time = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' }).format(date);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} kl. ${time}`;
};

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
          <aside className="plansaker-status" aria-label="Tid og sted">
            <span>Tid og sted</span>
            <strong>{formatWhen(shown.starts_at)}</strong>
            <p>{shown.location}</p>
          </aside>
        </header>

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
            <p className="mm-help">Innspill går til styret. Utvalgte innspill publiseres nedenfor med fornavn etter at styret har sett gjennom dem.</p>
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
