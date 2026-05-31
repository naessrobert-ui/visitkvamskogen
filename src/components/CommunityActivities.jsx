import { useState } from 'react';
import Icon from './Icons.jsx';
import ActivitySignupModal from './ActivitySignupModal.jsx';
import { createSignup } from '../lib/activities.js';

const SAMPLE_ACTIVITIES = [
  {
    id: 'sample-1',
    title: 'Felles kveldstur til Såta',
    type: 'Tur',
    date: '2026-06-06',
    time: '18:00',
    place: 'Parkeringsplassen ved Furedalen',
    price: 'Gratis',
    organizer: 'Kvamskogen-turgjengen',
    description: 'Rolig fellestur for voksne og ungdom. Ta med hodelykt om været trekker inn.',
  },
  {
    id: 'sample-2',
    title: 'Barnas fiskedag ved Måvotno',
    type: 'Barn og familie',
    date: '2026-06-13',
    time: '11:00',
    place: 'Møt ved stien fra Mødalen',
    price: '50 kr per familie',
    organizer: 'Lokale hyttefolk',
    description: 'En lavterskel formiddag med fisking, bålkaffe og premie til alle barn som prøver.',
  },
  {
    id: 'sample-3',
    title: 'Dugnad på lavlandsløypen',
    type: 'Dugnad',
    date: '2026-06-20',
    time: '10:00',
    place: 'Start ved Tokagjelet-siden',
    price: 'Gratis',
    organizer: 'Kvamskogen Vel',
    description: 'Vi rydder kvist og gjør traseen klar for sommerbruk. Ta med arbeidshansker.',
  },
];

const formatDate = (value) => {
  if (!value) return 'Dato kommer';
  return new Intl.DateTimeFormat('no-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${value}T12:00:00`));
};

const CommunityActivityCard = ({ activity, onSignup }) => (
  <article className="community-activity-card">
    <div className="community-card-top">
      <span className="tag tag-ok"><span className="dot" />{activity.type}</span>
      <span className="community-price">{activity.price || 'Gratis'}</span>
    </div>
    <h3>{activity.title}</h3>
    <p>{activity.description}</p>
    <dl className="community-meta">
      <div>
        <dt><Icon name="calendar" size={15} />Når</dt>
        <dd>{formatDate(activity.date)}{activity.time ? ` kl. ${activity.time}` : ''}</dd>
      </div>
      <div>
        <dt><Icon name="map-pin" size={15} />Møtested</dt>
        <dd>{activity.place}</dd>
      </div>
      <div>
        <dt><Icon name="heart" size={15} />Arrangør</dt>
        <dd>{activity.organizer || 'Ikke oppgitt'}</dd>
      </div>
    </dl>
    <div className="community-card-actions">
      <button className="btn btn-secondary btn-sm" onClick={() => onSignup(activity)}>
        Meld meg på
      </button>
    </div>
  </article>
);

const CommunityActivities = ({
  activities = [],
  loading = false,
  error = '',
  supabaseConfigured = false,
  onAdd,
}) => {
  const [signupActivity, setSignupActivity] = useState(null);
  const visibleActivities = supabaseConfigured ? activities : SAMPLE_ACTIVITIES;
  const sourceText = supabaseConfigured
    ? 'Aktiviteter hentes fra Supabase.'
    : 'Eksempelinnhold vises til Supabase-nøkler er lagt inn lokalt.';

  return (
    <section className="section community-page">
      <div className="container">
        <div className="community-hero">
          <div>
            <div className="eyebrow summer"><span className="dot" />Aktiviteter fra folk på Kvamskogen</div>
            <h1>Legg inn det som skjer på fjellet</h1>
            <p className="lede">
              Tur, kurs, dugnad, familiedag eller sosial samling. Siden er laget for enkle,
              lokale aktiviteter med tydelig dato, møtested og eventuell pris.
            </p>
            <div className="community-actions">
              <button className="btn btn-accent" onClick={onAdd}>
                <Icon name="plus" size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
                Legg inn aktivitet
              </button>
            </div>
          </div>
          <aside className="community-note" aria-label="Slik fungerer innsendte aktiviteter">
            <strong>Enkel start</strong>
            <p>
              Aktiviteter kan sendes inn uten konto. E-post brukes bare for kontakt
              og kan senere kobles til bekreftelse eller moderering.
            </p>
            <ul>
              <li>Type aktivitet</li>
              <li>Dato og klokkeslett</li>
              <li>Påmelding ved behov</li>
              <li>Pris og møtested</li>
              <li>Arrangør og kontakt</li>
            </ul>
          </aside>
        </div>

        <div className="community-toolbar">
          <div>
            <h2>Kommende aktiviteter</h2>
            <p>{loading ? 'Henter aktiviteter...' : sourceText}</p>
          </div>
          <span>{visibleActivities.length} aktiviteter</span>
        </div>

        {error && <div className="community-alert">{error}</div>}
        {supabaseConfigured && !loading && !error && visibleActivities.length === 0 && (
          <div className="community-empty">
            Det ligger ingen kommende aktiviteter inne ennå.
          </div>
        )}

        <div className="community-activity-list">
          {visibleActivities.map((activity) => (
            <CommunityActivityCard key={activity.id} activity={activity} onSignup={setSignupActivity} />
          ))}
        </div>
      </div>
      {signupActivity && (
        <ActivitySignupModal
          activity={signupActivity}
          onClose={() => setSignupActivity(null)}
          onSubmit={createSignup}
        />
      )}
    </section>
  );
};

export default CommunityActivities;
