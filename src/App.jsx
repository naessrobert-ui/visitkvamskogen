import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import HomeShortcuts from './components/HomeShortcuts.jsx';
import TrailList from './components/TrailList.jsx';
import Turforslag from './components/Turforslag.jsx';
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
import Naeringslag from './components/Naeringslag.jsx';
import Tilbud from './components/Tilbud.jsx';
import Medlemsfordeler from './components/Medlemsfordeler.jsx';
import Styret from './components/Styret.jsx';
import Plansaker from './components/Plansaker.jsx';
import Medlemsmote from './components/Medlemsmote.jsx';
import Loypebidrag from './components/Loypebidrag.jsx';
import SkiTrails from './components/SkiTrails.jsx';
import Marketplace from './components/Marketplace.jsx';
import MarketplaceListingModal from './components/MarketplaceListingModal.jsx';
import MarketplaceListingDashboard from './components/MarketplaceListingDashboard.jsx';
import VerifyMarketplaceEmail from './components/VerifyMarketplaceEmail.jsx';
import ModerateMarketplaceListing from './components/ModerateMarketplaceListing.jsx';
import StoryAdmin from './components/StoryAdmin.jsx';
import AddTrailModal from './components/AddTrailModal.jsx';
import VerifyTrailEmail from './components/VerifyTrailEmail.jsx';
import ModerateTrailSuggestion from './components/ModerateTrailSuggestion.jsx';
import { createActivity, loadActivities } from './lib/activities.js';
import { isVisibleUpcomingActivity } from './lib/activityVisibility.js';
import { createMarketplaceListing, loadMarketplaceListings } from './lib/marketplace.js';
import { createTrailSuggestion, loadTrailSuggestions } from './lib/trailSuggestions.js';
import { seasonFor } from './lib/season.js';
import { hentYr, vindretningTekst } from './lib/weather.js';
import { classifySummerMood } from './lib/hero-mood.js';
import { metaFor, pathFor, routeFromPath } from './lib/routes.js';
import { NAVIGATE_EVENT, navigate } from './lib/navigation.js';
import { usePageMeta } from './lib/usePageMeta.js';
import TurDetalj from './components/TurDetalj.jsx';
import PageIntro from './components/PageIntro.jsx';
import NotFound from './components/NotFound.jsx';

