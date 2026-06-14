const VELSAKER = [
  {
    tittel: 'Bli medlem',
    tekst: 'Medlemskapet gir rabattavtaler, støtte til fellesarbeid og en tydeligere stemme for hytte- og vogneiere på Kvamskogen.',
    lenke: 'https://www.kvamskogen-vel.no/bli-medlem-2/',
    handling: 'Gå til innmelding',
  },
  {
    tittel: 'Løyper og tilskudd',
    tekst: 'Vel-et bidrar til vintertilbudet, løypepreparering og praktisk informasjon for dem som bruker fjellet gjennom sesongen.',
    lenke: 'https://www.kvamskogen-vel.no/',
    handling: 'Les hos Kvamskogen Vel',
  },
  {
    tittel: 'Plansaker',
    tekst: 'Følg saker som påvirker hytter, veier, parkering, natur og utvikling av området. Her kan viktige frister og høringer samles.',
    lenke: 'https://www.kvam.no/tenester/planar-og-styrande-dokument/kunngjeringar-og-prosjekt/kommunedelpan-for-kvamskogen-planforslag-til-offentleg-ettersyn.65953.aspx',
    handling: 'Se planinformasjon',
  },
];

const VELFAKTA = [
  'Medlemsfordeler og lokale rabattavtaler',
  'Informasjon for hytte- og vogneiere',
  'Saker som gjelder bruk, drift og utvikling av Kvamskogen',
];

const FORDELSHOYDEPUNKT = [
  {
    verdi: '20 %',
    tittel: 'Rabatt på heiskort',
    tekst: 'Dags- og kveldskort hos Eikedalen Skisenter og Furedalen Alpin.',
  },
  {
    verdi: '10–15 %',
    tittel: 'Hos lokale butikker',
    tekst: 'Sport, bygg, farge, ull og mat — avtaler du bruker hele året.',
  },
  {
    verdi: 'Egne avtaler',
    tittel: 'Hytte og håndverk',
    tekst: 'Tak- og fasadevask, bredbånd, lokalavis og flere medlemstilbud.',
  },
];

const HISTORIE = [
  {
    aar: 'Før 1940',
    tittel: 'Hytteområdet tar form',
    tekst: 'Kvamskogen begynte så smått å utvikle seg som hytteområde før andre verdenskrig.',
  },
  {
    aar: '1950-tallet',
    tittel: 'Hyttebyggingen skyter fart',
    tekst: 'Da hyttebyggingen økte, kom behovet for stier, gangveier og lokale veilag.',
  },
  {
    aar: '1971',
    tittel: 'Kvamskogen Vel stiftes',
    tekst: '29. april 1971 ble Kvamskogen Vel etablert for å samle hytteeierne i en felles forening.',
  },
  {
    aar: 'I dag',
    tittel: 'Høringspart og felles talerør',
    tekst: 'Vel-et er høringspart i plansaker og engasjerer seg i miljø, trivsel, parkering og utvikling av Kvamskogen.',
  },
];

const VEDTEKTER = [
  {
    paragraf: '§ 1',
    tittel: 'Formål',
    tekst: 'Foreningen skal medvirke til å utvikle og ivareta allmenne interesser knyttet til Kvamskogen som hytte-, rekreasjons- og friluftsområde, inkludert naturvern, utbygging og anvendelse av området.',
  },
  {
    paragraf: '§ 2',
    tittel: 'Medlemskap',
    tekst: 'Medlemmer kan være alle som har eier- eller bruksinteresser innenfor området mellom Fossen Bratte og Tokagjelet.',
  },
  {
    paragraf: '§ 3',
    tittel: 'Styret',
    tekst: 'Foreningen ledes av 5 styremedlemmer og 2 varamedlemmer. Styret skal så langt som mulig representere de ulike områdene på Kvamskogen.',
  },
  {
    paragraf: '§ 4',
    tittel: 'Årsmøte',
    tekst: 'Årsmøtet er foreningens høyeste myndighet og avholdes årlig innen utgangen av april. Større investeringer og prosjekter skal fremlegges for årsmøtet.',
  },
  {
    paragraf: '§ 5-8',
    tittel: 'Kontingent, æresmedlemmer, fullmakt og endringer',
    tekst: 'Årsmøtet fastsetter medlemskontingent, kan utnevne æresmedlemmer, behandler fullmakter og vedtar vedtektsendringer med 2/3 flertall.',
  },
];

