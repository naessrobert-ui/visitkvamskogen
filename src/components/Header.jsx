import { Wordmark } from './Brand.jsx';
import Icon from './Icons.jsx';

const Header = ({ overHero, onNav, route }) => {
  return (
    <header className={"kk-header" + (overHero ? " over-hero" : "")}>
      <Wordmark onClick={() => onNav('home')}/>
      <nav className="kk-nav">
        <a className={route==='activities'?'active':''} onClick={() => onNav('activities')}>Aktiviteter</a>
        <a className={route==='marked'?'active':''} onClick={() => onNav('marked')}>Marked</a>
        <a className={route==='overnatting'?'active':''} onClick={() => onNav('overnatting')}>Overnatting</a>
        <a className={route==='vinter'?'active':''} onClick={() => onNav('vinter')}>Vinter</a>
        <a className={route==='webkamera'?'active':''} onClick={() => onNav('webkamera')}>Webkamera</a>
        <a className={route==='aktuelt'?'active':''} onClick={() => onNav('aktuelt')}>Aktuelt</a>
        <a className={route==='hardanger'?'active':''} onClick={() => onNav('hardanger')}>Oppdag Hardanger</a>
        <a className={route==='praktisk'?'active':''} onClick={() => onNav('praktisk')}>Praktisk</a>
      </nav>
      <div className="spacer"/>
      <button className="btn btn-accent btn-sm" onClick={() => onNav('tilbud')}>
        <Icon name="heart" size={14} style={{marginRight:6, verticalAlign:-2}}/>
        Dagens tilbud
      </button>
    </header>
  );
};

export default Header;
