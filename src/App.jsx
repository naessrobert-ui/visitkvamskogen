import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import YearStrip, { MoodBlock } from './components/YearStrip.jsx';
import { WinterCollage, SummerCollage } from './components/SeasonCollage.jsx';
import ActivityGrid from './components/ActivityGrid.jsx';
import TrailList from './components/TrailList.jsx';
import WeatherForecast from './components/WeatherForecast.jsx';
import Footer from './components/Footer.jsx';
import AddActivityModal from './components/AddActivityModal.jsx';
import CommunityActivities from './components/CommunityActivities.jsx';
import OrganizerDashboard from './components/OrganizerDashboard.jsx';
import Aktuelt from './components/Aktuelt.jsx';
import Praktisk from './components/Praktisk.jsx';
import Overnatting from './components/Overnatting.jsx';
import Hardanger from './components/Hardanger.jsx';
import Webkamera from './components/Webkamera.jsx';
import LavlandsloypeMap from './components/LavlandsloypeMap.jsx';
import LavlandsloypeCard from './components/LavlandsloypeCard.jsx';
import { createActivity, loadActivities } from './lib/activities.js';
import { seasonFor } from './lib/season.js';
import { hentYr, vindretningTekst } from './lib/weather.js';
import { classifySummerMood } from './lib/hero-mood.js';

const FALLBACK_WEATHER = {
  station: 'Kvamskogen, 455 moh.',
  temp: '–',
  cond: 'henter…',
  snow: '–',
  wind: '–',
  windDir: '',
  updated: '…',
  mood: 'mixed',
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
        const mood = classifySummerMood(ts);
        setWeather({
          station: 'Kvamskogen, 455 moh.',
          temp: temp !== undefined ? (temp > 0 ? '+' : '') + temp.toFixed(1).replace('.', ',') + '°' : '–',
          cond: labelFromSymbol(symbol),
          snow: '–',
          wind: wind !== undefined ? Math.round(wind).toString() : '–',
          windDir: vindretningTekst(windDeg),
          updated: now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
          mood,
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
  const [organizerAccess] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const activityId = params.get('arrangor');
    const token = params.get('token');
    return activityId && token ? { activityId, token } : null;
  });
  const [route, setRoute] = useState(() => organizerAccess ? 'organizer' : 'home');
  const [season] = useState(() => seasonFor());
  const [overHero, setOverHero] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submittedActivities, setSubmittedActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState('');
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const WEATHER = useLiveWeather();

  useEffect(() => {
    const onScroll = () => setOverHero(window.scrollY < 80 && route === 'home');
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [route]);

  const goto = (r) => { setRoute(r); window.scrollTo({ top: 0 }); };

  useEffect(() => {
    let cancelled = false;

    const fetchActivities = async () => {
      setActivitiesLoading(true);
      setActivitiesError('');
      try {
        const { activities, isConfigured } = await loadActivities();
        if (cancelled) return;
        setSupabaseConfigured(isConfigured);
        setSubmittedActivities(activities);
      } catch (_) {
        if (!cancelled) setActivitiesError('Kunne ikke hente aktiviteter akkurat nå.');
      } finally {
        if (!cancelled) setActivitiesLoading(false);
      }
    };

    fetchActivities();
    return () => { cancelled = true; };
  }, []);

  const addActivity = async (activity) => {
    const savedActivity = await createActivity(activity);
    setSubmittedActivities((items) => [savedActivity, ...items]);
    setRoute('activities');
    return savedActivity;
  };

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
            <TrailList onSelect={(t) => t.route && goto(t.route)}/>
            <ActivityGrid defaultSeason={season} onShowAll={() => goto('activities')}/>
            <SummerCollage/>
            <MoodBlock/>
            <LavlandsloypeCard onOpen={() => goto('lavlandsloypen')}/>
          </>
        )}
        {route === 'trails' && (
          <div style={{paddingTop:32}}>
            <LavlandsloypeCard onOpen={() => goto('lavlandsloypen')}/>
          </div>
        )}
        {route === 'lavlandsloypen' && (
          <div style={{paddingTop:32}}>
            <LavlandsloypeMap/>
          </div>
        )}
        {route === 'activities' && (
          <CommunityActivities
            activities={submittedActivities}
            loading={activitiesLoading}
            error={activitiesError}
            supabaseConfigured={supabaseConfigured}
            onAdd={() => setShowAdd(true)}
          />
        )}
        {route === 'organizer' && (
          <OrganizerDashboard access={organizerAccess}/>
        )}
        {route === 'weather' && <WeatherForecast/>}
        {route === 'webkamera' && <Webkamera onNav={goto}/>}
        {route === 'aktuelt' && <Aktuelt/>}
        {route === 'praktisk' && <Praktisk/>}
        {route === 'overnatting' && <Overnatting/>}
        {route === 'hardanger' && <Hardanger/>}
      </main>
      <Footer/>
      {showAdd && <AddActivityModal onClose={() => setShowAdd(false)} onSubmit={addActivity}/>}
    </div>
  );
};

export default App;
