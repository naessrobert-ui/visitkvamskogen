import { useEffect, useMemo, useState } from 'react';
import { SAMPLE_ACTIVITIES } from '../data/sampleActivities.js';
import EGNE_SAKER from '../data/aktuelt_saker.json';
import { isVisibleUpcomingActivity, todayDateKey } from '../lib/activityVisibility.js';
import { LOCAL_STORIES_EVENT, loadLocalStories, storyToAktueltPost } from '../lib/stories.js';
import { navigate } from '../lib/navigation.js';
import Link from './Link.jsx';
import '../styles/aktuelt.css';

const MEDIA_NEWS_PATH = '/data/kvamskogen_news.json';
const AI_EDITOR_PATH = '/data/kvamskogen_editor.json';
const MEDIA_FALLBACK_IMAGE = '/assets/photos/summer/hardangerfjorden.webp';
const GRID_SIZE = 4;
const LATEST_LIST_SIZE = 8;
// Egne saker får et lite forsprang i prioriteringen, slik at redaksjonelt stoff ikke drukner i medieklipp.
const OWN_STORY_HEAD_START_DAYS = 3;
const MAX_LEAD_AGE_DAYS = 21;

const SOURCE_NAMES = {
  'hf.no': 'Hordaland Folkeblad',
  'bt.no': 'Bergens Tidende',
  'ba.no': 'Bergensavisen',
  'nrk.no': 'NRK',
  'kvam.no': 'Kvam herad',
  'kvamnett.no': 'Kvamnett',
  'vestlandsnytt.no': 'Vestlandsnytt',
};

// Eiendomsannonser og salgsoppgaver er ikke nyheter. De hører hjemme i Marked.
const AD_PATTERNS = [
  /eiendomsmegler/i,
  /dnbeiendom/i,
  /privatmegleren/i,
  /krogsveen/i,
  /notar\.no/i,
  /proaktiv\.no/i,
  /finn\.no\/(realestate|eiendom)/i,
  /\/boliger\//i,
  /salgsoppgave/i,
];

const MEDIA_FALLBACK_IMAGES = [
  { keywords: ['løype', 'ski', 'vinter', 'påske', 'underlag'], image: '/assets/photos/winter/loypemaskin-natt.webp' },
  { keywords: ['fond', 'vel', 'lavlandsløyp', 'tur'], image: '/assets/photos/summer/grusvei-stol.webp' },
  { keywords: ['kommune', 'plan', 'regulering', 'veg', 'vei', 'vern', 'arbeid'], image: '/assets/photos/summer/utsikt-fjord.webp' },
];

const LOYPEVENN = {
  vippsNumber: '91705',
  goalAmount: 350000,
  raisedAmount: 150000,
  goalTitle: 'Ny bru over Røyro',
};

const dateOnly = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const fallback = new Date(`${value}T12:00:00`);
  return Number.isNaN(fallback.getTime()) ? '' : fallback.toISOString().slice(0, 10);
};

const dateTimestamp = (value) => {
  const normalized = dateOnly(value);
  return normalized ? new Date(`${normalized}T12:00:00`).getTime() : 0;
};

const ageDays = (value) => {
  const timestamp = dateTimestamp(value);
  if (!timestamp) return 999;
  const todayNoon = new Date(`${todayDateKey()}T12:00:00`).getTime();
  return Math.max(0, Math.round((todayNoon - timestamp) / 86400000));
};

const isThisYear = (value) => new Date(dateTimestamp(value)).getFullYear() === new Date().getFullYear();

const formatDate = (value, withYear = true) => {
  const normalized = dateOnly(value);
  if (!normalized) return '';
  const options = withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' };
  return new Intl.DateTimeFormat('no-NO', options).format(new Date(`${normalized}T12:00:00`));
};

