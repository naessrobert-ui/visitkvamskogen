import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import HomeShortcuts from './components/HomeShortcuts.jsx';
import TrailList from './components/TrailList.jsx';
import WeatherForecast from './components/WeatherForecast.jsx';
import Footer from './components/Footer.jsx';
import AddActivityModal from './components/AddActivityModal.jsx';
import CommunityActivities from './components/CommunityActivities.jsx';
import OrganizerDashboard from './components/OrganizerDashboard.jsx';
import VerifyActivityEmail from './components/VerifyActivityEmail.jsx';
import Aktuelt from './components/Aktuelt.jsx';
import Praktisk from './components/Praktisk.jsx';
import Overnatting from './components/Overnatting.jsx';
import Hardanger from './components/Hardanger.jsx';
import Webkamera from './components/Webkamera.jsx';
import Skisentre from './components/Skisentre.jsx';
import WinterGuide from './components/WinterGuide.jsx';
import LavlandsloypeMap from './components/LavlandsloypeMap.jsx';
import LavlandsloypeCard from './components/LavlandsloypeCard.jsx';
import HyttefolkPlaceholder from './components/HyttefolkPlaceholder.jsx';
import Naeringslag from './components/Naeringslag.jsx';
import Tilbud from './components/Tilbud.jsx';
import Marketplace from './components/Marketplace.jsx';
import MarketplaceListingModal from './components/MarketplaceListingModal.jsx';
import MarketplaceListingDashboard from './components/MarketplaceListingDashboard.jsx';
import VerifyMarketplaceEmail from './components/VerifyMarketplaceEmail.jsx';
import { createActivity, loadActivities } from './lib/activities.js';
import { createMarketplaceListing, loadMarketplaceListings } from './lib/marketplace.js';
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

const symbolIsNice = (symbol) => {
  const s = String(symbol || '').toLowerCase();
  return s.includes('clearsky') || s.includes('fair') || s.includes('partlycloudy');
};

