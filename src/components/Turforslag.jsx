import Icon from './Icons.jsx';
import LavlandsloypeCard from './LavlandsloypeCard.jsx';

const TURER = [
  {
    title: 'Lavlandsløypen',
    place: 'Tokagjelet / NAF / Røytli',
    image: '/assets/photos/lavlandsloypen/hero.webp',
    season: 'Helår',
    level: 'Lett',
    time: '2-3 t',
    km: '10 km',
    climb: 'Lite stigning',
    text: 'Grusvei og lett sti på tvers av Kvamskogen. Fin for barnefamilier, sykkel og en rolig dag ute.',
    route: 'lavlandsloypen',
  },
  {
    title: 'Såta',
    place: 'Modalen / Furedalen',
    image: '/assets/photos/summer/saata-sommar.webp',
    season: 'Sommer',
    level: 'Middels',
    time: '3-4 t',
    km: '6-8 km',
    climb: 'Ca. 500 hm',
    text: 'Klassisk fjelltur med god utsikt over Kvamskogen. Best i klart vær og når stien er tørr.',
  },
  {
    title: 'Tveitakvitingen',
    place: 'Aktiven / Kvitingen',
    image: '/assets/photos/summer/tveitakvitingen-sommar.webp',
    season: 'Sommer',
    level: 'Krevende',
    time: '5-7 t',
    km: '10-13 km',
    climb: 'Mye stigning',
    text: 'Lang og luftig fjelltur for erfarne turgjengere. Krever gode forhold og en tidlig start.',
  },
  {
    title: 'Kjelen',
    place: 'Kvamskogen vest',
    image: '/assets/photos/summer/kjelen.webp',
    season: 'Sommer',
    level: 'Middels',
    time: '2-3 t',
    km: '4-6 km',
    climb: 'Moderat',
    text: 'Kortere tur med fin utsikt og tydelig fjellfølelse uten at hele dagen går med.',
  },
];

const INNSENDING = [
  'Startsted eller møtested',
  'Minst ett bilde, gjerne flere',
  'Kort beskrivelse av turen',
  'Vanskelighetsgrad og ca. tidsbruk',
  'GPX-spor hvis du har det',
];

const scrollToId = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const Turforslag = ({ onNav }) => (
  <section className="trail-suggestions-page">
    <div className="container">
      <div className="trail-suggestions-hero">
        <div>
          <div className="eyebrow summer"><span className="dot"/>Turforslag</div>
          <h1>Finn en tur som passer dagen.</h1>
          <p>
            Start med sommerturene, og bygg videre med vinterruter, GPX-spor og tips fra folk som
            kjenner Kvamskogen godt.
          </p>
          <div className="trail-suggestions-actions">
            <button className="btn btn-primary" type="button" onClick={() => scrollToId('turene')}>Se turene</button>
            <button className="btn btn-secondary" type="button" onClick={() => scrollToId('foresla-tur')}>Foreslå tur</button>
          </div>
        </div>
        <div className="trail-submit-panel" id="foresla-tur">
          <span>Kommer snart</span>
          <h2>Foreslå en tur</h2>
          <p>
            Vi legger opp til en enkel innsending med bilder, startsted og valgfritt GPX-spor.
            Bidrag blir moderert for publisering.
          </p>
          <ul>
            {INNSENDING.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>

      <LavlandsloypeCard onOpen={() => onNav && onNav('lavlandsloypen')} />

      <div className="trail-suggestions-head" id="turene">
        <div>
          <div className="eyebrow summer"><span className="dot"/>Sommer først</div>
          <h2>Flere turer å bygge ut.</h2>
        </div>
        <div className="trail-filter-row" aria-label="Turforslag filtre">
          <span className="chip active">Alle</span>
          <span className="chip">Sommer</span>
          <span className="chip">Lett</span>
          <span className="chip">Middels</span>
          <span className="chip">Krevende</span>
        </div>
      </div>

      <div className="trail-suggestion-grid">
        {TURER.map((tur) => (
          <article className="trail-suggestion-card" key={tur.title}>
            {tur.route ? (
              <button
                type="button"
                className="trail-suggestion-image"
                onClick={() => onNav && onNav(tur.route)}
                aria-label={`Åpne ${tur.title}`}
              >
                <img src={tur.image} alt="" loading="lazy" />
                <span>{tur.season}</span>
              </button>
            ) : (
              <div className="trail-suggestion-image is-static">
                <img src={tur.image} alt="" loading="lazy" />
                <span>{tur.season}</span>
              </div>
            )}
            <div className="trail-suggestion-body">
              <div className="trail-suggestion-title">
                <h3>{tur.title}</h3>
                <span>{tur.level}</span>
              </div>
              <p className="trail-suggestion-place"><Icon name="map-pin" size={15}/>{tur.place}</p>
              <p>{tur.text}</p>
              <dl className="trail-suggestion-facts">
                <div><dt>Tid</dt><dd>{tur.time}</dd></div>
                <div><dt>Lengde</dt><dd>{tur.km}</dd></div>
                <div><dt>Høyde</dt><dd>{tur.climb}</dd></div>
              </dl>
              {tur.route ? (
                <button className="btn-ghost" type="button" onClick={() => onNav && onNav(tur.route)}>
                  Åpne tur <Icon name="arrow-right" size={15}/>
                </button>
              ) : (
                <span className="trail-suggestion-note">Detaljside og kart kommer</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default Turforslag;