const relativeDate = (value) => {
  const days = Math.floor(ageDays(value));
  if (days === 0) return 'I dag';
  if (days === 1) return 'I går';
  if (days < 7) return `${days} dager siden`;
  return formatDate(value, !isThisYear(value));
};

const cleanText = (value) => {
  const withoutTags = String(value || '').replace(/<[^>]*>/g, ' ');
  if (typeof document === 'undefined') return withoutTags.replace(/\s+/g, ' ').trim();
  const textarea = document.createElement('textarea');
  textarea.innerHTML = withoutTags;
  return textarea.value.replace(/\s+/g, ' ').trim();
};

const fingerprint = (value) => cleanText(value)
  .toLowerCase()
  .replace(/^\(\+\)\s*/, '')
  .replace(/[^a-z0-9æøå]+/g, ' ')
  .trim();

const sourceName = (source) => SOURCE_NAMES[source] || source || 'Ukjent kilde';

const isAd = (item) => AD_PATTERNS.some((pattern) => pattern.test(`${item.url || ''} ${item.source || ''}`));

const isAggregatorUrl = (url) => /news\.google\.com/i.test(url || '');

const fallbackImageFor = (text) => {
  const haystack = text.toLowerCase();
  return MEDIA_FALLBACK_IMAGES.find(({ keywords }) => keywords.some((word) => haystack.includes(word)))?.image || MEDIA_FALLBACK_IMAGE;
};

// Google News-snippets er bare tittel + avisnavn, så de gir ingen ingress å vise.
const cleanSnippet = (snippet, title, source) => {
  let text = cleanText(snippet).replace(/^\(\+\)\s*/, '');
  const name = sourceName(source);
  if (name && text.endsWith(name)) text = text.slice(0, -name.length).trim();
  if (fingerprint(text) === fingerprint(title)) return '';
  return text;
};

const mediaToPost = (item) => {
  const rawTitle = cleanText(item.title) || 'Ny sak om Kvamskogen';
  const paywall = /^\(\+\)/.test(rawTitle);
  const title = rawTitle.replace(/^\(\+\)\s*/, '');
  const date = dateOnly(item.published_at) || item.found_date || '';

  return {
    id: `media-${item.url}`,
    origin: 'media',
    kicker: sourceName(item.source),
    source: item.source,
    date,
    title,
    lede: cleanSnippet(item.snippet, title, item.source),
    image: item.image_url || fallbackImageFor(`${title} ${item.snippet || ''}`),
    hasOwnImage: Boolean(item.image_url),
    url: item.url,
    paywall,
  };
};

const ownToPost = (story) => ({
  ...story,
  origin: 'egen',
  kicker: story.section,
});

const prepareMediaNews = (items) => {
  // Direkte lenker til avisen foretrekkes framfor Google News-omveien når samme sak finnes to ganger.
  const ordered = [...items]
    .filter((item) => item?.url && !isAd(item))
    .sort((a, b) => Number(isAggregatorUrl(a.url)) - Number(isAggregatorUrl(b.url)) || Number(Boolean(b.image_url)) - Number(Boolean(a.image_url)));

  const seen = new Map();
  ordered.forEach((item) => {
    const key = fingerprint(item.title);
    if (!key) return;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, { ...item });
      return;
    }
    // Behold publiseringsdatoen fra den kopien som har den.
    if (!existing.published_at && item.published_at) existing.published_at = item.published_at;
  });

  return [...seen.values()].map(mediaToPost);
};

const priority = (post) => ageDays(post.date) - (post.origin === 'egen' ? OWN_STORY_HEAD_START_DAYS : 0);

const matchesPlanStory = (post, story) => {
  if (!story) return false;
  if (story.id && story.id === post.id) return true;
  if (story.url && post.url && story.url === post.url) return true;
  return Boolean(story.title) && fingerprint(story.title) === fingerprint(post.title);
};

