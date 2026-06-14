import { useState } from 'react';
import { Wordmark } from './Brand.jsx';
import Icon from './Icons.jsx';

const routeHref = (route) => route === 'home' ? '/' : `#/${route}`;
const SECRET_PASSWORD = 'Kvamskogen1971';

const weatherIconName = (weather) => {
  const cond = String(weather?.cond || '').toLowerCase();
  if (cond.includes('snø') || cond.includes('sludd')) return 'cloud-snow';
  if (cond.includes('regn') || cond.includes('tåke') || cond.includes('sky')) return 'cloud';
  if (cond.includes('klart') || cond.includes('lettskyet')) return 'sun';
  return 'thermometer';
};

const Header = ({ overHero, onNav, route, weather, showSecretMenu = false }) => {
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
        <a href={routeHref('aktuelt')} className={route==='aktuelt'?'active':''} onClick={go('aktuelt')}>Aktuelt</a>
        <a href={routeHref('turforslag')} className={(route==='turforslag' || route==='trails')?'active':''} onClick={go('turforslag')}>Turforslag</a>
        <a href={routeHref('vinter')} className={route==='vinter'?'active':''} onClick={go('vinter')}>Vinter</a>
        <a href={routeHref('weather')} className={'weather-nav-link ' + (route==='weather'?'active':'')} onClick={go('weather')}>
          <Icon name={weatherIconName(weather)} size={15}/>
          <span>Vær</span>
          {weather?.temp && weather.temp !== '–' && <span className="weather-nav-temp">{weather.temp}</span>}
        </a>
        <a href={routeHref('webkamera')} className={route==='webkamera'?'active':''} onClick={go('webkamera')}>Webkamera</a>
        <a href={routeHref('marked')} className={route==='marked'?'active':''} onClick={go('marked')}>Marked</a>
        <a href={routeHref('praktisk')} className={route==='praktisk'?'active':''} onClick={go('praktisk')}>Praktisk</a>
        <a href={routeHref('overnatting')} className={route==='overnatting'?'active':''} onClick={go('overnatting')}>Overnatting</a>
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
      <button className={"btn btn-accent btn-sm" + (route === 'tilbud' || route === 'styret' ? ' active' : '')} onClick={() => onNav('tilbud')}>
        <Icon name="heart" size={14} style={{marginRight:6, verticalAlign:-2}}/>
        Kvamskogen Vel
      </button>
    </header>
  );
};

export default Header;
