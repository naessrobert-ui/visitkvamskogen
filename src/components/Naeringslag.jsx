const linkStyle = {
  color: 'var(--color-fg)',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
};

const SectionHeading = ({ eyebrow, tone, title }) => (
  <>
    <div className={'eyebrow ' + tone} style={{marginTop:56}}><span className="dot"/>{eyebrow}</div>
    <h3 style={{fontFamily:'var(--font-display)', fontSize:'clamp(26px,3vw,36px)', fontWeight:500, lineHeight:1.1, letterSpacing:'-0.015em', margin:'8px 0 16px'}}>
      {title}
    </h3>
  </>
);

const PhoneList = ({ title, numbers }) => (
  <div style={{padding:'18px 0', borderTop:'1px solid var(--color-border, rgba(0,0,0,0.08))'}}>
    <h4 style={{fontFamily:'var(--font-display)', fontSize:19, fontWeight:500, letterSpacing:'-0.01em', margin:'0 0 8px'}}>{title}</h4>
    <ul style={{listStyle:'none', padding:0, margin:0, lineHeight:1.9, color:'var(--color-fg-muted)', fontSize:16}}>
      {numbers.map((n) => (
        <li key={n.label} style={{display:'flex', justifyContent:'space-between', gap:16, maxWidth:420}}>
          <span>{n.label}</span>
          <a href={'tel:' + n.tel.replace(/\s/g, '')} style={{...linkStyle, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap'}}>{n.tel}</a>
        </li>
      ))}
    </ul>
  </div>
);

const NODNUMMER = [
  { label: 'Brann', tel: '110' },
  { label: 'Politi', tel: '112' },
  { label: 'Lege / ambulanse', tel: '113' },
];

const NYTTIGE_NUMMER = [
  { label: 'Legevakt', tel: '116 117' },
  { label: 'Brannvarslingssentralen', tel: '55 56 57 30' },
  { label: 'Norheimsund Legesenter', tel: '56 55 39 40' },
  { label: 'Politiet i Kvam', tel: '56 55 35 00' },
  { label: 'Kvam Kraftverk (vakt)', tel: '56 55 33 33' },
  { label: 'Veterinærvakt', tel: '88 00 56 55' },
  { label: 'Falck bilberging', tel: '02 222' },
  { label: 'NAF bilberging', tel: '08 505' },
  { label: 'Kvam herad (09-15)', tel: '56 55 30 00' },
  { label: 'Teknisk vakt, Kvam herad', tel: '56 55 34 00' },
];

const SCOOTERTRANSPORT = [
  { label: 'Norheimsund Røde Kors', tel: '48 13 53 20' },
  { label: 'Bergen Røde Kors', tel: '56 55 89 57' },
  { label: 'Arna Røde Kors', tel: '56 55 88 68' },
  { label: 'Johan Skeie AS', tel: '915 45 745' },
  { label: 'Henrik Steine AS', tel: '408 51 963' },
];

const STYRET = [
  { rolle: 'Leder', navn: 'Henrik Steine', tel: '917 14 982', epost: 'post@henrikmaskin.no' },
  { rolle: 'Nestleder', navn: 'Bertil Ove Skeie', tel: '901 20 855', epost: 'beoske@bellen.no' },
  { rolle: 'Styremedlem', navn: 'Siri Anne Steine', tel: '970 82 461' },
  { rolle: 'Styremedlem', navn: 'Alf Bjarne H. Steine', tel: '906 03 407' },
  { rolle: 'Styremedlem', navn: 'Nils Åge Skeie', tel: '901 05 759' },
  { rolle: 'Varamedlem', navn: 'Georg Års', tel: '481 00 439' },
];

const LEVERANDORER = [
  { navn: 'Thon Hotel Sandven', href: 'https://www.thonhotels.no/hoteller/norge/norheimsund/thon-hotel-sandven/' },
  { navn: 'Mo Sport', href: 'https://sport1.no/butikker/mo-sport/' },
  { navn: 'Fargerike Norheimsund', href: 'https://www.fargerike.no/butikker/fargerike-norheimsund/' },
  { navn: 'Furedalen', href: 'https://www.furedalen.no/' },
  { navn: 'Norheimsund Elektro', href: 'https://nhselektro.no/' },
  { navn: 'Hovden Elektro' },
  { navn: 'Botnen Entreprenør', href: 'https://www.botnen.no' },
  { navn: 'Nils Aksnes' },
  { navn: 'Tecno', href: 'https://www.tecno.no/' },
  { navn: 'Jan Mø', href: 'https://www.janmo.no/' },
  { navn: 'Kvam Security', href: 'https://www.kvamsecurity.no/' },
  { navn: 'NLB Lyd og Bilde', href: 'https://www.lydogbilde.net/' },
  { navn: 'Kvamskogen Ski Eldorado' },
  { navn: 'Kvamskogen Hytteservice' },
];

const Naeringslag = ({ onNav }) => (
  <section className="section">
    <div className="container" style={{maxWidth:780}}>
      <div className="eyebrow winter"><span className="dot"/>Kvamskogen Næringslag</div>
      <h2 style={{fontFamily:'var(--font-display)', fontSize:'clamp(34px,4.5vw,56px)', fontWeight:500, lineHeight:1.05, letterSpacing:'-0.02em', margin:'0 0 14px'}}>
        De som preparerer løypene.
      </h2>
      <p style={{lineHeight:1.7, color:'var(--color-fg-muted)', fontSize:17, margin:'0 0 14px'}}>
        Kvamskogen Næringslag samler næringsdrivende på og rundt Kvamskogen, og står for prepareringen
        av over 65 km turløyper i sesongen. Den mest populære løypa går fra Furedalen videre til Mødal,
        maskinpreparert til foten av Såta. Løypa fra Aktiven inn til Øvre Steinskvanndalen er også mye
        brukt, og lavlandsløypen - turvei om sommeren - prepareres som skiløype om vinteren.
      </p>
      <p style={{lineHeight:1.7, color:'var(--color-fg-muted)', fontSize:16, margin:'0 0 14px'}}>
        Innholdet på denne siden er videreført fra næringslagets tidligere nettside.
        Se også <a href="#lavlandsloypen" onClick={(e) => { e.preventDefault(); onNav && onNav('lavlandsloypen'); }} style={linkStyle}>lavlandsløypen</a> og <a href="#weather" onClick={(e) => { e.preventDefault(); onNav && onNav('weather'); }} style={linkStyle}>vær og føreforhold</a>.
      </p>

      <SectionHeading eyebrow="Løypebidrag" tone="winter" title="Tilskudd til turløypeprepareringen."/>
      <p style={{lineHeight:1.7, color:'var(--color-fg-muted)', fontSize:16, margin:'0 0 10px'}}>
        Næringslaget oppfordrer alle med hytte eller campingvogn på Kvamskogen til å bidra til
        vedlikehold av turløypene. Giro på kr 600 sendes ut hvert år, og kontraktssummen med
        løypekjørerne må betales enten det er mye eller lite snø. Arbeidet skjer i samarbeid med
        Kvamskogen Vel om turveier og bruer.
      </p>
      <ul style={{listStyle:'none', padding:0, margin:0, lineHeight:1.9, color:'var(--color-fg-muted)', fontSize:16}}>
        <li><strong style={{color:'var(--color-fg)'}}>Vipps:</strong> 91705</li>
        <li><strong style={{color:'var(--color-fg)'}}>Bankgiro:</strong> 3530.07.08577</li>
      </ul>

      <SectionHeading eyebrow="Telefonliste" tone="spring" title="Nyttige telefonnummer."/>
      <PhoneList title="Nødnummer" numbers={NODNUMMER}/>
      <PhoneList title="Nyttige nummer" numbers={NYTTIGE_NUMMER}/>
      <PhoneList title="Snøscootertransport" numbers={SCOOTERTRANSPORT}/>

      <SectionHeading eyebrow="Styret" tone="summer" title="Styret i Kvamskogen Næringslag."/>
      <ul style={{listStyle:'none', padding:0, margin:0, lineHeight:1.9, color:'var(--color-fg-muted)', fontSize:16}}>
        {STYRET.map((m) => (
          <li key={m.navn}>
            <strong style={{color:'var(--color-fg)'}}>{m.rolle}:</strong> {m.navn} - <a href={'tel:' + m.tel.replace(/\s/g, '')} style={linkStyle}>{m.tel}</a>
            {m.epost && <> - <a href={'mailto:' + m.epost} style={linkStyle}>{m.epost}</a></>}
          </li>
        ))}
      </ul>

      <SectionHeading eyebrow="Leverandører" tone="autumn" title="Leverandører av varer og tjenester til Kvamskogen."/>
      <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexWrap:'wrap', gap:'8px 18px'}}>
        {LEVERANDORER.map((l) => (
          <li key={l.navn}>
            {l.href ? (
              <a href={l.href} target="_blank" rel="noopener" style={{fontSize:15, fontWeight:500, ...linkStyle, textUnderlineOffset:4}}>
                {l.navn}
              </a>
            ) : (
              <span style={{fontSize:15, fontWeight:500, color:'var(--color-fg)'}}>{l.navn}</span>
            )}
          </li>
        ))}
      </ul>

      <SectionHeading eyebrow="Kontakt" tone="winter" title="Kontakt næringslaget."/>
      <ul style={{listStyle:'none', padding:0, margin:0, lineHeight:1.9, color:'var(--color-fg-muted)', fontSize:16}}>
        <li><strong style={{color:'var(--color-fg)'}}>Adresse:</strong> Kvinnhovden 1, 5600 Norheimsund</li>
        <li><strong style={{color:'var(--color-fg)'}}>Telefon:</strong> <a href="tel:91714982" style={linkStyle}>91 71 49 82</a></li>
      </ul>
    </div>
  </section>
);

export default Naeringslag;
