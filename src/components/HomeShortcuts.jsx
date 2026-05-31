import Icon from './Icons.jsx';

const SHORTCUTS = [
  {
    icon: 'map',
    title: 'Turforslag',
    text: 'Lavlandsløypen, fjellturer, utsiktspunkt og korte turer i området.',
    action: 'Se turer',
    route: 'trails',
  },
  {
    icon: 'cloud',
    title: 'Vær',
    text: 'Sjekk været før du kjører opp eller planlegger turen.',
    action: 'Se varsel',
    route: 'weather',
  },
  {
    icon: 'calendar',
    title: 'Aktiviteter',
    text: 'Finn det som skjer på Kvamskogen, eller legg inn noe selv.',
    action: 'Se aktiviteter',
    route: 'activities',
  },
  {
    icon: 'compass',
    title: 'Praktisk',
    text: 'Parkering, webkamera og nyttig info for hyttefolk.',
    action: 'Finn info',
    route: 'praktisk',
  },
];

const HomeShortcuts = ({ onNav }) => (
  <section className="home-shortcuts" aria-label="Snarveier">
    <div className="container">
      <div className="home-shortcuts-head">
        <div>
          <div className="eyebrow summer"><span className="dot"/>Start her</div>
          <h2>Velg det du kom for.</h2>
        </div>
        <p>De viktigste inngangene for tur, vær, aktiviteter og praktisk informasjon.</p>
      </div>
      <div className="home-shortcuts-grid">
        {SHORTCUTS.map((item) => (
          <button
            className="home-shortcut"
            key={item.route}
            type="button"
            onClick={() => onNav(item.route)}
          >
            <span className="home-shortcut-icon"><Icon name={item.icon} size={22}/></span>
            <span className="home-shortcut-title">{item.title}</span>
            <span className="home-shortcut-text">{item.text}</span>
            <span className="home-shortcut-action">{item.action} <Icon name="arrow-right" size={15}/></span>
          </button>
        ))}
      </div>
    </div>
  </section>
);

export default HomeShortcuts;
