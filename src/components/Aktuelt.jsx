import { useEffect, useMemo, useState } from 'react';
import { SAMPLE_ACTIVITIES } from '../data/sampleActivities.js';
import { isVisibleUpcomingActivity, todayDateKey } from '../lib/activityVisibility.js';
import { LOCAL_STORIES_EVENT, loadLocalStories, storyToAktueltPost } from '../lib/stories.js';
import '../styles/ai-editor.css';

const LIVE_WEBCAM_SOURCES = [
  {
    type: 'stream',
    src: 'https://camstreamer.com/embed/Gnsmh9uWRE7FGnRNi6YrAr6DfoefVI86ZMO1hQUT',
    label: 'Eikedalen · Tvillingtrekkene',
  },
  {
    type: 'stream',
    src: 'https://camstreamer.com/embed/TlggbcsCYIopP3dwVr8cQaEAuZpClik56SuHLlpC',
    label: 'Eikedalen · Tobiasheisen',
  },
  {
    type: 'stream',
    src: 'https://camstreamer.com/embed/0wd5neFMSF1aeM29ZsWXzYEWpwx5VgBQtLRA64nC',
    label: 'Eikedalen · Setertrekket',
  },
  {
    type: 'image',
    src: 'https://img.youtube.com/vi/EjymYkpcQCs/maxresdefault_live.jpg',
    label: 'Furedalen topp · webkamera',
  },
  {
    type: 'image',
    src: 'https://img.youtube.com/vi/kRhnJsErBdE/maxresdefault_live.jpg',
    label: 'Furedalen bunn · webkamera',
  },
  {
    type: 'image',
    src: 'https://img.youtube.com/vi/EjymYkpcQCs/maxresdefault.jpg',
    label: 'Furedalen topp · webkamera',
  },
  {
    type: 'image',
    src: 'https://img.youtube.com/vi/kRhnJsErBdE/maxresdefault.jpg',
    label: 'Furedalen bunn · webkamera',
  },
  {
    type: 'image',
    src: 'https://img.youtube.com/vi/EjymYkpcQCs/hqdefault.jpg',
    label: 'Furedalen topp · webkamera',
  },
  {
    type: 'image',
    src: 'https://img.youtube.com/vi/kRhnJsErBdE/hqdefault.jpg',
    label: 'Furedalen bunn · webkamera',
  },
];

const ARCHIVE_WEATHER_IMAGE = {
  src: '/assets/photos/winter/utsikt-vinter.webp',
  label: 'Arkivbilde · Kvamskogen',
};


const MEDIA_NEWS_PATH = '/data/kvamskogen_news.json';
const AI_EDITOR_PATH = '/data/kvamskogen_editor.json';
const MEDIA_NEWS_IMAGE = '/assets/photos/summer/hardangerfjorden.webp';
const FRESH_MEDIA_NEWS_DAYS = 5;

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Anbefalt' },
  { value: 'date', label: 'Nyeste først' },
  { value: 'popular', label: 'Mest lest' },
  { value: 'liked', label: 'Best likt' },
  { value: 'source', label: 'Kilde og score' },
];

const MEDIA_FALLBACK_IMAGES = [
  { keywords: ['løype', 'ski', 'vinter', 'påske'], image: '/assets/photos/winter/loypemaskin-natt.webp' },
  { keywords: ['fond', 'vel', 'lavlandsløypa', 'tur'], image: '/assets/photos/summer/grusvei-stol.webp' },
  { keywords: ['kommune', 'plan', 'regulering', 'fylkesveg', 'veg', 'vei'], image: '/assets/photos/summer/utsikt-fjord.webp' },
];

const sortByNewest = (items) => [...items].sort((a, b) => dateTimestamp(b.date) - dateTimestamp(a.date));

const splitMediaNewsByAge = (items) => {
  const fresh = [];
  const previous = [];

  items.forEach((item) => {
    if (mediaArticleAgeDays(item) <= FRESH_MEDIA_NEWS_DAYS) {
      fresh.push(item);
      return;
    }
    previous.push(item);
  });

  return {
    fresh: sortByNewest(fresh),
    previous: sortByNewest(previous),
  };
};

