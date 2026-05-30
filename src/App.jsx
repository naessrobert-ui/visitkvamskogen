import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import YearStrip, { MoodBlock } from './components/YearStrip.jsx';
import { WinterCollage, SummerCollage } from './components/SeasonCollage.jsx';
import ActivityGrid from './components/ActivityGrid.jsx';
import TrailList from './components/TrailList.jsx';
import WeatherStrip from './components/WeatherStrip.jsx';
import WeatherForecast from './components/WeatherForecast.jsx';
import Footer from './components/Footer.jsx';
import AddActivityModal from './components/AddActivityModal.jsx';
import { seasonFor } from './lib/season.js';
import { hentYr, vindretningTekst } from './lib/weather.js';

const FALLBACK_WEATHER = {
  station: 'Kvamskogen, 455 moh.',
  temp: '–',
  cond: 'henter…',
  snow: '–',
  wind: '–',
  windDir: '',
  updated: '…',
};

const labelFromSymbol = (sym) => {
  const s = String(sym || '').toLowerCase();
  if (s.includes('thunder')) return 'Torden';
  if (s.includes('sleet')) return 'Sludd';
  if (s.includes('snow')) return 'Snø';
  if (s.includes('rain')) return 'Regn';
  if (s.includes('fog')) return 'Tåke';
  if (s.includes('partlycloudy')) return 'Lettskyet';
  if (s.includes('cloudy')) return 'Overskyet';
  if (s.includes('clearsky') || s.includes('fair')) return 'Klart';
  return '–';
};

const useLiveWeather = () => {
  const [weather, setWeather] = useState(FALLBACK_WEATHER);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Kvamskogen — bruk YR direkte. Snødybde krever Frost (server) og er ikke tilgjengelig her.
        const ts = await hentYr(60.37834747146485, 5.979590206513535);
        if (cancelled || !ts.length) return;
        const now = new Date();
        // Finn nærmeste tidspunkt
        let best = ts[0];
        let bestDt = Math.abs(new Date(ts[0].time) - now);
        for (const it of ts) {
          const dt = Math.abs(new Date(it.time) - now);
          if (dt < bestDt) { best = it; bestDt = dt; }
        }
        const data = best.data || {};
        const inst = ((data.instant || {}).details) || {};
        const symBlock = data.next_1_hours || data.next_6_hours || data.next_12_hours || {};
        const symbol = ((symBlock.summary || {}).symbol_code) || '';
        const temp = inst.air_temperature;
        const wind = inst.wind_speed;
        const windDeg = inst.wind_from_direction;
        setWeather({
          station: 'Kvamskogen, 455 moh.',
          temp: temp !== undefined ? (temp > 0 ? '+' : '') + temp.toFixed(1).replace('.', ',') + '°' : '–',
          cond: labelFromSymbol(symbol),
          snow: '–',
          wind: wind !== undefined ? Math.round(wind).toString() : '–',
          windDir: vindretningTekst(windDeg),
          updated: now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (_) {
        if (!cancelled) setWeather((w) => ({ ...w, cond: 'utilgjengelig' }));
      }
    })();
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
              onSecondary={() => goto('weather')}
              onWeather={() => goto('weather')}/>
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
        {route === 'weather' && <WeatherForecast/>}
        {route === 'about' && (
          <section className="section"><div className="container" style={{maxWidth:680}}>
            <div className="eyebrow summer"><span className="dot"/>Om Kvamskogen</div>
            <h2 style={{fontFamily:'var(--font-display)', fontSize:'clamp(34px,4.5vw,56px)', fontWeight:500, lineHeight:1.05, letterSpacing:'-0.02em', margin:'0 0 14px'}}>Et hyttelandskap, ikke en destinasjon.</h2>
            <p style={{lineHeight:1.7, color:'var(--color-fg-muted)', fontSize:17}}>Kvamskogen er et fjellplatå mellom Samnanger og Hardanger, fra om lag 400 til 1300 moh. Området har om lag 1 700 hytter — den tredje største konsentrasjonen i landet — og har vært et utfartssted for bergensere i over hundre år.</p>
            <p style={{lineHeight:1.7, color:'var(--color-fg-muted)', fontSize:17}}>Denne siden er drevet på dugnad av <a>Kvamskogen Vel</a>, sammen med Kvam herad, Bergen og Omland Friluftsråd og de som kjører løypemaskinene lørdagskvelden.</p>
          </div></section>
        )}
      </main>
      <Footer/>
      {showAdd && <AddActivityModal onClose={() => setShowAdd(false)}/>}
    </div>
  );
};

export default App;