const applyEditorPlan = (posts, plan) => {
  if (!plan?.lead_story) return posts;
  const planned = [plan.lead_story, ...(plan.featured_stories || [])];

  return posts.map((post) => {
    const rank = planned.findIndex((story) => matchesPlanStory(post, story));
    if (rank < 0) return post;
    const story = planned[rank];
    return {
      ...post,
      editorRank: rank,
      lede: post.origin === 'media' && story.lede ? story.lede : post.lede,
    };
  });
};

const buildFrontPage = (posts) => {
  const byPriority = [...posts].sort((a, b) => priority(a) - priority(b));
  const editorLead = posts
    .filter((post) => post.editorRank !== undefined && ageDays(post.date) <= 7)
    .sort((a, b) => a.editorRank - b.editorRank)[0];
  const lead = editorLead
    || byPriority.find((post) => ageDays(post.date) <= MAX_LEAD_AGE_DAYS && (post.origin === 'egen' || post.hasOwnImage))
    || byPriority[0];

  const rest = byPriority.filter((post) => post !== lead);
  const grid = rest.slice(0, GRID_SIZE);
  const latest = rest.slice(GRID_SIZE).sort((a, b) => dateTimestamp(b.date) - dateTimestamp(a.date));
  return { lead, grid, latest };
};

const useJson = (path) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(path, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [path]);

  return data;
};