const ADMIN_SAKER = [
  {
    id: 'preppemaskin-elven-broer-2026',
    type: 'Aktuelt',
    date: '2026-06-14',
    dateLabel: '14. juni 2026',
    section: 'Løyper',
    image: '/assets/photos/winter/loypemaskin-natt.webp',
    title: 'Da preppemaskinen gikk i elven: slitte broer setter løypene i fare',
    lede: 'I påsken raste en av Kvamskogens preppemaskiner gjennom en gammel bro og havnet i elven. Episoden satte en skremmende strek under et problem vellet har visst om lenge — flere av broene på fjellet er utslitte, og uten mer bidrag til løypekjøringen står vi til slutt mellom helse og løyper.',
    body: 'Det kunne gått riktig galt. I påsken, midt i den travleste skiuken på året, ga en gammel og slitt bro etter da en av Kvamskogens preppemaskiner skulle over. Maskinen falt i elven. Heldigvis gikk det bra med føreren, men bildene av den veltede maskinen i det iskalde vannet har brent seg fast.\n\nUlykken var ikke et uhell ut av det blå. Broen var gammel og medtatt, og den er ikke den eneste. Flere av broene preppemaskinene må krysse for å holde løypenettet i gang er i samme forfatning. Å få på plass én sikker og solid bro kan koste opp mot 300 000 kroner. Minst to broer må skiftes ut nå.\n\nI skrivende stund har vi rett og slett ikke penger til dette. Og da blir valget brutalt enkelt: enten lar vi maskiner og folk krysse broer vi vet ikke holder — og risikerer helse og liv — eller så kutter vi ned på løypene. Ingen av delene er noe vi ønsker.\n\nDet finnes en tredje vei, og den er den klart beste: at flere er med og betaler for løypekjøringen. I dag er det bare en liten andel av alle som har hytte eller vogn på Kvamskogen som bidrar til løypene. De preparerte løypene er et fellesgode alle nyter godt av — men regningen bæres av de få.\n\nDersom flere ble med, ville vi ikke bare ha råd til trygge broer. Vi ville sikret selve grunnlaget for at det går an å kjøre løyper på Kvamskogen i årene som kommer.\n\nSpørsmålet vi stiller hyttefolket er enkelt: hva skal til for at nettopp du blir med og bidrar? Et fast årlig løypebidrag fra flere ville løst både brovedlikehold og preparering på en gang. Vi tar gjerne imot innspill — og enda heller et bidrag.',
  },
  {
    id: 'aktiviteter-lavterskel-2026',
    type: 'Nyhet',
    date: '2026-06-14',
    dateLabel: '14. juni 2026',
    section: 'Aktiviteter',
    image: '/assets/photos/summer/saata-sommar.webp',
    title: 'Nå kan alle legge inn det som skjer på fjellet',
    lede: 'Visit Kvamskogen har åpnet en helt åpen aktivitetstavle. Her kan hvem som helst legge inn en tur, et arrangement eller bare et lite initiativ til å gjøre noe sammen — uten innlogging og helt gratis.',
    body: 'På Kvamskogen skjer det mer enn folk rekker å fortelle hverandre om. Noen tar en morgentur til seters, andre samler naboene til dugnad, grillkveld eller en uformell fest. Nå har Visit Kvamskogen laget et sted der slikt kan deles med alle: en åpen aktivitetstavle under «Aktiviteter».\n\nDet viktigste ordet er lavterskel. Du trenger verken konto, pålogging eller en stor plan. Aktiviteter kan sendes inn uten innlogging, og e-postadressen brukes bare til kontakt — ikke til å lage en profil. Du fyller inn type aktivitet, dato og klokkeslett, møtested og eventuell pris, og en kort beskrivelse. Så er den ute.\n\nDet kan være et større arrangement med påmelding og program. Men det kan like gjerne være det helt enkle: «Jeg går en kort tur til Mødalsseterne lørdag klokka ni — bli med den som vil.» Begge deler er like velkomne. Poenget er å gjøre det lettere å finne hverandre, slik at den som har lyst på selskap slipper å gå alene, og den som lurer på hva som skjer har et sted å se etter det.\n\nOg det trenger slett ikke å være en tur. Lek for ungene, en familiedag, en konsert i hagen, quiz på hytta eller en spontan fest teller like mye. Kanskje noen vil arrangere en uhøytidelig konkurranse — hvem løper raskest opp Furedalstrekket, eller hvem klarer flest hopp uti et kaldt fjellvann en sommerkveld? Eller kanskje dere rett og slett vil gå sammen for å oppdage nye steder på Kvamskogen som de færreste kjenner til.\n\nHer er det meste lov, og det er opp til dem som bor og ferdes på fjellet å fylle tavla med innhold. Har du en idé, stor eller liten, ligger knappen «Legg inn aktivitet» klar under Aktiviteter.',
  },
  {
    id: 'vel-oppnadd-siste-aar-2026',
    type: 'Bakgrunn',
    date: '2026-04-13',
    dateLabel: '13. april 2026',
    section: 'Kvamskogen Vel',
    image: '/assets/photos/summer/utsikt-fjord.webp',
    title: 'Dette har Kvamskogen Vel fått til de siste årene',
    lede: 'Avtroppende styreleder Edvard Skagen ser tilbake på år med Lavlandsløypen, tryggere RV49 og sterk medlemsvekst — og minner om at jo flere medlemmer, desto mer kan vellet få til.',
    body: 'Da Edvard Skagen takket for seg som styreleder våren 2026, gjorde han det med en lang liste fullførte saker bak seg. Årene i styret har vært både givende og lærerike, oppsummerte han, og noe han ikke ville vært foruten.\n\nDet mest synlige løftet er Lavlandsløypen. Den første delen er ferdig og gir Kvamskogen en lettgått helårsrunde for hyttefolk, barnefamilier og besøkende som vil ha en tur uten å måtte opp i høyden.\n\nVinterstid handler mye om løypene. Vellet har sikret preparering av rundt 65 kilometer skiløyper gjennom en flerårig avtale med Kvamskogen Hytteservice fram til 2028, slik at tilbudet ligger fast fra sesong til sesong.\n\nTrafikksikkerheten langs RV49 har også stått høyt. Arbeidet med strekningen fra Skarbekkdalen og forbi NAF-banen, med 60 km/t, er en god begynnelse, og fylket har lovet fartsmålinger på utsatte punkt.\n\nBak kulissene har vellet blitt en tydelig stemme inn mot Kvam herad. Organisasjonen er nå høringspart i utviklingen av området og møter kommunen jevnlig om planer som former Kvamskogen i mange år framover.\n\nVeksten i medlemstall gir tyngde. Ved inngangen til 2026 var rundt 800 hytteeiere medlemmer. For å få gjennomført medlemmenes ønsker må vellet ha medlemsvekst — det gir både forhandlingsstyrke og kapital til tiltak, understreket Skagen, som oppfordret flere til å melde seg inn.\n\nVisjonen ligger fast: at Kvamskogen skal være et godt sted å komme til og å være på — i alle livets faser.',
  },
  {
    id: 'innspill-kommunedelplan-kvamskogen-2026',
    type: 'Høring',
    date: '2026-06-13',
    dateLabel: '13. juni 2026',
    section: 'Plansak',
    image: '/assets/photos/summer/utsikt-fjord.webp',
    title: 'Vel-et ber kommunen sikre løypene, fjellfølelsen og trygge kryssinger',
    lede: 'Kvamskogen Vel støtter hovedretningen i ny kommunedelplan, men peker på det som må voktes når området utvikles: sammenhengende løyper, grøntdrag, trafikktrygghet og mørkere fjellkvelder.',
    body: 'Høringsinnspillet ber Kvam herad gi ski- og turløyper romslige korridorer, sikre trygge krysningspunkt over hovedvegen og ta vare på landskapskvalitetene som gjør Kvamskogen til et friluftsområde.',
    internalUrl: '#/plansaker',
    linkLabel: 'Les hele høringsinnspillet',
  },
  {
    id: 'lavlandsloypen-2025',
    type: 'Adminsak',
    date: '2025-08-15',
    dateLabel: '15. august 2025',
    section: 'Friluft',
    image: '/assets/photos/summer/grusvei-stol.webp',
    title: 'Lavlandsløypen gir Kvamskogen en enklere helårstur',
    lede: 'En lettgått runde gjennom skogen gjør det enklere å velge kort tur, trilletur eller sykkeltur når fjellet ikke frister.',
    body: 'Løypen er tenkt som et lavterskeltilbud for hyttefolk, barnefamilier og besøkende som vil ha en tur uten å måtte opp i høyden. Den kan bli en fast redaksjonell sak som oppdateres med føre, bilder og praktisk informasjon gjennom året.',
    internalUrl: '#/lavlandsloypen',
    linkLabel: 'Se Lavlandsløypen på kartet',
  },
];

const NYHETSIDEER = [
  {
    id: 'furedalen',
    label: 'Nyhetsovervåkning',
    title: 'AI kan finne lokale signaler — men bør ikke kopiere nettaviser',
    text: 'Et trygt oppsett er å hente overskrifter, dato, kilde og kort utdrag fra godkjente kilder, og la AI lage en egen oppsummering med tydelig kildehenvisning. Full artikkeltekst bør ikke kopieres.',
  },
  {
    id: 'bilder',
    label: 'Bilder',
    title: 'Bildebruk bør komme fra egne bilder, frie kilder eller administrator',
    text: 'Nyhetsjobben prøver nå å hente og lagre originalt og:image når kilden eksponerer det. Eksterne pressebilder bør likevel bare vises når lisens og hotlinking tillater det; ellers brukes lokale arkivbilder.',
  },
  {
    id: 'admin',
    label: 'Admin',
    title: 'Hemmelig kode må ligge på serveren — ikke i React-koden',
    text: 'Reelle lesertall, tommel opp, ok-markering og tommel ned bør lagres i Supabase med rate limiting. Stemmer bør påvirke flyten, men ikke alene styre forsiden uten redaksjonell vekt.',
  },
];

