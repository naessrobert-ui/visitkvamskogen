import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import YearStrip, { MoodBlock } from './components/YearStrip.jsx';
import { WinterCollage, SummerCollage } from './components/SeasonCollage.jsx';
import ActivityGrid from './components/ActivityGrid.jsx';
import TrailList from './components/TrailList.jsx';
import WeatherStrip from './components/WeatherStrip.jsx';
import Footer from './components/Footer.jsx';
import AddActivityModal from './components/AddActivityModal.jsx';
import Aktuelt from './components/Aktuelt.jsx';
import Praktisk from './components/Praktisk.jsx';
import Overnatting from './components/Overnatting.jsx';
import Hardanger from './components/Hardanger.jsx';
import Webkamera from './components/Webkamera.jsx';
import { seasonFor } from './lib/season.js';

const FALLBACK_WEATHER = {
  station: 'Kvamskogen, 455 moh.',
  temp: '–',
  cond: 'henter…',
  snow: '–',
  wind: '–',
  windDir: '',
  updated: '…',
};

const degToCompass = (deg) => {
  if (deg === null || deg === undefined) return '';
  const dirs = ['N','NØ','Ø','SØ','S','SV','V','NV'];
  return dirs[Math.round(deg / 45) % 8];
};

const useLiveWeather = () => {
  const [weather, setWeather] = useState(FALLBACK_WEATHER);
  useEffect(() => {
    let cancelled = false;
    const tryEndpoints = async () => {
      const urls = [
        '/ver/api/snovarsel?stasjon=Kvamskogen',
        '/ver/api/kvamskogen/snovarsel',
        '/ver/api/kvamskogen',
        '/ver/snovarsel?stasjon=Kvamskogen&format=json',
      ];
      for (const url of urls) {
        try {
          const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
          if (!r.ok) continue;
          const ct = r.headers.get('content-type') || '';
          if (!ct.includes('json')) continue;
          const txt = await r.text();
          const cleaned = txt
            .replace(/\bNaN\b/g, 'null')
            .replace(/\b-?Infinity\b/g, 'null');
          let d;
          try {
            d = JSON.parse(cleaned);
          } catch (parseErr) {
            console.warn('[Vær] kunne ikke parse JSON fra', url, parseErr.message);
            continue;
          }
          if (cancelled) return;
          console.log('[Vær] OK fra', url, d);
          const s = d.sammendrag || d.summary || d || {};
          const iv = (d.intervaller && d.intervaller[0]) || (d.intervals && d.intervals[0]) || d.now || {};
          const t = s.temperatur_nå_c ?? s.temp_c ?? s.temperatur ?? d.temp ?? iv.temperatur_c;
          const snow = s.start_snødybde_cm ?? s.snødybde_cm ?? s.snow_cm ?? d.snow_cm;
          const wind = iv.vind_ms ?? iv.wind_ms ?? d.wind_ms ?? s.vind_ms;
          const windDeg = iv.vindretning_grader ?? iv.wind_dir_deg ?? d.wind_dir_deg;
          const cond = iv.vær_label ?? iv.weather_label ?? iv.symbol ?? d.cond;
          const hentet = d.hentet || d.fetched_at || d.updated_at;
          const updated = hentet
            ? new Date(hentet).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
          setWeather({
            station: 'Kvamskogen, 455 moh.',
            temp: t !== null && t !== undefined ? (t > 0 ? '+' : '') + String(t).replace('.', ',') + '°' : '–',
            cond: cond || '–',
            snow: snow !== null && snow !== undefined ? Math.round(snow).toString() : '–',
            wind: wind !== null && wind !== undefined ? Math.round(wind).toString() : '–',
            windDir: degToCompass(windDeg),
            updated,
          });
          return;
        } catch (e) {
          console.warn('[Vær] feilet for', url, e.message);
        }
      }
      console.warn('[Vær] Ingen endepunkt svarte — beholder fallback');
    };
    tryEndpoints();
    return () => { cancelled = true; };
  }, []);
  return weather;
};

const App = () => {
  const [route, setRoute] = useState('home');
  const [season] = useState(() => seasonFor());
  const [overHero, setOverHero] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const WEATHER = useLiveWeather();

  useEffect(() => {
    const onScroll = () => setOverHero(window.scrollY < 80 && route === 'home');
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [route]);

  const goto = (r) => { setRoute(r); window.scrollTo({ top: 0 }); };

  return (
    <div className="app" data-screen-label={"Kvamskogen.no — " + route}>
      <Header overHero={overHero && route==='home'} onNav={goto} route={route} onAdd={() => setShowAdd(true)}/>
      <main className="main">
        {route === 'home' && (
          <>
            <Hero season={season} weather={WEATHER}
              onPrimary={() => goto('trails')}
              onSecondary={() => goto('weather')}/>
            <YearStrip/>
            <WinterCollage/>
            <ActivityGrid defaultSeason={season}/>
            <SummerCollage/>
            <MoodBlock/>
            <TrailList/>
          </>
        )}
        {route === 'trails' && (
          <div style={{paddingTop:32}}>
            <TrailList/>
          </div>
        )}
        {route === 'activities' && <ActivityGrid defaultSeason="all"/>}
        {route === 'weather' && (
          <>
            <section className="section"><div className="container">
              <div className="eyebrow winter"><span className="dot"/>Vær · live</div>
              <h2 style={{fontFamily:'var(--font-display)', fontSize:'clamp(34px,4.5vw,56px)', fontWeight:500, lineHeight:1.05, letterSpacing:'-0.02em'}}>Slik er det oppe nå.</h2>
              <p className="lede" style={{marginBottom:24}}>Tre værstasjoner på Kvamskogen, oppdatert hvert tiende minutt — og direktebilder fra skisentrene under.</p>
              <WeatherStrip data={WEATHER}/>
            </div></section>
            <Webkamera/>
          </>
        )}
        {route === 'aktuelt' && <Aktuelt/>}
        {route === 'praktisk' && <Praktisk/>}
        {route === 'overnatting' && <Overnatting/>}
        {route === 'hardanger' && <Hardanger/>}
      </main>
      <Footer/>
      {showAdd && <AddActivityModal onClose={() => setShowAdd(false)}/>}
    </div>
  );
};

export default App;
