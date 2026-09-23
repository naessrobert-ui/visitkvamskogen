import { turBySlug } from '../data/turer.js';

const SITE = 'Kvamskogen';

export const PAGES = {
  home: {
    path: '/',
    title: 'Kvamskogen — fjell, hytter og turløyper utenfor Bergen',
    description: 'Alt om Kvamskogen: turforslag, skiløyper, vær, webkamera, aktiviteter og lokalt marked for hyttefolk og besøkende mellom Bergen og Hardanger.',
  },
  aktuelt: {
    path: '/aktuelt',
    title: `Aktuelt fra ${SITE}`,
    description: 'Siste nytt fra Kvamskogen: nyheter, føremeldinger, lokale saker og hva som skjer på fjellet akkurat nå.',
  },
  aktiviteter: {
    path: '/aktiviteter',
    title: `Aktiviteter på ${SITE}`,
    description: 'Hva skjer på Kvamskogen? Turer, markeder, kurs og familiedager — og legg inn din egen aktivitet.',
  },
  turforslag: {
    path: '/turforslag',
    title: `Turforslag på ${SITE}`,
    description: 'Fjellturer, utsiktspunkt og korte turer på Kvamskogen — med lengde, høydemeter og tidsbruk. Foreslå gjerne din egen favorittur.',
  },
  vinter: {
    path: '/vinter',
    title: `Vinter på ${SITE} — skiløyper og skisentre`,
    description: 'Vinterguide for Kvamskogen: preparerte langrennsløyper, alpinanlegg i Eikedalen og Furedalen, og tips før skituren.',
  },
  vaer: {
    path: '/vaer',
    title: `Vær på ${SITE} — varsel time for time`,
    description: 'Værvarsel for Kvamskogen fra MET/yr.no: temperatur, nedbør og vind time for time, med turvurdering og beste værvindu.',
  },
  webkamera: {
    path: '/webkamera',
    title: `Webkamera på ${SITE}`,
    description: 'Se hvordan det ser ut på Kvamskogen nå: ferske fjellkamerabilder og direktestrømmer fra Eikedalen og Furedalen.',
  },
  marked: {
    path: '/marked',
    title: `${SITE} Marked — kjøp, selg og lei lokalt`,
    description: 'Lokalt marked for Kvamskogen: kjøp, selg, lei ut eller gi bort utstyr, ved og tjenester blant hyttefolk.',
  },
  praktisk: {
    path: '/praktisk',
    title: `Praktisk informasjon om ${SITE}`,
    description: 'Slik kommer du til Kvamskogen med bil, buss eller fly, hvor du kan parkere, og hvem du kontakter om hva.',
  },
  tilbud: {
    path: '/tilbud',
    title: 'Kvamskogen Vel',
    description: 'Kvamskogen Vel driver løypekjøring, dugnad og arbeid med plansaker på Kvamskogen. Bli medlem og få medlemsfordeler.',
  },
  lavlandsloypen: {
    path: '/lavlandsloypen',
    title: `Lavlandsløypen — kart og rute på ${SITE}`,
    description: 'Kart over Lavlandsløypen: grusvei og lett sti på tvers av Kvamskogen, fin for barnefamilier, sykkel og rolige turer hele året.',
  },
  skiloyper: {
    path: '/skiloyper',
    title: `Preparerte skiløyper på ${SITE}`,
    description: 'Se hvilke langrennsløyper på Kvamskogen som er kjørt akkurat nå, og når de sist ble preparert.',
  },
  skisentre: {
    path: '/skisentre',
    title: `Skisentre på ${SITE} — Eikedalen og Furedalen`,
    description: 'To skisentre, to ulike skidager: oversikt over Eikedalen Skisenter og Furedalen Alpin på Kvamskogen.',
  },
  styret: {
    path: '/styret',
    title: 'Styret i Kvamskogen Vel',
    description: 'Hvem sitter i styret i Kvamskogen Vel, og hvordan du tar kontakt.',
  },
  medlemsfordeler: {
    path: '/medlemsfordeler',
    title: 'Medlemsfordeler — Kvamskogen Vel',
    description: 'Rabatter og fordeler for medlemmer av Kvamskogen Vel hos lokale bedrifter.',
  },
  overnatting: {
    path: '/overnatting',
    title: `Overnatting på ${SITE}`,
    description: 'Overnattingssteder på og rundt Kvamskogen: hytteutleie, hotell og camping.',
  },
  hardanger: {
    path: '/hardanger',
    title: 'Oppdag Hardanger fra Kvamskogen',
    description: 'Utflukter fra Kvamskogen ned til Hardanger: fjord, fruktbygder, fosser og kultur i nærheten.',
  },
  naeringslag: {
    path: '/naeringslag',
    title: 'Kvamskogen Næringslag',
    description: 'Kvamskogen Næringslag samler lokale bedrifter og finansierer løypekjøring og fellestiltak på Kvamskogen.',
  },
  loypebidrag: {
    path: '/loypebidrag',
    title: `Støtt løypekjøringen på ${SITE}`,
    description: 'Løypekjøringen på Kvamskogen drives på dugnad og gikk med underskudd. Bli løypevenn og bidra med Vipps.',
  },
  plansaker: {
    path: '/plansaker',
    title: `Plansaker og høringer — ${SITE}`,
    description: 'Innspill til kommunedelplan for Kvamskogen og andre plansaker og høringer som angår hyttefolk.',
  },
  medlemsmote: {
    path: '/medlemsmote',
    title: 'Medlemsmøte i Kvamskogen Vel 24. oktober',
    description: 'Medlemsmøte i Kvamskogen Vel lørdag 24. oktober kl. 16–18 i Eikedalen. Program, påmelding og innspill til hva Vel\'et skal jobbe med.',
  },
  'historie-admin': {
    path: '/historie-admin',
    title: `Legg inn historie — ${SITE}`,
    description: 'Intern side for å publisere historier.',
    noindex: true,
  },
};

