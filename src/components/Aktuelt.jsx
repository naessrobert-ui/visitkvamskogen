import { useState } from 'react';
import { SAMPLE_ACTIVITIES } from '../data/sampleActivities.js';
import { isVisibleUpcomingActivity, todayDateKey } from '../lib/activityVisibility.js';
import { ageDays, dateTimestamp, formatDate, isThisYear, sourceName, useAktueltFeed } from '../lib/aktueltFeed.js';
import AktueltKort, { StoryImage, StoryMeta, openOnCardClick } from './AktueltKort.jsx';
import Link from './Link.jsx';
import '../styles/aktuelt.css';

const GRID_SIZE = 4;
const LATEST_LIST_SIZE = 8;
// Egne saker får et lite forsprang i prioriteringen, slik at redaksjonelt stoff ikke drukner i medieklipp.
const OWN_STORY_HEAD_START_DAYS = 3;
const MAX_LEAD_AGE_DAYS = 21;
const FRESH_OWN_LEAD_DAYS = 2;

// Skjult til innsamlingstallene er på plass. Sett til true for å vise boksen igjen.
const VIS_LOYPEVENN = false;

const LOYPEVENN = {
  vippsNumber: '91705',
  goalAmount: 350000,
  raisedAmount: 150000,
  goalTitle: 'Ny bru over Røyro',
};

const priority = (post) => ageDays(post.date) - (post.origin === 'egen' ? OWN_STORY_HEAD_START_DAYS : 0);

const buildFrontPage = (posts) => {
  const byPriority = [...posts].sort((a, b) => priority(a) - priority(b));
  const editorLead = posts
    .filter((post) => post.editorRank !== undefined && ageDays(post.date) <= 7)
    .sort((a, b) => a.editorRank - b.editorRank)[0];
  // En helt fersk egen sak er det redaksjonen vil ha fram, så den går foran AI-redaktørens valg.
  const freshOwn = byPriority.find((post) => post.origin === 'egen' && ageDays(post.date) <= FRESH_OWN_LEAD_DAYS);
  const lead = freshOwn
    || editorLead
    || byPriority.find((post) => ageDays(post.date) <= MAX_LEAD_AGE_DAYS && (post.origin === 'egen' || post.hasOwnImage))
    || byPriority[0];

  const rest = byPriority.filter((post) => post !== lead);
  const grid = rest.slice(0, GRID_SIZE);
  const latest = rest.slice(GRID_SIZE).sort((a, b) => dateTimestamp(b.date) - dateTimestamp(a.date));
  return { lead, grid, latest };
};

export const upcomingActivities = (activities, supabaseConfigured) => {
  const today = todayDateKey();
  return (supabaseConfigured ? activities : SAMPLE_ACTIVITIES)
    .filter((activity) => isVisibleUpcomingActivity(activity, today))
    .sort((a, b) => dateTimestamp(a.date) - dateTimestamp(b.date))
    .slice(0, 4);
};

const LeadStory = ({ post }) => {
  const [usesFallback, setUsesFallback] = useState(false);
  return (
    <article className="avis-lead" onClick={(event) => openOnCardClick(event, post)}>
      <figure className="avis-lead-media">
        <StoryImage key={post.id} post={post} onFallback={() => setUsesFallback(true)} />
        {post.origin === 'media' && post.hasOwnImage && !usesFallback && <figcaption>Foto: {sourceName(post.source)}</figcaption>}
      </figure>
      <div className="avis-lead-copy">
        <StoryMeta post={post} />
        <h2><Link to={post.path}>{post.title}</Link></h2>
        {post.lede && <p className="avis-lede">{post.lede}</p>}
        <Link className="avis-action" to={post.path}>Les mer</Link>
      </div>
    </article>
  );
};

const LatestList = ({ posts }) => {
  const [expanded, setExpanded] = useState(false);
  if (!posts.length) return null;
  const visible = expanded ? posts : posts.slice(0, LATEST_LIST_SIZE);

  return (
    <section className="avis-latest" aria-labelledby="avis-latest-title">
      <h2 id="avis-latest-title" className="avis-section-title">Siste nytt</h2>
      <ol>
        {visible.map((post) => (
          <li key={post.id}>
            <time dateTime={post.date}>{formatDate(post.date, !isThisYear(post.date))}</time>
            <div>
              <span className={post.origin === 'media' ? 'avis-kicker is-media' : 'avis-kicker'}>{post.kicker}</span>
              <Link to={post.path}>{post.title}</Link>
            </div>
          </li>
        ))}
      </ol>
      {posts.length > LATEST_LIST_SIZE && (
        <button type="button" className="avis-more" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Vis færre' : `Vis alle ${posts.length} saker`}
        </button>
      )}
    </section>
  );
};