const useLocalStories = () => {
  const [stories, setStories] = useState(() => loadLocalStories());

  useEffect(() => {
    const reload = () => setStories(loadLocalStories());
    window.addEventListener(LOCAL_STORIES_EVENT, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(LOCAL_STORIES_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);

  return stories;
};

const upcomingActivities = (activities, supabaseConfigured) => {
  const today = todayDateKey();
  return (supabaseConfigured ? activities : SAMPLE_ACTIVITIES)
    .filter((activity) => isVisibleUpcomingActivity(activity, today))
    .sort((a, b) => dateTimestamp(a.date) - dateTimestamp(b.date))
    .slice(0, 4);
};

const openPost = (post, onOpen) => {
  if (post.url) {
    window.open(post.url, '_blank', 'noopener,noreferrer');
    return;
  }
  if (post.internalUrl) {
    navigate(post.internalUrl);
    return;
  }
  onOpen(post);
};

const StoryMeta = ({ post }) => (
  <div className="avis-meta">
    <span className={post.origin === 'media' ? 'avis-kicker is-media' : 'avis-kicker'}>{post.kicker}</span>
    {post.paywall && <span className="avis-badge">Pluss</span>}
    <time dateTime={post.date}>{relativeDate(post.date)}</time>
  </div>
);

const StoryAction = ({ post, onOpen }) => {
  if (post.url) {
    return (
      <a className="avis-action" href={post.url} target="_blank" rel="noreferrer">
        Les hos {sourceName(post.source)} ↗
      </a>
    );
  }
  if (post.internalUrl) {
    return <Link className="avis-action" to={post.internalUrl}>{post.linkLabel || 'Les mer'}</Link>;
  }
  return <button type="button" className="avis-action" onClick={() => onOpen(post)}>Les saken</button>;
};

const handleCardClick = (event, post, onOpen) => {
  if (event.target.closest('a, button')) return;
  openPost(post, onOpen);
};

// Eksterne pressebilder kan blokkere hotlinking; da brukes et lokalt arkivbilde i stedet for en tom ramme.
const StoryImage = ({ post, className, lazy = false, onFallback }) => {
  const fallback = fallbackImageFor(post.title || '');
  const [src, setSrc] = useState(post.image);
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading={lazy ? 'lazy' : undefined}
      onError={() => {
        if (src === fallback) return;
        setSrc(fallback);
        onFallback?.();
      }}
    />
  );
};

const LeadStory = ({ post, onOpen }) => {
  const [usesFallback, setUsesFallback] = useState(false);
  return (
  <article className="avis-lead" onClick={(event) => handleCardClick(event, post, onOpen)}>
    <figure className="avis-lead-media">
      <StoryImage key={post.id} post={post} onFallback={() => setUsesFallback(true)} />
      {post.origin === 'media' && post.hasOwnImage && !usesFallback && <figcaption>Foto: {sourceName(post.source)}</figcaption>}
    </figure>
    <div className="avis-lead-copy">
      <StoryMeta post={post} />
      <h2>{post.title}</h2>
      {post.lede && <p className="avis-lede">{post.lede}</p>}
      <StoryAction post={post} onOpen={onOpen} />
    </div>
  </article>
  );
};

const StoryCard = ({ post, onOpen }) => (
  <article className="avis-card" onClick={(event) => handleCardClick(event, post, onOpen)}>
    <StoryImage post={post} className="avis-card-image" lazy />
    <StoryMeta post={post} />
    <h3>{post.title}</h3>
    {post.lede && <p>{post.lede}</p>}
  </article>
);

const LatestList = ({ posts, onOpen }) => {
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
              {post.url ? (
                <a href={post.url} target="_blank" rel="noreferrer">{post.title} ↗</a>
              ) : post.internalUrl ? (
                <Link to={post.internalUrl}>{post.title}</Link>
              ) : (
                <button type="button" onClick={() => onOpen(post)}>{post.title}</button>
              )}
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

const UpcomingBox = ({ activities }) => (
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

const ArticleModal = ({ post, onClose }) => {
  useEffect(() => {
    if (!post) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [post, onClose]);

  if (!post) return null;

  const paragraphs = String(post.body || post.lede || '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="article-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="article-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="article-modal-close" onClick={onClose} aria-label="Lukk artikkel">Lukk</button>
        <figure className="article-modal-hero">
          <img src={post.image} alt="" />
          {post.imageCredit && <figcaption>{post.imageCredit}</figcaption>}
        </figure>
        <div className="article-modal-content">
          <div className="avis-meta">
            <span className="avis-kicker">{post.kicker}</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
          <h2 id="article-modal-title">{post.title}</h2>
          <div className="article-modal-body">
            {paragraphs.map((paragraph, index) => <p key={`${post.id}-${index}`}>{paragraph}</p>)}
          </div>
          {post.gallery?.length > 1 && (
            <div className="article-modal-gallery" aria-label={`Bilder til ${post.title}`}>
              {post.gallery.slice(1).map((image, index) => <img key={`${post.id}-gallery-${index}`} src={image} alt="" />)}
            </div>
          )}
        </div>
      </article>
    </div>
  );
};

const Aktuelt = ({ weather, activities = [], supabaseConfigured = false }) => {
  const mediaData = useJson(MEDIA_NEWS_PATH);
  const editorPlan = useJson(AI_EDITOR_PATH);
  const localStories = useLocalStories();
  const [selectedPost, setSelectedPost] = useState(null);

  const front = useMemo(() => {
    const own = [
      ...EGNE_SAKER.map(ownToPost),
      ...localStories.map((story) => ownToPost(storyToAktueltPost(story))),
    ];
    const media = prepareMediaNews(Array.isArray(mediaData) ? mediaData : []);
    return buildFrontPage(applyEditorPlan([...own, ...media], editorPlan));
  }, [mediaData, editorPlan, localStories]);

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
            {front.lead && <LeadStory post={front.lead} onOpen={setSelectedPost} />}
            {front.grid.length > 0 && (
              <div className="avis-grid">
                {front.grid.map((post) => <StoryCard key={post.id} post={post} onOpen={setSelectedPost} />)}
              </div>
            )}
            <LatestList posts={front.latest} onOpen={setSelectedPost} />
          </div>

          <aside className="avis-side">
            <UpcomingBox activities={upcoming} />
            <LoypevennBox />
          </aside>
        </div>
      </div>
      <ArticleModal post={selectedPost} onClose={() => setSelectedPost(null)} />
    </section>
  );
};

export default Aktuelt;
