// Mapper måned (1-12) til en liste av kandidatbilder for hero.
// Filnavna referer til public/assets/photos/<navn>.{avif,webp,jpg}.
// Et bilde kan stå i fleire månader — det gjev oss fleksibilitet utan å duplisere filer.

const BY_MONTH = {
  1:  ['furedalen-snofall-natt', 'hytte-snodd-ned', 'modalen-djup-sno', 'utsikt-vinter', 'loypemaskin-natt'],
  2:  ['saata-nysno-toppturarar', 'tveitakvitingen-skispor', 'modalen-vinter', 'preparerte-loyper', 'vinter-skispor'],
  3:  ['saata-skitur', 'topptur-1300-skylag', 'preparerte-loyper', 'tveitakvitingen-skispor'],
  4:  ['varski-folgefonna', 'lavlandsloypa-vaar', 'saata-skitur', 'topptur-1300-skylag'],
  5:  ['lavlandsloypa-vaar', 'grusvei-stol', 'hardangerfjorden', 'utsikt-fjord'],
  6:  ['tveitakvitingen-sommar', 'hardangerfjorden', 'utsikt-fjord', 'grusvei-stol'],
  7:  ['saata-sommar', 'sommar-fjell-isflak', 'tveitakvitingen-sommar', 'tveitakvitingen-varde', 'hardangerfjorden'],
  8:  ['sommar-fjell-isflak', 'saata-sommar', 'tveitakvitingen-varde', 'utsikt-fjord'],
  9:  ['kjelen-haust', 'tveitakvitingen-varde', 'grusvei-stol', 'modalen-stol'],
  10: ['kjelen-haust', 'modalen-stol', 'utsikt-fjord'],
  11: ['furedalen-snofall-natt', 'utsikt-vinter', 'hytte-snodd-ned'],
  12: ['furedalen-snofall-natt', 'loypemaskin-natt', 'modalen-djup-sno', 'hytte-snodd-ned'],
};

// Alle bilder samla — brukast som fallback om ein månad er tom.
const ALL = Array.from(new Set(Object.values(BY_MONTH).flat()));

export const pickHeroImage = (date = new Date()) => {
  const month = date.getMonth() + 1;
  const pool = BY_MONTH[month]?.length ? BY_MONTH[month] : ALL;
  return pool[Math.floor(Math.random() * pool.length)];
};

export const heroSources = (name) => ({
  avif: `/assets/photos/${name}.avif`,
  webp: `/assets/photos/${name}.webp`,
  jpg:  `/assets/photos/${name}.jpg`,
});