// Gamle hash-nøkler (#/activities osv.) som ikke lenger er egne sidenavn.
const LEGACY_ALIASES = {
  activities: 'aktiviteter',
  weather: 'vaer',
  trails: 'turforslag',
};

const PATH_TO_KEY = new Map(Object.entries(PAGES).map(([key, page]) => [page.path, key]));

export const pathFor = (key, param) => {
  if (key === 'tur' && param) return `/turforslag/${param}`;
  const resolved = LEGACY_ALIASES[key] || key;
  return PAGES[resolved]?.path || '/';
};

export const routeFromPath = (pathname) => {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  const turMatch = clean.match(/^\/turforslag\/([^/]+)$/);
  if (turMatch) {
    const slug = decodeURIComponent(turMatch[1]);
    return turBySlug(slug) ? { key: 'tur', param: slug } : { key: 'ikke-funnet' };
  }
  const key = PATH_TO_KEY.get(clean);
  return key ? { key } : { key: 'ikke-funnet' };
};

export const metaFor = ({ key, param }) => {
  if (key === 'tur') {
    const tur = turBySlug(param);
    return {
      title: `${tur.title} — turforslag på ${SITE}`,
      description: tur.metaDescription || tur.text,
    };
  }
  if (key === 'ikke-funnet') {
    return {
      title: `Fant ikke siden — ${SITE}`,
      description: 'Siden finnes ikke. Gå til forsiden for turforslag, vær og webkamera fra Kvamskogen.',
      noindex: true,
    };
  }
  return PAGES[key] || { ...PAGES.home, noindex: true };
};

// Bare «#/…» regnes som gammel rute. Supabase-innlogging (#access_token=…,
// #error_description=…) og ankere som #turene blir derfor ikke rørt.
export const legacyHashTarget = (location) => {
  if (location.pathname !== '/' && location.pathname !== '/index.html') return null;
  const match = (location.hash || '').match(/^#\/([a-z0-9-]*)\/?$/i);
  if (!match) return null;
  const key = match[1].toLowerCase();
  if (key && !PAGES[key] && !LEGACY_ALIASES[key]) return null;
  return `${pathFor(key || 'home')}${location.search}`;
};

export const redirectLegacyHash = () => {
  const target = legacyHashTarget(window.location);
  if (target) window.history.replaceState(null, '', target);
};

