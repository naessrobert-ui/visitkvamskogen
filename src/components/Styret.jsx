import { useState } from 'react';
import { STYRET } from '../data/styret.js';

const profilIdFor = (navn) => `profil-${navn.toLowerCase().replace(/\s+/g, '-')}`;

const StyreCard = ({ medlem }) => {
  const [visProfil, setVisProfil] = useState(false);
  const profilId = profilIdFor(medlem.navn);

  return (
    <article className="vel-board-card">
      <div className="vel-board-card-top">
        {medlem.bilde ? (
          <img className="vel-board-photo" src={medlem.bilde} alt={medlem.navn} loading="lazy"/>
        ) : (
          <div className="vel-board-photo vel-board-photo-placeholder" aria-hidden="true">{medlem.navn.charAt(0)}</div>
        )}
        <div>
          <h3>{medlem.navn}</h3>
          <p>{medlem.rolle}</p>
        </div>
      </div>
      <div className="vel-board-contact">
        <a href={`mailto:${medlem.epost}`}>{medlem.epost}</a>
        <a href={`tel:${medlem.telefon.replace(/\s/g, '')}`}>{medlem.telefon}</a>
      </div>
      <button
        className="vel-board-profile"
        type="button"
        aria-expanded={visProfil}
        aria-controls={profilId}
        onClick={() => setVisProfil((apen) => !apen)}
      >
        Min tilknytning til Kvamskogen {visProfil ? '↑' : '↓'}
      </button>
      {visProfil ? (
        <div className="vel-board-bio" id={profilId}>
          {medlem.profil.map((avsnitt) => <p key={avsnitt}>{avsnitt}</p>)}
        </div>
      ) : null}
    </article>
  );
};

const Styret = ({ onNav }) => (
  <section className="section vel-page vel-board-page">
    <div className="container">
      <header className="vel-board-hero">
        <div>
          <button className="text-link-button" type="button" onClick={() => onNav('tilbud')}>← Tilbake til Kvamskogen Vel</button>
          <div className="eyebrow summer"><span className="dot"/>Styret</div>
          <h1>Styret i Kvamskogen Vel</h1>
          <p className="lede">
            Ta kontakt med styret i saker som gjelder medlemskap, parkering, planer og fellesinteresser på Kvamskogen. Under finner du kontaktinformasjon og presentasjoner fra styret.
          </p>
        </div>
        <aside className="vel-board-summary" aria-label="Kort om styret">
          <span>Kontakt</span>
          <p>Foreningen ledes av 5 styremedlemmer og 2 varamedlemmer, og skal så langt som mulig representere de ulike områdene på Kvamskogen.</p>
        </aside>
      </header>

      <div className="vel-board-grid vel-board-grid-page">
        {STYRET.map((medlem) => <StyreCard medlem={medlem} key={medlem.navn}/>)}
      </div>
    </div>
  </section>
);

export default Styret;
