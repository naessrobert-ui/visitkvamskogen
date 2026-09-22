import Icon from './Icons.jsx';
import Link from './Link.jsx';
import { turBySlug } from '../data/turer.js';

const TurDetalj = ({ slug }) => {
  const tur = turBySlug(slug);
  if (!tur) return null;

  const facts = [
    ['Lengde', tur.km],
    ['Høydemeter', tur.climb],
    ['Tid', tur.time],
    ['Vanskelighetsgrad', tur.level],
    ['Sesong', tur.season],
    ['Startpunkt', tur.start],
    ['Parkering', tur.parking],
  ].filter(([, value]) => value);

  return (
    <article className="section tur-detalj">
      <div className="container" style={{maxWidth:880}}>
        <Link className="text-link-button" to="/turforslag">← Alle turforslag</Link>
        <div className="eyebrow summer"><span className="dot"/>Turforslag · {tur.place}</div>
        <h1>{tur.title}</h1>
        <p className="lede">{tur.text}</p>

        {tur.image && (
          <figure className="tur-detalj-bilde">
            <img src={tur.image} alt={`${tur.title} på Kvamskogen`} />
          </figure>
        )}

        <h2>Fakta om turen</h2>
        <dl className="tur-detalj-fakta">
          {facts.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>

        {tur.route && (
          <p>
            <Link className="btn btn-primary" to={`/${tur.route}`}>
              <Icon name="map" size={15} style={{marginRight:6, verticalAlign:-2}}/>
              Se kart over {tur.title}
            </Link>
          </p>
        )}

        <p className="tur-detalj-vaer">
          Sjekk <Link to="/vaer">været på Kvamskogen</Link> og <Link to="/webkamera">webkameraene</Link> før du drar.
        </p>
      </div>
    </article>
  );
};

export default TurDetalj;
