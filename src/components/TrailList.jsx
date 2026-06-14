const TRAILS = [
  { n:1, name:'Furedalen -> Mødal',          sub:'Maskinpreparert til foten av Såta', km:'8,4 km', status:'ok',   tag:'Preparert i dag' },
  { n:2, name:'Løkjentunet -> Mødal',        sub:'Familievennlig, jevn stigning',       km:'6,1 km', status:'ok',   tag:'Preparert' },
  { n:3, name:'Aktiven -> Steinskvanndalen', sub:'Lite snø under 500 moh.',             km:'4,7 km', status:'warn', tag:'Delvis' },
  { n:4, name:'Lavlandsløypen rundt',        sub:'Åpen hele året - våt etter regn',      km:'4,2 km', status:'ok',   tag:'Åpen', route:'lavlandsloypen' },
  { n:5, name:'Aktiven -> Tveitakvitingen',  sub:'Topptur. Vurder været før avgang.',   km:'5,8 km', status:'bad',  tag:'Stengt' },
];

const SKI_MAP_URL = 'https://prisanalyse.no/ver/skiloyper-kvamskogen';
const INTERNAL_SKI_MAP_URL = '#/skiloyper';

const TrailList = ({ onSelect }) => (
  <section className="section tight">
    <div className="container">
      <div className="section-head">
        <div className="titles">
          <div className="eyebrow winter"><span className="dot"/>Løyper og stier · oppdatert i går kl. 22.30</div>
          <h2>Hva er preparert akkurat nå?</h2>
          <p className="lede">Status kommer direkte fra løypekartet for Kvamskogen.</p>
        </div>
        <a className="btn btn-secondary" href={INTERNAL_SKI_MAP_URL}>Åpne stort kart</a>
      </div>
      <div className="ski-trail-map">
        <iframe
          title="Preparerte skiløyper på Kvamskogen"
          src={SKI_MAP_URL}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="trail-banner">
        <div className="quote">
          <small>Fra dugnaden</small>
          <p>"Det som gjør at maskinene kommer ut lørdagskvelden, er at hyttefolket bidrar med tilskudd."</p>
        </div>
      </div>
      <div className="trail-card">
        {TRAILS.map(t => (
          <div className="trail-row" key={t.n} onClick={() => onSelect && onSelect(t)}>
            <div className="pin">{t.n}</div>
            <div>
              <div className="name">{t.name}</div>
              <div className="sub">{t.sub}</div>
            </div>
            <div className="km">{t.km}</div>
            <span className={"tag tag-" + t.status}><span className="dot"/>{t.tag}</span>
            <div className="arrow">&rarr;</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TrailList;
