import { BY_SEASON } from './hero-images.generated.js';
import { seasonFor } from './season.js';

// Velger et tilfeldig bilde fra sesongen til datoen. Faller tilbake til
// alle bilder hvis sesongen er tom.
export const pickHeroImage = (date = new Date()) => {
  const season = seasonFor(date);
  const pool = BY_SEASON[season]?.length
    ? { season, names: BY_SEASON[season] }
    : { season, names: Object.values(BY_SEASON).flat() };
  const name = pool.names[Math.floor(Math.random() * pool.names.length)];
  return { name, season: pool.season };
};

export const heroSources = ({ name, season }) => ({
  avif: `/assets/photos/${season}/${name}.avif`,
  webp: `/assets/photos/${season}/${name}.webp`,
});
