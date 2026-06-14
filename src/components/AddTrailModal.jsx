import { useMemo, useState } from 'react';
import Icon from './Icons.jsx';
import { TRAIL_LEVELS, TRAIL_SEASONS } from '../lib/trailSuggestions.js';

const AddTrailModal = ({ onClose, onSubmit }) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    area: '',
    season: 'Sommer',
    level: 'Middels',
    duration: '',
    distance: '',
    elevation: '',
    description: '',
    tips: '',
    images: [],
    gpx: null,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });

  const update = (key) => (event) => {
    setForm({ ...form, [key]: event.target.value });
  };

  const imageSummary = useMemo(() => {
    const count = form.images.length;
    if (!count) return 'Ingen bilder valgt';
    if (count === 1) return '1 bilde valgt';
    return `${count} bilder valgt`;
  }, [form.images]);

  const updateImages = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 6);
    setForm((current) => ({ ...current, images: files }));
  };

  const updateGpx = (event) => {
    const file = event.target.files?.[0] || null;
    setForm((current) => ({ ...current, gpx: file }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await onSubmit?.(form);
      setSubmitted(true);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError?.message || 'Kunne ikke sende inn turforslaget akkurat nå. Prøv igjen om litt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal marketplace-modal" onClick={(event) => event.stopPropagation()}>
        {submitted ? (
          <div className="success">
            <div className="icon"><Icon name="check" size={26} /></div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, margin: '0 0 6px' }}>
              Takk for turforslaget!
            </h3>
            <p style={{ margin: 0, color: 'var(--color-fg-subtle)', fontSize: 14 }}>
              Du får en e-post for å bekrefte adressen din. Etter bekreftelsen blir turforslaget
              gjennomgått av en moderator før det publiseres.
            </p>
            <div style={{ marginTop: 18 }}>
              <button className="btn btn-primary" onClick={onClose}>Lukk</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <header>
              <div>
                <h3>Foreslå en tur</h3>
                <p>Del en favorittur på Kvamskogen. Kontaktinfo vises ikke offentlig.</p>
              </div>
              <button type="button" className="close" onClick={onClose} aria-label="Lukk">
                <Icon name="x" size={20} />
              </button>
            </header>
            <div className="body">
              <div className="field">
                <label htmlFor="trail-title">Turens navn</label>
                <input id="trail-title" required value={form.title} onChange={update('title')} placeholder="F.eks. Rundtur til Såta" />
              </div>
              <div className="field">
                <label htmlFor="trail-area">Startsted / møtested</label>
                <input id="trail-area" required value={form.area} onChange={update('area')} placeholder="F.eks. parkeringen ved Furedalen" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="trail-season">Sesong</label>
                  <select id="trail-season" value={form.season} onChange={update('season')}>
                    {TRAIL_SEASONS.map((season) => (
                      <option key={season}>{season}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="trail-level">Vanskelighetsgrad</label>
                  <select id="trail-level" value={form.level} onChange={update('level')}>
                    {TRAIL_LEVELS.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="trail-distance">Lengde</label>
                  <input id="trail-distance" value={form.distance} onChange={update('distance')} placeholder="F.eks. 8 km" />
                </div>
                <div className="field">
                  <label htmlFor="trail-duration">Tidsbruk</label>
                  <input id="trail-duration" value={form.duration} onChange={update('duration')} placeholder="F.eks. 3-4 t" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="trail-elevation">Stigning</label>
                <input id="trail-elevation" value={form.elevation} onChange={update('elevation')} placeholder="F.eks. ca. 500 hm, eller lite stigning" />
              </div>
              <div className="field">
                <label htmlFor="trail-description">Beskrivelse</label>
                <textarea
                  id="trail-description"
                  required
                  rows={5}
                  value={form.description}
                  onChange={update('description')}
                  placeholder="Beskriv turen, terreng, utsikt og hvem den passer for."
                />
              </div>
              <div className="field">
                <label htmlFor="trail-tips">Tips (valgfritt)</label>
                <textarea
                  id="trail-tips"
                  rows={2}
                  value={form.tips}
                  onChange={update('tips')}
                  placeholder="F.eks. ta med godt fottøy, best i tørt vær."
                />
              </div>
              <div className="field">
                <label htmlFor="trail-images">Bilder</label>
                <input id="trail-images" type="file" accept="image/*" multiple onChange={updateImages} />
                <span className="field-help">{imageSummary}. Maks 6 bilder.</span>
              </div>
              <div className="field">
                <label htmlFor="trail-gpx">GPX-spor (valgfritt)</label>
                <input id="trail-gpx" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onChange={updateGpx} />
                <span className="field-help">{form.gpx ? form.gpx.name : 'Last opp et GPX-spor hvis du har det.'}</span>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="trail-name">Navn</label>
                  <input id="trail-name" required value={form.contactName} onChange={update('contactName')} placeholder="Navn eller kallenavn" />
                </div>
                <div className="field">
                  <label htmlFor="trail-email">E-post</label>
                  <input id="trail-email" required type="email" value={form.contactEmail} onChange={update('contactEmail')} placeholder="Vises ikke offentlig" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="trail-phone">Telefon</label>
                <input id="trail-phone" type="tel" value={form.contactPhone} onChange={update('contactPhone')} placeholder="Valgfritt, brukes bare ved behov" />
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Avbryt</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sender...' : 'Send inn turforslag'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddTrailModal;