const weatherNumber = (value) => {
  if (!value || value === '–') return null;
  const normalized = String(value).replace('+', '').replace('°', '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDayName = (isoDate) => {
  if (!isoDate) return 'en av dagene fremover';
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('no-NO', { weekday: 'long' });
};

const formatShortDate = (isoDate) => {
  if (!isoDate) return '';
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('no-NO', { day: 'numeric', month: 'long' });
};

const makeWeatherArticle = (weather) => {
  const temp = weatherNumber(weather?.temp);
  const wind = weatherNumber(weather?.wind);
  const condition = weather?.cond && weather.cond !== '–' ? weather.cond.toLowerCase() : 'skiftende vær';
  const windText = wind === null ? 'vinden er ikke målt akkurat nå' : `vinden ligger rundt ${Math.round(wind)} m/s${weather?.windDir ? ` fra ${weather.windDir.toLowerCase()}` : ''}`;
  const sunnyDay = weather?.forecast?.sunnyDay;

  if (sunnyDay) {
    const dayName = formatDayName(sunnyDay.date);
    const maxTemp = sunnyDay.maxTemp !== null ? `${Math.round(sunnyDay.maxTemp)}°` : 'mildere luft';
    const rain = sunnyDay.precipitation !== null ? `${sunnyDay.precipitation.toFixed(1).replace('.', ',')} mm` : 'lite nedbør';

    return {
      title: `Snart kommer solen til Kvamskogen`,
      lede: `Yr peker særlig på ${dayName} ${formatShortDate(sunnyDay.date)}: ${sunnyDay.clearHours} lyse timer, opp mot ${maxTemp} og ${rain} i prognosen.`,
      body: `Akkurat nå er bildet ${weather?.temp || 'ukjent temperatur'} og ${condition}. ${windText}. Det gjør ${dayName} til dagen å følge med på for tur, vedlikehold ute og små ærend på fjellet.`,
    };
  }

  if (temp !== null && temp <= 0) {
    return {
      title: 'Kaldt drag over Kvamskogen',
      lede: `Akkurat nå meldes ${weather.temp} og ${condition}. ${windText}.`,
      body: 'Når temperaturen ligger rundt null eller lavere, kan små endringer gi stor forskjell på veier, stier og skiløyper. Ta høyde for glatte partier, raskt værskifte og kaldere luft i høyden.',
    };
  }

  if (temp !== null && temp >= 16) {
    return {
      title: 'Mild dag på fjellet',
      lede: `Værbildet nå: ${weather.temp}, ${condition}, og ${windText}.`,
      body: 'På milde dager er lavterskelturene ekstra aktuelle. Lavlandsløypen, korte utsiktspunkt og en rolig kaffestopp passer godt når været spiller på lag.',
    };
  }

  return {
    title: 'Slik ser Kvamskogen ut akkurat nå',
    lede: `Siste værdata viser ${weather?.temp || 'ukjent temperatur'}, ${condition}, og ${windText}.`,
    body: 'Saken kombinerer oppdatert Yr-data med direkte webkamera fra Eikedalen. Furedalen brukes bare som reserve, slik at en svart eller inaktiv Furedalen-strøm ikke skal overstyre et fungerende kamera.',
  };
};

const shouldFeatureWeatherLead = (weather) => {
  const temp = weatherNumber(weather?.temp);
  const wind = weatherNumber(weather?.wind);
  const sunnyDay = weather?.forecast?.sunnyDay;
  const hasClearWeatherHook = sunnyDay && Number(sunnyDay.clearHours || 0) >= 4;
  const hasDrivingConditionsHook = temp !== null && temp <= 0;
  const hasWindHook = wind !== null && wind >= 10;

  return Boolean(hasClearWeatherHook || hasDrivingConditionsHook || hasWindHook);
};

const rotateByDay = (items) => {
  const day = Math.floor(Date.now() / 86400000);
  return items.map((_, index) => items[(index + day) % items.length]);
};

const ARTICLE_VIEW_KEY = 'visitkvamskogen.articleReads.v1';
const ARTICLE_FEEDBACK_KEY = 'visitkvamskogen.articleFeedback.v1';

const dateValue = (activity) => new Date(`${activity?.date || activity?.created_at || '1970-01-01'}T12:00:00`).getTime();

const formatActivityDate = (value) => {
  if (!value) return 'dato kommer';
  return new Intl.DateTimeFormat('no-NO', { day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`));
};


const dateOnly = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date(`${value}T12:00:00`);
    return Number.isNaN(fallback.getTime()) ? '' : fallback.toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
};

const formatArticleDate = (value) => {
  const normalized = dateOnly(value);
  if (!normalized) return 'dato ukjent';
  return new Intl.DateTimeFormat('no-NO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${normalized}T12:00:00`));
};

const dateTimestamp = (value) => {
  const normalized = dateOnly(value);
  return normalized ? new Date(`${normalized}T12:00:00`).getTime() : 0;
};

const articleAgeDays = (date) => {
  const timestamp = dateTimestamp(date);
  if (!timestamp) return 999;
  return Math.max(0, (Date.now() - timestamp) / 86400000);
};

function mediaArticleAgeDays(item) {
  const published = dateTimestamp(item?.date);
  if (!published) return 999;
  const found = dateTimestamp(item?.foundDate);
  const reference = Math.max(Date.now(), found || 0);
  return Math.max(0, (reference - published) / 86400000);
}

const cleanExternalText = (value, fallback = '') => {
  const withoutTags = String(value || '').replace(/<[^>]*>/g, ' ');
  if (typeof document === 'undefined') return withoutTags.replace(/\s+/g, ' ').trim() || fallback;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = withoutTags;
  return textarea.value.replace(/\s+/g, ' ').trim() || fallback;
};

const storyFingerprint = (item) => cleanExternalText(item?.title || item?.angle || '')
  .toLowerCase()
  .replace(/\s+-\s+[^-]+$/, '')
  .replace(/[^a-z0-9æøå]+/g, ' ')
  .replace(/\b(bt|ba|nrk|hf|no|com|bergen tidende|bergensavisen)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const uniqueByStory = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = storyFingerprint(item) || item?.url || item?.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const imageForMediaItem = (item) => {
  const explicitImage = item.image_url || item.image || item.thumbnail;
  if (explicitImage) return explicitImage;
  const haystack = `${item.title || ''} ${item.snippet || ''}`.toLowerCase();
  return MEDIA_FALLBACK_IMAGES.find(({ keywords }) => keywords.some((keyword) => haystack.includes(keyword)))?.image || MEDIA_NEWS_IMAGE;
};

const safeIdPart = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9æøå]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

const mediaNewsToPost = (item, index) => {
  const source = item.source || 'ukjent kilde';
  const date = dateOnly(item.published_at) || item.found_date || new Date().toISOString().slice(0, 10);
  const score = Number(item.importance_score || 0);
  const title = cleanExternalText(item.title, 'Ny sak om Kvamskogen');
  const snippet = cleanExternalText(item.snippet, 'Søketreffet mangler kort utdrag, men lenken er tatt med for redaksjonell kontroll.');

  return {
    id: `media-${safeIdPart(source)}-${safeIdPart(item.url || title)}-${index}`,
    section: item.source_group === 'bonus' ? 'Media · bonus' : 'Media',
    date,
    dateLabel: item.published_at ? `Publisert ${formatArticleDate(item.published_at)}` : `Funnet ${formatArticleDate(date)}`,
    image: imageForMediaItem(item),
    imageCredit: item.image_url ? `Bilde fra ${source}` : 'Lokalt arkivbilde',
    title,
    lede: snippet,
    body: `Kort oppsummert fra søkeresultatet: ${snippet}`,
    source,
    url: item.url,
    external: true,
    foundDate: item.found_date,
    baseViews: 130 + score * 12,
    importance: 35 + score,
    importanceScore: score,
    importanceReason: item.importance_reason || 'Vurdert etter kilde og lokale temaord.',
  };
};

const feedbackScore = (feedback, id) => Number(feedback?.[id]?.up || 0) - Number(feedback?.[id]?.down || 0);

const readingScore = (reads, id) => Number(reads?.[id] || 0);

const recencyScore = (date) => {
  const ageDays = articleAgeDays(date);
  if (ageDays > 14) return 0;
  if (ageDays > 7) return Math.max(0, 18 - (ageDays - 7) * 3);
  return Math.max(0, 70 - ageDays * 5);
};

const stalePenalty = (date) => {
  const ageDays = articleAgeDays(date);
  if (ageDays <= 7) return 0;
  return 45 + (ageDays - 7) * 18;
};

const sortPostsForNewsstand = (posts, sortBy = 'recommended', reads = {}, feedback = {}) => [...posts].sort((a, b) => {
  if (sortBy === 'date') {
    const dateDiff = dateTimestamp(b.date) - dateTimestamp(a.date);
    if (dateDiff !== 0) return dateDiff;
  }

  if (sortBy === 'popular') {
    const readDiff = (Number(b.baseViews || 0) + readingScore(reads, b.id)) - (Number(a.baseViews || 0) + readingScore(reads, a.id));
    if (readDiff !== 0) return readDiff;
  }

  if (sortBy === 'liked') {
    const likeDiff = feedbackScore(feedback, b.id) - feedbackScore(feedback, a.id);
    if (likeDiff !== 0) return likeDiff;
  }

  if (sortBy === 'source') {
    const scoreDiff = Number(b.importanceScore || b.importance || 0) - Number(a.importanceScore || a.importance || 0);
    if (scoreDiff !== 0) return scoreDiff;
  }

  const recommendedDiff = (Number(b.importance || 0) + recencyScore(b.date) - stalePenalty(b.date) + readingScore(reads, b.id) + feedbackScore(feedback, b.id) * 8)
    - (Number(a.importance || 0) + recencyScore(a.date) - stalePenalty(a.date) + readingScore(reads, a.id) + feedbackScore(feedback, a.id) * 8);
  if (recommendedDiff !== 0) return recommendedDiff;

  return dateTimestamp(b.date) - dateTimestamp(a.date);
});

const editorialStoryKey = (story) => story?.url || story?.title || '';

const applyEditorialPlan = (posts, editorPlan) => {
  if (!editorPlan) return posts;
  const orderedStories = [editorPlan.lead_story, ...(editorPlan.featured_stories || [])].filter(Boolean);
  const boosts = new Map(orderedStories.map((story, index) => [editorialStoryKey(story), {
    rank: index,
    score: Math.max(0, Number(story.priority_score || 0)),
    reason: story.reason,
    angle: story.angle,
  }]));

  return posts.map((post) => {
    const boost = boosts.get(editorialStoryKey(post));
    if (!boost) return post;
    if (articleAgeDays(post.date) > 7) return post;
    const editorialBoost = 86 - boost.rank * 16 + boost.score * 2;
    return {
      ...post,
      section: boost.rank === 0 ? 'AI-redaktøren velger' : post.section,
      lede: boost.angle || post.lede,
      editorialReason: boost.reason,
      editorialRank: boost.rank,
      importance: Number(post.importance || 0) + editorialBoost,
    };
  });
};

const useMediaNews = () => {
  const [mediaNews, setMediaNews] = useState([]);
  const [mediaStatus, setMediaStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    const loadMediaNews = async () => {
      try {
        const response = await fetch(MEDIA_NEWS_PATH, { cache: 'no-store' });
        if (!response.ok) {
          if (!cancelled) setMediaStatus(response.status === 404 ? 'missing' : 'error');
          return;
        }
        const data = await response.json();
        if (cancelled) return;
        const items = Array.isArray(data) ? data : [];
        setMediaNews(uniqueByStory(items.map(mediaNewsToPost)));
        setMediaStatus(items.length ? 'ready' : 'empty');
      } catch (_) {
        if (!cancelled) setMediaStatus('error');
      }
    };

    loadMediaNews();
    return () => { cancelled = true; };
  }, []);

  return { mediaNews, mediaStatus };
};

