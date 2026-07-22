import { useEffect, useMemo, useState } from 'react';
import kampanje from '../data/brokampanje.json';
import {
  KAMPANJEMÅL,
  beregnDobling,
  loadKampanjeStats,
  startVippsBetaling,
} from '../lib/donasjoner.js';

const nok = (n) => Math.round(n).toLocaleString('nb-NO');
const dagLabel = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

const FORHÅNDSBELØP = [200, 400, 600];
const MEDLEMSKAP_BELØP = 200;

const BroKampanje = () => {
  const [dager, setDager] = useState(kampanje.dager ?? []);
  const [belop, setBelop] = useState(400);
  const [egetBelop, setEgetBelop] = useState('');
  const [dekkerMedlemskap, setDekkerMedlemskap] = useState(false);
  const [navn, setNavn] = useState('');
  const [epost, setEpost] = useState('');
  const [sender, setSender] = useState(false);
  const [feil, setFeil] = useState('');
  const [takk, setTakk] = useState(false);

  useEffect(() => {
    let aktiv = true;
    loadKampanjeStats().then((stats) => {
      if (aktiv && stats && stats.length > 0) setDager(stats);
    });
    return () => {
      aktiv = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('bro-takk')) {
      setTakk(true);
      const rein = window.location.pathname + window.location.hash;
      window.history.replaceState(null, '', rein);
    }
  }, []);

  const { innkommet, dobling, visning, pst, maxDag } = useMemo(() => {
    const inn = dager.reduce((sum, d) => sum + d.belop, 0);
    const dob = beregnDobling(inn);
    const vis = inn + dob;
    return {
      innkommet: inn,
      dobling: dob,
      visning: vis,
      pst: Math.min(100, Math.round((vis / KAMPANJEMÅL) * 100)),
      maxDag: Math.max(1, ...dager.map((d) => d.belop)),
    };
  }, [dager]);

  const valgtBelop = egetBelop ? Number(egetBelop) : belop;

  const velgForhånd = (n) => {
    setBelop(n);
    setEgetBelop('');
  };

  const toggleMedlemskap = (checked) => {
    setDekkerMedlemskap(checked);
    if (checked) {
      setBelop(MEDLEMSKAP_BELØP);
      setEgetBelop('');
    }
  };

  const betal = async () => {
    setFeil('');
    if (!valgtBelop || valgtBelop < 1) {
      setFeil('Velg et beløp.');
      return;
    }
    if (dekkerMedlemskap && (!navn.trim() || !epost.trim())) {
      setFeil('Fyll inn navn og e-post for medlemskap.');
      return;
    }
    setSender(true);
    try {
      const url = await startVippsBetaling({
        belop: valgtBelop,
        dekkerMedlemskap,
        navn,
        epost,
      });
      window.location.href = url;
    } catch (error) {
      setFeil(error.message || 'Noe gikk galt. Prøv igjen.');
      setSender(false);
    }
  };

  return (
    <section className="brokampanje">
      <div className="container brokampanje-inner">
        <div className="brokampanje-eyebrow"><span className="dot"/>Kampanje · Kvamskogen Vel</div>
        <h1 className="brokampanje-title">Redd broene — så redder vi løypenettet</h1>
        <p className="brokampanje-lede">
          I vinter falt den ene brua sammen. Den andre står fortsatt, men er usikker. Uten
          broene henger deler av løypenettet i løse lufta, og løypeprepareringen i 2027 må
          kuttes kraftig. Å ruste opp begge broene koster <strong>200 000 kr</strong>.
        </p>
        <p className="brokampanje-context">
          I dag er bare 1 av 3 hytte- og campingeiere på Kvamskogen medlem i Kvamskogen Vel,
          og under halvparten er med og betaler for løypeprepareringen. Likevel har Vel de
          siste årene bidratt med flere millioner til lavlandsløypa — som alle får glede av.
          Nå dobler vi hver krone som kommer inn.
        </p>

        <div className="brokampanje-tiers">
          <div className="brokampanje-tier">
            <span className="tier-tag">Ikke medlem ennå?</span>
            <p>
              Kontingenten er <strong>400 kr</strong> for hele året. Nå betaler du bare{' '}
              <strong>200 kr</strong> for resten av 2026 — og hele beløpet går rett til nye
              broer.
            </p>
          </div>
          <div className="brokampanje-tier">
            <span className="tier-tag">Medlem, eller vil gi mer enn 200 kr?</span>
            <p>
              Vel <strong>dobler</strong> bidraget ditt. Vippser du 200 kr, går det{' '}
              <strong>400 kr</strong> til broene.
            </p>
          </div>
        </div>

        {takk && (
          <div className="brokampanje-takk" role="status">
            <strong>Tusen takk for bidraget! 💚</strong> Betalingen behandles, og beløpet
            teller snart med i innsamlingen under. Du er med på å redde broene.
          </div>
        )}

        <div className="brokampanje-give">
          <h2 className="give-title">Gi et bidrag</h2>
          <div className="give-amounts">
            {FORHÅNDSBELØP.map((n) => (
              <button
                key={n}
                type="button"
                className={`give-chip${!egetBelop && belop === n ? ' is-active' : ''}`}
                onClick={() => velgForhånd(n)}
              >
                {n} kr
              </button>
            ))}
            <input
              className="give-custom"
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="Eget beløp"
              value={egetBelop}
              onChange={(e) => setEgetBelop(e.target.value)}
            />
          </div>

          <label className="give-check">
            <input
              type="checkbox"
              checked={dekkerMedlemskap}
              onChange={(e) => toggleMedlemskap(e.target.checked)}
            />
            <span>Dette dekker medlemskap i Kvamskogen Vel for 2026 (200 kr)</span>
          </label>

          {dekkerMedlemskap && (
            <div className="give-fields">
              <input
                className="give-input"
                type="text"
                placeholder="Navn"
                value={navn}
                onChange={(e) => setNavn(e.target.value)}
              />
              <input
                className="give-input"
                type="email"
                placeholder="E-post"
                value={epost}
                onChange={(e) => setEpost(e.target.value)}
              />
            </div>
          )}

          {feil && <p className="give-error">{feil}</p>}

          <button type="button" className="give-submit" onClick={betal} disabled={sender}>
            {sender ? 'Åpner Vipps …' : `Betal ${nok(valgtBelop || 0)} kr med Vipps`}
          </button>
          <p className="give-note">
            Du sendes til Vipps for å fullføre. Vippser du {nok(valgtBelop || 0)} kr, dobler
            Vel det til <strong>{nok((valgtBelop || 0) * 2)} kr</strong> til broene.
          </p>
        </div>

        <div className="brokampanje-progress">
          <div className="progress-head">
            <span className="progress-sum">{nok(visning)} kr</span>
            <span className="progress-goal">av {nok(KAMPANJEMÅL)} kr</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pst}%` }}>
              {pst >= 12 && <span className="progress-pst">{pst}%</span>}
            </div>
          </div>
          <p className="progress-breakdown">
            {nok(innkommet)} kr fra givere · {nok(dobling)} kr doblet av Kvamskogen Vel
          </p>

          {dager.length > 0 && (
            <div className="progress-bars" aria-label="Innbetalinger per dag">
              {dager.map((d) => (
                <div className="bar-col" key={d.dato}>
                  <span className="bar-amount">{nok(d.belop)}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${Math.round((d.belop / maxDag) * 100)}%` }}
                    />
                  </div>
                  <span className="bar-date">{dagLabel(d.dato)}</span>
                </div>
              ))}
            </div>
          )}

          <p className="progress-updated">Sist oppdatert {dagLabel(kampanje.oppdatert)}</p>
        </div>
      </div>
    </section>
  );
};

export default BroKampanje;
