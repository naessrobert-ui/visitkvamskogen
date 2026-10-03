import { useEffect, useMemo, useState } from 'react';
import EGNE_SAKER from '../data/aktuelt_saker.json';
import { todayDateKey } from './activityVisibility.js';
import { LOCAL_STORIES_EVENT, loadLocalStories, storyToAktueltPost } from './stories.js';

const MEDIA_NEWS_PATH = '/data/kvamskogen_news.json';
const AI_EDITOR_PATH = '/data/kvamskogen_editor.json';
const MEDIA_FALLBACK_IMAGE = '/assets/photos/summer/hardangerfjorden.webp';

export const SAK_PATH_PREFIX = '/aktuelt/sak/';

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

export const dateOnly = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const fallback = new Date(`${value}T12:00:00`);
  return Number.isNaN(fallback.getTime()) ? '' : fallback.toISOString().slice(0, 10);
};

export const dateTimestamp = (value) => {
  const normalized = dateOnly(value);
  return normalized ? new Date(`${normalized}T12:00:00`).getTime() : 0;
};

export const ageDays = (value) => {
  const timestamp = dateTimestamp(value);
  if (!timestamp) return 999;
  const todayNoon = new Date(`${todayDateKey()}T12:00:00`).getTime();
  return Math.max(0, Math.round((todayNoon - timestamp) / 86400000));
};

export const isThisYear = (value) => new Date(dateTimestamp(value)).getFullYear() === new Date().getFullYear();

export const formatDate = (value, withYear = true) => {
  const normalized = dateOnly(value);
  if (!normalized) return '';
  const options = withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' };
  return new Intl.DateTimeFormat('no-NO', options).format(new Date(`${normalized}T12:00:00`));
};

export const relativeDate = (value) => {
  const days = ageDays(value);
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

const slugify = (value) => fingerprint(value)
  .replace(/æ/g, 'ae')
  .replace(/ø/g, 'o')
  .replace(/å/g, 'a')
  .replace(/\s+/g, '-')
  .slice(0, 60)
  .replace(/-+$/, '');

// Artikkelnummeret i avisens URL er stabilt selv om tittelen endres; uten nummer brukes en kort hash av URL-en.
const urlId = (url) => {
  const match = String(url || '').match(/\/(\d{5,})\/?(?:[?#].*)?$/);
  if (match) return match[1];
  let hash = 0;
  for (const char of String(url || '')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
};

export const sourceName = (source) => SOURCE_NAMES[source] || source || 'Ukjent kilde';

const isAd = (item) => AD_PATTERNS.some((pattern) => pattern.test(`${item.url || ''} ${item.source || ''}`));

const isAggregatorUrl = (url) => /news\.google\.com/i.test(url || '');

export const fallbackImageFor = (text) => {
  const haystack = String(text || '').toLowerCase();
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
  const slug = `${slugify(title) || 'sak'}-${urlId(item.url)}`;

  return {
    id: `media-${item.url}`,
    slug,
    path: `${SAK_PATH_PREFIX}${slug}`,
    origin: 'media',
    kicker: sourceName(item.source),
    source: item.source,
    date: dateOnly(item.published_at) || item.found_date || '',
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
  slug: story.id,
  path: story.internalUrl || `${SAK_PATH_PREFIX}${story.id}`,
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
    if (!existing.published_at && item.published_at) existing.published_at = item.published_at;
  });

  return [...seen.values()].map(mediaToPost);
};

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
      lede: post.origin === 'media' && story.lede && !post.lede ? story.lede : post.lede,
    };
  });
};

const useJson = (path) => {
  const [state, setState] = useState({ data: null, loaded: false });

  useEffect(() => {
    let cancelled = false;
    fetch(path, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => { if (!cancelled) setState({ data: json, loaded: true }); })
      .catch(() => { if (!cancelled) setState({ data: null, loaded: true }); });
    return () => { cancelled = true; };
  }, [path]);

  return state;
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

export const useAktueltFeed = () => {
  const media = useJson(MEDIA_NEWS_PATH);
  const editor = useJson(AI_EDITOR_PATH);
  const localStories = useLocalStories();

  const posts = useMemo(() => {
    const own = [
      ...EGNE_SAKER.map(ownToPost),
      ...localStories.map((story) => ownToPost(storyToAktueltPost(story))),
    ];
    const mediaPosts = prepareMediaNews(Array.isArray(media.data) ? media.data : []);
    return applyEditorPlan([...own, ...mediaPosts], editor.data);
  }, [media.data, editor.data, localStories]);

  return { posts, loaded: media.loaded };
};

const STOP_WORDS = new Set(['og', 'i', 'på', 'pa', 'for', 'med', 'til', 'av', 'er', 'det', 'som', 'om', 'ein', 'en', 'eit', 'et', 'har', 'kvamskogen', 'frå', 'fra', 'meir', 'mer']);

const keywords = (post) => new Set(
  fingerprint(`${post.title} ${post.lede || ''}`)
    .split(' ')
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word)),
);

// Relaterte saker: flest felles ord først, deretter nyeste. Enkelt, men nok til «ladestasjon»-sakene og plansakene.
export const relatedPosts = (post, posts, count = 3) => {
  const words = keywords(post);
  return posts
    .filter((other) => other.id !== post.id)
    .map((other) => {
      const shared = [...keywords(other)].filter((word) => words.has(word)).length;
      return { other, shared };
    })
    .sort((a, b) => b.shared - a.shared || dateTimestamp(b.other.date) - dateTimestamp(a.other.date))
    .slice(0, count)
    .map(({ other }) => other);
};
