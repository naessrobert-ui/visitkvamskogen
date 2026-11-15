import { useEffect, useState } from 'react';
import Link from './Link.jsx';
import { supabase } from '../lib/supabase.js';
import '../styles/bli-medlem.css';

const STYREWEB_INNMELDING = 'https://kvamskogenvel.portal.styreweb.com/arrangement/ArrangementSession?ID=Innmelding';
const KONTAKT = 'mailto:kasserer@kvamskogen-vel.no';

async function medlemskap(body) {
  if (!supabase) {
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

function Innmeldingslenke() {
  return (
    <>
      <h2>Meld deg inn</h2>
      <p>Du melder deg inn hos StyreWeb. Bruk Vipps eller fyll ut skjemaet manuelt.</p>
      <a className="btn btn-primary" href={STYREWEB_INNMELDING}>Til innmeldingsskjemaet</a>
    </>
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
          {betaling ? <Kvittering key={betaling} id={betaling} /> : <Innmeldingslenke />}
        </div>
      </div>
    </section>
  );
}
