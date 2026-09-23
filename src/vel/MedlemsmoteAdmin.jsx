import { useEffect, useMemo, useState } from 'react';
import {
  deleteVelEventInput, deleteVelEventSignup, deleteVelEventSignups, loadVelEventDetails, loadVelEvents, setVelEventInputStatus, updateVelEvent,
} from './eventApi.js';

const INPUT_FILTERS = [
  { value: 'new', label: 'Nye' },
  { value: 'approved', label: 'Publisert' },
  { value: 'rejected', label: 'Avvist' },
  { value: 'all', label: 'Alle' },
];

const when = (value) => new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' }).format(new Date(value));
const eventDate = (value) => new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' }).format(new Date(value));

const pickDefaultEvent = (events) => {
  const now = Date.now();
  const upcoming = events.filter((item) => new Date(item.starts_at).getTime() > now);
  return (upcoming[upcoming.length - 1] || events[0])?.id || null;
};

const MedlemsmoteAdmin = ({ member, onNotice }) => {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(null);
  const [details, setDetails] = useState({ signups: [], input: [] });
  const [filter, setFilter] = useState('new');
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const event = events.find((item) => item.id === eventId) || null;

  useEffect(() => {
    loadVelEvents()
      .then((rows) => { setEvents(rows); setEventId(pickDefaultEvent(rows)); })
      .catch(() => setError('Kunne ikke hente medlemsmøter. Er vel_medlemsmote.sql kjørt i Supabase?'));
  }, []);

  const reload = async (id = eventId) => {
    if (!id) return;
    setDetails(await loadVelEventDetails(id));
  };

  useEffect(() => {
    if (!event) return;
    setSettings({ invitedCount: event.invited_count, invitedOn: event.invited_on || '', signupOpen: event.signup_open });
    reload(event.id).catch(() => setError('Kunne ikke hente påmeldinger og innspill.'));
  }, [eventId]);

  const totalPeople = useMemo(() => details.signups.reduce((sum, item) => sum + item.people_count, 0), [details.signups]);
  const counts = useMemo(() => details.input.reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }), {}), [details.input]);
  const visibleInput = details.input.filter((item) => filter === 'all' || item.status === filter);

  const run = async (action, message) => {
    setBusy(true);
    setError('');
    try {
      await action();
      if (message) onNotice(message);
    } catch (_) {
      setError('Endringen kunne ikke lagres. Prøv igjen.');
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = (e) => {
    e.preventDefault();
    run(async () => {
      const updated = await updateVelEvent(event.id, settings);
      setEvents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    }, 'Møteinnstillingene er lagret.');
  };

  const setStatus = (item, status) => run(async () => {
    const updated = await setVelEventInputStatus(item.id, status, member.id);
    setDetails((current) => ({ ...current, input: current.input.map((row) => (row.id === updated.id ? updated : row)) }));
  }, status === 'approved' ? 'Innspillet er publisert på møtesiden.' : null);

  const copyEmails = async () => {
    const emails = details.signups.map((item) => item.email).join('; ');
    try {
      await navigator.clipboard.writeText(emails);
      onNotice(`${details.signups.length} e-postadresser er kopiert.`);
    } catch (_) {
      window.prompt('Kopier e-postadressene:', emails);
    }
  };

  const deleteSignup = (item) => {
    if (!window.confirm(`Slette påmeldingen fra ${item.name} (${item.email})?`)) return;
    run(async () => {
      await deleteVelEventSignup(item.id);
      setDetails((current) => ({ ...current, signups: current.signups.filter((row) => row.id !== item.id) }));
    }, 'Påmeldingen er slettet.');
  };

  const deleteInput = (item) => {
    if (!window.confirm(`Slette innspillet fra ${item.name} for godt? Vil du bare skjule det, bruk Avvis.`)) return;
    run(async () => {
      await deleteVelEventInput(item.id);
      setDetails((current) => ({ ...current, input: current.input.filter((row) => row.id !== item.id) }));
    }, 'Innspillet er slettet.');
  };

  const deleteSignups = () => {
    if (!window.confirm(`Slette hele påmeldingslisten (${details.signups.length} påmeldinger)? Dette kan ikke angres.`)) return;
    run(async () => { await deleteVelEventSignups(event.id); await reload(); }, 'Påmeldingslisten er slettet.');
  };

  if (!event) {
    return <section className="vel-view"><header className="vel-view-header"><div><p className="vel-kicker">MEDLEMMENE</p><h1>Medlemsmøte</h1></div></header>{error ? <p className="vel-form-error">{error}</p> : <div className="vel-empty"><strong>Laster…</strong></div>}</section>;
  }

  const isPast = new Date(event.starts_at).getTime() < Date.now();

  return (
    <section className="vel-view vel-mm">
      <header className="vel-view-header">
        <div>
          <p className="vel-kicker">MEDLEMMENE</p>
          <h1>{event.title}</h1>
          <span>{eventDate(event.starts_at)}{event.location ? ` · ${event.location}` : ''}</span>
        </div>
        <div className="vel-view-actions">
          {events.length > 1 && (
            <select className="vel-mm-select" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          )}
          <a className="vel-secondary-dark vel-mm-link" href="/medlemsmote" target="_blank" rel="noreferrer">Åpne møtesiden ↗</a>
        </div>
      </header>

      {error && <p className="vel-form-error vel-mm-error">{error}</p>}

      <div className="vel-mm-stats">
        <div><strong>{event.invited_count.toLocaleString('nb-NO')}</strong><span>varslet</span></div>
        <div><strong>{totalPeople}</strong><span>påmeldte personer</span></div>
        <div><strong>{counts.new || 0}</strong><span>nye innspill</span></div>
        <div><strong>{counts.approved || 0}</strong><span>publiserte innspill</span></div>
      </div>

      <div className="vel-mm-grid">
        <div className="vel-mm-main">
          <section className="vel-content-card vel-mm-card">
            <header className="vel-mm-card-header"><h2>Innspill fra medlemmene</h2></header>
            <div className="vel-filters">
              {INPUT_FILTERS.map((item) => (
                <button key={item.value} type="button" className={filter === item.value ? 'is-active' : ''} onClick={() => setFilter(item.value)}>
                  {item.label}{item.value !== 'all' && counts[item.value] ? ` (${counts[item.value]})` : ''}
                </button>
              ))}
            </div>
            {visibleInput.length ? visibleInput.map((item) => (
              <article className={`vel-mm-input is-${item.status}`} key={item.id}>
                <header>
                  <b>{item.name}</b>
                  <a href={`mailto:${item.email}`}>{item.email}</a>
                  <time>{when(item.created_at)}</time>
                </header>
                <p>{item.body}</p>
                <div className="vel-mm-actions">
                  {item.status !== 'approved' && <button className="vel-primary" type="button" disabled={busy} onClick={() => setStatus(item, 'approved')}>Publiser</button>}
                  {item.status !== 'rejected' && <button className="vel-quiet-button" type="button" disabled={busy} onClick={() => setStatus(item, 'rejected')}>{item.status === 'approved' ? 'Avpubliser' : 'Avvis'}</button>}
                  {item.status !== 'new' && <button className="vel-quiet-button" type="button" disabled={busy} onClick={() => setStatus(item, 'new')}>Tilbake til ny</button>}
                  {member.is_admin && <button className="vel-quiet-button vel-mm-delete" type="button" disabled={busy} onClick={() => deleteInput(item)}>Slett</button>}
                </div>
              </article>
            )) : <div className="vel-empty"><strong>Ingen innspill her</strong><span>Publiserte innspill vises med fornavn på møtesiden.</span></div>}
          </section>

          <section className="vel-content-card vel-mm-card">
            <header className="vel-mm-card-header">
              <h2>Påmeldte ({details.signups.length} påmeldinger, {totalPeople} personer)</h2>
              {details.signups.length > 0 && <button className="vel-quiet-button" type="button" onClick={copyEmails}>Kopier e-poster</button>}
            </header>
            {details.signups.length ? (
              <div className="vel-mm-table-wrap">
                <table className="vel-mm-table">
                  <thead><tr><th>Navn</th><th>E-post</th><th>Antall</th><th>Meldt på</th>{member.is_admin && <th aria-label="Handlinger" />}</tr></thead>
                  <tbody>
                    {details.signups.map((item) => (
                      <tr key={item.id}><td>{item.name}</td><td><a href={`mailto:${item.email}`}>{item.email}</a></td><td>{item.people_count}</td><td>{when(item.created_at)}</td>{member.is_admin && <td className="vel-mm-row-action"><button className="vel-mm-delete-link" type="button" disabled={busy} onClick={() => deleteSignup(item)}>Slett</button></td>}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="vel-empty"><strong>Ingen påmeldte ennå</strong></div>}
          </section>
        </div>

        {member.is_admin && settings && (
          <aside className="vel-side-card vel-mm-settings">
            <form onSubmit={saveSettings}>
              <h2>Innstillinger</h2>
              <label>Medlemmer varslet i StyreWeb
                <input type="number" min="0" value={settings.invitedCount} onChange={(e) => setSettings((s) => ({ ...s, invitedCount: e.target.value }))} />
              </label>
              <label>Dato for utsendelse
                <input type="date" value={settings.invitedOn} onChange={(e) => setSettings((s) => ({ ...s, invitedOn: e.target.value }))} />
              </label>
              <label className="vel-mm-check">
                <input type="checkbox" checked={settings.signupOpen} onChange={(e) => setSettings((s) => ({ ...s, signupOpen: e.target.checked }))} />
                Påmeldingen er åpen
              </label>
              <button className="vel-primary vel-full-button" type="submit" disabled={busy}>Lagre</button>
            </form>
            <div className="vel-mm-gdpr">
              <h2>Etter møtet</h2>
              <p>Vi har lovet at påmeldingslisten slettes når møtet er avholdt. Innspill beholdes.</p>
              <button className="vel-secondary-dark vel-full-button" type="button" disabled={busy || !details.signups.length} onClick={deleteSignups}>
                Slett påmeldingslisten
              </button>
              {!isPast && details.signups.length > 0 && <small>Møtet er ikke avholdt ennå.</small>}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
};

export default MedlemsmoteAdmin;
