import { useEffect, useState } from 'react';
import { loadWildlifeCameras } from '../lib/wildlifeCameras.js';

const CAMERAS = [
  {
    group: 'Furedalen Alpin',
    eyebrowClass: 'winter',
    note: 'Direktestrømmer fra Furedalen — øvre og nedre del av anlegget.',
    cams: [
      { title: 'Furedalen Alpin · Topp', src: 'https://www.youtube.com/embed/EjymYkpcQCs?autoplay=1&mute=1&playsinline=1' },
      { title: 'Furedalen Alpin · Bunn', src: 'https://www.youtube.com/embed/FALtJZa6cBw?autoplay=1&mute=1&playsinline=1' },
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

const FALLBACK_WILDLIFE_CAMERAS = [
  {
    id: 'kamera-01',
    name: 'Viltkamera 1',
    description: 'Første testbilde fra kameraet på Kvamskogen.',
    images: [
      {
        avif: '/assets/photos/viltkamera/kamera-01-2026-07-17.avif',
        webp: '/assets/photos/viltkamera/kamera-01-2026-07-17.webp',
        alt: 'Utsikt over grønt fjellterreng på Kvamskogen',
        received: 'Mottatt 17. juli 2026',
      },
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

const WildlifeCamera = ({ camera }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const selected = camera.images[selectedIndex];

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <article className="wildlife-camera-card">
      <div className="wildlife-camera-heading">
        <div>
          <h3>{camera.name}</h3>
          <p>{camera.description}</p>
        </div>
        <span className="wildlife-camera-count">{camera.images.length} {camera.images.length === 1 ? 'bilde' : 'bilder'}</span>
      </div>

      <button className="wildlife-camera-main" type="button" onClick={() => setIsOpen(true)} aria-label={`Åpne siste bilde fra ${camera.name}`}>
        <picture>
          {selected.avif && <source srcSet={selected.avif} type="image/avif" />}
          <img src={selected.webp} alt={selected.alt} loading="lazy" />
        </picture>
        <span className="wildlife-camera-date">{selected.received}</span>
        <span className="wildlife-camera-open">Se stort</span>
      </button>

      <div className="wildlife-camera-history">
        <div>
          <strong>Tidligere bilder</strong>
          <span> Velg et bilde for å se det over.</span>
        </div>
        <div className="wildlife-camera-thumbnails">
          {camera.images.map((image, index) => (
            <button
              className={index === selectedIndex ? 'is-selected' : ''}
              type="button"
              key={image.webp}
              onClick={() => setSelectedIndex(index)}
              aria-label={`Vis ${image.received.toLowerCase()}`}
              aria-pressed={index === selectedIndex}
            >
              <picture>
                {image.avif && <source srcSet={image.avif} type="image/avif" />}
                <img src={image.webp} alt="" loading="lazy" />
              </picture>
              <span>{image.received.replace('Mottatt ', '')}</span>
            </button>
          ))}
        </div>
      </div>

      {isOpen && (
        <div className="wildlife-camera-modal" role="dialog" aria-modal="true" aria-label={`Bilde fra ${camera.name}`} onClick={() => setIsOpen(false)}>
          <button type="button" className="wildlife-camera-close" onClick={() => setIsOpen(false)} aria-label="Lukk bilde">×</button>
          <figure onClick={(event) => event.stopPropagation()}>
            <picture>
              {selected.avif && <source srcSet={selected.avif} type="image/avif" />}
              <img src={selected.webp} alt={selected.alt} />
            </picture>
            <figcaption>{camera.name} · {selected.received}</figcaption>
          </figure>
        </div>
      )}
    </article>
  );
};

const Webkamera = ({ onNav }) => {
  const [wildlifeCameras, setWildlifeCameras] = useState(FALLBACK_WILDLIFE_CAMERAS);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const cameras = await loadWildlifeCameras();
        if (!cancelled && cameras.length) setWildlifeCameras(cameras);
      } catch (_) {
        // Reservebildet beholdes når Supabase er midlertidig utilgjengelig.
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
  <section className="section tight webcam-page" id="webkamera">
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

      <section className="wildlife-camera-section" aria-labelledby="viltkamera-title">
        <div className="eyebrow summer"><span className="dot"/>Viltkamera · siste bilder</div>
        <h2 id="viltkamera-title">Nytt fra terrenget.</h2>
        <p className="lede">
          Siste bilde vises først. Klikk på bildet for stor visning, eller velg et tidligere bilde i historikken.
        </p>
        <div className="wildlife-camera-grid">
          {wildlifeCameras.map((camera) => <WildlifeCamera key={camera.id} camera={camera}/>)}
        </div>
      </section>

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
};

export default Webkamera;
