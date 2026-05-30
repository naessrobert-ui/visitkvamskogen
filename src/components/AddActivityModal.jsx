import { useState } from 'react';
import Icon from './Icons.jsx';

const AddActivityModal = ({ onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: 'Skitur til Mødal',
    season: 'Vår',
    date: '2026-05-09',
    time: '10.00',
    place: 'Furedalen',
    desc: 'Åpen skitur for familier — vi går rolig og tar pause på Mødal.',
  });
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="success">
            <div className="icon"><Icon name="check" size={26}/></div>
            <h3 style={{fontFamily:'var(--font-display)', fontSize:24, fontWeight:500, margin:'0 0 6px'}}>Takk for bidraget!</h3>
            <p style={{margin:0, color:'var(--color-fg-subtle)', fontSize:14}}>Aktiviteten er sendt til moderasjon. Vi legger den ut innen ett døgn.</p>
            <div style={{marginTop:18}}><button className="btn btn-primary" onClick={onClose}>Lukk</button></div>
          </div>
        ) : (
          <>
            <header>
              <div>
                <h3>Legg til en aktivitet</h3>
                <p>Foreslå en tur, et arrangement eller en dugnad. Vi modererer før det blir publisert.</p>
              </div>
              <button className="close" onClick={onClose} aria-label="Lukk"><Icon name="x" size={20}/></button>
            </header>
            <div className="body">
              <div className="field"><label>Aktivitetens navn</label><input value={form.name} onChange={update('name')}/></div>
              <div className="field-row">
                <div className="field"><label>Sesong</label>
                  <select value={form.season} onChange={update('season')}><option>Vår</option><option>Sommer</option><option>Høst</option><option>Vinter</option></select>
                </div>
                <div className="field"><label>Sted</label><input value={form.place} onChange={update('place')}/></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Dato</label><input type="date" value={form.date} onChange={update('date')}/></div>
                <div className="field"><label>Klokken</label><input value={form.time} onChange={update('time')}/></div>
              </div>
              <div className="field"><label>Kort beskrivelse</label><textarea rows={3} value={form.desc} onChange={update('desc')}/></div>
            </div>
            <div className="actions">
              <button className="btn btn-secondary" onClick={onClose}>Avbryt</button>
              <button className="btn btn-primary" onClick={() => setSubmitted(true)}>Send inn</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddActivityModal;
