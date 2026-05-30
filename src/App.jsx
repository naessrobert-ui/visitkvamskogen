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
import Aktuelt from './components/Aktuelt.jsx';
import Praktisk from './components/Praktisk.jsx';
import Overnatting from './components/Overnatting.jsx';
import Hardanger from './components/Hardanger.jsx';
import Webkamera from './components/Webkamera.jsx';
import { seasonFor } from './lib/season.js';

const App = () => {
  const [route, setRoute] = useState('home');
  const [season] = useState(() => seasonFor());
  const [overHero, setOverHero] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

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
            <Hero season={season}
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
        {route === 'weather' && <WeatherForecast/>}
        {route === 'webkamera' && <Webkamera onNav={goto}/>}
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
