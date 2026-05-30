const TravelCard = ({ title, body, links }) => (
  <div style={{padding:'24px 0', borderTop:'1px solid var(--color-border, rgba(0,0,0,0.08))'}}>
    <h3 style={{fontFamily:'var(--font-display)', fontSize:22, fontWeight:500, letterSpacing:'-0.01em', margin:'0 0 8px'}}>{title}</h3>
    <p style={{lineHeight:1.65, color:'var(--color-fg-muted)', fontSize:16, margin:'0 0 10px'}}>{body}</p>
    {links && (
      <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexWrap:'wrap', gap:'8px 18px'}}>
        {links.map((l, i) => (
          <li key={i}>
            <a href={l.href} target="_blank" rel="noopener"
               style={{fontSize:14, fontWeight:500, color:'var(--color-fg)', textDecoration:'underline', textUnderlineOffset:4}}>
              {l.label} ↗
            </a>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const Praktisk = () => (
  <section className="section">
    <div className="container" style={{maxWidth:780}}>
      <div className="eyebrow summer"><span className="dot"/>Praktisk</div>
      <h2 style={{fontFamily:'var(--font-display)', fontSize:'clamp(34px,4.5vw,56px)', fontWeight:500, lineHeight:1.05, letterSpacing:'-0.02em', margin:'0 0 14px'}}>
        Et hyttelandskap, ikke en destinasjon.
      </h2>
      <p style={{lineHeight:1.7, color:'var(--color-fg-muted)', fontSize:17, margin:'0 0 14px'}}>
        Kvamskogen er et fjellplatå mellom Samnanger og Hardanger, fra om lag 400 til 1300 moh. Området har om lag 1 700 hytter — den tredje største konsentrasjonen i landet — og har vært et utfartssted for bergensere i over hundre år.
      </p>
      <p style={{lineHeight:1.7, color:'var(--color-fg-muted)', fontSize:17, margin:'0 0 48px'}}>
        Denne siden er drevet på dugnad av <a href="https://www.kvamskogen-vel.no/" target="_blank" rel="noopener" style={{color:'var(--color-fg)', textDecoration:'underline', textUnderlineOffset:3}}>Kvamskogen Vel</a>, sammen med Kvam herad, Bergen og Omland Friluftsråd og de som kjører løypemaskinene lørdagskvelden.
      </p>

      <div className="eyebrow winter" style={{marginTop:32}}><span className="dot"/>Hvordan komme hit</div>
      <h3 style={{fontFamily:'var(--font-display)', fontSize:'clamp(26px,3vw,36px)', fontWeight:500, lineHeight:1.1, letterSpacing:'-0.015em', margin:'8px 0 24px'}}>
        Drøyt en time fra Bergen, halvannen fra flyplassen.
      </h3>

      <TravelCard
        title="Med bil fra Bergen"
        body="E16 mot Voss, ta av mot Hardanger på Trengereid og følg Rv7 over Kvamskogen. Kjøretid er om lag 1 t 15 min ved gode forhold. Vinterstid kan vær og brøyting gi forsinkelser — sjekk Statens vegvesen før avreise."
        links={[
          { label: 'Veimelding Statens vegvesen', href: 'https://www.vegvesen.no/trafikkinformasjon/' },
        ]}
      />

      <TravelCard
        title="Med buss"
        body="Skyss-buss går mellom Bergen og Norheimsund via Kvamskogen. Stoppestedene ligger langs Rv7 og er nærmest til Mødalen, Kvamskogen sentrum og Tørvikbygd. Sjekk rutetider på skyss.no — frekvensen varierer mellom hverdag og helg."
        links={[
          { label: 'Skyss reiseplanlegger', href: 'https://www.skyss.no/' },
        ]}
      />

      <TravelCard
        title="Med fly + buss"
        body="Fra Bergen lufthavn Flesland: Flybuss til Bergen sentrum, deretter Skyss til Kvamskogen. Total reisetid om lag 2–2,5 timer. Bilutleie på flyplassen er ofte enklere hvis du har bagasje og barn."
      />

      <TravelCard
        title="Parkering"
        body="Det er offentlige parkeringsplasser ved skisentrene (Eikedalen, Furedalen) og ved enkelte løypestarter. Gjesteparkering ved hyttene er privat. Vinterstid: vær oppmerksom på brøytekanter og kjør ikke utenfor merket plass."
      />

      <div className="eyebrow spring" style={{marginTop:64}}><span className="dot"/>Kontakt</div>
      <h3 style={{fontFamily:'var(--font-display)', fontSize:'clamp(26px,3vw,36px)', fontWeight:500, lineHeight:1.1, letterSpacing:'-0.015em', margin:'8px 0 16px'}}>
        Hvem du snakker med om hva.
      </h3>
      <ul style={{listStyle:'none', padding:0, margin:0, lineHeight:1.8, color:'var(--color-fg-muted)', fontSize:16}}>
        <li><strong style={{color:'var(--color-fg)'}}>Kvamskogen Vel:</strong> løyper, plansaker, medlemskap. <a href="https://www.kvamskogen-vel.no/" target="_blank" rel="noopener" style={{color:'var(--color-fg)', textDecoration:'underline', textUnderlineOffset:3}}>kvamskogen-vel.no ↗</a></li>
        <li><strong style={{color:'var(--color-fg)'}}>Kvam herad:</strong> reguleringsplaner, vann/avløp, kommunale tjenester.</li>
        <li><strong style={{color:'var(--color-fg)'}}>Bergen og Omland Friluftsråd:</strong> friluftsområder, turstier.</li>
      </ul>
    </div>
  </section>
);

export default Praktisk;
