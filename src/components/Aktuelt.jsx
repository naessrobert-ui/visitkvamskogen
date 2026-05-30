const POSTS = [
  {
    id: 'lavlandsloypen-2025',
    date: '2025-08-15',
    dateLabel: '15. august 2025',
    eyebrowClass: 'summer',
    eyebrow: 'Nyhet · Lavlandsløypen',
    title: 'Lavlandsløypen er på plass — en lettgått runde gjennom skogen.',
    lede: 'Etter flere års arbeid har Kvamskogen Vel fått realisert en helårsløype på lavere terreng, slik at også de som ikke vil opp på fjellet får en fin tur.',
    body: [
      'Lavlandsløypen er en rundløype på Kvamskogen som egner seg for gående, sykkel og barnefamilier. Traseen går i hovedsak på grusvei og lett sti, og er tilrettelagt slik at den er brukbar i store deler av året.',
      'Initiativet ble tatt av Kvamskogen Vel, og er realisert i samarbeid med Kvam herad og grunneiere langs traseen. Tanken har hele tiden vært å gi et alternativ til de mer krevende fjellturene — en tur som passer på en grå dag, med små barn, eller når kondisen ikke strekker til mer.',
      'Detaljert kart over løypa finnes i PDF-en under, og oppdateringer kommer på Vel sine sider.',
    ],
    links: [
      { label: 'Last ned kart (PDF)', href: 'https://www.kvamskogen-vel.no/wp-content/uploads/2025/08/Lavlandsloypen-over-Kvamskogen-pr-juli-2025-4.pdf', external: true },
      { label: 'Mer om prosjektet på Kvamskogen Vel', href: 'https://www.kvamskogen-vel.no/', external: true },
    ],
  },
  {
    id: 'plan-kvamskogen-2026',
    date: '2026-04-20',
    dateLabel: '20. april 2026',
    eyebrowClass: 'spring',
    eyebrow: 'Plansak',
    title: 'Ny områdeplan for Kvamskogen — hva betyr det for hytteeiere?',
    lede: 'Kvam herad har sendt ny områdeplan på høring. Her er en kort oppsummering av hva som ligger på bordet.',
    body: [
      'Planen omfatter blant annet utbyggingsmønster, vann og avløp, trafikkavvikling langs Rv7 og bevaring av friluftsområder. Den berører de fleste hyttetomter på Kvamskogen, både direkte og indirekte.',
      'Kvamskogen Vel har sendt høringssvar på vegne av medlemmene. Vi har lagt vekt på at fortetting må veies mot opplevelsen av Kvamskogen som et åpent fjellandskap, og at infrastruktur (særlig vann og avløp) må følge utviklingen.',
      'Hele høringssvaret, samt selve planforslaget, ligger på Vel sine sider. Vi oppfordrer alle hytteeiere til å sette seg inn i saken — den vil prege Kvamskogen i flere tiår framover.',
    ],
    links: [
      { label: 'Les høringssvaret (Kvamskogen Vel)', href: 'https://www.kvamskogen-vel.no/', external: true },
      { label: 'Kvam herad — plansaker', href: 'https://www.kvam.no/', external: true },
    ],
  },
  {
    id: 'loypeprep-finansiering-2026',
    date: '2026-05-10',
    dateLabel: '10. mai 2026',
    eyebrowClass: 'winter',
    eyebrow: 'Vinterløyper',
    title: 'Slik finansieres skiløypene — og hvorfor det er verdt å bli med.',
    lede: 'Maskinene som kjører løypene koster penger. I dag bidrar under halvparten av hytteeierne — så her er hvordan det henger sammen.',
    body: [
      'Skiløypene på Kvamskogen prepareres av løypemaskiner som kjører om natten, slik at det er klart til søndagsturen. Driften finansieres gjennom løypebidrag fra hytteeiere, sammen med midler fra Kvam herad og noen private bidragsytere.',
      'I sesongen 2025/26 var det under halvparten av hytteeierne på Kvamskogen som betalte løypebidrag. Det er ingen krise — løypene har gått som planlagt — men det betyr at en mindre andel bærer en stor del av regningen for noe alle har glede av.',
      'Det er rett og slett en av de billigste måtene å gjøre Kvamskogen til et bedre sted å være, både for seg selv og for naboene. Mer informasjon, beløp og innbetalingsdetaljer finner du hos Kvamskogen Vel.',
    ],
    links: [
      { label: 'Bli bidragsyter / medlem', href: 'https://www.kvamskogen-vel.no/', external: true },
    ],
  },
];

const Post = ({ post }) => (
  <article className="aktuelt-post">
    <div className={"eyebrow " + post.eyebrowClass}>
      <span className="dot"/>{post.eyebrow}
      <span style={{marginLeft:'auto', color:'var(--color-fg-subtle)', letterSpacing:'0.02em', textTransform:'none', fontWeight:400}}>
        <time dateTime={post.date}>{post.dateLabel}</time>
      </span>
    </div>
    <h3 style={{fontFamily:'var(--font-display)', fontSize:'clamp(26px,3vw,38px)', fontWeight:500, lineHeight:1.1, letterSpacing:'-0.015em', margin:'0 0 12px'}}>
      {post.title}
    </h3>
    <p className="lede" style={{marginBottom:18}}>{post.lede}</p>
    {post.body.map((p, i) => (
      <p key={i} style={{lineHeight:1.7, color:'var(--color-fg-muted)', fontSize:16, margin:'0 0 14px'}}>{p}</p>
    ))}
    {post.links && post.links.length > 0 && (
      <ul style={{listStyle:'none', padding:0, margin:'18px 0 0', display:'flex', flexWrap:'wrap', gap:'10px 22px'}}>
        {post.links.map((l, i) => (
          <li key={i}>
            <a href={l.href} target={l.external ? '_blank' : undefined} rel={l.external ? 'noopener' : undefined}
               style={{fontSize:14, fontWeight:500, color:'var(--color-fg)', textDecoration:'underline', textUnderlineOffset:4}}>
              {l.label}{l.external ? ' ↗' : ''}
            </a>
          </li>
        ))}
      </ul>
    )}
  </article>
);

const Aktuelt = () => (
  <section className="section">
    <div className="container" style={{maxWidth:780}}>
      <div className="eyebrow spring"><span className="dot"/>Aktuelt</div>
      <h2 style={{fontFamily:'var(--font-display)', fontSize:'clamp(34px,4.5vw,56px)', fontWeight:500, lineHeight:1.05, letterSpacing:'-0.02em', margin:'0 0 14px'}}>
        Det som skjer på Kvamskogen nå.
      </h2>
      <p className="lede" style={{marginBottom:48}}>
        Saker fra Kvamskogen Vel og redaksjonen — løyper, planer, og hvorfor området ser ut som det gjør.
      </p>
      <div style={{display:'flex', flexDirection:'column', gap:64}}>
        {POSTS.map(p => <Post key={p.id} post={p}/>)}
      </div>
    </div>
  </section>
);

export default Aktuelt;
