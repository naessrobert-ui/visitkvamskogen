import { Fragment } from 'react';
import WeatherStrip from './WeatherStrip.jsx';

const Hero = ({ season, weather, onPrimary, onSecondary }) => {
  const seasonClass = ['winter','spring','summer','autumn'].includes(season) ? season : 'spring';
  const headlineBySeason = {
    spring: { eyebrow: 'Vår på Kvamskogen', title: 'Snøen smelter i dalen.\nFramleis ski oppi fjellene.', lede: 'Lengre lyse kveldar, rim om morgonen, og turløyper som gradvis kjem fram. Kvamskogen er femti minutt frå Bergen.' },
    winter: { eyebrow: 'Vinter på Kvamskogen', title: 'Meir enn seksti km\npreparerte skiløyper.', lede: 'Tre alpinanlegg, eit nett av løyper, og maskina som kjøyrer ut om natta. Sjekk vêret før du kjører oppover.' },
    summer: { eyebrow: 'Sommer på Kvamskogen', title: 'Hardanger ovenfra.\nFjord, fjell og ein fortelling.', lede: 'Toppturar til Tveitakvitingen, fiskevatn utan kort, og ein fjord som ligg femti minutt unna ein bytur.' },
    autumn: { eyebrow: 'Haust på Kvamskogen', title: 'Klar luft og roleg\nvatn i Kjelen.', lede: 'Mose, lyng og dei første rim­morgonane. Sopp i skogen, og kveldar som blir mørke nok til å sjå stjerner.' },
  };
  const h = headlineBySeason[seasonClass];
  const lines = h.title.split('\n');
  return (
    <section className="hero">
      <div className="hero-bg"><div className={"hero-photo " + seasonClass}/></div>
      <div className="hero-content">
        <div className="hero-eyebrow"><span className="dot"/>{h.eyebrow} · 50 min frå Bergen</div>
        <h1>{lines.map((l,i)=> <Fragment key={i}>{l}{i<lines.length-1 && <br/>}</Fragment>)}</h1>
        <p className="lede">{h.lede}</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={onPrimary}>Sjå turløyper</button>
          <button className="btn btn-secondary on-dark" onClick={onSecondary}>Vêr og føreforhold</button>
        </div>
      </div>
      <WeatherStrip data={weather}/>
    </section>
  );
};

export default Hero;
