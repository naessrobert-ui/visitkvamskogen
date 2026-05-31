import { useState } from 'react';
import Icon from './Icons.jsx';

const ActivityQuestionModal = ({ activity, onClose, onSubmit }) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    question: '',
  });

  const update = (key) => (event) => {
    setForm({ ...form, [key]: event.target.value });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await onSubmit({
        ...form,
        activityId: activity.id,
      });
      setSubmitted(true);
    } catch (_) {
      setError('Kunne ikke sende spørsmålet akkurat nå. Prøv igjen om litt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        {submitted ? (
          <div className="success">
            <div className="icon"><Icon name="check" size={26} /></div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, margin: '0 0 6px' }}>
              Spørsmålet er sendt
            </h3>
            <p style={{ margin: 0, color: 'var(--color-fg-subtle)', fontSize: 14 }}>
              Spørsmålet er synlig for alle, og arrangør har fått varsel på e-post.
            </p>
            <div style={{ marginTop: 18 }}>
              <button className="btn btn-primary" onClick={onClose}>Lukk</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <header>
              <div>
                <h3>Still et spørsmål</h3>
                <p>{activity.title}</p>
              </div>
              <button type="button" className="close" onClick={onClose} aria-label="Lukk">
                <Icon name="x" size={20} />
              </button>
            </header>
            <div className="body">
              <div className="field-row">
                <div className="field">
                  <label htmlFor="question-name">Navn</label>
                  <input id="question-name" value={form.name} onChange={update('name')} placeholder="Valgfritt" />
                </div>
                <div className="field">
                  <label htmlFor="question-email">E-post</label>
                  <input id="question-email" type="email" value={form.email} onChange={update('email')} placeholder="Valgfritt" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="question-text">Spørsmål</label>
                <textarea
                  id="question-text"
                  required
                  rows={4}
                  value={form.question}
                  onChange={update('question')}
                  placeholder="Hva lurer du på?"
                />
              </div>
              <p className="privacy-note">
                Spørsmålet publiseres med en gang. E-post vises ikke offentlig.
              </p>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Avbryt</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sender...' : 'Send spørsmål'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ActivityQuestionModal;
