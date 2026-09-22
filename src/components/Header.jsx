import { useState } from 'react';
import { Wordmark } from './Brand.jsx';
import Icon from './Icons.jsx';
import Link from './Link.jsx';
import { navigate } from '../lib/navigation.js';

const SECRET_PASSWORD = 'Kvamskogen1971';

const weatherIconName = (weather) => {
  const cond = String(weather?.cond || '').toLowerCase();
  if (cond.includes('snø') || cond.includes('sludd')) return 'cloud-snow';
  if (cond.includes('regn') || cond.includes('tåke') || cond.includes('sky')) return 'cloud';
  if (cond.includes('klart') || cond.includes('lettskyet')) return 'sun';
  return 'thermometer';
};

const NAV = [
  { key: 'aktuelt', to: '/aktuelt', label: 'Aktuelt' },
  { key: 'aktiviteter', to: '/aktiviteter', label: 'Aktiviteter' },
  { key: 'turforslag', to: '/turforslag', label: 'Turforslag', also: ['tur'] },
  { key: 'vinter', to: '/vinter', label: 'Vinter' },
  { key: 'vaer', to: '/vaer', label: 'Vær', weather: true },
  { key: 'webkamera', to: '/webkamera', label: 'Webkamera' },
  { key: 'marked', to: '/marked', label: 'Marked' },
  { key: 'praktisk', to: '/praktisk', label: 'Praktisk' },
];

const Header = ({ overHero, route, weather, showSecretMenu = false }) => {
  const [secretValue, setSecretValue] = useState('');

  const handleSecretChange = (event) => {
    const value = event.target.value;
    setSecretValue(value);

    if (value === SECRET_PASSWORD) {
      setSecretValue('');
      navigate('/historie-admin');
    }
  };

  return (
    <header className={"kk-header" + (overHero ? " over-hero" : "")}>
      <Wordmark/>
      <nav className="kk-nav">
        {NAV.map((item) => {
          const active = route === item.key || item.also?.includes(route);
          const className = (item.weather ? 'weather-nav-link ' : '') + (active ? 'active' : '');
          return (
            <Link key={item.key} to={item.to} className={className} aria-current={active ? 'page' : undefined}>
              {item.weather ? (
                <>
                  <Icon name={weatherIconName(weather)} size={15}/>
                  <span>{item.label}</span>
                  {weather?.temp && weather.temp !== '–' && <span className="weather-nav-temp">{weather.temp}</span>}
                </>
              ) : item.label}
            </Link>
          );
        })}
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
      <Link className={"btn btn-accent btn-sm" + (route === 'tilbud' || route === 'styret' ? ' active' : '')} to="/tilbud">
        <Icon name="heart" size={14} style={{marginRight:6, verticalAlign:-2}}/>
        Kvamskogen Vel
      </Link>
    </header>
  );
};

export default Header;
