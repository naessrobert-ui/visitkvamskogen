const OPTIONS = [
  {
    eb: 'Hytter til leie',
    ebClass: 'winter',
    title: 'Privateide hytter — kortere og lengre opphold',
    body: 'Mange hytteeiere på Kvamskogen leier ut når de ikke bruker hytta selv. Du finner alt fra enkle helgeleieforhold til moderne hytter med ski-in/ski-out om vinteren.',
    links: [
      { label: 'Hytter til leie på Finn', href: 'https://www.finn.no/reise/feriehus-hytteutleie/resultat/?lat_sw=60.267594&lng_sw=5.770759&lat_ne=60.488131&lng_ne=6.127706&nrFUSAds=2&country=Norge&city=Kvamskogen&no_of_bedrooms_from=0&no_of_beds_from=0' },
      { label: 'Airbnb — Kvamskogen', href: 'https://www.airbnb.no/s/Kvamskogen--Norheimsund/homes?refinement_paths%5B%5D=%2Fhomes&place_id=ChIJx7bF77ZLPEYRUTA5yxQndvM&location_bb=QnGJ6kC%2BcXNCcYcnQL5bWQ%3D%3D&acp_id=f0ef668c-cda1-4e62-87c9-626ae2585633&date_picker_type=calendar&search_type=autocomplete_click' },
    ],
  },
  {
    eb: 'Camping',
    ebClass: 'summer',
    title: 'Campingplasser og fast campingvogn',
    body: 'Det finnes plasser for både telt, campingvogn og bobil i området. Noen plasser tilbyr også fast oppstilling for campingvogn gjennom sesongen — særlig populært om sommeren.',
    links: [
      { label: 'Kvernavollen Camping', href: 'https://kvernavollen-camping.webnode.page/' },
      { label: 'NAF Kro & Camping', href: 'https://post0365.wixsite.com/minside' },
      { label: 'Søk camping i Hardanger', href: 'https://www.nafcamp.com/' },
    ],
  },
  {
    eb: 'Hotell og pensjonat',
    ebClass: 'spring',
    title: 'Norheimsund og Øystese — 15–25 minutter unna',
    body: 'Det er ingen hoteller på selve Kvamskogen, men flere alternativer i nabobygdene nede ved Hardangerfjorden. Praktisk hvis du vil kombinere fjell og fjord, eller hvis hyttene er fullbooket.',
    links: [
      { label: 'Hardangerfjord Hotel (Øystese)', href: 'https://www.hardangerfjordhotel.no/' },
      { label: 'Sandven Hotel (Norheimsund)', href: 'https://www.sandvenhotel.no/' },
    ],
  },
];

const Card = ({ opt }) => (
  <div style={{padding:'28px 0', borderTop:'1px solid var(--color-border, rgba(0,0,0,0.08))'}}>
    <div className={"eyebrow " + opt.ebClass}><span className="dot"/>{opt.eb}</div>
    <h3 style={{fontFamily:'var(--font-display)', fontSize:'clamp(22px,2.4vw,30px)', fontWeight:500, letterSpacing:'-0.01em', margin:'4px 0 10px'}}>{opt.title}</h3>
    <p style={{lineHeight:1.65, color:'var(--color-fg-muted)', fontSize:16, margin:'0 0 14px'}}>{opt.body}</p>
    <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexWrap:'wrap', gap:'8px 20px'}}>
      {opt.links.map((l, i) => (
        <li key={i}>
          <a href={l.href} target="_blank" rel="noopener"
             style={{fontSize:14, fontWeight:500, color:'var(--color-fg)', textDecoration:'underline', textUnderlineOffset:4}}>
            {l.label} ↗
          </a>
        </li>
      ))}
    </ul>
  </div>
);

const Overnatting = () => (
  <section className="section">
    <div className="container" style={{maxWidth:780}}>
      <div className="eyebrow winter"><span className="dot"/>Overnatting</div>
      <h2 style={{fontFamily:'var(--font-display)', fontSize:'clamp(34px,4.5vw,56px)', fontWeight:500, lineHeight:1.05, letterSpacing:'-0.02em', margin:'0 0 14px'}}>
        Hvor du kan bo på Kvamskogen.
      </h2>
      <p className="lede" style={{marginBottom:32}}>
        Kvamskogen er først og fremst et hyttelandskap, så de fleste overnatter privat. Her er hovedalternativene — fra hytteleie til hotell nede ved fjorden.
      </p>
      {OPTIONS.map((o, i) => <Card key={i} opt={o}/>)}
      <p style={{marginTop:48, fontSize:14, color:'var(--color-fg-subtle)', lineHeight:1.6}}>
        Driver du utleie og vil stå oppført her? Ta kontakt med <a href="https://www.kvamskogen-vel.no/" target="_blank" rel="noopener" style={{color:'var(--color-fg)', textDecoration:'underline'}}>Kvamskogen Vel ↗</a>.
      </p>
    </div>
  </section>
);

export default Overnatting;