const useAiEditorPlan = () => {
  const [editorPlan, setEditorPlan] = useState(null);
  const [editorStatus, setEditorStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    const loadEditorPlan = async () => {
      try {
        const response = await fetch(AI_EDITOR_PATH, { cache: 'no-store' });
        if (!response.ok) {
          if (!cancelled) setEditorStatus(response.status === 404 ? 'missing' : 'error');
          return;
        }
        const data = await response.json();
        if (cancelled) return;
        setEditorPlan(data && typeof data === 'object' ? data : null);
        setEditorStatus(data ? 'ready' : 'empty');
      } catch (_) {
        if (!cancelled) setEditorStatus('error');
      }
    };

    loadEditorPlan();
    return () => { cancelled = true; };
  }, []);

  return { editorPlan, editorStatus };
};

const pickActivityDigest = (activities, supabaseConfigured) => {
  const today = todayDateKey();
  const visibleActivities = (supabaseConfigured ? activities : SAMPLE_ACTIVITIES)
    .filter((activity) => isVisibleUpcomingActivity(activity, today));
  const normalized = (visibleActivities || []).map((activity) => ({
    ...activity,
    signup_count: Number(activity.signup_count || 0),
  }));
  const sortedByDate = [...normalized].sort((a, b) => dateValue(a) - dateValue(b));
  const sortedByCreated = [...normalized].sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0));
  const sortedByInterest = [...normalized].sort((a, b) => b.signup_count - a.signup_count || dateValue(a) - dateValue(b));

  return {
    activities: normalized,
    count: normalized.length,
    popular: sortedByInterest[0] || null,
    newest: sortedByCreated[0] || sortedByDate[0] || null,
    upcoming: sortedByDate.slice(0, 3),
    sourceLabel: supabaseConfigured ? 'live fra Supabase' : 'eksempeldata til Supabase kobles på',
  };
};

const makeActivityArticle = (digest) => {
  const popular = digest.popular;
  if (!popular) {
    return {
      id: 'aktiviteter-status',
      section: 'Aktiviteter',
      date: new Date().toISOString().slice(0, 10),
      dateLabel: 'Nå',
      image: '/assets/photos/summer/modalen.webp',
      title: 'Aktivitetsfeltet er klart for lokale saker',
      lede: 'Når aktiviteter publiseres, kan Aktuelt automatisk løfte frem nyeste, mest populære og det totale antallet.',
      body: 'Dette gir en levende forside uten at alt må skrives manuelt: redaksjonen kan fortsatt overstyre, men systemet finner signalene.',
      baseViews: 96,
    };
  }

  return {
    id: `aktivitet-${popular.id}`,
    section: 'Aktiviteter',
    date: popular.date,
    dateLabel: formatActivityDate(popular.date),
    image: '/assets/photos/summer/modalen.webp',
    title: `${popular.title} er aktiviteten flest følger nå`,
    lede: `${popular.signup_count || 0} påmeldte gjør denne til den tydeligste aktivitetssaken akkurat nå. Totalt ligger ${digest.count} aktiviteter ute.`,
    body: `${popular.description} Neste steg kan være å lage en egen nyhetsartikkel automatisk når en aktivitet passerer en terskel for påmeldinger eller spørsmål.`,
    baseViews: 188 + (popular.signup_count || 0) * 4,
  };
};

const useArticleReads = () => {
  const [reads, setReads] = useState({});

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(ARTICLE_VIEW_KEY) || '{}');
      setReads(stored && typeof stored === 'object' ? stored : {});
    } catch (_) {
      setReads({});
    }
  }, []);

  const registerRead = (id) => {
    setReads((current) => {
      const next = { ...current, [id]: Number(current[id] || 0) + 1 };
      try {
        window.localStorage.setItem(ARTICLE_VIEW_KEY, JSON.stringify(next));
      } catch (_) {
        // Lokal måling er bare en demo; Supabase bør brukes når data skal deles mellom brukere.
      }
      return next;
    });
  };

  return { reads, registerRead };
};


const useArticleFeedback = () => {
  const [feedback, setFeedback] = useState({});

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(ARTICLE_FEEDBACK_KEY) || '{}');
      setFeedback(stored && typeof stored === 'object' ? stored : {});
    } catch (_) {
      setFeedback({});
    }
  }, []);

  const registerFeedback = (id, direction) => {
    setFeedback((current) => {
      const currentItem = current[id] || { up: 0, ok: 0, down: 0 };
      const next = {
        ...current,
        [id]: {
          ...currentItem,
          [direction]: Number(currentItem[direction] || 0) + 1,
        },
      };
      try {
        window.localStorage.setItem(ARTICLE_FEEDBACK_KEY, JSON.stringify(next));
      } catch (_) {
        // Lokal måling er bare en demo; Supabase bør brukes når data skal deles mellom brukere.
      }
      return next;
    });
  };

  return { feedback, registerFeedback };
};

