import Link from './Link.jsx';

const LavlandsloypeCard = () => (
  <section className="section tight">
    <div className="container">
      <Link className="feature-card" to="/lavlandsloypen">
        <div className="feature-card-media">
          <picture>
            <img src="/assets/photos/lavlandsloypen/lavland.png" alt="Kollasj med opplevelser langs Lavlandsløypen"/>
          </picture>
        </div>
        <div className="feature-card-body">
          <div className="eyebrow summer"><span className="dot"/>Nytt · Lavlandsløypen</div>
          <h3>10 km grussti på tvers av Kvamskogen — året rundt.</h3>
          <p>Tilrettelagt for alle: gående, sykkel, barnefamilier og barnevogn. Åpen hele året, går i hovedsak på grusvei og lett sti. Klikk for interaktivt kart med foto langs ruta.</p>
          <span className="feature-card-cta">Åpne interaktivt kart →</span>
        </div>
      </Link>
    </div>
  </section>
);

export default LavlandsloypeCard;
