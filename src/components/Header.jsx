import { useState } from 'react';
import { Wordmark } from './Brand.jsx';
import Icon from './Icons.jsx';

const routeHref = (route) => route === 'home' ? '/' : `#/${route}`;
const SECRET_PASSWORD = 'Kvamskogen1971';

const Header = ({ overHero, onNav, route, showSecretMenu = false }) => {
  const [secretValue, setSecretValue] = useState('');

  const go = (nextRoute) => (event) => {
    event.preventDefault();
    onNav(nextRoute);
  };

  const handleSecretChange = (event) => {
    const value = event.target.value;
    setSecretValue(value);

    if (value === SECRET_PASSWORD) {
      setSecretValue('');
      onNav('historie-admin');
    }
  };

  return (
    <header className={"kk-header" + (overHero ? " over-hero" : "")}>
      <Wordmark onClick={go('home')}/>
      <nav className="kk-nav">
        <a href={routeHref('activities')} className={route==='activities'?'active':''} onClick={go('activities')}>Aktiviteter</a>
        <a href={routeHref('marked')} className={route==='marked'?'active':''} onClick={go('marked')}>Marked</a>
        <a href={routeHref('overnatting')} className={route==='overnatting'?'active':''} onClick={go('overnatting')}>Overnatting</a>
        <a href={routeHref('vinter')} className={route==='vinter'?'active':''} onClick={go('vinter')}>Vinter</a>
        <a href={routeHref('webkamera')} className={route==='webkamera'?'active':''} onClick={go('webkamera')}>Webkamera</a>
        <a href={routeHref('aktuelt')} className={route==='aktuelt'?'active':''} onClick={go('aktuelt')}>Aktuelt</a>
        <a href={routeHref('hardanger')} className={route==='hardanger'?'active':''} onClick={go('hardanger')}>Oppdag Hardanger</a>
        <a href={routeHref('praktisk')} className={route==='praktisk'?'active':''} onClick={go('praktisk')}>Praktisk</a>
      </nav>
      <div className="spacer"/>
      {showSecretMenu && (
        <label className="secret-menu-field">
          <input
            type="password"
            value={secretValue}
            onChange={handleSecretChange}
            autoComplete="off"
            aria-label="Adminkode"
          />
        </label>
      )}
      <button className="btn btn-accent btn-sm" onClick={() => onNav('tilbud')}>
        <Icon name="heart" size={14} style={{marginRight:6, verticalAlign:-2}}/>
        Kvamskogen Vel
      </button>
    </header>
  );
};

export default Header;
