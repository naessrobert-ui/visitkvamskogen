import { Wordmark } from './Brand.jsx';
import Icon from './Icons.jsx';

const Header = ({ overHero, onNav, route, onAdd }) => {
  const scrollToId = (id) => {
    if (route !== 'home') {
      onNav('home');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
      }, 60);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
    }
  };
  return (
    <header className={"kk-header" + (overHero ? " over-hero" : "")}>
      <Wordmark onClick={() => onNav('home')}/>
      <nav className="kk-nav">
        <a onClick={() => scrollToId('aktiviteter')}>Aktiviteter</a>
        <a className={route==='overnatting'?'active':''} onClick={() => onNav('overnatting')}>Overnatting</a>
        <a onClick={() => scrollToId('vinter')}>Vinter</a>
        <a className={route==='weather'?'active':''} onClick={() => onNav('weather')}>Vær</a>
        <a className={route==='aktuelt'?'active':''} onClick={() => onNav('aktuelt')}>Aktuelt</a>
        <a className={route==='hardanger'?'active':''} onClick={() => onNav('hardanger')}>Oppdag Hardanger</a>
        <a className={route==='praktisk'?'active':''} onClick={() => onNav('praktisk')}>Praktisk</a>
      </nav>
      <div className="spacer"/>
      <button className="btn btn-accent btn-sm" onClick={onAdd}>
        <Icon name="plus" size={14} style={{marginRight:6, verticalAlign:-2}}/>
        Legg til aktivitet
      </button>
    </header>
  );
};

export default Header;
