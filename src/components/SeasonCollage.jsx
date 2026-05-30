const WINTER_PHOTOS = [
  { src: '/assets/photos/winter/hytte-snodd-ned.webp',         cap: 'Hytte snødd ned' },
  { src: '/assets/photos/winter/modalen-djup-sno.webp',        cap: 'Dyp snø i Modalen' },
  { src: '/assets/photos/winter/modalen-vinter.webp',          cap: 'Modalen, januar' },
  { src: '/assets/photos/winter/saata-nysno-toppturarar.webp', cap: 'Sååta · nysnø og toppturfolk' },
  { src: '/assets/photos/winter/topptur-1300-skylag.webp',     cap: 'Topptur 1300 moh.' },
  { src: '/assets/photos/winter/tveitakvitingen-skispor.webp', cap: 'Tveitakvitingen · skispor' },
  { src: '/assets/photos/winter/utsikt-vinter.webp',           cap: 'Utsikt · vinter' },
  { src: '/assets/photos/winter/furedalen-snofall-natt.webp',  cap: 'Furedalen · snøfall om natten' },
];

const SUMMER_PHOTOS = [
  { src: '/assets/photos/summer/tveitakvitingen-sommar.webp', cap: 'Tveitakvitingen · sommer' },
  { src: '/assets/photos/summer/saata-sommar.webp',           cap: 'Sååta i juli' },
  { src: '/assets/photos/summer/sommar-fjell-isflak.webp',    cap: 'Fjellvann · isflak' },
  { src: '/assets/photos/summer/hardangerfjorden.webp',       cap: 'Hardangerfjorden' },
  { src: '/assets/photos/summer/grusvei-stol.webp',           cap: 'Grusvei · stol' },
  { src: '/assets/photos/summer/utsikt-fjord.webp',           cap: 'Utsikt mot fjorden' },
];

const Collage = ({ photos, eyebrowClass, eyebrow, title, lede }) => (
  <section className="section" id={eyebrowClass==='winter' ? 'vinter' : (eyebrowClass==='summer' ? 'sommer' : undefined)}>
    <div className="container">
      <div className={"eyebrow " + eyebrowClass}><span className="dot"/>{eyebrow}</div>
      <h2 style={{fontFamily:'var(--font-display)', fontSize:'clamp(34px,4.5vw,56px)', fontWeight:500, lineHeight:1.05, letterSpacing:'-0.02em', margin:'0 0 14px', maxWidth:780}}>{title}</h2>
      <p className="lede" style={{marginBottom:32, maxWidth:680}}>{lede}</p>
      <div className="collage-grid">
        {photos.map((p, i) => (
          <figure key={i} className={"collage-tile collage-tile-" + (i % 6)}
            style={{backgroundImage:`url('${p.src}')`}}>
            <figcaption>{p.cap}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);

export const WinterCollage = () => (
  <Collage
    photos={WINTER_PHOTOS}
    eyebrowClass="winter"
    eyebrow="Kvamskogen · vinter"
    title="Når snøen kommer, blir det stille."
    lede="Fra de første snøfallene i november til vårski på Folgefonna i mai. Mørke morgener, lyse netter under løypelyset, og toppturer når sola endelig snur."
  />
);

export const SummerCollage = () => (
  <Collage
    photos={SUMMER_PHOTOS}
    eyebrowClass="summer"
    eyebrow="Kvamskogen · sommer"
    title="Sommeren er kort, men lang nok."
    lede="Bading i fjellvann, toppturer uten staver, og fjorden et kvarter unna. Mellom juni og august er Kvamskogen et annet sted."
  />
);
