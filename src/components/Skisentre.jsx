import Icon from './Icons.jsx';

const CENTERS = [
  {
    name: 'Furedalen Alpin',
    kicker: 'Familievennlig anlegg',
    photoClass: 'ski-center-photo-furedalen',
    body: 'Furedalen passer godt for barnefamilier, nye alpinister og hyttefolk som vil ha en kort vei fra frokostbordet til bakken. Anlegget er oversiktlig, nært mange hyttefelt og lett å bruke for en rolig skidag.',
    highlights: ['Familievennlig profil', 'Nært hyttefeltene på Kvamskogen', 'Godt valg for barn og nybegynnere'],
    facts: [
      ['Passer best for', 'familier og nærmiljø'],
      ['Stemning', 'lun og oversiktlig'],
    ],
    href: 'https://furedalen.no/',
    cta: 'Gå til Furedalen',
  },
  {
    name: 'Eikedalen Skisenter',
    kicker: 'Større og brattere',
    photoClass: 'ski-center-photo-eikedalen',
    body: 'Eikedalen har mer variasjon og mer krevende nedfarter for deg som vil ha fart, høydefølelse og lengre turer. Stolheisen på 1800 meter er blant Nord-Europas lengste og gir anlegget et tydelig fjellpreg.',
    highlights: ['Mer krevende løyper', '1800 meter stolheis', 'Større variasjon i terrenget'],
    facts: [
      ['Passer best for', 'viderekomne og eventyrlystne'],
      ['Signatur', 'lang stolheis og høydefølelse'],
    ],
    href: 'https://www.eikedalen.no/',
    cta: 'Gå til Eikedalen',
  },
];

const SkiCenterCard = ({ center }) => (
  <article className="ski-center-card">
    <div className={'ski-center-photo ' + center.photoClass}>
      <div className="ski-center-photo-label">{center.kicker}</div>
    </div>
    <div className="ski-center-body">
      <div className="eyebrow winter"><span className="dot"/>{center.kicker}</div>
      <h3>{center.name}</h3>
      <p>{center.body}</p>
      <ul className="ski-center-highlights">
        {center.highlights.map((highlight) => (
          <li key={highlight}>
            <Icon name="check" size={15}/>
            <span>{highlight}</span>
          </li>
        ))}
      </ul>
      <dl className="ski-center-facts">
        {center.facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <a className="btn btn-primary" href={center.href} target="_blank" rel="noopener">
        {center.cta}
      </a>
    </div>
  </article>
);

const Skisentre = () => (
  <section className="ski-centers-page">
    <div className="ski-centers-hero">
      <div className="container">
        <div className="ski-centers-hero-content">
          <div className="eyebrow winter"><span className="dot"/>Alpint på Kvamskogen</div>
          <h1>To skisentre, to ulike skidager.</h1>
          <p>
            Kvamskogen har både Furedalen og Eikedalen. Det ene er nært, oversiktlig og familievennlig. Det andre er større, brattere og laget for deg som vil ha mer fart og lengre heisturer.
          </p>
        </div>
      </div>
    </div>

    <div className="container">
      <div className="ski-centers-intro">
        <div>
          <Icon name="snowflake" size={24}/>
          <span>Velg Furedalen når dagen skal være enkel og sosial.</span>
        </div>
        <div>
          <Icon name="mountain" size={24}/>
          <span>Velg Eikedalen når du vil ha mer terreng og lengre nedfarter.</span>
        </div>
      </div>

      <div className="ski-centers-grid">
        {CENTERS.map((center) => (
          <SkiCenterCard key={center.name} center={center}/>
        ))}
      </div>

      <div className="ski-centers-note">
        <h2>Før du reiser</h2>
        <p>
          Sjekk åpningstider, føre og heiskort direkte hos skisentrene. Værforholdene på Kvamskogen kan skifte fort, og åpne heiser varierer gjennom sesongen.
        </p>
        <div className="ski-centers-note-actions">
          <a className="btn btn-secondary" href="https://furedalen.no/webkamera-1.html" target="_blank" rel="noopener">Webkamera Furedalen</a>
          <a className="btn btn-secondary" href="https://www.eikedalen.no/web-kamera/" target="_blank" rel="noopener">Webkamera Eikedalen</a>
        </div>
      </div>
    </div>
  </section>
);

export default Skisentre;
