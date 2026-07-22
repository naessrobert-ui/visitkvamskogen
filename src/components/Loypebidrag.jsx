import BroKampanje from './BroKampanje.jsx';

const paragraphStyle = {
  lineHeight: 1.75,
  color: 'var(--color-fg-muted)',
  fontSize: 17,
  margin: '0 0 16px',
};

const Loypebidrag = () => (
  <>
    <BroKampanje />

    <section className="loypebidrag-page">
      <div className="container loypebidrag-shell">
        <article className="loypebidrag-article">
          <img
            className="loypebidrag-photo"
            src="/assets/photos/naeringslag-loypemaskin.jpg"
            alt="Løypemaskin på Kvamskogen"
          />
          <div className="eyebrow winter"><span className="dot"/>Bakgrunn · Løypebidrag</div>
          <p className="article-date">13. juni 2026</p>
          <h1>Løypekjøringen gikk med underskudd - i år også</h1>
          <p className="loypebidrag-lede">
            Kvamskogen Næringslag har fått tildelt 150.000 kroner fra Sparebankstiftinga Sparebanken Norge til ny bru over Røyro, nord for Naffen.
          </p>
          <p style={paragraphStyle}>
            Den gamle brua ble satt opp i 1990 og har fungert lenge. Etter uhellet ved Røyro er det laget budsjett for ny bru på 350.000 kroner, inkludert 50.000 kroner i dugnad, egen innsats og uforutsett.
          </p>
          <p style={paragraphStyle}>
            Næringslaget har søkt flere om støtte, og håper at flere vil bidra til tiltaket. Arbeidet med bruer og løyper er en del av den praktiske infrastrukturen som gjør Kvamskogen tilgjengelig gjennom vinteren.
          </p>
          <p style={paragraphStyle}>
            Løyperegnskapet hadde underskudd på 177.000 kroner i 2025. Derfor oppfordres alle med hytte, vogn eller fast bruk av Kvamskogen til å bidra til turløypeprepareringen.
          </p>
        </article>
        <aside className="loypebidrag-card">
          <h2>Støtt løypene direkte</h2>
          <p>Kvamskogen Næringslag drifter løypene og broene. Bidrag hit går til preparering, vedlikehold og tiltak som holder løypenettet i drift — utenom Vel-kampanjen over.</p>
          <dl>
            <div><dt>Vipps (Næringslaget)</dt><dd>91705</dd></div>
            <div><dt>Bankgiro</dt><dd>3530.07.08577</dd></div>
            <div><dt>Foreslått bidrag</dt><dd>600 kr</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  </>
);

export default Loypebidrag;
