import { BY_SEASON } from './hero-images.generated.js';
import { seasonFor } from './season.js';

// Kuratert utvalg av hero-kandidater per sesong. Bilder som ikke står her
// vises ikke som hero, men kan fortsatt brukes andre steder (SeasonCollage,
// ActivityGrid via direkte sti-referanse). Tom liste = bruk alle bilder fra
// BY_SEASON.
const HERO_PICKS = {
  winter: [],
  spring: [],
  summer: ['modal', 'hardangerfjorden', 'fjord', 'setre', 'fjell', 'grusvei-stol'],
  autumn: [],
};

// Velger et tilfeldig bilde fra sesongen til datoen. Faller tilbake til
// alle bilder hvis sesongen er tom.
export const pickHeroImage = (date = new Date()) => {
  const season = seasonFor(date);
  const picks = HERO_PICKS[season];
  const pool = picks?.length
    ? picks
    : (BY_SEASON[season]?.length ? BY_SEASON[season] : Object.values(BY_SEASON).flat());
  const name = pool[Math.floor(Math.random() * pool.length)];
  return { name, season };
};

export const heroSources = ({ name, season }) => ({
  avif: `/assets/photos/${season}/${name}.avif`,
  webp: `/assets/photos/${season}/${name}.webp`,
});
