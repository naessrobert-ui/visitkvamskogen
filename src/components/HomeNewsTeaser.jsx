import EGNE_SAKER from '../data/aktuelt_saker.json';
import Icon from './Icons.jsx';
import Link from './Link.jsx';
import { SAK_PATH_PREFIX } from '../lib/aktueltFeed.js';

// Styres med id slik at forsiden viser det redaksjonen velger, ikke bare nyeste sak.
const TEASER_ID = 'strid-om-gangvei-kvamskogen-2026';

const HomeNewsTeaser = () => {
  const story = EGNE_SAKER.find((item) => item.id === TEASER_ID);
  if (!story) return null;
  const path = `${SAK_PATH_PREFIX}${story.id}`;

  return (
    <section className="home-news" aria-label="Siste fra Kvamskogen Vel">
      <div className="container">
        <Link className="home-news-card" to={path}>
          {story.image && <img className="home-news-image" src={story.image} alt="" loading="lazy" />}
          <span className="home-news-copy">
            <span className="home-news-kicker">{story.section}</span>
            <span className="home-news-title">{story.title}</span>
            <span className="home-news-lede">{story.lede}</span>
            <span className="home-shortcut-action">Les saken <Icon name="arrow-right" size={15}/></span>
          </span>
        </Link>
      </div>
    </section>
  );
};

export default HomeNewsTeaser;