const makeForecastSummary = (timeseries) => {
  const days = new Map();
  const now = new Date();

  for (const item of timeseries || []) {
    const time = new Date(item.time);
    if (time <= now) continue;
    const hour = time.getHours();
    if (hour < 8 || hour > 20) continue;

    const date = item.time.slice(0, 10);
    const data = item.data || {};
    const inst = ((data.instant || {}).details) || {};
    const symBlock = data.next_1_hours || data.next_6_hours || data.next_12_hours || {};
    const symbol = ((symBlock.summary || {}).symbol_code) || '';
    const precipitation = (((data.next_1_hours || {}).details) || {}).precipitation_amount;
    const day = days.get(date) || {
      date,
      clearHours: 0,
      precipitation: 0,
      maxTemp: null,
      wind: 0,
    };

    if (symbolIsNice(symbol)) day.clearHours += 1;
    if (Number.isFinite(precipitation)) day.precipitation += precipitation;
    if (Number.isFinite(inst.air_temperature)) {
      day.maxTemp = day.maxTemp === null ? inst.air_temperature : Math.max(day.maxTemp, inst.air_temperature);
    }
    if (Number.isFinite(inst.wind_speed)) day.wind = Math.max(day.wind, inst.wind_speed);
    days.set(date, day);
  }

  const sunnyDay = [...days.values()]
    .filter((day) => day.clearHours >= 4 && day.precipitation <= 1.5 && day.wind <= 8)
    .sort((a, b) => b.clearHours - a.clearHours || a.precipitation - b.precipitation)[0] || null;

  return { sunnyDay };
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
          forecast: makeForecastSummary(ts),
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
  const [emailVerification] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const activityId = params.get('bekreft');
    const token = params.get('token');
    return activityId && token ? { activityId, token } : null;
  });
  const [marketplaceVerification] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('bekreft-annonse');
    const token = params.get('token');
    return listingId && token ? { listingId, token } : null;
  });
  const [marketplaceAccess] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('annonse');
    const token = params.get('token');
    return listingId && token ? { listingId, token } : null;
  });
  const [route, setRoute] = useState(() => {
    if (organizerAccess) return 'organizer';
    if (emailVerification) return 'verify-email';
    if (marketplaceVerification) return 'verify-listing-email';
    if (marketplaceAccess) return 'listing-dashboard';
    return 'home';
  });
  const [season] = useState(() => seasonFor());
  const [overHero, setOverHero] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddListing, setShowAddListing] = useState(false);
  const [submittedActivities, setSubmittedActivities] = useState([]);
  const [marketplaceListings, setMarketplaceListings] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState('');
  const [marketplaceError, setMarketplaceError] = useState('');
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [marketplaceSupabaseConfigured, setMarketplaceSupabaseConfigured] = useState(false);
  const WEATHER = useLiveWeather();

  useEffect(() => {
    const onScroll = () => setOverHero(window.scrollY < 80 && route === 'home');
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [route]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  const goto = (r) => {
    setRoute(r);
  };

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

  useEffect(() => {
    let cancelled = false;

    const fetchMarketplaceListings = async () => {
      setMarketplaceLoading(true);
      setMarketplaceError('');
      try {
        const { listings, isConfigured } = await loadMarketplaceListings();
        if (cancelled) return;
        setMarketplaceSupabaseConfigured(isConfigured);
        setMarketplaceListings(listings);
      } catch (_) {
        if (!cancelled) setMarketplaceError('Kunne ikke hente annonser akkurat nå.');
      } finally {
        if (!cancelled) setMarketplaceLoading(false);
      }
    };

    fetchMarketplaceListings();
    return () => { cancelled = true; };
  }, []);

  const addActivity = async (activity) => {
    const savedActivity = await createActivity(activity);
    setSubmittedActivities((items) => [savedActivity, ...items]);
    setRoute('activities');
    return savedActivity;
  };

  const addMarketplaceListing = async (listing) => {
    const savedListing = await createMarketplaceListing(listing);
    setRoute('marked');
    return savedListing;
  };


  return (
    <div className="app" data-screen-label={"Kvamskogen.no — " + route}>
      <Header overHero={overHero && route==='home'} onNav={goto} route={route}/>
      <main className="main">
        {route === 'home' && (
          <>
            <Hero season={season} weather={WEATHER}
              onPrimary={() => goto('trails')}
              onSecondary={() => goto('weather')}/>
            <HomeShortcuts onNav={goto}/>
          </>
        )}
        {route === 'trails' && (
          <div style={{paddingTop:32}}>
            <LavlandsloypeCard onOpen={() => goto('lavlandsloypen')}/>
          </div>
        )}
        {route === 'vinter' && (
          <>
            <WinterGuide onNav={goto}/>
            <TrailList onSelect={(t) => t.route && goto(t.route)}/>
            <Skisentre/>
          </>
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
        {route === 'marked' && (
          <Marketplace
            listings={marketplaceListings}
            loading={marketplaceLoading}
            error={marketplaceError}
            supabaseConfigured={marketplaceSupabaseConfigured}
            onAdd={() => setShowAddListing(true)}
          />
        )}
        {route === 'organizer' && (
          <OrganizerDashboard access={organizerAccess}/>
        )}
        {route === 'verify-email' && (
          <VerifyActivityEmail verification={emailVerification}/>
        )}
        {route === 'verify-listing-email' && (
          <VerifyMarketplaceEmail verification={marketplaceVerification}/>
        )}
        {route === 'listing-dashboard' && (
          <MarketplaceListingDashboard access={marketplaceAccess}/>
        )}
        {route === 'weather' && <WeatherForecast/>}
        {route === 'webkamera' && <Webkamera onNav={goto}/>}
        {route === 'skisentre' && <Skisentre/>}
        {route === 'aktuelt' && (
          <Aktuelt
            weather={WEATHER}
            activities={submittedActivities}
            supabaseConfigured={supabaseConfigured}
          />
        )}
        {route === 'tilbud' && <Tilbud/>}
        {route === 'praktisk' && <Praktisk/>}
        {route === 'overnatting' && <Overnatting/>}
        {route === 'hardanger' && <Hardanger/>}
        {route === 'naeringslag' && <Naeringslag onNav={goto}/>}
        {route === 'loypebidrag' && <HyttefolkPlaceholder title="Tilskudd til løypepreparering"/>}
        {route === 'plansaker' && <HyttefolkPlaceholder title="Plansaker og høringer"/>}
      </main>
      <Footer onNav={goto} route={route}/>
      {showAdd && <AddActivityModal onClose={() => setShowAdd(false)} onSubmit={addActivity}/>}
      {showAddListing && (
        <MarketplaceListingModal
          onClose={() => setShowAddListing(false)}
          onSubmit={addMarketplaceListing}
        />
      )}
    </div>
  );
};

export default App;
