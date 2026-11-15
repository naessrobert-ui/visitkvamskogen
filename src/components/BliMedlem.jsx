import { useEffect, useRef, useState } from 'react';
import Link from './Link.jsx';
import { supabase } from '../lib/supabase.js';
import '../styles/bli-medlem.css';

const GAMMEL_INNMELDING = 'https://www.kvamskogen-vel.no/bli-medlem-2/';
const KONTAKT = 'mailto:kasserer@kvamskogen-vel.no';
const STEDSTYPER = ['Hytte', 'Campingvogn', 'Annet'];

async function medlemskap(body) {
  if (!supabase) {
    if (body.action === 'info') return { open: false };
    throw new Error('Innmeldingstjenesten er midlertidig utilgjengelig.');
  }
  const { data, error } = await supabase.functions.invoke('medlemskap', { body });
  if (!error) return data;
  const response = error.context;
  const details = response instanceof Response ? await response.json().catch(() => null) : null;
  throw new Error(details?.error || 'Tjenesten er midlertidig utilgjengelig. Prøv igjen om litt.');
}

function Kvittering({ id }) {
  const [resultat, setResultat] = useState(null);
  const [sok, setSok] = useState(0);

  useEffect(() => {
    let avsluttet = false;
    let timer;
    let forsok = 0;
    async function sjekk() {
      try {
        const resultat = await medlemskap({ action: 'kvittering', id });
        if (avsluttet) return;
        setResultat(resultat);
        if (resultat.status !== 'venter' && !(resultat.status === 'betalt' && !resultat.epostSendt)) return;
      } catch {
        if (avsluttet) return;
      }
      forsok += 1;
      if (forsok < 6) timer = window.setTimeout(sjekk, 2500);
      else setResultat((siste) => siste?.status === 'betalt' ? siste : { status: 'ukjent' });
    }
    sjekk();
    return () => { avsluttet = true; window.clearTimeout(timer); };
  }, [id, sok]);

  const status = resultat?.status;
  if (status === 'betalt') return (
    <div role="status">
      <h2>Velkommen til Kvamskogen Vel!</h2>
      <p className="innmelding-nr">Medlemsnummer <strong>{resultat.medlemsnummer}</strong></p>
      <p>{resultat.belopOre / 100} kr betalt for {resultat.kontingentar}. {resultat.epostSendt ? 'Vi har sendt deg en bekreftelse på e-post.' : 'Ta vare på nummeret. E-postbekreftelsen kan komme litt senere.'}</p>
      <Link className="btn btn-secondary" to="/medlemsfordeler">Se medlemsfordelene</Link>
    </div>
  );
  if (status === 'avbrutt' || status === 'refundert') return (
    <div role="status">
      <h2>{status === 'avbrutt' ? 'Betalingen ble avbrutt' : 'Betalingen er refundert'}</h2>
      {status === 'avbrutt' ? <Link className="btn btn-primary" to="/bli-medlem">Tilbake til innmeldingen</Link>
        : <p>Ta kontakt med <a href={KONTAKT}>kassereren</a> hvis du har spørsmål om innmeldingen.</p>}
    </div>
  );
  if (status === 'ukjent') return (
    <div role="status">
      <h2>Venter på betalingsbekreftelse</h2>
      <p>Du får medlemsnummer på e-post når betalingen er bekreftet. Har du betalt og venter fortsatt, kontakt <a href={KONTAKT}>kassereren</a>.</p>
      <button className="btn btn-secondary" type="button" onClick={() => { setResultat(null); setSok((antall) => antall + 1); }}>Sjekk betalingen igjen</button>
    </div>
  );
  return <div role="status"><h2>Sjekker betalingen hos Vipps …</h2><p>Medlemsnummeret vises så snart betalingen er bekreftet.</p></div>;
}

function Innmeldingsskjema() {
  const [info, setInfo] = useState(null);
  const [sender, setSender] = useState(false);
  const [feil, setFeil] = useState('');
  const innmelding = useRef(null);

  useEffect(() => {
    let aktiv = true;
    medlemskap({ action: 'info' }).then((resultat) => {
      if (aktiv) setInfo(resultat);
    }).catch(() => {
      if (aktiv) setInfo({ open: false });
    });
    return () => { aktiv = false; };
  }, []);

  async function startBetaling(event) {
    event.preventDefault();
    if (sender || !info?.open) return;
    setSender(true);
    setFeil('');
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      const formKey = JSON.stringify(fields);
      if (innmelding.current?.formKey !== formKey) innmelding.current = { formKey, id: crypto.randomUUID() };
      const data = await medlemskap({ action: 'start', id: innmelding.current.id, ...fields, kontingentar: info.kontingentar, belopOre: info.belopOre });
      window.location.assign(data.redirectUrl);
    } catch (error) {
      setFeil(error.message || 'Kunne ikke starte Vipps. Prøv igjen.');
      setSender(false);
    }
  }

  if (!info) return <p role="status">Henter innmelding …</p>;
  if (!info.open) return (
    <>
      <h2>Meld deg inn</h2>
      <p>Du kan bruke det vanlige innmeldingsskjemaet til Kvamskogen Vel.</p>
      <a className="btn btn-primary" href={GAMMEL_INNMELDING}>Til innmeldingsskjemaet</a>
    </>
  );

  return (
    <form className="innmelding-form" onSubmit={startBetaling}>
      <div className="innmelding-pris"><h2>Årskontingent {info.kontingentar}</h2><strong>{info.belopOre / 100} kr</strong></div>
      <div className="innmelding-felter">
        <label>Fornavn<input name="fornavn" autoComplete="given-name" maxLength={80} required /></label>
        <label>Etternavn<input name="etternavn" autoComplete="family-name" maxLength={80} required /></label>
        <label>Mobil<input name="mobil" type="tel" autoComplete="tel" maxLength={24} required /></label>
        <label>E-post<input name="epost" type="email" autoComplete="email" maxLength={254} required /></label>
        <label>Tilknytning<select name="stedstype" defaultValue="" required><option value="" disabled>Velg</option>{STEDSTYPER.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Hytteområde eller campingplass<input name="omrade" maxLength={160} required /></label>
      </div>
      <p className="innmelding-detaljer">Kvamskogen Vel bruker opplysningene til å registrere medlemskapet og sende betalingsbekreftelse.</p>
      {feil && <p className="innmelding-feil" role="alert">{feil}</p>}
      <button className="btn btn-primary" type="submit" disabled={sender}>{sender ? 'Åpner Vipps …' : 'Betal med Vipps'}</button>
      <p className="innmelding-detaljer">Er du eller har du vært medlem? Kontakt <a href={KONTAKT}>kassereren</a> for å beholde medlemsnummeret ditt.</p>
    </form>
  );
}

export default function BliMedlem({ betaling }) {
  return (
    <section className="section innmelding">
      <div className="container innmelding-layout">
        <header className="innmelding-tekst">
          <h1>Bli medlem i Kvamskogen Vel</h1>
          <p className="lede">Har du hytte eller campingvogn på Kvamskogen? Som medlem gir du oss en sterkere stemme i arbeidet for trygge veier, gode stier og løyper.</p>
          <Link to="/medlemsfordeler">Se hva du får som medlem →</Link>
        </header>
        <div className="innmelding-kort">
          {betaling ? <Kvittering key={betaling} id={betaling} /> : <Innmeldingsskjema />}
        </div>
      </div>
    </section>
  );
}
