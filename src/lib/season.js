// Sesong utleia frå månad. Tilpassa Kvamskogen — mai er sommarstart
// (snøen er smelta i dalen, blomane spring ut). Mars er framleis full
// skisesong oppi fjellet, så han ligg under 'spring' med vårski-vinkel.

const BY_MONTH = {
  1:'winter', 2:'winter', 3:'spring', 4:'spring',
  5:'summer', 6:'summer', 7:'summer', 8:'summer',
  9:'autumn', 10:'autumn', 11:'winter', 12:'winter',
};

export const seasonFor = (date = new Date()) => BY_MONTH[date.getMonth() + 1];
