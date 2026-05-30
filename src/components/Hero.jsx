import { Fragment, useState } from 'react';
import WeatherStrip from './WeatherStrip.jsx';
import { pickHeroImage, heroSources } from '../lib/hero-images.js';
import { seasonFor } from '../lib/season.js';

const HEADLINES = {
  spring: { eyebrow: 'Vår på Kvamskogen', title: 'Snøen smelter i dalen.\nFortsatt ski oppi fjellet.', lede: 'Lengre lyse kvelder, rim om morgenen, og turløyper som gradvis kommer fram. Kvamskogen er femti minutter fra Bergen.' },
  winter: { eyebrow: 'Vinter på Kvamskogen', title: 'Mer enn seksti km\npreparerte skiløyper.', lede: 'Tre alpinanlegg, et nett av løyper, og maskinen som kjører ut om natten. Sjekk været før du kjører oppover.' },
  summer: { eyebrow: 'Sommer på Kvamskogen · inngangen til Hardanger', title: 'Hardanger ovenfra,\nfjorden helt nær.', lede: 'Toppturer til Tveitakvitingen, fjellvann varme nok til å bade i, og fjorden en halvtime ned. Et fjell mellom Bergen og Hardanger.' },
  autumn: { eyebrow: 'Høst på Kvamskogen', title: 'Klar luft og rolig\nvann i Kjelen.', lede: 'Mose, lyng og de første rim­morgenene. Sopp i skogen, og kvelder som blir mørke nok til å se stjerner.' },
};

const Hero = ({ season, weather, onPrimary, onSecondary, onWeather }) => {
  const now = new Date();
  const seasonKey = HEADLINES[season] ? season : seasonFor(now);
  const h = HEADLINES[seasonKey];

  const [pick] = useState(() => pickHeroImage(now));
  const src = heroSources(pick);

  const lines = h.title.split('\n');
  return (
    <section className="hero">
      <div className="hero-bg">
        <picture>
          <source srcSet={src.avif} type="image/avif" />
          <img
            className="hero-photo"
            src={src.webp}
            alt=""
            decoding="async"
          />
        </picture>
      </div>
      <div className="hero-content">
        <div className="hero-eyebrow"><span className="dot"/>{h.eyebrow}</div>
        <h1>{lines.map((l,i)=> <Fragment key={i}>{l}{i<lines.length-1 && <br/>}</Fragment>)}</h1>
        <p className="lede">{h.lede}</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={onPrimary}>Se turløyper</button>
          <button className="btn-ghost on-dark" onClick={onSecondary}>Vær og føreforhold →</button>
        </div>
      </div>
      <WeatherStrip data={weather} onSeeMore={onWeather || onSecondary}/>
    </section>
  );
};

export default Hero;
