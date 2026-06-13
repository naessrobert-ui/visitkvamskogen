import { useState } from 'react';

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

const STYRET = [
  {
    navn: 'Robert Næss',
    rolle: 'Styreleder',
    epost: 'robert.naess@online.no',
    telefon: '993 20 541',
    profil: [
      'Jeg har hatt tilknytning til Kvamskogen siden 1970. De første årene brukte vi min fars foreningshytte gjennom Tollvesenet, før foreldrene mine kjøpte en liten campingvogn på 1980-tallet. I 2001 bygget jeg egen hytte i Furedalen.',
      'Barna våre er nå voksne, og vi har fire barnebarn som vi håper også vil sette pris på Kvamskogen. Selv er jeg glad i langrenn og bruker de oppkjørte løypene flittig. Jeg har også sans for toppturer, med Tveitakvitingen som den klare favoritten. De senere årene har jeg i tillegg fått stadig større glede av Kvamskogen om sommeren.',
    ],
  },
  {
    navn: 'Svein Anders Dahl',
    rolle: 'Nestleder',
    epost: 'sanddahl@online.no',
    telefon: '958 13 980',
    bilde: '/assets/photos/styret/svein-anders-dahl.jpg',
    presentasjon: 'https://www.kvamskogen-vel.no/svein-anders-dahl/',
    profil: [
      'Svein Anders har hatt tilknytning til Furunabben ved Jonshøgdi siden tidlig på 1970-tallet, og bruker nå hytten som deltids pensjonist med god tid til hverdagshelger.',
      'Han har bakgrunn fra markedsføring, ledelse, egen virksomhet og styrearbeid. Viktige saker for ham er trafikkforhold, stier og skiløyper, service- og tjenestetilbud og vern av naturverdier.',
    ],
  },
  {
    navn: 'Karl Ole Midtbø',
    rolle: 'Styremedlem',
    epost: 'Komidtbo@gmail.com',
    telefon: '901 41 611',
    bilde: '/assets/photos/styret/karl-ole-midtbo.png',
    presentasjon: 'http://www.kvamskogen-vel.no/karlole-midtbo/',
    profil: [
      'Karl Ole kjøpte hytte i Kleven i 1998 og bruker Kvamskogen like mye sommer som vinter.',
      'Yrkeslivet hans spenner fra musikk og dirigering i Forsvarets musikk til lederroller i Os kommune og Norges Musikkorps Forbund. I styret er han særlig opptatt av samarbeid med Kvam herad, utvikling av tur- og løypenettet og tryggere ferdsel.',
    ],
  },
  {
    navn: 'Karoline Oen',
    rolle: 'Kasserer og parkeringsansvarlig',
    epost: 'kasserer@kvamskogen-vel.no',
    telefon: '954 09 857',
    presentasjon: 'https://www.kvamskogen-vel.no/karoline-oen/',
    profil: [
      'Karoline har hatt Kvamskogen som fast holdepunkt gjennom hele livet. I 2022 kjøpte hun og mannen egen hytte på Kvinnhovden, nær familiens hytte.',
      'Hun bor til vanlig i Bergen, jobber som sivilingeniør og bruker mye fritid på hund, tur og trening. Hun engasjerer seg for at Kvamskogen skal være et sted for alle aldersgrupper, hele året.',
    ],
  },
  {
    navn: 'Martin Hlinka',
    rolle: 'Styremedlem',
    epost: 'martinhli@hotmail.com',
    telefon: '977 08 585',
    bilde: '/assets/photos/styret/martin-hlinka.jpg',
    presentasjon: 'https://www.kvamskogen-vel.no/martin-hlinka/',
    profil: [
      'Martin har hatt hytte på Byrkjesete siden 2017 og bruker området gjennom store deler av året.',
      'Sommerstid trekker han gjerne mot fiskevann utenfor de mest brukte rutene. Vinterstid bruker han både alpinbakke, fjellski og turterreng. Han er opptatt av tilgjengelighet, infrastruktur og en sterk velforening som kan tale hytteeiernes sak.',
    ],
  },
  {
    navn: 'Therese Lund-Ringstad',
    rolle: 'Varamedlem',
    epost: 'thereselund79@gmail.com',
    telefon: '990 28 484',
    bilde: '/assets/photos/styret/therese-lund-ringstad.jpg',
    presentasjon: 'https://www.kvamskogen-vel.no/therese-lund-ringstad/',
    profil: [
      'Therese bor i Bergen med mann, to tenåringer og hund, og driver egen tannlegeklinikk på Os.',
      'Etter å ha leid hytte på åremål kjøpte familien egen hytte på Kleven i 2015. Hun ønsker å bidra til at Kvamskogen er et hyggelig og aktivt sted for barn, ungdommer og voksne gjennom hele året.',
    ],
  },
  {
    navn: 'Anne Lien',
    rolle: 'Varamedlem',
    epost: 'prahlsv@yahoo.no',
    telefon: '900 58 717',
    bilde: '/assets/photos/styret/anne-lien.jpg',
    presentasjon: 'https://www.kvamskogen-vel.no/anne-lien/',
    profil: [
      'Anne bor i Bergen, jobber i Kartverket og har hytte i Hjeltelia, like øst for Mødalselven. Hun har 20 år som hytteeier på Kvamskogen.',
      'Hun setter pris på roen, turmulighetene og nærheten til Norheimsund og Øystese, og er også styreleder i den lokale velforeningen i Hjeltelia. I styret er hun opptatt av balanse mellom utvikling og bevaring.',
    ],
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

const StyreCard = ({ medlem }) => {
  const [visProfil, setVisProfil] = useState(false);
  const profilId = `profil-${medlem.navn.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <article className="vel-board-card">
      <div className="vel-board-card-top">
        {medlem.bilde ? (
          <img className="vel-board-photo" src={medlem.bilde} alt={medlem.navn} loading="lazy"/>
        ) : (
          <div className="vel-board-photo vel-board-photo-placeholder" aria-hidden="true">{medlem.navn.charAt(0)}</div>
        )}
        <div>
          <h3>{medlem.navn}</h3>
          <p>{medlem.rolle}</p>
        </div>
      </div>
      <div className="vel-board-contact">
        <a href={`mailto:${medlem.epost}`}>{medlem.epost}</a>
        <a href={`tel:${medlem.telefon.replace(/\s/g, '')}`}>{medlem.telefon}</a>
      </div>
      <button
        className="vel-board-profile"
        type="button"
        aria-expanded={visProfil}
        aria-controls={profilId}
        onClick={() => setVisProfil((apen) => !apen)}
      >
        Derfor liker jeg Kvamskogen {visProfil ? '↑' : '↓'}
      </button>
      {visProfil ? (
        <div className="vel-board-bio" id={profilId}>
          {medlem.profil?.map((avsnitt) => <p key={avsnitt}>{avsnitt}</p>)}
          {medlem.presentasjon ? (
            <a href={medlem.presentasjon} target="_blank" rel="noopener">Les hele presentasjonen hos Kvamskogen Vel →</a>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

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

      <section className="vel-board-section" aria-labelledby="vel-board-title">
        <div className="section-head">
          <div className="titles">
            <div className="eyebrow summer"><span className="dot"/>Styret</div>
            <h2 id="vel-board-title">Kontaktinformasjon</h2>
            <p className="lede">Ta kontakt med styret i saker som gjelder medlemskap, parkering, planer og fellesinteresser på Kvamskogen.</p>
          </div>
        </div>
        <div className="vel-board-grid">
          {STYRET.map((medlem) => <StyreCard medlem={medlem} key={medlem.navn}/>)}
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

      <section className="business-offer-cta vel-benefits-link" aria-labelledby="vel-benefits-title">
        <div>
          <span className="offer-label">Medlemsfordeler</span>
          <h2 id="vel-benefits-title">Rabattavtalene ligger på egen side</h2>
          <p>
            Vi har samlet medlemsfordeler, lokale rabattavtaler og skikortinformasjon slik at denne siden kan handle mer om arbeidet til Kvamskogen Vel.
          </p>
        </div>
        <button className="btn btn-accent" type="button" onClick={() => onNav('medlemsfordeler')}>Se medlemsfordeler</button>
      </section>
    </div>
  </section>
);

export default Tilbud;
