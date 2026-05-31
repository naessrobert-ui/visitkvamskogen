import { useState } from 'react';
import Icon from './Icons.jsx';

const ActivitySignupModal = ({ activity, onClose, onSubmit }) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    peopleCount: '1',
    message: '',
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
      setError('Kunne ikke registrere påmeldingen akkurat nå. Prøv igjen om litt.');
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
              Du er påmeldt
            </h3>
            <p style={{ margin: 0, color: 'var(--color-fg-subtle)', fontSize: 14 }}>
              Påmeldingen er registrert. Arrangøren kan bruke kontaktinfoen ved endringer.
            </p>
            <div style={{ marginTop: 18 }}>
              <button className="btn btn-primary" onClick={onClose}>Lukk</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <header>
              <div>
                <h3>Meld deg på</h3>
                <p>{activity.title}</p>
              </div>
              <button type="button" className="close" onClick={onClose} aria-label="Lukk">
                <Icon name="x" size={20} />
              </button>
            </header>
            <div className="body">
              <div className="field">
                <label htmlFor="signup-name">Navn</label>
                <input id="signup-name" required value={form.name} onChange={update('name')} placeholder="Ditt navn" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="signup-email">E-post</label>
                  <input id="signup-email" required type="email" value={form.email} onChange={update('email')} placeholder="navn@eksempel.no" />
                </div>
                <div className="field">
                  <label htmlFor="signup-phone">Telefon</label>
                  <input id="signup-phone" value={form.phone} onChange={update('phone')} placeholder="Valgfritt" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="signup-people">Antall personer</label>
                <input id="signup-people" required min="1" max="20" type="number" value={form.peopleCount} onChange={update('peopleCount')} />
              </div>
              <div className="field">
                <label htmlFor="signup-message">Melding til arrangør</label>
                <textarea
                  id="signup-message"
                  rows={3}
                  value={form.message}
                  onChange={update('message')}
                  placeholder="Valgfritt, f.eks. barnas alder, allergier eller spørsmål"
                />
              </div>
              <p className="privacy-note">
                Kontaktinfo vises ikke offentlig og brukes bare til denne aktiviteten.
              </p>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Avbryt</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Melder på...' : 'Meld meg på'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ActivitySignupModal;