const buildReadingList = ({ weather, posts, reads, feedback }) => {
  const weatherStory = makeWeatherArticle(weather);
  const featuredWeather = shouldFeatureWeatherLead(weather);
  const weatherCandidate = {
    id: 'vaer-na',
    section: 'Vær og webkamera',
    title: weatherStory.title,
    lede: weatherStory.lede,
    date: new Date().toISOString().slice(0, 10),
    baseViews: featuredWeather ? 210 : 118,
    importance: featuredWeather ? 54 : 26,
  };
  const candidates = [
    ...posts.map((post, index) => ({
      ...post,
      baseViews: post.baseViews || 142 - index * 12,
      importance: post.importance ?? (post.section === 'Planer' ? 55 : 28),
    })),
  ];

  const ranked = candidates
    .map((item) => {
      const localReads = Number(reads[item.id] || 0);
      const views = Number(item.baseViews || 0) + localReads;
      return {
        ...item,
        localReads,
        views,
        feedback: feedback?.[item.id] || { up: 0, ok: 0, down: 0 },
        score: views + Number(item.importance || 0) + recencyScore(item.date) - stalePenalty(item.date) + feedbackScore(feedback, item.id) * 8,
      };
    })
    .sort((a, b) => b.score - a.score);

  const weatherItem = {
    ...weatherCandidate,
    localReads: Number(reads[weatherCandidate.id] || 0),
    views: Number(weatherCandidate.baseViews || 0) + Number(reads[weatherCandidate.id] || 0),
    feedback: feedback?.[weatherCandidate.id] || { up: 0, ok: 0, down: 0 },
    score: Number(weatherCandidate.baseViews || 0) + Number(weatherCandidate.importance || 0) + recencyScore(weatherCandidate.date),
  };

  const withoutWeather = ranked.filter((item) => item.id !== weatherItem.id);
  const combined = featuredWeather ? [weatherItem, ...withoutWeather] : [...withoutWeather.slice(0, 4), weatherItem];
  return combined
    .sort((a, b) => (featuredWeather ? b.score - a.score : 0))
    .slice(0, 5);
};

const cacheKeyForWebcam = () => Math.floor(Date.now() / 300000);

const LiveWebcamPhoto = () => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [useArchive, setUseArchive] = useState(false);
  const cacheKey = useMemo(cacheKeyForWebcam, []);
  const source = useArchive ? ARCHIVE_WEATHER_IMAGE : LIVE_WEBCAM_SOURCES[sourceIndex];

  const handleError = () => {
    if (sourceIndex < LIVE_WEBCAM_SOURCES.length - 1) {
      setSourceIndex((index) => index + 1);
      return;
    }
    setUseArchive(true);
  };

  const handleLoad = (event) => {
    if (useArchive) return;

    const img = event.currentTarget;
    try {
      const canvas = document.createElement('canvas');
      const width = 32;
      const height = 18;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(img, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      let brightness = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        brightness += (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
      }
      const average = brightness / (pixels.length / 4);
      if (average < 18) handleError();
    } catch (_) {
      // Dersom nettleseren sperrer pikselkontroll, beholder vi bildet som faktisk lastet.
    }
  };

  if (!useArchive && source?.type === 'stream') {
    return (
      <div className="newspaper-photo-wrap">
        <iframe
          src={source.src}
          title={`Direkte webkamera fra ${source.label}`}
          className="newspaper-webcam-frame"
          loading="eager"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <span className="newspaper-photo-label">{source.label}</span>
      </div>
    );
  }

  const src = useArchive ? source.src : `${source.src}?visitkvamskogen=${cacheKey}`;

  return (
    <div className="newspaper-photo-wrap">
      <img
        src={src}
        alt="Oppdatert bilde fra webkamera på Kvamskogen"
        className="newspaper-photo"
        crossOrigin="anonymous"
        onError={handleError}
        onLoad={handleLoad}
      />
      <span className="newspaper-photo-label">{source.label}</span>
    </div>
  );
};

const LeadStory = ({ weather }) => {
  const story = makeWeatherArticle(weather);
  return (
    <article className="newspaper-lead">
      <LiveWebcamPhoto />
      <div className="newspaper-lead-copy">
        <div className="newspaper-kicker">Været nå · webkamera og Yr</div>
        <h2>{story.title}</h2>
        <p className="newspaper-lede">{story.lede}</p>
        <p>{story.body}</p>
        <dl className="weather-facts">
          <div><dt>Temperatur</dt><dd>{weather?.temp || '–'}</dd></div>
          <div><dt>Vær</dt><dd>{weather?.cond || '–'}</dd></div>
          <div><dt>Vind</dt><dd>{weather?.wind || '–'} m/s</dd></div>
          <div><dt>Oppdatert</dt><dd>{weather?.updated || '–'}</dd></div>
        </dl>
      </div>
    </article>
  );
};

const makeForecastStory = (forecast) => {
  if (!forecast?.sunnyDay) return null;

  const dayName = formatDayName(forecast.sunnyDay.date);
  const temp = forecast.sunnyDay.maxTemp !== null ? `${Math.round(forecast.sunnyDay.maxTemp)}°` : 'milde temperaturer';
  const rain = forecast.sunnyDay.precipitation !== null ? `${forecast.sunnyDay.precipitation.toFixed(1).replace('.', ',')} mm` : 'lite nedbør';

  return {
    id: 'finvaer-varsel',
    section: 'Værvarsel',
    date: forecast.sunnyDay.date,
    dateLabel: dayName.charAt(0).toUpperCase() + dayName.slice(1),
    image: '/assets/photos/summer/utsikt-fjord.webp',
    title: `Yr peker ut ${dayName}: dette kan bli ukens finværsdag`,
    lede: `${forecast.sunnyDay.clearHours} timer med klart eller lettskyet vær, rundt ${temp} på det varmeste og bare ${rain} nedbør i prognosen.`,
    body: 'Når varselet peker ut en tydelig finværsdag, kan Aktuelt lage en egen sak med arkivbilde og konkrete turforslag. Dette er en tryggere bruk av arkivfoto enn i saken om været akkurat nå, som bør bruke webkamera når det er tilgjengelig.',
  };
};

const isInteractiveElement = (target) => Boolean(target.closest('a, button'));

