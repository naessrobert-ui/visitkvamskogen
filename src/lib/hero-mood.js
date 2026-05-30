// Klassifiser kommende sommer-vær i én av tre stemninger basert på YR timeseries.
// Brukes til å variere lede-teksten i Hero etter forventet vær de neste døgnene.

export function classifySummerMood(timeseries, days = 5) {
  if (!Array.isArray(timeseries) || !timeseries.length) return 'mixed';

  const now = new Date();
  const horizon = new Date(now.getTime() + days * 86400 * 1000);

  let sunHours = 0;
  let rainHours = 0;
  let daytimeHours = 0;
  let rainTotal = 0;

  for (const it of timeseries) {
    const t = new Date(it.time);
    if (!Number.isFinite(t.getTime())) continue;
    if (t < now || t > horizon) continue;
    const hr = t.getHours();
    if (hr < 6 || hr > 21) continue;
    daytimeHours += 1;

    const data = it.data || {};
    const symBlock = data.next_1_hours || data.next_6_hours || data.next_12_hours || {};
    const sym = String(((symBlock.summary || {}).symbol_code) || '').toLowerCase();
    const rain = Number(((symBlock.details || {}).precipitation_amount) || 0);
    rainTotal += rain;

    if (rain >= 0.2 || sym.includes('rain') || sym.includes('sleet') || sym.includes('thunder')) {
      rainHours += 1;
    } else if (sym.includes('clearsky') || sym.includes('fair')) {
      sunHours += 1;
    }
  }

  if (!daytimeHours) return 'mixed';
  const sunRatio = sunHours / daytimeHours;
  const rainRatio = rainHours / daytimeHours;

  if (sunRatio >= 0.5 && rainTotal < 10) return 'sun';
  if (rainRatio >= 0.4 || rainTotal >= 25) return 'rain';
  return 'mixed';
}
