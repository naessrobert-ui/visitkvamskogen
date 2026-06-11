import { useState } from 'react';
import Icon from './Icons.jsx';
import ActivitySignupModal from './ActivitySignupModal.jsx';
import ActivityQuestionModal from './ActivityQuestionModal.jsx';
import { createQuestion, createSignup, deleteActivities } from '../lib/activities.js';
import { SAMPLE_ACTIVITIES } from '../data/sampleActivities.js';


const formatDate = (value) => {
  if (!value) return 'Dato kommer';
  return new Intl.DateTimeFormat('no-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${value}T12:00:00`));
};

const signupText = (count = 0) => {
  if (count === 1) return '1 person påmeldt';
  return `${count} personer påmeldt`;
};

const CommunityActivityCard = ({
  activity,
  adminMode,
  deleting,
  selected,
  onDelete,
  onQuestion,
  onSelect,
  onSignup,
}) => (
  <article className="community-activity-card">
    {adminMode && (
      <label className="activity-admin-select">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(activity.id, event.target.checked)}
          disabled={deleting}
        />
        Velg for sletting
      </label>
    )}
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
      <div>
        <dt><Icon name="check" size={15} />Påmeldte</dt>
        <dd>{signupText(activity.signup_count)}</dd>
      </div>
    </dl>
    <details className="activity-dialog">
      <summary>Spørsmål og svar</summary>
      <div className="activity-dialog-body">
        {activity.organizer_note && (
          <p><strong>Fra arrangør:</strong> {activity.organizer_note}</p>
        )}
        {activity.qa_text ? (
          <p>{activity.qa_text}</p>
        ) : !activity.questions?.length && (
          <p>Arrangøren har ikke lagt inn spørsmål og svar ennå.</p>
        )}
        {activity.questions?.length > 0 && (
          <div className="activity-questions">
            {activity.questions.map((question) => (
              <div key={question.id} className="activity-question">
                <p><strong>Spørsmål:</strong> {question.question}</p>
                <p><strong>Svar:</strong> {question.answer || 'Ikke besvart ennå'}</p>
              </div>
            ))}
          </div>
        )}
        <button className="btn-ghost" onClick={() => onQuestion(activity)}>
          Still et spørsmål
        </button>
      </div>
    </details>
    <div className="community-card-actions">
      <button className="btn btn-secondary btn-sm" onClick={() => onSignup(activity)}>
        Meld meg på
      </button>
      {adminMode && (
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete([activity.id])}
          disabled={deleting}
        >
          Slett
        </button>
      )}
    </div>
  </article>
);

const CommunityActivities = ({
  activities = [],
  loading = false,
  error = '',
  supabaseConfigured = false,
  onActivitiesDeleted,
  onAdd,
}) => {
  const [signupActivity, setSignupActivity] = useState(null);
  const [questionActivity, setQuestionActivity] = useState(null);
  const [localSignupCounts, setLocalSignupCounts] = useState({});
  const [adminCode, setAdminCode] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);
  const [deleteStatus, setDeleteStatus] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const visibleActivities = supabaseConfigured ? activities : SAMPLE_ACTIVITIES;
  const activitiesWithLocalCounts = visibleActivities.map((activity) => ({
    ...activity,
    signup_count: Number(activity.signup_count || 0) + Number(localSignupCounts[activity.id] || 0),
  }));
  const sourceText = supabaseConfigured
    ? 'Aktiviteter hentes fra Supabase.'
    : 'Eksempelinnhold vises til Supabase-nøkler er lagt inn lokalt.';

  const handleSignup = async (signup) => {
    await createSignup(signup);
    setLocalSignupCounts((counts) => ({
      ...counts,
      [signup.activityId]: Number(counts[signup.activityId] || 0) + Number(signup.peopleCount || 1),
    }));
  };

  const handleAdminCode = (event) => {
    const value = event.target.value.trim().toLowerCase();
    setAdminCode(value);
    if (value === 'adm007') {
      setAdminMode(true);
      setDeleteError('');
    }
  };

  const toggleSelectedActivity = (activityId, checked) => {
    setSelectedActivityIds((ids) => {
      if (checked) return [...new Set([...ids, activityId])];
      return ids.filter((id) => id !== activityId);
    });
  };

  const handleDelete = async (activityIds) => {
    const ids = [...new Set(activityIds || selectedActivityIds)].filter(Boolean);
    if (!ids.length) return;

    const message = ids.length === 1
      ? 'Slette denne aktiviteten?'
      : `Slette ${ids.length} aktiviteter?`;
    if (!window.confirm(message)) return;

    setDeleting(true);
    setDeleteStatus('');
    setDeleteError('');
    try {
      const result = await deleteActivities({ activityIds: ids, code: adminCode });
      const deletedIds = result.deletedIds?.length ? result.deletedIds : ids;
      onActivitiesDeleted?.(deletedIds);
      setSelectedActivityIds((currentIds) => currentIds.filter((id) => !deletedIds.includes(id)));
      setDeleteStatus(deletedIds.length === 1 ? 'Aktiviteten ble slettet.' : `${deletedIds.length} aktiviteter ble slettet.`);
    } catch (_) {
      setDeleteError('Kunne ikke slette aktivitetene akkurat nå.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="section community-page">
      <div className="container">
        <input
          className="admin-ghost-code"
          type="password"
          value={adminCode}
          onChange={handleAdminCode}
          aria-label="Adminkode"
          autoComplete="off"
          tabIndex={0}
        />
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
          <div className="community-toolbar-actions">
            {adminMode && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(selectedActivityIds)}
                disabled={deleting || selectedActivityIds.length === 0}
              >
                Slett valgte
              </button>
            )}
            <span>{activitiesWithLocalCounts.length} aktiviteter</span>
          </div>
        </div>

        {error && <div className="community-alert">{error}</div>}
        {deleteStatus && <div className="community-alert community-alert-success">{deleteStatus}</div>}
        {deleteError && <div className="community-alert">{deleteError}</div>}
        {supabaseConfigured && !loading && !error && activitiesWithLocalCounts.length === 0 && (
          <div className="community-empty">
            Det ligger ingen kommende aktiviteter inne ennå.
          </div>
        )}

        <div className="community-activity-list">
          {activitiesWithLocalCounts.map((activity) => (
            <CommunityActivityCard
              key={activity.id}
              activity={activity}
              adminMode={adminMode}
              deleting={deleting}
              selected={selectedActivityIds.includes(activity.id)}
              onDelete={handleDelete}
              onQuestion={setQuestionActivity}
              onSelect={toggleSelectedActivity}
              onSignup={setSignupActivity}
            />
          ))}
        </div>
      </div>
      {signupActivity && (
        <ActivitySignupModal
          activity={signupActivity}
          onClose={() => setSignupActivity(null)}
          onSubmit={handleSignup}
        />
      )}
      {questionActivity && (
        <ActivityQuestionModal
          activity={questionActivity}
          onClose={() => setQuestionActivity(null)}
          onSubmit={createQuestion}
        />
      )}
    </section>
  );
};

export default CommunityActivities;
