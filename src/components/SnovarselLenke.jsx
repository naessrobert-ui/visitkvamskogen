import Link from './Link.jsx';

const SnovarselLenke = () => (
  <section className="section tight snovarsel-lenke-wrap">
    <div className="container">
      <Link to="/snovarsel" className="snovarsel-lenke">
        <span className="snovarsel-lenke-ikon" aria-hidden="true">❄️</span>
        <span className="snovarsel-lenke-tekst">
          <strong>Snøvarsel: hvor mye snø blir det?</strong>
          <span>Snødybde time for time og 15 døgn frem, også for Såta på 800 moh.</span>
        </span>
        <span className="snovarsel-lenke-pil" aria-hidden="true">→</span>
      </Link>
    </div>
  </section>
);

export default SnovarselLenke;
