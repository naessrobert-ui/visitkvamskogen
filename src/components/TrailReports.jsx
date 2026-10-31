import { useEffect, useState } from 'react';
import Link from './Link.jsx';
import { formatReportTime, loadTrailReports, reportIsOld } from '../lib/trailReports.js';
import '../styles/trail-reports.css';

const TrailReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const next = await loadTrailReports(controller.signal);
        if (!controller.signal.aborted) { setReports(next); setError(''); }
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || 'Kunne ikke hente føremeldinger.');
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) { setLoading(false); setClock(Date.now()); }
      }
    };
    setLoading(true);
    refresh();
    const interval = window.setInterval(refresh, 60000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [attempt]);

  return (
    <section className="section trail-reports-page">
      <div className="container">
        <header className="trail-reports-header">
          <div className="eyebrow winter"><span className="dot"/>Fra løypekjørerne</div>
          <h1>Hvordan er føret?</h1>
          <p className="lede">Siste meldinger fra dem som preparerer løypene på Kvamskogen.</p>
          <div className="trail-reports-links">
            <Link className="btn btn-primary" to="/skiloyper">Se prepareringskartet</Link>
            <Link className="btn-ghost" to="/webkamera">Webkamera</Link>
            <Link className="btn-ghost" to="/vaer">Værvarsel</Link>
          </div>
        </header>

        <div aria-live="polite" aria-busy={loading}>
          {loading && <p>Henter føremeldinger …</p>}
          {error && <div className="trail-report-notice" role="status">
            <p>{error} {reports.length > 0 && 'Meldingene nedenfor er fra sist vi fikk kontakt.'}</p>
            <button className="btn-ghost" onClick={() => setAttempt((value) => value + 1)}>Prøv igjen</button>
          </div>}
          {!loading && !error && reports.length === 0 && <div className="trail-report-empty">
            <h2>Ingen føremeldinger ennå</h2>
            <p>Her kommer rapporter fra løypekjørerne. Se prepareringskartet for siste registrerte kjøring.</p>
          </div>}

          {reports.map((report, index) => (
            <article className={`trail-report-card${index === 0 ? ' latest' : ''}`} key={report.id}>
              <div className="trail-report-meta">
                <span className="trail-report-badge">{index === 0 ? 'Siste melding' : 'Tidligere melding'}</span>
                <span>{report.area}</span>
              </div>
              <h2>{report.title}</h2>
              <p className="trail-report-observed">Forhold observert <time dateTime={report.observed_at}>{formatReportTime(report.observed_at)}</time></p>
              {reportIsOld(report, clock) && <p className="trail-report-age">Meldingen er over ett døgn gammel. Forholdene kan ha endret seg.</p>}
              <p className="trail-report-body">{report.text}</p>
              <footer>Innrapportert av løypekjører · Publisert <time dateTime={report.published_at}>{formatReportTime(report.published_at)}</time></footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrailReports;
