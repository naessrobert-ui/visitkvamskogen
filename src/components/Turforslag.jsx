import { useMemo, useState } from 'react';
import Icon from './Icons.jsx';
import LavlandsloypeCard from './LavlandsloypeCard.jsx';
import TrailSuggestionModal from './TrailSuggestionModal.jsx';
import Link from './Link.jsx';
import { TURER } from '../data/turer.js';
import { pathFor } from '../lib/routes.js';

const INNSENDING = [
  'Startsted eller møtested',
  'Minst ett bilde, gjerne flere',
  'Kort beskrivelse av turen',
  'Vanskelighetsgrad og ca. tidsbruk',
  'GPX-spor hvis du har det',
];

const FILTERS = ['Alle', 'Sommer', 'Lett', 'Middels', 'Krevende'];

const scrollToId = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Gjør et innsendt turforslag om til samme kortformat som de redaksjonelle turene
const suggestionToCard = (suggestion) => ({
  id: suggestion.id,
  title: suggestion.title,
  place: suggestion.area || 'Kvamskogen',
  image: suggestion.images?.[0]?.url || '',
  season: suggestion.season || 'Sommer',
  level: suggestion.level || 'Middels',
  time: suggestion.duration || '–',
  km: suggestion.distance || '–',
  climb: suggestion.elevation || '–',
  text: suggestion.description,
  gpxUrl: suggestion.gpx_url || '',
  submitted: true,
  raw: suggestion,
});

const matchesFilter = (tur, filter) => {
  if (filter === 'Alle') return true;
  if (filter === 'Sommer') return tur.season === 'Sommer' || tur.season === 'Helår';
  return tur.level === filter;
};

const Turforslag = ({ onAdd, suggestions = [] }) => {
  const [filter, setFilter] = useState('Alle');
  const [openTrail, setOpenTrail] = useState(null);

  const allTurer = useMemo(() => {
    const submitted = (suggestions || []).map(suggestionToCard);
    return [...submitted, ...TURER];
  }, [suggestions]);

  const visibleTurer = useMemo(
    () => allTurer.filter((tur) => matchesFilter(tur, filter)),
    [allTurer, filter],
  );

  return (
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
              <button className="btn btn-secondary" type="button" onClick={onAdd}>Foreslå tur</button>
            </div>
          </div>
          <div className="trail-submit-panel" id="foresla-tur">
            <span>Foreslå en tur</span>
            <h2>Del en favorittur</h2>
            <p>
              En enkel innsending med bilder, startsted og valgfritt GPX-spor.
              Bidrag blir moderert før publisering.
            </p>
            <ul>
              {INNSENDING.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <button className="btn btn-accent" type="button" onClick={onAdd}>
              <Icon name="plus" size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
              Foreslå tur
            </button>
          </div>
        </div>

        <LavlandsloypeCard />

        <div className="trail-suggestions-head" id="turene">
          <div>
            <div className="eyebrow summer"><span className="dot"/>Sommer først</div>
            <h2>Flere turer å bygge ut.</h2>
          </div>
          <div className="trail-filter-row" aria-label="Turforslag filtre">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                className={'chip' + (filter === item ? ' active' : '')}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="trail-suggestion-grid">
          {visibleTurer.map((tur) => (
            <article className="trail-suggestion-card" key={tur.id || tur.title}>
              {tur.slug ? (
                <Link className="trail-suggestion-image" to={pathFor('tur', tur.slug)} aria-label={`Åpne ${tur.title}`}>
                  {tur.image ? <img src={tur.image} alt="" loading="lazy" /> : <span className="trail-suggestion-image-empty"><Icon name="mountain" size={32}/></span>}
                  <span>{tur.season}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="trail-suggestion-image"
                  onClick={() => setOpenTrail(tur.raw)}
                  aria-label={`Åpne ${tur.title}`}
                >
                  {tur.image ? <img src={tur.image} alt="" loading="lazy" /> : <span className="trail-suggestion-image-empty"><Icon name="mountain" size={32}/></span>}
                  <span>{tur.season}</span>
                </button>
              )}
              <div className="trail-suggestion-body">
                <div className="trail-suggestion-title">
                  <h3>{tur.title}</h3>
                  <span>{tur.level}</span>
                </div>
                <p className="trail-suggestion-place"><Icon name="map-pin" size={15}/>{tur.place}</p>
                {tur.submitted && <span className="trail-suggestion-badge">Innsendt av turgåer</span>}
                <p>{tur.text}</p>
                <dl className="trail-suggestion-facts">
                  <div><dt>Tid</dt><dd>{tur.time}</dd></div>
                  <div><dt>Lengde</dt><dd>{tur.km}</dd></div>
                  <div><dt>Høyde</dt><dd>{tur.climb}</dd></div>
                </dl>
                {tur.slug ? (
                  <Link className="btn-ghost" to={pathFor('tur', tur.slug)}>
                    Åpne tur <Icon name="arrow-right" size={15}/>
                  </Link>
                ) : (
                  <button className="btn-ghost" type="button" onClick={() => setOpenTrail(tur.raw)}>
                    Åpne tur <Icon name="arrow-right" size={15}/>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
      {openTrail && (
        <TrailSuggestionModal suggestion={openTrail} onClose={() => setOpenTrail(null)} />
      )}
    </section>
  );
};

export default Turforslag;