const NewsCard = ({
  post,
  featured = false,
  feedback = {},
  reads = {},
  onOpen,
  onRegisterRead,
  onRegisterFeedback,
}) => {
  const itemFeedback = feedback?.[post.id] || { up: 0, ok: 0, down: 0 };
  const views = Number(post.baseViews || 0) + Number(reads?.[post.id] || 0);
  const cardClassName = [
    featured ? 'newspaper-card featured' : 'newspaper-card',
    onOpen || post.internalUrl ? 'is-clickable' : '',
  ].filter(Boolean).join(' ');
  const openArticle = () => onOpen?.(post);
  const openInternalArticle = () => {
    if (!post.internalUrl) return;
    window.location.href = post.internalUrl;
  };
  const openFromCard = (event) => {
    if (isInteractiveElement(event.target)) return;
    if (post.internalUrl) {
      openInternalArticle();
      return;
    }
    if (!onOpen) return;
    openArticle();
  };

  return (
    <article
      className={cardClassName}
      onClick={openFromCard}
    >
      <figure className="newspaper-card-media">
        <img src={post.image} alt="" className="newspaper-card-image" />
        {post.imageCredit && <figcaption>{post.imageCredit}</figcaption>}
      </figure>
      <div className="newspaper-card-body">
        <div className="newspaper-meta">
          <span>{post.section}</span>
          <time dateTime={post.date}>{post.dateLabel}</time>
        </div>
        <h3>{post.title}</h3>
        <p className="newspaper-card-lede">{post.lede}</p>
        {featured && <p>{post.body}</p>}
        {post.gallery?.length > 1 && (
          <div className="story-card-gallery" aria-label={`Bilder til ${post.title}`}>
            {post.gallery.slice(1).map((image, index) => (
              <img key={`${post.id}-gallery-${index}`} src={image} alt="" />
            ))}
          </div>
        )}
        {post.external && (
          <div className="newspaper-source-row">
            <span>{post.source}</span>
            {post.importanceScore ? <span>Score {post.importanceScore}</span> : null}
          </div>
        )}
        {post.editorialReason && (
          <p className="newspaper-editor-reason">AI-redaktør: {post.editorialReason}</p>
        )}
        {onRegisterRead && onRegisterFeedback && (
          <div className="article-feedback" aria-label={`Tilbakemelding for ${post.title}`}>
            <button type="button" onClick={() => onRegisterRead(post.id)}>👁️ {views} lest</button>
            <button type="button" onClick={() => onRegisterFeedback(post.id, 'up')}>👍 {itemFeedback.up || 0}</button>
            <button type="button" onClick={() => onRegisterFeedback(post.id, 'ok')}>● {itemFeedback.ok || 0}</button>
            <button type="button" onClick={() => onRegisterFeedback(post.id, 'down')}>👎 {itemFeedback.down || 0}</button>
          </div>
        )}
        {post.url && (
          <a className="newspaper-link" href={post.url} target="_blank" rel="noreferrer">
            Les saken hos {post.source || 'kilden'}
          </a>
        )}
        {post.internalUrl && (
          <a className="newspaper-link" href={post.internalUrl}>
            {post.linkLabel || 'Les mer'}
          </a>
        )}
        {onOpen && (
          <button type="button" className="newspaper-link newspaper-read-button" onClick={openArticle}>
            Les hele historien
          </button>
        )}
      </div>
    </article>
  );
};