const WeatherStrip = ({ weather }) => {
  const hasData = weather?.temp && weather.temp !== '–';
  return (
    <div className="avis-weather" aria-label="Været på Kvamskogen nå">
      <span className="avis-weather-now">
        {hasData ? (
          <>
            <strong>{weather.temp}</strong>
            {weather.cond && <span>{weather.cond}</span>}
            {weather.wind && weather.wind !== '–' && <span>{weather.wind} m/s{weather.windDir ? ` ${weather.windDir}` : ''}</span>}
          </>
        ) : (
          <span>Henter vær …</span>
        )}
      </span>
      <span className="avis-weather-links">
        <Link to="/webkamera">Webkamera</Link>
        <Link to="/vaer">Værmelding</Link>
      </span>
    </div>
  );
};

export const UpcomingBox = ({ activities }) => (
  <section className="avis-box" aria-labelledby="avis-upcoming-title">
    <h2 id="avis-upcoming-title" className="avis-section-title">Skjer snart</h2>
    {activities.length ? (
      <ul className="avis-upcoming">
        {activities.map((activity) => (
          <li key={activity.id}>
            <time dateTime={activity.date}>{formatDate(activity.date, false)}{activity.time ? ` kl. ${String(activity.time).slice(0, 5)}` : ''}</time>
            <strong>{activity.title}</strong>
            {Number(activity.signup_count) > 0 && <span>{activity.signup_count} påmeldte</span>}
          </li>
        ))}
      </ul>
    ) : (
      <p>Ingen aktiviteter er lagt inn ennå.</p>
    )}
    <Link className="avis-action" to="/aktiviteter">Se alle og legg inn aktivitet</Link>
  </section>
);

const LoypevennBox = () => {
  const { goalAmount, raisedAmount, goalTitle, vippsNumber } = LOYPEVENN;
  const pct = Math.min(100, Math.round((raisedAmount / goalAmount) * 100));
  const fmt = (value) => new Intl.NumberFormat('no-NO').format(value);

  return (
    <section className="avis-box avis-loypevenn" aria-labelledby="avis-loypevenn-title">
      <h2 id="avis-loypevenn-title" className="avis-section-title">Bli løypevenn</h2>
      <p>Innsamling: <strong>{goalTitle}</strong></p>
      <div className="avis-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Innsamling til ${goalTitle}`}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="avis-progress-figures">{fmt(raisedAmount)} av {fmt(goalAmount)} kr · {pct} %</p>
      <p>Vipps til <strong>{vippsNumber}</strong> eller les mer om løypebidraget.</p>
      <Link className="avis-button" to="/loypebidrag">Bidra til løypene</Link>
    </section>
  );
};

const Aktuelt = ({ weather, activities = [], supabaseConfigured = false }) => {
  const { posts } = useAktueltFeed();
  const front = buildFrontPage(posts);
  const upcoming = upcomingActivities(activities, supabaseConfigured);
  const today = new Date().toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <section className="section avis">
      <div className="container avis-container">
        <header className="avis-masthead">
          <div className="avis-masthead-row">
            <span className="avis-date">{today}</span>
            <WeatherStrip weather={weather} />
          </div>
          <h1>Aktuelt fra Kvamskogen</h1>
          <p>Nyheter, saker fra Kvamskogen Vel og det som skjer på fjellet.</p>
        </header>

        <div className="avis-layout">
          <div className="avis-main">
            {front.lead && <LeadStory post={front.lead} />}
            {front.grid.length > 0 && (
              <div className="avis-grid">
                {front.grid.map((post) => <AktueltKort key={post.id} post={post} />)}
              </div>
            )}
            <LatestList posts={front.latest} />
          </div>

          <aside className="avis-side">
            <UpcomingBox activities={upcoming} />
            {VIS_LOYPEVENN && <LoypevennBox />}
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Aktuelt;
