import { useState } from 'react';
import Icon from './Icons.jsx';

const AddActivityModal = ({ onClose, onSubmit }) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    type: 'Tur',
    date: '',
    time: '',
    place: '',
    price: 'Gratis',
    organizer: '',
    email: '',
    description: '',
    organizerNote: '',
    qaText: '',
  });

  const update = (key) => (event) => {
    setForm({ ...form, [key]: event.target.value });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await onSubmit?.(form);
      setSubmitted(true);
    } catch (_) {
      setError('Kunne ikke sende inn aktiviteten akkurat nå. Prøv igjen om litt.');
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
              Takk for bidraget!
            </h3>
            <p style={{ margin: 0, color: 'var(--color-fg-subtle)', fontSize: 14 }}>
              Aktiviteten er sendt inn og vises på aktivitetssiden.
            </p>
            <div style={{ marginTop: 18 }}>
              <button className="btn btn-primary" onClick={onClose}>Lukk</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <header>
              <div>
                <h3>Legg til en aktivitet</h3>
                <p>Foreslå en tur, et arrangement eller en dugnad. E-post brukes kun ved behov for oppfølging.</p>
              </div>
              <button type="button" className="close" onClick={onClose} aria-label="Lukk">
                <Icon name="x" size={20} />
              </button>
            </header>
            <div className="body">
              <div className="field">
                <label htmlFor="activity-title">Aktivitetens navn</label>
                <input id="activity-title" required value={form.title} onChange={update('title')} placeholder="F.eks. Felles topptur til Såta" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="activity-type">Type aktivitet</label>
                  <select id="activity-type" value={form.type} onChange={update('type')}>
                    <option>Tur</option>
                    <option>Ski</option>
                    <option>Barn og familie</option>
                    <option>Kurs</option>
                    <option>Dugnad</option>
                    <option>Sosialt</option>
                    <option>Annet</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="activity-price">Pris/kostnad</label>
                  <input id="activity-price" value={form.price} onChange={update('price')} placeholder="Gratis, 100 kr, eller annet" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="activity-date">Dato</label>
                  <input id="activity-date" required type="date" value={form.date} onChange={update('date')} />
                </div>
                <div className="field">
                  <label htmlFor="activity-time">Klokken</label>
                  <input id="activity-time" type="time" value={form.time} onChange={update('time')} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="activity-place">Møtested</label>
                <input id="activity-place" required value={form.place} onChange={update('place')} placeholder="F.eks. parkeringsplassen ved Furedalen" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="activity-organizer">Arrangør/navn</label>
                  <input id="activity-organizer" value={form.organizer} onChange={update('organizer')} placeholder="Person, lag eller bedrift" />
                </div>
                <div className="field">
                  <label htmlFor="activity-email">E-post</label>
                  <input id="activity-email" type="email" value={form.email} onChange={update('email')} placeholder="Vises ikke offentlig" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="activity-description">Kort beskrivelse</label>
                <textarea
                  id="activity-description"
                  required
                  rows={4}
                  value={form.description}
                  onChange={update('description')}
                  placeholder="Hva skjer, hvem passer det for, og hva bør folk ta med?"
                />
              </div>
              <div className="field">
                <label htmlFor="activity-organizer-note">Melding fra arrangør</label>
                <textarea
                  id="activity-organizer-note"
                  rows={2}
                  value={form.organizerNote}
                  onChange={update('organizerNote')}
                  placeholder="Valgfritt, f.eks. møt presis eller ta med brodder."
                />
              </div>
              <div className="field">
                <label htmlFor="activity-qa">Spørsmål og svar</label>
                <textarea
                  id="activity-qa"
                  rows={3}
                  value={form.qaText}
                  onChange={update('qaText')}
                  placeholder="Valgfritt, f.eks. Passer det for barn? Ja, fra ca. 8 år."
                />
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Avbryt</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sender...' : 'Send inn'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddActivityModal;
