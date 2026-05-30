// Sesong utledet fra måned. Tilpasset Kvamskogen — mai er sommerstart
// (snøen er smeltet i dalen, blomstene spretter ut). Mars er fortsatt full
// skisesong oppe i fjellet, så den ligger under 'spring' med vårski-vinkel.

const BY_MONTH = {
  1:'winter', 2:'winter', 3:'spring', 4:'spring',
  5:'summer', 6:'summer', 7:'summer', 8:'summer',
  9:'autumn', 10:'autumn', 11:'winter', 12:'winter',
};

export const seasonFor = (date = new Date()) => BY_MONTH[date.getMonth() + 1];
