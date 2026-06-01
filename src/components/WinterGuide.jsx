import Icon from './Icons.jsx';

const WINTER_AREAS = [
  {
    icon: 'heart',
    title: 'Familieturer',
    kicker: 'Lav terskel',
    image: '/assets/photos/winter/modalen-vinter.webp',
    body: 'Korte skiturer og lune mål der det er plass til pauser, kakao og barn som bruker litt tid.',
    places: ['Mødalssetrene', 'Steinskvanndalen', 'Furedalen-Mødal', 'Lavere skogsløyper'],
  },
  {
    icon: 'mountain',
    title: 'Toppturer',
    kicker: 'Høyere fjell',
    image: '/assets/photos/winter/saata-nysno-toppturarar.webp',
    body: 'Kvamskogen har flere klassiske topper for erfarne skifolk. Vær, skredfare og sikt må alltid vurderes før avgang.',
    places: ['Byrkjefjell', 'Såta', 'Tveitakvitingen', 'Topper mot 1 300 moh.'],
  },
  {
    icon: 'snowflake',
    title: 'Langrenn',
    kicker: 'Preppede spor',
    image: '/assets/photos/winter/preparerte-loyper.webp',
    body: 'Et stort sammenhengende løypenett gjør det mulig å velge alt fra rolige runder til lange dagsturer.',
    places: ['65 km preparert løypenett', 'Løypemaskiner på nattkjøring', 'Runder fra flere parkeringsplasser', 'Førestatus før tur'],
    stat: '65 km',
  },
  {
    icon: 'compass',
    title: 'Alpin',
    kicker: 'Heisbasert ski',
    image: '/assets/photos/winter/furedalen-alpin.webp',
    body: 'Furedalen og Eikedalen dekker to ulike skidager: nært og familievennlig, eller større anlegg med mer fart.',
    places: ['Furedalen', 'Eikedalen', 'Barnebakker og kveldskjøring', 'Sjekk åpne heiser'],
    action: 'Se skisentre',
    route: 'skisentre',
  },
];

const WinterGuide = ({ onNav }) => (
  <section className="winter-guide section" id="vinter">
    <div className="container">
      <div className="winter-guide-head">
        <div>
          <div className="eyebrow winter"><span className="dot"/>Vinter på Kvamskogen</div>
          <h2>Fire måter å bruke snøen på.</h2>
        </div>
        <p className="lede">
          Fra korte turer med barn til toppturer, langrenn og alpin. Her samler vi vinteren slik folk faktisk planlegger helgen.
        </p>
      </div>

      <div className="winter-guide-grid">
        {WINTER_AREAS.map((area) => (
          <article className="winter-guide-card" key={area.title}>
            <div className="winter-guide-photo" style={{ backgroundImage: `url('${area.image}')` }}>
              <span className="winter-guide-kicker">{area.kicker}</span>
              {area.stat && <strong className="winter-guide-stat">{area.stat}</strong>}
            </div>
            <div className="winter-guide-body">
              <div className="winter-guide-title">
                <span><Icon name={area.icon} size={20}/></span>
                <h3>{area.title}</h3>
              </div>
              <p>{area.body}</p>
              <ul>
                {area.places.map((place) => <li key={place}>{place}</li>)}
              </ul>
              {area.route && (
                <button className="btn-ghost" type="button" onClick={() => onNav(area.route)}>
                  {area.action} <Icon name="arrow-right" size={15}/>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default WinterGuide;
