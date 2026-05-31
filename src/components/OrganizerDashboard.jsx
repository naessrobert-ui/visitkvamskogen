import { useEffect, useState } from 'react';
import { answerActivityQuestion, loadOrganizerActivity } from '../lib/activities.js';

const OrganizerDashboard = ({ access }) => {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState('');

  const load = async () => {
    if (!access?.activityId || !access?.token) {
      setError('Arrangørlenken mangler eller er ugyldig.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await loadOrganizerActivity(access);
      if (!data) {
        setError('Fant ikke aktivitet for denne arrangørlenken.');
      } else {
        setActivity(data);
      }
    } catch (_) {
      setError('Kunne ikke hente arrangørpanelet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveAnswer = async (questionId) => {
    const answer = (answers[questionId] || '').trim();
    if (!answer) return;

    setSaving(questionId);
    setError('');
    try {
      await answerActivityQuestion({
        activityId: access.activityId,
        token: access.token,
        questionId,
        answer,
      });
      setAnswers((current) => ({ ...current, [questionId]: '' }));
      await load();
    } catch (_) {
      setError('Kunne ikke lagre svaret.');
    } finally {
      setSaving('');
    }
  };

  if (loading) {
    return (
      <section className="section organizer-page">
        <div className="container"><p>Henter arrangørpanel...</p></div>
      </section>
    );
  }

  return (
    <section className="section organizer-page">
      <div className="container">
        <div className="organizer-header">
          <div>
            <div className="eyebrow summer"><span className="dot" />Arrangørpanel</div>
            <h1>{activity?.title || 'Arrangørlenke'}</h1>
            <p className="lede">Se påmeldinger og svar på spørsmål for denne aktiviteten.</p>
          </div>
        </div>

        {error && <div className="community-alert">{error}</div>}

        {activity && (
          <div className="organizer-grid">
            <section className="organizer-panel">
              <h2>Påmeldinger</h2>
              <p>{activity.signup_people_count || 0} personer påmeldt</p>
              <div className="organizer-list">
                {(activity.signups || []).length ? activity.signups.map((signup) => (
                  <article key={signup.id}>
                    <strong>{signup.name}</strong>
                    <span>{signup.people_count} person(er)</span>
                    <span>{signup.email}{signup.phone ? ` · ${signup.phone}` : ''}</span>
                    {signup.message && <p>{signup.message}</p>}
                  </article>
                )) : <p>Ingen påmeldinger ennå.</p>}
              </div>
            </section>

            <section className="organizer-panel">
              <h2>Spørsmål</h2>
              <div className="organizer-list">
                {(activity.questions || []).length ? activity.questions.map((question) => (
                  <article key={question.id}>
                    <strong>{question.question}</strong>
                    {question.answer ? (
                      <p><b>Svar:</b> {question.answer}</p>
                    ) : (
                      <>
                        <textarea
                          rows={3}
                          value={answers[question.id] || ''}
                          onChange={(event) => setAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))}
                          placeholder="Skriv svar til spørsmålet"
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={saving === question.id}
                          onClick={() => saveAnswer(question.id)}
                        >
                          {saving === question.id ? 'Lagrer...' : 'Publiser svar'}
                        </button>
                      </>
                    )}
                  </article>
                )) : <p>Ingen spørsmål ennå.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
};

export default OrganizerDashboard;