const SPECIAL_ROUTES = new Set([
  'organizer',
  'verify-email',
  'verify-listing-email',
  'moderate-listing',
  'listing-dashboard',
  'verify-trail-email',
  'moderate-trail',
]);

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
  const [marketplaceModeration] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('moderer');
    const token = params.get('token');
    const action = params.get('handling');
    return listingId && token && action ? { listingId, token, action } : null;
  });
  const [trailVerification] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const suggestionId = params.get('bekreft-tur');
    const token = params.get('token');
    return suggestionId && token ? { suggestionId, token } : null;
  });
  const [trailModeration] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const suggestionId = params.get('moderer-tur');
    const token = params.get('token');
    const action = params.get('handling');
    return suggestionId && token && action ? { suggestionId, token, action } : null;
  });
  const [location, setLocation] = useState(() => {
    if (organizerAccess) return { key: 'organizer' };
    if (emailVerification) return { key: 'verify-email' };
    if (marketplaceVerification) return { key: 'verify-listing-email' };
    if (marketplaceModeration) return { key: 'moderate-listing' };
    if (marketplaceAccess) return { key: 'listing-dashboard' };
    if (trailVerification) return { key: 'verify-trail-email' };
    if (trailModeration) return { key: 'moderate-trail' };
    return routeFromPath(window.location.pathname);
  });
  const route = location.key;
  const [season] = useState(() => seasonFor());
  const [overHero, setOverHero] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddListing, setShowAddListing] = useState(false);
  const [showAddTrail, setShowAddTrail] = useState(false);
  const [submittedActivities, setSubmittedActivities] = useState([]);
  const [marketplaceListings, setMarketplaceListings] = useState([]);
  const [trailSuggestions, setTrailSuggestions] = useState([]);
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
  }, [route, location.param]);

  useEffect(() => {
    if (organizerAccess || emailVerification || marketplaceVerification || marketplaceModeration || marketplaceAccess || trailVerification || trailModeration) return undefined;

    const onHistoryChange = () => setLocation(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', onHistoryChange);
    window.addEventListener(NAVIGATE_EVENT, onHistoryChange);
    return () => {
      window.removeEventListener('popstate', onHistoryChange);
      window.removeEventListener(NAVIGATE_EVENT, onHistoryChange);
    };
  }, [organizerAccess, emailVerification, marketplaceVerification, marketplaceModeration, marketplaceAccess, trailVerification, trailModeration]);

  usePageMeta(metaFor(location));

  const goto = (key, options = {}) => {
    if (SPECIAL_ROUTES.has(key)) {
      setLocation({ key });
      return;
    }
    const path = pathFor(key);
    navigate(path, options);
    // Token-sidene lytter ikke på navigasjon, så tilstanden settes direkte også.
    setLocation(routeFromPath(path));
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

  useEffect(() => {
    let cancelled = false;

    const fetchTrailSuggestions = async () => {
      try {
        const { suggestions } = await loadTrailSuggestions();
        if (cancelled) return;
        setTrailSuggestions(suggestions);
      } catch (_) {
        // Innsendte turforslag er valgfri pynt over de redaksjonelle turene; feiler stille.
      }
    };

    fetchTrailSuggestions();
    return () => { cancelled = true; };
  }, []);

  const addActivity = async (activity) => {
    const savedActivity = await createActivity(activity);
    if (isVisibleUpcomingActivity(savedActivity)) {
      setSubmittedActivities((items) => [savedActivity, ...items]);
    }
    goto('aktiviteter');
    return savedActivity;
  };

  const addMarketplaceListing = async (listing) => {
    const savedListing = await createMarketplaceListing(listing);
    goto('marked');
    return savedListing;
  };

  const addTrailSuggestion = async (suggestion) => {
    return createTrailSuggestion(suggestion);
  };

  const removeActivities = (activityIds) => {
    setSubmittedActivities((items) => items.filter((activity) => !activityIds.includes(activity.id)));
  };

  return (
    <div className="app" data-screen-label={"Kvamskogen.no — " + route}>
      <Header overHero={overHero && route==='home'} route={route} weather={WEATHER} showSecretMenu={route === 'aktuelt'}/>
      <main className="main">
        {route === 'home' && (
          <>
            <Hero season={season} weather={WEATHER}/>
            <HomeShortcuts/>
          </>
        )}
        {route === 'turforslag' && (
          <Turforslag onAdd={() => setShowAddTrail(true)} suggestions={trailSuggestions}/>
        )}
        {route === 'tur' && <TurDetalj slug={location.param}/>}
        {route === 'vinter' && (
          <>
            <WinterGuide/>
            <TrailList onSelect={(t) => t.route && goto(t.route)}/>
            <Skisentre/>
          </>
        )}
        {route === 'lavlandsloypen' && (
          <div style={{paddingTop:32}}>
            <LavlandsloypeMap/>
          </div>
        )}
        {route === 'aktiviteter' && (
          <CommunityActivities
            activities={submittedActivities}
            loading={activitiesLoading}
            error={activitiesError}
            supabaseConfigured={supabaseConfigured}
            onActivitiesDeleted={removeActivities}
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
          <VerifyActivityEmail
            verification={emailVerification}
            onShowActivities={() => goto('aktiviteter', { replace: true })}
            onVerified={async () => {
              const { activities, isConfigured } = await loadActivities();
              setSupabaseConfigured(isConfigured);
              setSubmittedActivities(activities);
            }}
          />
        )}
        {route === 'verify-listing-email' && (
          <VerifyMarketplaceEmail verification={marketplaceVerification}/>
        )}
        {route === 'moderate-listing' && (
          <ModerateMarketplaceListing moderation={marketplaceModeration}/>
        )}
        {route === 'listing-dashboard' && (
          <MarketplaceListingDashboard access={marketplaceAccess}/>
        )}
        {route === 'verify-trail-email' && (
          <VerifyTrailEmail verification={trailVerification}/>
        )}
        {route === 'moderate-trail' && (
          <ModerateTrailSuggestion moderation={trailModeration}/>
        )}
        {route === 'vaer' && (
          <>
            <PageIntro
              eyebrow="Vær"
              title="Været på Kvamskogen"
              text="Værvarselet kommer fra MET/yr.no og gjelder Kvamskogen, om lag 455 moh. Du får temperatur, nedbør og vind time for time, en turvurdering og det beste værvinduet de neste dagene. Været på fjellet kan skifte raskt — sjekk igjen rett før du drar."
            />
            <WeatherForecast/>
          </>
        )}
        {route === 'webkamera' && <Webkamera/>}
        {route === 'skiloyper' && <SkiTrails/>}
        {route === 'skisentre' && <Skisentre/>}
        {route === 'aktuelt' && (
          <Aktuelt
            weather={WEATHER}
            activities={submittedActivities}
            supabaseConfigured={supabaseConfigured}
          />
        )}
        {route === 'tilbud' && <Tilbud/>}
        {route === 'styret' && <Styret/>}
        {route === 'medlemsfordeler' && <Medlemsfordeler/>}
        {route === 'praktisk' && <Praktisk/>}
        {route === 'overnatting' && <Overnatting/>}
        {route === 'hardanger' && <Hardanger/>}
        {route === 'naeringslag' && <Naeringslag/>}
        {route === 'loypebidrag' && <Loypebidrag/>}
        {route === 'plansaker' && <Plansaker/>}
        {route === 'medlemsmote' && <Medlemsmote/>}
        {route === 'historie-admin' && <StoryAdmin onPublished={() => goto('aktuelt')}/>}
        {route === 'ikke-funnet' && <NotFound/>}
      </main>
      <Footer route={route}/>
      {showAdd && <AddActivityModal onClose={() => setShowAdd(false)} onSubmit={addActivity}/>}
      {showAddListing && (
        <MarketplaceListingModal
          onClose={() => setShowAddListing(false)}
          onSubmit={addMarketplaceListing}
        />
      )}
      {showAddTrail && (
        <AddTrailModal
          onClose={() => setShowAddTrail(false)}
          onSubmit={addTrailSuggestion}
        />
      )}
    </div>
  );
};

export default App;