const ArticleModal = ({ post, onClose }) => {
  useEffect(() => {
    if (!post) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

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
        <button type="button" className="article-modal-close" onClick={onClose} aria-label="Lukk artikkel">
          Lukk
        </button>
        <figure className="article-modal-hero">
          <img src={post.image} alt="" />
          {post.imageCredit && <figcaption>{post.imageCredit}</figcaption>}
        </figure>
        <div className="article-modal-content">
          <div className="newspaper-meta">
            <span>{post.section}</span>
            <time dateTime={post.date}>{post.dateLabel}</time>
          </div>
          <h2 id="article-modal-title">{post.title}</h2>
          <div className="article-modal-body">
            {paragraphs.map((paragraph, index) => (
              <p key={`${post.id}-paragraph-${index}`}>{paragraph}</p>
            ))}
          </div>
          {post.gallery?.length > 1 && (
            <div className="article-modal-gallery" aria-label={`Bilder til ${post.title}`}>
              {post.gallery.slice(1).map((image, index) => (
                <img key={`${post.id}-modal-gallery-${index}`} src={image} alt="" />
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
};

const SectionIntro = ({ kicker, title, children }) => (
  <div className="aktuelt-section-intro">
    <div>
      <div className="newspaper-kicker">{kicker}</div>
      <h2>{title}</h2>
    </div>
    {children && <p>{children}</p>}
  </div>
);

const VelNewsSection = ({ posts, stories = [] }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const cards = [
    ...posts.map((post) => ({ ...post, section: post.section === 'Aktiviteter' ? post.section : 'Kvamskogen Vel' })),
    ...stories.map(storyToAktueltPost),
  ];

  return (
    <section className="aktuelt-block" aria-labelledby="vel-news-title">
      <SectionIntro kicker="Fra Kvamskogen Vel" title="Nytte fra Kvamskogen Vel">
        Praktiske saker, planer og bakgrunnsstoff som er nyttig for hyttefolk og besøkende.
      </SectionIntro>
      <div className="aktuelt-card-grid">
        {cards.map((post) => (
          <NewsCard
            key={post.id}
            post={post}
            onOpen={post.internalUrl ? undefined : setSelectedPost}
          />
        ))}
      </div>
      <ArticleModal post={selectedPost} onClose={() => setSelectedPost(null)} />
    </section>
  );
};

const LOYPEVENN = {
  vippsNumber: '91705',
  bankgiro: '3530.07.08577',
  suggestedAmount: 600,
  goalAmount: 350000,
  raisedAmount: 150000,
  goalTitle: 'Ny bru over Røyro',
  donationUrl: '#/loypebidrag',
  qr: '/assets/loypevenn-vipps-qr.svg',
};

const formatKr = (value) => new Intl.NumberFormat('no-NO').format(Math.round(value));

const LoypevennSection = () => {
  const { goalAmount, raisedAmount, goalTitle, vippsNumber, bankgiro, suggestedAmount, donationUrl, qr } = LOYPEVENN;
  const pct = goalAmount > 0 ? Math.min(100, Math.round((raisedAmount / goalAmount) * 100)) : 0;
  const remaining = Math.max(0, goalAmount - raisedAmount);

  return (
    <section className="aktuelt-block loypevenn-block" aria-labelledby="loypevenn-title">
      <SectionIntro kicker="Bli løypevenn" title="Vær med og sikre broene og løypene">
        Preparerte løyper er et fellesgode alle nyter godt av, men bare en liten andel av hyttefolket er med og betaler. Et fast bidrag holder maskinene i drift og broene trygge.
      </SectionIntro>

      <div className="loypevenn-panel">
        <div className="loypevenn-progress">
          <div className="loypevenn-progress-head">
            <span className="loypevenn-goal-label">Innsamling · {goalTitle}</span>
            <span className="loypevenn-pct">{pct}%</span>
          </div>
          <div
            className="loypevenn-bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Innsamling til ${goalTitle}`}
          >
            <div className="loypevenn-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <dl className="loypevenn-figures">
            <div><dt>Sikret så langt</dt><dd>{formatKr(raisedAmount)} kr</dd></div>
            <div><dt>Mangler ennå</dt><dd>{formatKr(remaining)} kr</dd></div>
            <div><dt>Budsjett</dt><dd>{formatKr(goalAmount)} kr</dd></div>
          </dl>
          <p className="loypevenn-note">
            150 000 kr er sikret fra Sparebankstiftinga Sparebanken Norge. Resten må fjellet selv dra i land — og det står minst én bro til på vent.
          </p>
        </div>

        <aside className="loypevenn-pay" aria-label="Slik bidrar du">
          <div className="loypevenn-qr">
            <img src={qr} alt="QR-kode til løypebidrag på Kvamskogen" width="150" height="150" />
            <span>Skann for å bidra</span>
          </div>
          <dl className="loypevenn-pay-figures">
            <div><dt>Vipps</dt><dd>{vippsNumber}</dd></div>
            <div><dt>Bankgiro</dt><dd>{bankgiro}</dd></div>
            <div><dt>Foreslått bidrag</dt><dd>{formatKr(suggestedAmount)} kr</dd></div>
          </dl>
          <a className="loypevenn-cta" href={donationUrl}>Bli løypevenn</a>
        </aside>
      </div>
    </section>
  );
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

const FreshMediaNewsSection = ({ posts, status }) => {
  const [lead, ...rest] = posts;

  return (
    <section className="aktuelt-block" aria-labelledby="media-news-title">
      <SectionIntro kicker="I mediene" title="Ferske nyheter om Kvamskogen">
        Saker fra eksterne kilder vises med tydelig avsender og lenke videre. Bare saker fra de siste {FRESH_MEDIA_NEWS_DAYS} dagene kan få stor plass her.
      </SectionIntro>
      <MediaNewsStatus status={status} count={posts.length} />
      {lead ? (
        <div className="newspaper-grid aktuelt-media-grid">
          <NewsCard post={lead} featured />
          {rest.length > 0 && (
            <aside className="newspaper-sidebar" aria-label="Flere ferske mediesaker">
              <div className="newspaper-sidebar-title">Flere ferske saker</div>
              {rest.map((post) => <NewsCard key={post.id} post={post} />)}
            </aside>
          )}
        </div>
      ) : (
        <p className="aktuelt-empty">Ingen ferske eksterne saker er klare akkurat nå.</p>
      )}
    </section>
  );
};

const PreviousMediaNewsSection = ({ posts }) => {
  if (!posts.length) return null;

  return (
    <section className="aktuelt-block previous-news-block" aria-labelledby="previous-media-title">
      <SectionIntro kicker="Tidligere nyheter" title="Eldre saker fra mediene">
        Nyheter som er mer enn {FRESH_MEDIA_NEWS_DAYS} dager gamle arkiveres her, slik at de fortsatt er tilgjengelige uten å dominere forsiden.
      </SectionIntro>
      <div className="previous-news-list">
        {posts.map((post) => (
          <article key={post.id} className="previous-news-item">
            <div className="newspaper-meta">
              <span>{post.source}</span>
              <time dateTime={post.date}>{post.dateLabel}</time>
            </div>
            <h3>{post.title}</h3>
            <p>{post.lede}</p>
            {post.url && <a href={post.url} target="_blank" rel="noreferrer">Les hos {post.source}</a>}
          </article>
        ))}
      </div>
    </section>
  );
};

const ExplainerCard = ({ item }) => (
  <article className="newspaper-explainer-card">
    <span>{item.label}</span>
    <h3>{item.title}</h3>
    <p>{item.text}</p>
  </article>
);

const ActivityPulse = ({ digest }) => (
  <section className="newspaper-pulse" aria-labelledby="activity-pulse-title">
    <div>
      <div className="newspaper-kicker">Aktivitetspuls</div>
      <h2 id="activity-pulse-title">Dette skjer på Kvamskogen nå</h2>
      <p>
        Aktuelt kan automatisk hente antall aktiviteter, nyeste innsendte aktivitet og den aktiviteten flest har meldt seg på.
      </p>
      {digest.newest && (
        <p className="newspaper-latest-activity">
          Nyeste aktivitet: <strong>{digest.newest.title}</strong> ({formatActivityDate(digest.newest.date)}).
        </p>
      )}
      <span className="newspaper-data-source">Datakilde: {digest.sourceLabel}</span>
    </div>
    <div className="pulse-stats" aria-label="Aktivitetsstatistikk">
      <article>
        <span>{digest.count}</span>
        <p>kommende aktiviteter</p>
      </article>
      <article>
        <span>{digest.popular?.signup_count || 0}</span>
        <p>påmeldte på mest populære aktivitet</p>
      </article>
      <article>
        <span>{digest.upcoming.length}</span>
        <p>førstkommende løftes i nyhetsflyten</p>
      </article>
    </div>
    <div className="pulse-activity-list">
      {digest.upcoming.map((activity) => (
        <article key={activity.id} className="pulse-activity-card">
          <span>{activity.type}</span>
          <h3>{activity.title}</h3>
          <p>{formatActivityDate(activity.date)}{activity.time ? ` kl. ${activity.time}` : ''} · {activity.signup_count || 0} påmeldte</p>
        </article>
      ))}
    </div>
  </section>
);


const MediaNewsStatus = ({ status, count }) => {
  if (status === 'ready') {
    return (
      <aside className="newspaper-media-status" aria-label="Status for eksterne mediesaker">
        <span>Mediesøk er aktivt</span>
        <p>{count} ferske eksterne saker er klare for visning. Eldre saker flyttes til tidligere nyheter.</p>
      </aside>
    );
  }

  if (status === 'loading') return null;

  const message = status === 'missing'
    ? 'Kjør python kvamskogen_news_search.py --days 90 for å lage /data/kvamskogen_news.json.'
    : 'Ingen eksterne mediesaker er klare akkurat nå. Siden viser faste saker til nyhetsjobben har skrevet JSON.';

  return (
    <aside className="newspaper-media-status" aria-label="Status for eksterne mediesaker">
      <span>Mediesøk venter på data</span>
      <p>{message}</p>
    </aside>
  );
};

const AiEditorPlan = ({ status }) => (
  <section className="newspaper-ai-editor" aria-labelledby="ai-editor-title">
    <div>
      <div className="newspaper-kicker">AI-redaktør</div>
      <h2 id="ai-editor-title">AI-redaktøren velger og rullerer saker</h2>
      <p>
        Nyhetsjobben kan nå skrive en egen redaktørfil som løfter hovedsak, prioriterer støttesaker og gir dagens forside litt variasjon. Status: {status === 'ready' ? 'redaktørfil er lastet' : 'venter på redaktørfil eller bruker fallback'}.
      </p>
    </div>
    <ol className="ai-editor-steps">
      <li><strong>Innhent</strong><span>Yr, lokale nyhetslenker, aktivitetsforslag og admin-saker.</span></li>
      <li><strong>Vinkle</strong><span>Lag værbit, solvarsel, helgevarsel eller fersk nyhet etter tydelige regler.</span></li>
      <li><strong>Kontroller</strong><span>Vis kilder, marker usikkerhet og la en person publisere eller avvise.</span></li>
    </ol>
  </section>
);

const EditorDesk = ({ editorPlan }) => {
  if (!editorPlan?.lead_story) return null;
  const leadFingerprint = storyFingerprint(editorPlan.lead_story);
  const leadText = `${editorPlan.lead_story.title || ''} ${editorPlan.lead_story.angle || ''}`.toLowerCase();
  const featured = uniqueByStory(editorPlan.featured_stories || [])
    .filter((story) => {
      const key = storyFingerprint(story);
      return key && key !== leadFingerprint && !leadText.includes(key);
    });
  const generatedAt = editorPlan.generated_at
    ? new Intl.DateTimeFormat('no-NO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(editorPlan.generated_at))
    : 'nylig';

  return (
    <section className="newspaper-editor-desk" aria-labelledby="editor-desk-title">
      <div className="editor-desk-lead">
        <div className="newspaper-kicker">Redaktørens hovedsak</div>
        <h2 id="editor-desk-title">{editorPlan.lead_story.title}</h2>
        <p className="newspaper-lede">{editorPlan.lead_story.angle}</p>
        <p>{editorPlan.lead_story.reason}</p>
        <div className="newspaper-source-row">
          <span>{editorPlan.lead_story.source}</span>
          <span>{editorPlan.source === 'openai' ? 'AI-vurdert' : 'Fallback'}</span>
          <span>Oppdatert {generatedAt}</span>
        </div>
        {editorPlan.lead_story.url && (
          <a className="newspaper-link" href={editorPlan.lead_story.url} target="_blank" rel="noreferrer">
            Les hovedsaken hos {editorPlan.lead_story.source}
          </a>
        )}
      </div>
      {featured.length > 0 && (
        <div className="editor-desk-list">
          <div className="newspaper-sidebar-title">Bør rullere videre</div>
          {featured.map((story) => (
            <article key={story.url || story.title} className="editor-desk-item">
              <div className="newspaper-meta">
                <span>{story.source}</span>
                <span>Score {story.priority_score}</span>
              </div>
              <h3>{story.title}</h3>
              <p>{story.angle}</p>
              {story.url && <a href={story.url} target="_blank" rel="noreferrer">Gå til kilden</a>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

const ReadingPulse = ({ articles, onRegisterRead, onRegisterFeedback }) => (
  <section className="newspaper-popular" aria-labelledby="popular-title">
    <div className="newspaper-popular-header">
      <div>
        <div className="newspaper-kicker">Mest lest · automatisk prioritering</div>
        <h2 id="popular-title">Saker som mange leser, får mer plass</h2>
      </div>
      <p>
        I denne prototypen kombineres redaksjonell viktighet med lokale visninger og enkel tommelrespons i nettleseren. I drift bør samme mekanikk lagres i Supabase, med spamvern og moderering, slik at populære saker kan løftes for alle.
      </p>
    </div>
    <div className="popular-list">
      {articles.map((article, index) => (
        <article key={article.id} className="popular-card">
          <span className="popular-rank">{index + 1}</span>
          <div>
            <div className="newspaper-meta">
              <span>{article.section}</span>
              <span>{article.views} visninger</span>
            </div>
            <h3>{article.title}</h3>
            <p>{article.lede}</p>
            <div className="popular-actions">
              <button type="button" className="popular-read-button" onClick={() => onRegisterRead(article.id)}>
                Registrer lest
              </button>
              <button type="button" className="popular-read-button" onClick={() => onRegisterFeedback(article.id, 'up')}>
                👍 {article.feedback.up || 0}
              </button>
              <button type="button" className="popular-read-button" onClick={() => onRegisterFeedback(article.id, 'ok')}>
                Ok {article.feedback.ok || 0}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  </section>
);


const NewsSortControls = ({ sortBy, onSortChange }) => (
  <div className="newspaper-sortbar">
    <div>
      <div className="newspaper-kicker">Styr nyhetsflyten</div>
      <h2>Sorter sakene slik leseren ønsker</h2>
      <p>
        Dato bruker publiseringstidspunktet fra originalkilden når det finnes. Mest lest og best likt er lokale demotall nå, men kan kobles mot Supabase for reelle tall på tvers av brukere.
      </p>
    </div>
    <label>
      Sorter etter
      <select value={sortBy} onChange={(event) => onSortChange(event.target.value)}>
        {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  </div>
);

const AktueltLegacy = ({ weather, activities = [], supabaseConfigured = false }) => {
  const showWeatherLead = shouldFeatureWeatherLead(weather);
  const forecastPost = makeForecastStory(weather?.forecast);
  const rotatedAdminPosts = rotateByDay(ADMIN_SAKER);
  const activityDigest = pickActivityDigest(activities, supabaseConfigured);
  const activityArticle = makeActivityArticle(activityDigest);
  const { mediaNews, mediaStatus } = useMediaNews();
  const { editorPlan, editorStatus } = useAiEditorPlan();
  const [sortBy, setSortBy] = useState('recommended');
  const { reads, registerRead } = useArticleReads();
  const { feedback, registerFeedback } = useArticleFeedback();
  const fixedPosts = forecastPost ? [forecastPost, activityArticle, ...rotatedAdminPosts] : [activityArticle, ...rotatedAdminPosts];
  const allPosts = sortPostsForNewsstand(uniqueByStory(applyEditorialPlan([...fixedPosts, ...mediaNews], editorPlan)), sortBy, reads, feedback);
  const [firstPost, ...restPosts] = allPosts;
  const readingList = buildReadingList({ weather, posts: allPosts, reads, feedback });

  return (
    <section className="section newspaper-section">
      <div className="container newspaper-container">
        <header className="newspaper-masthead">
          <div className="newspaper-masthead-top">
            <span>Visit Kvamskogen</span>
            <span>Aktuelt · levende forside</span>
            <span>{new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <h1>Aktuelt fra Kvamskogen</h1>
          <p>
            Lokale værvarsler, webkamera, ferske mediesaker og aktivitetspuls samlet som en lett nettavis for Kvamskogen.
          </p>
        </header>

        {showWeatherLead && <LeadStory weather={weather} />}

        <EditorDesk editorPlan={editorPlan} />

        <AiEditorPlan status={editorStatus} />

        <ActivityPulse digest={activityDigest} />

        <MediaNewsStatus status={mediaStatus} count={mediaNews.length} />

        <ReadingPulse articles={readingList} onRegisterRead={registerRead} onRegisterFeedback={registerFeedback} />

        <NewsSortControls sortBy={sortBy} onSortChange={setSortBy} />

        <div className="newspaper-grid">
          {firstPost && (
            <NewsCard
              post={firstPost}
              featured
              reads={reads}
              feedback={feedback}
              onRegisterRead={registerRead}
              onRegisterFeedback={registerFeedback}
            />
          )}
          <aside className="newspaper-sidebar" aria-label="Korte aktuelle saker">
            <div className="newspaper-sidebar-title">Dagens smånotiser</div>
            {restPosts.map((post) => (
              <NewsCard
                key={post.id}
                post={post}
                reads={reads}
                feedback={feedback}
                onRegisterRead={registerRead}
                onRegisterFeedback={registerFeedback}
              />
            ))}
          </aside>
        </div>

        <section className="newspaper-explainer" aria-labelledby="aktuelt-ai-plan">
          <div>
            <div className="newspaper-kicker">Forslag til neste fase</div>
            <h2 id="aktuelt-ai-plan">Slik kan siden bli automatisk uten å miste redaktørkontroll</h2>
            <p>
              Første versjon kan bygges trygt med Supabase for admin-saker, en serverjobb som henter vær og nyhetssignaler, og en AI-modell som skriver korte, kildebaserte utkast. Administrator publiserer eller overstyrer før det havner på forsiden.
            </p>
          </div>
          <div className="newspaper-explainer-grid">
            {NYHETSIDEER.map((item) => <ExplainerCard key={item.id} item={item} />)}
          </div>
        </section>
      </div>
    </section>
  );
};

const Aktuelt = ({ weather, activities = [], supabaseConfigured = false }) => {
  const rotatedAdminPosts = rotateByDay(ADMIN_SAKER);
  const activityDigest = pickActivityDigest(activities, supabaseConfigured);
  const { mediaNews, mediaStatus } = useMediaNews();
  const localStories = useLocalStories();
  const mediaSections = splitMediaNewsByAge(mediaNews);

  return (
    <section className="section newspaper-section">
      <div className="container newspaper-container">
        <header className="newspaper-masthead">
          <div className="newspaper-masthead-top">
            <span>Visit Kvamskogen</span>
            <span>Aktuelt fra Kvamskogen</span>
            <span>{new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <h1>Aktuelt fra Kvamskogen</h1>
          <p>
            Vær og føreforhold, oppdateringer fra Kvamskogen Vel, mediesaker og aktiviteter samlet på ett rolig sted.
          </p>
        </header>

        <section className="aktuelt-block" aria-labelledby="weather-current-title">
          <SectionIntro kicker="Vær og føreforhold" title="Slik ser det ut nå">
            Direkte webkamera og værdata gir et raskt bilde av forholdene før turen opp.
          </SectionIntro>
          <LeadStory weather={weather} />
        </section>

        <VelNewsSection posts={rotatedAdminPosts} stories={localStories} />

        <LoypevennSection />

        <FreshMediaNewsSection posts={mediaSections.fresh} status={mediaStatus} />

        <PreviousMediaNewsSection posts={mediaSections.previous} />

        <ActivityPulse digest={activityDigest} />
      </div>
    </section>
  );
};

export default Aktuelt;
