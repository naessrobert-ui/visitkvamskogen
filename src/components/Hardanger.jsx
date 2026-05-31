const PLACES = [
  {
    eb: '15 minutter ned',
    ebClass: 'summer',
    title: 'Norheimsund',
    body: 'Den nærmeste bygda nede ved fjorden. Båthavn, butikker, kafeer og Hardanger fartøyvernsenter. Praktisk stopp for proviant på vei opp, og fin å besøke en regnværsdag.',
    links: [
      { label: 'Aktiviteter i Norheimsund', href: 'https://www.getyourguide.com/no-no/norheimsund-l191797/ttd/' },
      { label: 'Opplevelser i Hardanger', href: 'https://hardangerfjord.com/opplevelser' },
    ],
  },
  {
    eb: 'Foss',
    ebClass: 'summer',
    title: 'Steinsdalsfossen',
    body: 'En av de mest besøkte fossene i Norge — du kan gå bak fossen på en tilrettelagt sti. Ligger fem minutter utenfor Norheimsund, rett ved Rv7.',
    links: [
      { label: 'Steinsdalsfossen hos Hardangerfjord', href: 'https://hardangerfjord.com/opplevelser/steinsdalsfossen-792843' },
      { label: 'Nasjonal turistveg Hardanger', href: 'https://www.nasjonaleturistveger.no/no/turistvegene/hardanger/steindalsfossen/' },
    ],
  },
  {
    eb: 'Nasjonalpark',
    ebClass: 'winter',
    title: 'Folgefonna nasjonalpark',
    body: 'Folgefonna er Norges tredje største isbre og synlig fra mange toppturer på Kvamskogen. Mauranger og Bondhusbreen på vestsiden gir lett tilgang for dagsbesøk.',
    links: [
      { label: 'Folgefonna informasjonssenter', href: 'https://folgefonna.info/' },
      { label: 'Folgefonna nasjonalpark hos Hardangerfjord', href: 'https://hardangerfjord.com/opplevelser/folgefonna-nasjonalpark-970413' },
    ],
  },
  {
    eb: 'Fjord',
    ebClass: 'summer',
    title: 'Hardangerfjorden',
    body: 'Norges nest lengste fjord. Fra Norheimsund går det båt mot Eidfjord og Ulvik, og bilfergen mellom Tørvikbygd og Jondal åpner for rundturer på sørsiden av fjorden.',
    links: [
      { label: 'Hardangerfjord', href: 'https://hardangerfjord.com/' },
      { label: 'Hardangerfjorden på Wikipedia', href: 'https://no.wikipedia.org/wiki/Hardangerfjorden' },
    ],
  },
  {
    eb: 'Tradisjon',
    ebClass: 'autumn',
    title: 'Hardanger fartøyvernsenter',
    body: 'Levende verksted for restaurering av trebåter i Norheimsund. Åpent for besøkende store deler av året, og helt verdt en avstikker for både voksne og barn.',
    links: [
      { label: 'Hardanger fartøyvernsenter', href: 'https://fartoyvern.no/' },
    ],
  },
  {
    eb: 'Sør for fjorden',
    ebClass: 'spring',
    title: 'Jondal og Mauranger',
    body: 'Tar du fergen fra Tørvikbygd kommer du til Jondal, med videre vei mot Mauranger og Bondhusvatnet. En klassisk dagstur for hytteeiere på Kvamskogen.',
    links: [
      { label: 'Jondal', href: 'https://www.bookhardanger.com/no/steder-a-besoke/jondal/' },
      { label: 'Bondhusvatnet', href: 'https://hardangerfjord.com/opplevelser/bondhusvatnet-5175833' },
    ],
  },
];

const Place = ({ p }) => (
  <article style={{padding:'24px 0', borderTop:'1px solid var(--color-border, rgba(0,0,0,0.08))'}}>
    <div className={"eyebrow " + p.ebClass}><span className="dot"/>{p.eb}</div>
    <h3 style={{fontFamily:'var(--font-display)', fontSize:'clamp(22px,2.4vw,30px)', fontWeight:500, letterSpacing:'-0.01em', margin:'4px 0 10px'}}>{p.title}</h3>
    <p style={{lineHeight:1.65, color:'var(--color-fg-muted)', fontSize:16, margin:p.links ? '0 0 14px' : 0}}>{p.body}</p>
    {p.links && (
      <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexWrap:'wrap', gap:'8px 20px'}}>
        {p.links.map((l, i) => (
          <li key={i}>
            <a href={l.href} target="_blank" rel="noopener"
               style={{fontSize:14, fontWeight:500, color:'var(--color-fg)', textDecoration:'underline', textUnderlineOffset:4}}>
              {l.label} ↗
            </a>
          </li>
        ))}
      </ul>
    )}
  </article>
);

const Hardanger = () => (
  <section className="section">
    <div className="container" style={{maxWidth:780}}>
      <div className="eyebrow summer"><span className="dot"/>Oppdag Hardanger</div>
      <h2 style={{fontFamily:'var(--font-display)', fontSize:'clamp(34px,4.5vw,56px)', fontWeight:500, lineHeight:1.05, letterSpacing:'-0.02em', margin:'0 0 14px'}}>
        Det som ligger rundt — innenfor en kort kjøretur.
      </h2>
      <p className="lede" style={{marginBottom:32}}>
        Kvamskogen er fjellplatået, men Hardanger er hva som ligger nedenfor. Her er noen steder vi anbefaler — særlig hvis været er for godt, eller for dårlig, til å være oppe.
      </p>
      {PLACES.map((p, i) => <Place key={i} p={p}/>)}
    </div>
  </section>
);

export default Hardanger;
