import { Fragment, useState } from 'react';
import { pickHeroImage, heroSources } from '../lib/hero-images.js';
import { seasonFor } from '../lib/season.js';

const SUMMER_VARIANTS = {
  sun: {
    eyebrow: 'Sommer på Kvamskogen · sol og fjellvann',
    title: 'Hardanger ovenfra,\nfjorden helt nær.',
    lede: 'Sol over fjellene, bading i fjellvann og lange lyse kvelder. Idylliske turer i lavlandsløypen eller opp i fjellet til 1300 m, og fjorden bare et kvarter ned til Norheimsund.',
  },
  mixed: {
    eyebrow: 'Sommer på Kvamskogen · inngangen til Hardanger',
    title: 'Hardanger ovenfra,\nfjorden helt nær.',
    lede: 'Idylliske turer i lavlandsløypen eller opp i fjellet helt opp til 1300 m høyde, og fjorden bare et kvarter ned til Norheimsund. Et fjell mellom Bergen og Hardanger.',
  },
  rain: {
    eyebrow: 'Sommer på Kvamskogen · vått og rått',
    title: 'Lave skyer over\nfjellet, mose som glitrer.',
    lede: 'Turvær for de tøffe — våt mose, lukten av regn i furuskogen, og lite folk i løypene. Eller ta turen ned til fjorden i Norheimsund, bare et kvarter unna.',
  },
};

const HEADLINES = {
  spring: { eyebrow: 'Vår på Kvamskogen', title: 'Snøen smelter i dalen.\nFortsatt ski oppi fjellet.', lede: 'Lengre lyse kvelder, rim om morgenen, og turløyper som gradvis kommer fram. Kvamskogen er femti minutter fra Bergen.' },
  winter: { eyebrow: 'Vinter på Kvamskogen', title: 'Mer enn seksti km\npreparerte skiløyper.', lede: 'Tre alpinanlegg, et nett av løyper, og maskinen som kjører ut om natten. Sjekk været før du kjører oppover.' },
  summer: SUMMER_VARIANTS.mixed,
  autumn: { eyebrow: 'Høst på Kvamskogen', title: 'Klar luft og rolig\nvann i Kjelen.', lede: 'Mose, lyng og de første rim­morgenene. Sopp i skogen, og kvelder som blir mørke nok til å se stjerner.' },
};

const Hero = ({ season, onPrimary, onSecondary }) => {
  const now = new Date();
  const seasonKey = HEADLINES[season] ? season : seasonFor(now);
  const mood = weather && SUMMER_VARIANTS[weather.mood] ? weather.mood : null;
  const h = seasonKey === 'summer' && mood ? SUMMER_VARIANTS[mood] : HEADLINES[seasonKey];

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
    </section>
  );
};

export default Hero;
