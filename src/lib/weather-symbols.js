export function weatherEmoji(symbol) {
  const s = String(symbol || '').toLowerCase();
  const isNight = s.includes('night') || s.includes('polartwilight');
  if (s.includes('thunder')) return '⛈️';
  if (s.includes('sleet')) return '🌨️';
  if (s.includes('snow')) return '❄️';
  if (s.includes('rainshowers') || s.includes('heavyrain') || s.includes('rain')) return '🌧️';
  if (s.includes('fog')) return '🌫️';
  if (s.includes('partlycloudy')) return isNight ? '🌙' : '⛅';
  if (s.includes('cloudy')) return '☁️';
  if (s.includes('clearsky') || s.includes('fair')) return isNight ? '🌙' : '☀️';
  if (isNight) return '🌙';
  return '🌤️';
}

export function windStrengthIcon(speed) {
  const s = Number(speed || 0);
  if (s >= 12) return '●';
  if (s >= 7) return '◍';
  return '◌';
}

export function windArrow(deg) {
  if (deg === null || deg === undefined || Number.isNaN(Number(deg))) return '•';
  const dirs = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
  return dirs[Math.round((Number(deg) % 360) / 45) % 8];
}

// Bucket for "verdict strip" (sol / lettskyet / overskyet / nedbør / natt)
export function weatherStripBucket(hour) {
  const d = new Date(hour.time);
  const h = Number(d.toLocaleString('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false }).slice(0, 2));
  if (h < 6 || h >= 22) return 'night';
  const rain = Number(hour.rain || 0);
  const s = String(hour.symbol || '').toLowerCase();
  if (rain >= 0.2 || s.includes('rain') || s.includes('sleet') || s.includes('snow')) return 'rain';
  if (s.includes('clearsky') || s.includes('fair')) return 'sun';
  if (s.includes('partlycloudy')) return 'partly';
  return 'cloudy';
}

export function weatherStripLabel(bucket) {
  if (bucket === 'sun') return 'Sol';
  if (bucket === 'partly') return 'Lettskyet';
  if (bucket === 'cloudy') return 'Overskyet';
  if (bucket === 'rain') return 'Nedbør';
  return 'Natt';
}

export function verdictBucket(activity, timeIso) {
  const a = String(activity || '').toLowerCase();
  const d = new Date(timeIso);
  const h = Number(d.toLocaleString('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false }).slice(0, 2));
  if (h < 6 || h >= 22) return 'night';
  if (a.includes('bra for') || a.includes('fint') || a.includes('flott')) return 'good';
  if (a.includes('krevende') || a.includes('storm') || a.includes('kraftig') || a.includes('unngå')) return 'bad';
  return 'ok';
}

// Velg CSS-bakgrunnsklasse for en tidsblokk basert på symbol + nedbør.
// Terskler: 5+ mm = mye nedbør (mørk grå), 1-5 mm = moderat, 0.3-1 mm = lite (lys grå).
// Ellers stryres farge av symbol: sol = gul, partlycloudy = mellom, overskyet/tåke = nøytral.
export function blokkBakgrunn(blokk) {
  if (!blokk) return 'vf-bg-empty';
  const rain = Number(blokk.rain || 0);
  if (rain >= 5) return 'vf-bg-rain-heavy';
  if (rain >= 1) return 'vf-bg-rain-medium';
  if (rain >= 0.3) return 'vf-bg-rain-light';
  const s = String(blokk.symbol || '').toLowerCase();
  if (s.includes('thunder')) return 'vf-bg-rain-medium';
  if (s.includes('snow') || s.includes('sleet') || s.includes('rain')) return 'vf-bg-rain-light';
  if (s.includes('fog')) return 'vf-bg-cloudy';
  if (s.includes('clearsky') || s.includes('fair')) return 'vf-bg-sun';
  if (s.includes('partlycloudy')) return 'vf-bg-partly';
  return 'vf-bg-cloudy';
}

export function overallVerdict(hourly) {
  const day = (hourly || []).filter((h) => {
    if (h.is_history) return false;
    const d = new Date(h.time);
    const hr = Number(d.toLocaleString('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false }).slice(0, 2));
    return hr >= 6 && hr < 22;
  });
  const buckets = { good: 0, ok: 0, bad: 0 };
  day.forEach((h) => {
    const b = verdictBucket(h.activity, h.time);
    if (b === 'good') buckets.good++;
    else if (b === 'bad') buckets.bad++;
    else if (b === 'ok') buckets.ok++;
  });
  const total = buckets.good + buckets.ok + buckets.bad || 1;
  if (buckets.bad / total > 0.3) return { cls: 'bad', icon: '⚠️', text: 'Krevende forhold – vurder inne' };
  if (buckets.good / total > 0.4) return { cls: 'good', icon: '☀️', text: 'Bra for uteaktivitet' };
  return { cls: 'warn', icon: '⛅', text: 'Greit utevær – følg med' };
}
