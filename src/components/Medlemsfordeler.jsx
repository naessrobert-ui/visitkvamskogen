import { AVTALER, HEISKORT } from '../data/medlemsfordeler.js';

const OfferCard = ({ avtale }) => (
  <article className="offer-card">
    <div className="offer-card-top">
      <span>{avtale.merke}</span>
      <strong>{avtale.rabatt}</strong>
    </div>
    <h3>{avtale.navn}</h3>
    <p className="offer-place">{avtale.sted}</p>
    <p>{avtale.detalj}</p>
  </article>
);

const Medlemsfordeler = () => (
  <section className="section member-benefits-page">
    <div className="container">
      <header className="member-benefits-hero">
        <div>
          <div className="eyebrow summer"><span className="dot"/>For medlemmer</div>
          <h1>Medlemsfordeler</h1>
          <p className="lede">
            Rabattavtaler og praktiske fordeler for medlemmer i Kvamskogen Vel. Medlemskapet støtter samtidig fellesarbeid, parkering, stier, løyper og saker som angår Kvamskogen.
          </p>
          <div className="vel-hero-actions">
            <a className="btn btn-accent" href="https://www.kvamskogen-vel.no/bli-medlem-2/" target="_blank" rel="noopener">Bli medlem</a>
            <a className="btn btn-secondary" href="mailto:kasserer@kvamskogen-vel.no">Spør om medlemskap</a>
          </div>
        </div>
        <aside className="member-benefits-note" aria-label="Kort om medlemsfordeler">
          <span>Lokale avtaler</span>
          <h2>Vis medlemskortet der avtalen gjelder</h2>
          <p>
            Noen avtaler krever kundenummer, promokode eller direkte kontakt med Kvamskogen Vel. Det står i teksten på hvert tilbud.
          </p>
        </aside>
      </header>

      <section className="offers-list" aria-labelledby="avtaler-title">
        <div className="section-head">
          <div className="titles">
            <div className="eyebrow summer"><span className="dot"/>Kjøpsavtaler</div>
            <h2 id="avtaler-title">Aktuelle medlemsrabatter</h2>
            <p className="lede">Et utvalg kjøps-, handels- og rabattavtaler for medlemmer i Kvamskogen Vel.</p>
          </div>
        </div>
        <div className="offers-grid">
          {AVTALER.map((avtale) => <OfferCard avtale={avtale} key={avtale.navn}/>) }
        </div>
      </section>

      <section className="business-offer-cta" aria-labelledby="business-offer-title">
        <div>
          <span className="offer-label">For lokale bedrifter</span>
          <h2 id="business-offer-title">Har bedriften et spesialtilbud?</h2>
          <p>
            Vi ønsker å løfte frem gode tilbud fra lokale aktører. Send inn en kort tekst med hva tilbudet gjelder, hvem det gjelder for, og hvor lenge tilbudet varer.
          </p>
        </div>
        <a className="btn btn-accent" href="mailto:robert.naess@online.no?subject=Spesialtilbud%20til%20Visit%20Kvamskogen">Meld inn tilbud</a>
      </section>

      <section className="lift-pass-offers lift-pass-offers-muted" aria-labelledby="heiskort-title">
        <div className="lift-pass-copy">
          <span className="offer-label">Vinteravtale</span>
          <h2 id="heiskort-title">Rabatt på heiskort</h2>
          <p>
            Medlemskap i Kvamskogen Vel gir 20 % rabatt på dags- og kveldskort hos både Eikedalen Skisenter og Furedalen Alpin. Dette fungerer som en bedriftsavtale.
          </p>
          <p>
            Kortene må kjøpes online. Send forespørsel til <a href="mailto:kasserer@kvamskogen-vel.no">kasserer@kvamskogen-vel.no</a> for å få promokoden som aktiverer rabatten.
          </p>
        </div>
        <div className="lift-pass-grid">
          {HEISKORT.map((avtale) => (
            <article className="lift-pass-card" key={avtale.navn}>
              <strong>{avtale.rabatt}</strong>
              <h3>{avtale.navn}</h3>
              <p>{avtale.detalj}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  </section>
);

export default Medlemsfordeler;
