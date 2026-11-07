import { useEffect, useRef, useState } from 'react';

const KILDE = 'https://blirdetfint.no';

const startHøyde = () => {
  try {
    const h = new URLSearchParams(window.location.search).get('hoyde');
    return h && /^\d{1,4}$/.test(h) ? h : '';
  } catch {
    return '';
  }
};

const Snovarsel = () => {
  const ramme = useRef(null);
  const [høyde] = useState(startHøyde);
  const [rammehøyde, setRammehøyde] = useState(1800);

  useEffect(() => {
    // Siden i rammen melder sin egen høyde, så vi slipper indre rullefelt.
    const motta = (event) => {
      if (event.origin !== KILDE || event.source !== ramme.current?.contentWindow) return;
      if (event.data?.type === 'snovarsel-hoyde' && Number.isFinite(event.data.h)) {
        setRammehøyde(Math.max(600, Math.ceil(event.data.h) + 8));
      }
    };
    window.addEventListener('message', motta);
    return () => window.removeEventListener('message', motta);
  }, []);

  const src = `${KILDE}/varsel-kvamskogen?embed=1${høyde ? `&hoyde=${høyde}` : ''}`;

  return (
    <section className="section tight snovarsel">
      <div className="container">
        <div className="snovarsel-ramme">
          <iframe
            ref={ramme}
            src={src}
            title="Snøvarsel for Kvamskogen: snødybde de neste 15 døgnene"
            style={{ height: rammehøyde }}
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <p className="snovarsel-fot">
          Modellen regner snø og smelting ut fra temperatur og nedbør, og er et anslag, ikke en måling.{' '}
          <a href={`${KILDE}/varsel-kvamskogen`} target="_blank" rel="noopener noreferrer">Åpne snøvarselet i eget vindu ↗</a>
        </p>
      </div>
    </section>
  );
};

export default Snovarsel;
