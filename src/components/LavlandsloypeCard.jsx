const LavlandsloypeCard = ({ onOpen }) => (
  <section className="section tight">
    <div className="container">
      <div className="feature-card" onClick={onOpen} role="button" tabIndex={0}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen && onOpen(); } }}>
        <div className="feature-card-media">
          <picture>
            <source srcSet="/assets/photos/lavlandsloypen/lav1.avif" type="image/avif"/>
            <img src="/assets/photos/lavlandsloypen/lav1.avif" alt="Grussti gjennom myrlandskap på Lavlandsløypen"/>
          </picture>
        </div>
        <div className="feature-card-body">
          <div className="eyebrow summer"><span className="dot"/>Nytt · Lavlandsløypen</div>
          <h3>10 km grussti på tvers av Kvamskogen — året rundt.</h3>
          <p>Tilrettelagt for alle: gående, sykkel, barnefamilier og barnevogn. Åpen hele året, går i hovedsak på grusvei og lett sti. Klikk for interaktivt kart med foto langs ruta.</p>
          <span className="feature-card-cta">Åpne interaktivt kart →</span>
        </div>
      </div>
    </div>
  </section>
);

export default LavlandsloypeCard;