const DOKUMENTER = [
  {
    tittel: 'Mål og fokus',
    tekst: 'Handlingsplanen er gjeldende fra 2025 og rullerende. Den ble oppdatert 01.09.2025 etter innspill fra medlemmene.',
    lenke: '/assets/docs/gjeldene-mal-og-fokus-kv-versjon-4-01.09.25.pdf',
    handling: 'Åpne PDF',
  },
  {
    tittel: 'Høringer',
    tekst: 'Oversikt over høringer og plansaker der Kvamskogen Vel følger opp saker som angår området.',
    lenke: 'https://www.kvamskogen-vel.no/about/horinger/',
    handling: 'Se høringer',
  },
  {
    tittel: 'Årsmøtedokumenter',
    tekst: 'Referater og dokumenter fra årsmøter samles hos Kvamskogen Vel.',
    lenke: 'https://www.kvamskogen-vel.no/about/arsmotedokumenter/',
    handling: 'Se referater',
  },
];

const Tilbud = ({ onNav }) => (
  <section className="section vel-page">
    <div className="container">
      <header className="vel-hero">
        <div>
          <img className="vel-logo" src="/assets/logos/kvamskogen-vel.png" alt="Kvamskogen Vel"/>
          <div className="eyebrow autumn"><span className="dot"/>For hyttefolk og medlemmer</div>
          <h1>Kvamskogen Vel</h1>
          <p className="lede">
            Samlingspunktet for deg som har hytte, vogn eller bruker Kvamskogen ofte. Her finner du medlemskap, løypebidrag, plansaker og rabattavtaler fra lokale aktører.
          </p>
          <div className="vel-hero-actions">
            <a className="btn btn-accent" href="https://www.kvamskogen-vel.no/bli-medlem-2/" target="_blank" rel="noopener">Bli medlem</a>
            <button className="btn btn-secondary" type="button" onClick={() => onNav('medlemsfordeler')}>Se medlemsfordeler</button>
          </div>
        </div>
        <aside className="vel-note" aria-label="Kort om Kvamskogen Vel">
          <span>Kort fortalt</span>
          <h2>Bruk Kvamskogen godt</h2>
          <p>
            Stiftet 29. april 1971. Vel-et arbeider for miljø, trivsel, parkering, friluftsliv og gode rammer for hytte- og rekreasjonsområdet.
          </p>
          <ul>
            {VELFAKTA.map((punkt) => <li key={punkt}>{punkt}</li>)}
          </ul>
        </aside>
      </header>

      <section className="vel-benefits-feature" aria-labelledby="vel-benefits-feature-title">
        <div className="vel-benefits-feature-copy">
          <span className="offer-label">Medlemsfordeler</span>
          <h2 id="vel-benefits-feature-title">Visste du at du kan spare tusener på å bli medlem?</h2>
          <p>
            Medlemskap i Kvamskogen Vel gir rabattavtaler hos lokale butikker, håndverkere og skisentre. Og jo flere vi blir, jo bedre avtaler kan vi forhandle frem for alle.
          </p>
          <div className="vel-hero-actions">
            <a className="btn btn-accent" href="https://www.kvamskogen-vel.no/bli-medlem-2/" target="_blank" rel="noopener">Bli medlem</a>
            <button className="btn btn-secondary" type="button" onClick={() => onNav('medlemsfordeler')}>Se alle medlemsfordeler</button>
          </div>
        </div>
        <div className="vel-benefits-feature-list">
          {FORDELSHOYDEPUNKT.map((punkt) => (
            <article key={punkt.tittel}>
              <strong>{punkt.verdi}</strong>
              <h3>{punkt.tittel}</h3>
              <p>{punkt.tekst}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="vel-board-teaser" aria-labelledby="vel-board-teaser-title">
        <div>
          <span className="offer-label">Styret</span>
          <h2 id="vel-board-teaser-title">Her er styret i Kvamskogen Vel</h2>
          <p>
            Styret følger opp medlemskap, parkering, plansaker, løyper og andre fellesinteresser. På styresiden finner du kontaktinformasjon og hele presentasjonen fra hvert styremedlem.
          </p>
        </div>
        <button className="btn btn-accent" type="button" onClick={() => onNav('styret')}>Gå til styret</button>
      </section>

      <section className="vel-history" aria-labelledby="vel-history-title">
        <div className="vel-history-copy">
          <span className="offer-label">Litt om historien</span>
          <h2 id="vel-history-title">Fra veilag til felles talerør</h2>
          <p>
            Da hyttebyggingen tok av etter 1950-tallet, vokste behovet for stier, gangveier, parkering og felles organisering. Kvamskogen Vel ble stiftet for å samle hytteeierne og arbeide for praktiske fellessaker.
          </p>
          <p>
            Noe av det første styret gjorde var å etablere parkeringsplassene på Leite og Kleiven. I dag disponerer Kvamskogen Vel om lag 400 parkeringsplasser på disse plassene.
          </p>
        </div>
        <div className="vel-timeline">
          {HISTORIE.map((punkt) => (
            <article key={punkt.aar}>
              <span>{punkt.aar}</span>
              <h3>{punkt.tittel}</h3>
              <p>{punkt.tekst}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="vel-intro-grid" aria-label="Viktige snarveier">
        {VELSAKER.map((sak) => (
          <article className="vel-info-card" key={sak.tittel}>
            <h2>{sak.tittel}</h2>
            <p>{sak.tekst}</p>
            <a href={sak.lenke} target="_blank" rel="noopener">{sak.handling} →</a>
          </article>
        ))}
      </section>

      <section className="vel-community-panel" aria-labelledby="vel-community-title">
        <div>
          <span className="offer-label">Mål og fokus</span>
          <h2 id="vel-community-title">Allmenne interesser, hele året</h2>
          <p>
            Kvamskogen Vel skal medvirke til å utvikle og ivareta allmenne interesser som knytter seg til Kvamskogen som hytte-, rekreasjons- og friluftsområde, i alle livets faser.
          </p>
        </div>
        <div className="vel-contact-card">
          <span>Handlingsplan</span>
          <a href="/assets/docs/gjeldene-mal-og-fokus-kv-versjon-4-01.09.25.pdf" target="_blank" rel="noopener">Mål og fokus 2025 →</a>
          <p>Planen er rullerende og bygger på innspill fra medlemmene.</p>
        </div>
      </section>

      <section className="vel-documents" aria-labelledby="vel-documents-title">
        <div className="section-head">
          <div className="titles">
            <div className="eyebrow winter"><span className="dot"/>Dokumenter</div>
            <h2 id="vel-documents-title">Mål, høringer og referater</h2>
            <p className="lede">Her finner du de viktigste lenkene for å følge sakene Kvamskogen Vel jobber med.</p>
          </div>
        </div>
        <div className="vel-doc-grid">
          {DOKUMENTER.map((dokument) => (
            <article className="vel-doc-card" key={dokument.tittel}>
              <h3>{dokument.tittel}</h3>
              <p>{dokument.tekst}</p>
              <a href={dokument.lenke} target="_blank" rel="noopener">{dokument.handling} →</a>
            </article>
          ))}
        </div>
      </section>

      <section className="vel-statutes" aria-labelledby="vel-statutes-title">
        <div className="vel-statutes-intro">
          <span className="offer-label">Vedtekter</span>
          <h2 id="vel-statutes-title">Formål og rammer</h2>
          <p>
            Vedtektene er vedtatt på årsmøter i 1971, 2017, 2019, 2022 og 2023. Under er en kortversjon av hovedpunktene.
          </p>
        </div>
        <div className="vel-statutes-list">
          {VEDTEKTER.map((punkt) => (
            <article key={punkt.paragraf}>
              <span>{punkt.paragraf}</span>
              <h3>{punkt.tittel}</h3>
              <p>{punkt.tekst}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  </section>
);

export default Tilbud;
