const HEISKORT = [
  {
    navn: 'Eikedalen Skisenter',
    rabatt: '20 % rabatt på dags- og kveldskort',
    detalj: 'Kjøp heiskort online og bruk promokoden du får ved å sende forespørsel til kasserer@kvamskogen-vel.no.',
  },
  {
    navn: 'Furedalen Alpin',
    rabatt: '20 % rabatt på dags- og kveldskort',
    detalj: 'Kjøp heiskort online og bruk promokoden du får ved å sende forespørsel til kasserer@kvamskogen-vel.no.',
  },
];

const AVTALER = [
  {
    navn: 'Mo Sport AS',
    sted: 'Sandvenvegen 1A',
    rabatt: '10 % rabatt',
    detalj: 'Gjelder varekjøp over kr 1.000. Gjelder ikke tilbudspriser og pakkepriser.',
    merke: 'Sport',
  },
  {
    navn: 'SAFA',
    sted: 'Butikken på Bjørkheim',
    rabatt: 'Medlemstilbud',
    detalj: 'Medlemstilbud på ullprodukter fra SAFA.',
    merke: 'Ull',
  },
  {
    navn: 'Hardangerbadet',
    sted: 'Øystese',
    rabatt: '15 % rabatt',
    detalj: 'Gjelder alle enkeltbilletter. Rabatten kan ikke kombineres med andre tilbud, for eksempel Coop-tilbud.',
    merke: 'Bading',
  },
  {
    navn: 'XL Bygg Kvam',
    sted: 'Sjusetevegen 20 E, Øystese',
    rabatt: '15 % prisavslag',
    detalj: 'Gjelder kontantkjøp og ikke tilbudsvarer eller kampanjevarer. Oppgi kundenr. 301487 ved kassen i tillegg til medlemskortet.',
    merke: 'Bygg',
  },
  {
    navn: 'Kvamskogen Takeaway ved Aktiven',
    sted: 'Aktiven',
    rabatt: '10 % rabatt',
    detalj: 'Alle medlemmer av Kvamskogen Vel får 10 % rabatt på alt kjøp.',
    merke: 'Mat',
  },
  {
    navn: 'Hordaland Folkeblad',
    sted: 'Digitalt abonnement',
    rabatt: '3 mnd for kr 255',
    detalj: 'Gjelder digitalt månedsabonnement. Kontakt abonnement@hf.no eller telefon 56 55 00 20 for medlemspris.',
    merke: 'Lokalavis',
  },
  {
    navn: 'Kvamnet AS',
    sted: 'Lokalt bredbånd',
    rabatt: 'Godt etableringstilbud',
    detalj: 'Godt tilbud på etablering og første måned for medlemmer.',
    merke: 'Nett',
  },
  {
    navn: 'Monter Kvam AS',
    sted: 'Kvam',
    rabatt: 'Ny og forbedret avtale',
    detalj: 'Medlemsavtale for kjøp, handel og rabatt hos Monter Kvam.',
    merke: 'Bygg',
  },
  {
    navn: 'Norheimsund Fargehandel AS',
    sted: 'Fargerike Norheimsund',
    rabatt: 'Gode tilbud',
    detalj: 'Gode tilbud og gode råd til medlemmer.',
    merke: 'Farge',
  },
  {
    navn: 'Dyrnes Tak- og fasadevask',
    sted: 'Kvamskogen og omegn',
    rabatt: 'Medlemstilbud',
    detalj: 'Tilbud på utvendig og innvendig vask av hytte, snømåking og lignende tjenester.',
    merke: 'Hytte',
  },
  {
    navn: 'Arna Jordsortering',
    sted: 'Egen prisliste',
    rabatt: 'Egen avtale',
    detalj: 'Tilbud med egen prisliste for medlemmer.',
    merke: 'Hage',
  },
];

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

const Tilbud = () => (
  <section className="section offers-page">
    <div className="container">
      <header className="offers-hero">
        <div>
          <div className="eyebrow autumn"><span className="dot"/>Medlemsfordeler</div>
          <h1>Dagens tilbud</h1>
          <p className="lede">
            Rabatter og gode handler for medlemmer i Kvamskogen Vel. Husk å vise frem digitalt medlemskort når du bruker rabattavtalene.
          </p>
        </div>
        <aside className="membership-card-note" aria-label="Digitalt medlemskort">
          <span>Digitalt medlemskort</span>
          <h2>Vis kortet i kassen</h2>
          <p>
            Rabattavtalene gjelder for medlemmer. Ha medlemskortet klart, og oppgi eventuelle kundenummer eller promokoder der avtalen krever det.
          </p>
        </aside>
      </header>

      <section className="lift-pass-offers" aria-labelledby="heiskort-title">
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
        <a className="btn btn-accent" href="mailto:kasserer@kvamskogen-vel.no?subject=Spesialtilbud%20til%20Visit%20Kvamskogen">Meld inn tilbud</a>
      </section>
    </div>
  </section>
);

export default Tilbud;
