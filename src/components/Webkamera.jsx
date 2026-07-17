import { useEffect, useMemo, useState } from 'react';

const CAMERAS = [
  {
    group: 'Furedalen Alpin',
    eyebrowClass: 'winter',
    note: 'Direktestrømmer fra Furedalen — øvre og nedre del av anlegget.',
    cams: [
      { title: 'Furedalen Alpin · Topp', src: 'https://www.youtube.com/embed/EjymYkpcQCs?autoplay=1&mute=1&playsinline=1' },
      { title: 'Furedalen Alpin · Bunn', src: 'https://www.youtube.com/embed/kRhnJsErBdE?autoplay=1&mute=1&playsinline=1' },
    ],
  },
  {
    group: 'Eikedalen Skisenter',
    eyebrowClass: 'summer',
    note: 'Direktestrømmer fra Eikedalen — Tobiasheisen, Tvillingtrekkene og Setertrekket.',
    cams: [
      { title: 'Tobiasheisen', src: 'https://camstreamer.com/embed/TlggbcsCYIopP3dwVr8cQaEAuZpClik56SuHLlpC' },
      { title: 'Tvillingtrekkene', src: 'https://camstreamer.com/embed/Gnsmh9uWRE7FGnRNi6YrAr6DfoefVI86ZMO1hQUT' },
      { title: 'Setertrekket', src: 'https://camstreamer.com/embed/0wd5neFMSF1aeM29ZsWXzYEWpwx5VgBQtLRA64nC' },
    ],
  },
];

const CamFrame = ({ cam }) => (
  <figure style={{margin:0}}>
    <div style={{position:'relative', width:'100%', aspectRatio:'16 / 9', background:'#000', borderRadius:8, overflow:'hidden'}}>
      <iframe
        src={cam.src}
        title={cam.title}
        loading="lazy"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        style={{position:'absolute', inset:0, width:'100%', height:'100%', border:0}}
      />
    </div>
    <figcaption style={{marginTop:8, fontSize:13, color:'var(--color-fg-muted)', letterSpacing:'0.01em'}}>{cam.title}</figcaption>
  </figure>
);

const WildlifeCamera = () => {
  const sourceUrl = String(import.meta.env.VITE_WILDLIFE_CAMERA_URL || '').trim();
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!sourceUrl) return undefined;
    const timer = window.setInterval(() => {
      setImageFailed(false);
      setRefreshKey(Date.now());
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [sourceUrl]);

  const imageUrl = useMemo(() => {
    if (!sourceUrl) return '';
    const separator = sourceUrl.includes('?') ? '&' : '?';
    return `${sourceUrl}${separator}t=${refreshKey}`;
  }, [sourceUrl, refreshKey]);

  return (
    <div style={{marginBottom:56}}>
      <div className="eyebrow summer" style={{marginBottom:6}}><span className="dot"/>Viltkamera</div>
      <p style={{margin:'0 0 20px', color:'var(--color-fg-muted)', fontSize:15, lineHeight:1.5}}>
        Siste bilde fra viltkameraet på Kvamskogen. Bildet oppdateres automatisk når kameraet er koblet til.
      </p>

      <figure style={{margin:0, maxWidth:900}}>
        <div style={{position:'relative', width:'100%', aspectRatio:'4 / 3', background:'var(--color-bg-soft, #eef1ec)', borderRadius:12, overflow:'hidden', display:'grid', placeItems:'center'}}>
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt="Siste bilde fra viltkamera på Kvamskogen"
              loading="eager"
              onError={() => setImageFailed(true)}
              style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}}
            />
          ) : (
            <div style={{padding:32, textAlign:'center', color:'var(--color-fg-muted)', lineHeight:1.55}}>
              <div style={{fontSize:34, marginBottom:10}} aria-hidden="true">🦌</div>
              <strong style={{display:'block', color:'var(--color-fg)', marginBottom:6}}>Viltkameraet klargjøres</strong>
              Første bilde vises her så snart opplastingen fra kameraet er satt opp.
            </div>
          )}
        </div>
        <figcaption style={{marginTop:8, fontSize:13, color:'var(--color-fg-muted)', letterSpacing:'0.01em'}}>
          Siste bilde · automatisk oppfriskning hvert femte minutt
        </figcaption>
      </figure>
    </div>
  );
};

const Webkamera = ({ onNav }) => (
  <section className="section tight" id="webkamera">
    <div className="container">
      <div className="eyebrow winter" style={{marginBottom:8}}><span className="dot"/>Webkamera · direkte</div>
      <h2 style={{fontFamily:'var(--font-display)', fontSize:'clamp(28px,3.6vw,44px)', fontWeight:500, lineHeight:1.1, letterSpacing:'-0.02em', margin:'0 0 12px'}}>
        Se selv hvordan det ser ut oppe.
      </h2>
      <p className="lede" style={{marginBottom:24}}>
        Siste bilde fra viltkameraet og direktestrømmer fra Furedalen og Eikedalen.
      </p>
      {onNav && (
        <p style={{marginBottom:40, fontSize:14}}>
          <button type="button" onClick={() => onNav('weather')} className="btn-ghost" style={{padding:0, fontSize:14, fontWeight:600}}>
            Se også værvarsel for Kvamskogen →
          </button>
        </p>
      )}

      <WildlifeCamera />

      {CAMERAS.map((g, gi) => (
        <div key={gi} style={{marginBottom: gi === CAMERAS.length - 1 ? 0 : 56}}>
          <div className={'eyebrow ' + g.eyebrowClass} style={{marginBottom:6}}><span className="dot"/>{g.group}</div>
          <p style={{margin:'0 0 20px', color:'var(--color-fg-muted)', fontSize:15, lineHeight:1.5}}>{g.note}</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap:20}}>
            {g.cams.map((c, i) => <CamFrame key={i} cam={c}/>) }
          </div>
        </div>
      ))}

      <p style={{marginTop:48, fontSize:13, color:'var(--color-fg-subtle)', lineHeight:1.6}}>
        Direktekameraene er hostet av <a href="https://furedalen.no/webkamera-1.html" target="_blank" rel="noopener" style={{color:'var(--color-fg-muted)', textDecoration:'underline'}}>Furedalen Alpin</a> og <a href="https://www.eikedalen.no/web-kamera/" target="_blank" rel="noopener" style={{color:'var(--color-fg-muted)', textDecoration:'underline'}}>Eikedalen Skisenter</a>. Visitkvamskogen kontrollerer ikke strømmene — er noe nede, er det hos dem.
      </p>
    </div>
  </section>
);

export default Webkamera;
