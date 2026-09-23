import Link from './Link.jsx';

const NotFound = () => (
  <section className="section page-intro">
    <div className="container" style={{maxWidth:720}}>
      <div className="eyebrow summer"><span className="dot"/>404</div>
      <h1>Fant ikke siden</h1>
      <p className="lede">
        Lenken kan være gammel eller feilskrevet. Prøv <Link to="/">forsiden</Link>,{' '}
        <Link to="/turforslag">turforslag</Link> eller <Link to="/vaer">været på Kvamskogen</Link>.
      </p>
    </div>
  </section>
);

export default NotFound;
