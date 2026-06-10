// Værdatalag — kaller YR (api.met.no) og Open-Meteo direkte fra nettleseren.
// Portering av aktivt-varsel-logikken fra prisanalyse/scripts/ver_routes.py.

const YR_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/complete';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

const OSLO_TZ = 'Europe/Oslo';

// ---------- Tidshjelpere (lokal Oslo-tid) ----------
const osloPartsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: OSLO_TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

function osloParts(date) {
  const parts = osloPartsFmt.formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value; return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '0' : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    iso: `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}:${parts.second}`,
  };
}

function osloHour(date) {
  return osloParts(date).hour;
}

function osloDateKey(date) {
  const p = osloParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

// Returner Date som representerer midnatt lokalt Oslo for ymd, som UTC-timestamp.
// Brukes for å finne dagens 00:00 og 24:00 i lokal tid.
function osloMidnightUTC(date) {
  const p = osloParts(date);
  // Vi vil finne et UTC-tidspunkt slik at osloHour=0, minute=0 for den lokale datoen.
  // Enkel approks: bygg et Date og juster til midnatt.
  // Lag en kandidat ved å bruke ISO-streng som om det var UTC, deretter juster.
  const candidate = new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0));
  // Finn forskjellen mellom candidate vist i Oslo-tid og 00:00.
  const cp = osloParts(candidate);
  const hourDiff = cp.hour + cp.minute / 60 + cp.second / 3600;
  // Hvis Oslo viser f.eks. 02:00, juster candidate baklengs 2 timer.
  return new Date(candidate.getTime() - hourDiff * 3600 * 1000);
}

function startOfTodayOslo() {
  return osloMidnightUTC(new Date());
}

function addHours(d, h) {
  return new Date(d.getTime() + h * 3600 * 1000);
}

function addDays(d, days) {
  return new Date(d.getTime() + days * 86400 * 1000);
}

// Avrund Date til hel time (UTC-basert avrunding, men siden vi sammenligner mot Oslo-timer hentet samme måte funker dette).
function floorToHour(d) {
  const t = new Date(d);
  t.setUTCMinutes(0, 0, 0);
  return t;
}

// ---------- Klassifikasjon (portering) ----------
export function vindretningTekst(deg) {
  if (deg === null || deg === undefined || Number.isNaN(Number(deg))) return 'Ukjent';
  const dirs = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'];
  return dirs[Math.floor(((Number(deg) + 22.5) % 360) / 45) % 8];
}

export function vindArrow(deg) {
  if (deg === null || deg === undefined || Number.isNaN(Number(deg))) return '•';
  const dirs = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
  // 0° = vind fra nord, peker derfor nedover (↓). 90° = fra øst, peker mot vest (←).
  return dirs[Math.round((Number(deg) % 360) / 45) % 8];
}

export function aktivitetstype(temp, rain, wind, gust, hourLocal) {
  if (hourLocal !== null && hourLocal !== undefined && (hourLocal >= 23 || hourLocal <= 5)) {
    if (rain > 2 || gust >= 15) return 'Natt: krevende forhold ute';
    return 'Natt: rolig tur passer bedre enn løpetur';
  }
  if (rain > 2 || gust >= 15) return 'Utfordrende utevær';
  if (temp >= 19 && rain < 0.2 && wind <= 6) return 'Svært bra for bading/sol';
  if (temp >= 10 && temp <= 22 && rain < 0.6 && wind <= 10) return 'Bra for løping og tur';
  if (temp < 3 && rain > 0) return 'Kaldt og vått';
  return 'Greit utevær';
}

export function kvalitetsvurdering(temp, rainSum, maxWind, maxGust) {
  if (rainSum <= 0.2 && maxWind <= 6 && maxGust <= 10) {
    return { score: '5/5', label: 'Meget bra', reason: 'Lite nedbør og behagelig vind.' };
  }
  if (rainSum <= 0.8 && maxGust <= 13) {
    return { score: '4/5', label: 'Bra', reason: 'Brukbare forhold med begrenset nedbør/vind.' };
  }
  if (rainSum <= 1.8 && maxGust <= 17) {
    return { score: '3/5', label: 'Middels', reason: 'Noe regn eller vind trekker ned komforten.' };
  }
  if (rainSum <= 3 && maxGust <= 22) {
    return { score: '2/5', label: 'Svakt', reason: 'Mye vind eller nedbør i perioder.' };
  }
  return { score: '1/5', label: 'Dårlig', reason: 'Kraftig vind og/eller nedbør.' };
}

function symbolFromCloud(cloudPct, hourLocal) {
  if (cloudPct === null || cloudPct === undefined) return 'cloudy';
  const isDay = hourLocal >= 6 && hourLocal < 22;
  const c = Math.max(0, Math.min(100, Number(cloudPct)));
  if (c <= 20) return isDay ? 'fair_day' : 'fair_night';
  if (c <= 65) return isDay ? 'partlycloudy_day' : 'partlycloudy_night';
  return 'cloudy';
}

function openMeteoSymbol(weatherCode, isDay, rain) {
  const code = weatherCode === null || weatherCode === undefined ? -1 : Number(weatherCode);
  const daytime = (isDay || 0) >= 1;
  const precip = Number(rain || 0);
  if (code === 0) return daytime ? 'clearsky_day' : 'clearsky_night';
  if (code === 1) return daytime ? 'fair_day' : 'fair_night';
  if (code === 2) return daytime ? 'partlycloudy_day' : 'partlycloudy_night';
  if ([3, 45, 48].includes(code)) return 'cloudy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'thunder';
  if ([61, 63, 65, 80, 81, 82].includes(code) || precip >= 0.2) return 'rain';
  return 'cloudy';
}

// ---------- Datahenting ----------
export async function hentYr(lat, lon) {
  const url = `${YR_URL}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error(`YR ${r.status}`);
  const data = await r.json();
  return ((data || {}).properties || {}).timeseries || [];
}

export async function hentOpenMeteoHistorikk(lat, lon, dayStartLocal, dayEndLocal) {
  // dayStartLocal / dayEndLocal er Date-objekter (UTC) som representerer dagens midnatt og morgendagens midnatt i Oslo.
  const startDate = osloDateKey(dayStartLocal);
  // End-date i Open-Meteo er inklusiv — vi sender samme dato (00:00 → 23:00 lokalt).
  const endDate = startDate;
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: OSLO_TZ,
    hourly: [
      'temperature_2m',
      'precipitation',
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m',
      'cloud_cover',
      'weather_code',
      'is_day',
    ].join(','),
    wind_speed_unit: 'ms',
    start_date: startDate,
    end_date: endDate,
  });
  try {
    const r = await fetch(`${OPEN_METEO_URL}?${params.toString()}`);
    if (!r.ok) return new Map();
    const data = await r.json();
    const hourly = data.hourly || {};
    const times = hourly.time || [];
    const out = new Map();
    for (let i = 0; i < times.length; i++) {
      // Open-Meteo med timezone=Europe/Oslo gir tider som lokal ISO uten timezone-suffix.
      // Vi tolker dem som Oslo-lokal tid. For å lage en sammenlignbar nøkkel bruker vi YYYY-MM-DDTHH.
      const localIso = String(times[i]).slice(0, 13); // "YYYY-MM-DDTHH"
      const rainVal = (hourly.precipitation || [])[i];
      const symbol = openMeteoSymbol(
        (hourly.weather_code || [])[i],
        (hourly.is_day || [])[i],
        rainVal,
      );
      out.set(localIso, {
        is_history: true,
        temp: numOrNull((hourly.temperature_2m || [])[i]),
        wind: numOrNull((hourly.wind_speed_10m || [])[i]),
        gust: numOrNull((hourly.wind_gusts_10m || [])[i]),
        wind_deg: numOrNull((hourly.wind_direction_10m || [])[i]),
        cloud: numOrNull((hourly.cloud_cover || [])[i]),
        rain: numOrNull(rainVal),
        rain_min: numOrNull(rainVal),
        rain_max: numOrNull(rainVal),
        rain_prob: null,
        symbol,
      });
    }
    return out;
  } catch (_) {
    return new Map();
  }
}

function numOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Hent ut symbol fra YR-blokk med fallback gjennom next_1/6/12_hours.
function yrSymbol(data) {
  for (const period of ['next_1_hours', 'next_6_hours', 'next_12_hours']) {
    const sym = (((data[period] || {}).summary || {}).symbol_code || '').trim();
    if (sym) return sym;
  }
  return 'cloudy';
}

function firstYrPrecipBlock(data) {
  for (const period of ['next_1_hours', 'next_6_hours', 'next_12_hours']) {
    const b = data[period];
    if (b) return b;
  }
  return {};
}

// Lokal "key" YYYY-MM-DDTHH for Oslo, matching Open-Meteo-format.
function osloHourKey(date) {
  const p = osloParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${String(p.hour).padStart(2, '0')}`;
}

// Observert nedbør bakover i tid fra Open-Meteo (past_days gir modellbasert
// historikk fra samme endepunkt som prognosen).
export async function hentNedbørHistorikk(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: OSLO_TZ,
    hourly: 'precipitation',
    past_days: '31',
    forecast_days: '1',
  });
  const r = await fetch(`${OPEN_METEO_URL}?${params.toString()}`);
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
  const data = await r.json();
  const times = (data.hourly || {}).time || [];
  const precip = (data.hourly || {}).precipitation || [];

  // Open-Meteo-verdien for time H dekker nedbøren i timen FØR H.
  // Finn siste fullførte time (lokal Oslo-tid, samme format som times-listen).
  const nowKey = osloHourKey(new Date());
  let nowIdx = -1;
  for (let i = times.length - 1; i >= 0; i--) {
    if (String(times[i]).slice(0, 13) <= nowKey) { nowIdx = i; break; }
  }
  if (nowIdx < 0) return null;

  const sumBack = (hoursBack) => {
    let s = 0;
    for (let i = Math.max(0, nowIdx - hoursBack + 1); i <= nowIdx; i++) {
      s += Number(precip[i]) || 0;
    }
    return round1(s);
  };

  return {
    siste_time: round1(precip[nowIdx]) ?? 0,
    siste_24t: sumBack(24),
    siste_30d: sumBack(30 * 24),
  };
}

// ---------- Hovedfunksjon: bygg hele varselet ----------
export async function hentAktivtVarsel(lat, lon, sted = 'Valgt sted') {
  const [yrTs, _] = [await hentYr(lat, lon), null];

  const now = new Date();
  const dayStartLocal = startOfTodayOslo();
  const dayEndLocal = addDays(dayStartLocal, 1);
  const horizon24 = addHours(now, 24);
  const horizon7d = addDays(now, 7);

  const omHist = await hentOpenMeteoHistorikk(lat, lon, dayStartLocal, dayEndLocal);

  const rows7d = [];
  const rowsDay = [];
  const rowsByHourKey = new Map();

  for (const it of yrTs) {
    const t = new Date(it.time);
    if (!Number.isFinite(t.getTime())) continue;
    if (t < dayStartLocal || t > horizon7d) continue;

    const data = it.data || {};
    const inst = ((data.instant || {}).details) || {};
    const precipBlock = firstYrPrecipBlock(data);
    const precipDetails = precipBlock.details || {};
    let symbol = yrSymbol(data);
    if (symbol === 'cloudy') {
      const hasExplicit = ['next_1_hours', 'next_6_hours', 'next_12_hours'].some((p) =>
        ((data[p] || {}).summary || {}).symbol_code,
      );
      if (!hasExplicit) symbol = symbolFromCloud(inst.cloud_area_fraction, osloHour(t));
    }

    const rec = {
      time: t.toISOString(),
      _date: t,
      is_history: t < now,
      temp: numOrNull(inst.air_temperature),
      wind: inst.wind_speed !== undefined ? Number(inst.wind_speed) : 0,
      gust: inst.wind_speed_of_gust !== undefined ? Number(inst.wind_speed_of_gust) : 0,
      wind_deg: numOrNull(inst.wind_from_direction),
      cloud: numOrNull(inst.cloud_area_fraction),
      rain: precipDetails.precipitation_amount !== undefined ? Number(precipDetails.precipitation_amount) : 0,
      rain_min: numOrNull(precipDetails.precipitation_amount_min),
      rain_max: numOrNull(precipDetails.precipitation_amount_max),
      rain_prob: numOrNull(precipDetails.probability_of_precipitation),
      symbol,
    };

    rows7d.push(rec);
    if (t >= dayStartLocal && t < dayEndLocal) {
      rowsDay.push(rec);
      rowsByHourKey.set(osloHourKey(t), rec);
    }
  }

  // Fyll inn historikk fra Open-Meteo der YR ikke har data (typisk timer tidligere i dag).
  const historyLimitKey = osloHourKey(floorToHour(now));
  // Bygg alle 24 timer for i dag.
  for (let h = 0; h < 24; h++) {
    const slotLocal = addHours(dayStartLocal, h);
    const key = osloHourKey(slotLocal);
    const fallback = omHist.get(key);
    if (!fallback) continue;

    const existing = rowsByHourKey.get(key);
    if (!existing && key <= historyLimitKey) {
      // Legg til som ny historisk rad
      const rec = {
        time: slotLocal.toISOString(),
        _date: slotLocal,
        is_history: true,
        temp: fallback.temp,
        wind: fallback.wind ?? 0,
        gust: fallback.gust ?? 0,
        wind_deg: fallback.wind_deg,
        cloud: fallback.cloud,
        rain: fallback.rain ?? 0,
        rain_min: fallback.rain_min,
        rain_max: fallback.rain_max,
        rain_prob: fallback.rain_prob,
        symbol: fallback.symbol,
      };
      rowsByHourKey.set(key, rec);
      rowsDay.push(rec);
      continue;
    }
    if (!existing) continue;
    if (!existing.is_history) continue;
    // Suppler manglende felter
    for (const field of ['temp', 'wind', 'gust', 'wind_deg', 'cloud']) {
      if ((existing[field] === null || existing[field] === undefined) && fallback[field] !== null && fallback[field] !== undefined) {
        existing[field] = fallback[field];
      }
    }
    if (fallback.rain !== null && fallback.rain !== undefined) {
      if (existing.rain === null || existing.rain === undefined || (existing.rain === 0 && fallback.rain > 0)) {
        existing.rain = fallback.rain;
        existing.rain_min = fallback.rain_min;
        existing.rain_max = fallback.rain_max;
      }
    }
    if ((!existing.symbol || existing.symbol === 'cloudy') && fallback.symbol) {
      existing.symbol = fallback.symbol;
    }
  }

  // Sorter rowsDay og rows24
  rowsDay.sort((a, b) => a._date - b._date);
  const rows24 = rows7d.filter((r) => r._date >= now && r._date <= horizon24);

  // KPI/quality basert på dagens døgn (eller neste 24t hvis dagen er tom).
  const dfDay = rowsDay.length ? rowsDay : rows24;
  const futureNow = rowsDay.filter((r) => !r.is_history);
  const dfNow = futureNow.length ? futureNow : (rows24.length ? rows24 : dfDay);

  const tempNow = (() => {
    const t = dfNow.find((r) => r.temp !== null && r.temp !== undefined);
    return t ? t.temp : 0;
  })();
  const rainDay = dfDay.reduce((s, r) => s + (Number(r.rain) || 0), 0);
  const maxWind = dfDay.reduce((s, r) => Math.max(s, Number(r.wind) || 0), 0);
  const maxGust = dfDay.reduce((s, r) => Math.max(s, Number(r.gust) || 0), 0);
  const quality = kvalitetsvurdering(tempNow, rainDay, maxWind, maxGust);

  // Fine vinduer (rangert)
  const bestWindows = [];
  let current = null;
  for (const rec of rows7d) {
    if (rec.is_history) continue;
    const ok = rec.rain <= 0.3 && rec.wind <= 8 && (rec.gust || 0) <= 12 && (rec.temp ?? -99) >= 8;
    if (ok) {
      if (!current) current = { start: rec._date, end: rec._date, score: 0, hours: 0 };
      current.end = rec._date;
      current.hours += 1;
      current.score += Math.max(0, 14 - rec.wind) + Math.max(0, 0.5 - rec.rain) * 10 + Math.max(0, (rec.temp ?? 8) - 8);
    } else if (current) {
      if (current.hours >= 2) bestWindows.push(current);
      current = null;
    }
  }
  if (current && current.hours >= 2) bestWindows.push(current);
  bestWindows.sort((a, b) => (b.score - a.score) || (b.hours - a.hours));
  const fineWindows = bestWindows.slice(0, 6).map((w) => ({
    start: w.start.toISOString(),
    end: addHours(w.end, 1).toISOString(),
    hours: w.hours,
  }));

  // Bygg komplett 24-timers hourly med hull (slik at grafen alltid har 0-23).
  const hourly = [];
  for (let h = 0; h < 24; h++) {
    const slot = addHours(dayStartLocal, h);
    const key = osloHourKey(slot);
    const rec = rowsByHourKey.get(key);
    const isHist = slot < now;
    if (!rec) {
      hourly.push({
        time: slot.toISOString(),
        is_history: isHist,
        temp: null, rain: null, rain_min: null, rain_max: null, rain_prob: null,
        wind: null, gust: null, wind_deg: null, wind_dir: 'Ukjent',
        cloud: null, activity: 'Mangler historikk', symbol: 'unknown',
      });
      continue;
    }
    const hr = osloHour(slot);
    hourly.push({
      time: slot.toISOString(),
      is_history: rec.is_history,
      temp: round1(rec.temp),
      rain: round1(rec.rain),
      rain_min: round1(rec.rain_min),
      rain_max: round1(rec.rain_max),
      rain_prob: rec.rain_prob !== null && rec.rain_prob !== undefined ? Math.round(rec.rain_prob) : null,
      wind: round1(rec.wind),
      gust: round1(rec.gust),
      wind_deg: rec.wind_deg,
      wind_dir: vindretningTekst(rec.wind_deg),
      cloud: rec.cloud !== null && rec.cloud !== undefined ? Math.round(rec.cloud) : null,
      activity: aktivitetstype(rec.temp || 0, rec.rain || 0, rec.wind || 0, rec.gust || 0, hr),
      symbol: rec.symbol,
    });
  }

  // Daglig aggregat 7d
  const dailyMap = new Map();
  for (const rec of rows7d) {
    if (rec.is_history) continue;
    const key = osloDateKey(rec._date);
    if (!dailyMap.has(key)) dailyMap.set(key, []);
    dailyMap.get(key).push(rec);
  }
  // For "i dag" tar vi med historikk + prognose
  const todayKey = osloDateKey(dayStartLocal);
  if (rowsDay.length) {
    dailyMap.set(todayKey, [...rowsDay].sort((a, b) => a._date - b._date));
  }

  const daily = [];
  const sortedKeys = [...dailyMap.keys()].sort();
  for (const key of sortedKeys) {
    const vals = dailyMap.get(key);
    const temps = vals.filter((v) => v.temp !== null && v.temp !== undefined).map((v) => v.temp);
    const rains = vals.map((v) => v.rain || 0);
    const winds = vals.map((v) => v.wind || 0);
    const gusts = vals.map((v) => v.gust || 0);

    // Soltimer
    let solTimer = 0;
    const skyKat = { sun: 0, partly: 0, cloudy: 0, rain: 0 };
    for (const v of vals) {
      const hr = osloHour(v._date);
      if (hr >= 6 && hr <= 21) {
        const kat = solKategori(v.symbol, v.rain);
        skyKat[kat]++;
        if (kat === 'sun') solTimer += 1;
        else if (kat === 'partly') solTimer += 0.5;
      }
    }

    const dayHours = vals.map((v) => {
      const hr = osloHour(v._date);
      return {
        time: v._date.toISOString(),
        temp: round1(v.temp),
        rain: round1(v.rain),
        rain_prob: v.rain_prob !== null && v.rain_prob !== undefined ? Math.round(v.rain_prob) : null,
        wind: round1(v.wind),
        gust: round1(v.gust),
        wind_deg: v.wind_deg,
        wind_dir: vindretningTekst(v.wind_deg),
        cloud: v.cloud !== null && v.cloud !== undefined ? Math.round(v.cloud) : null,
        activity: aktivitetstype(v.temp || 0, v.rain || 0, v.wind || 0, v.gust || 0, hr),
        symbol: v.symbol,
        is_history: v.is_history,
      };
    });

    daily.push({
      date: key,
      temp_min: temps.length ? round1(Math.min(...temps)) : null,
      temp_max: temps.length ? round1(Math.max(...temps)) : null,
      rain_total: round1(rains.reduce((a, b) => a + b, 0)),
      wind_max: winds.length ? round1(Math.max(...winds)) : null,
      gust_max: gusts.length ? round1(Math.max(...gusts)) : null,
      sun_hours: round1(solTimer),
      sky_mix: skyKat,
      hours: dayHours,
      best_6h: beste6tBlokk(dayHours),
      blokker: beregnDagsblokker(dayHours),
    });
  }

  return {
    sted,
    coords: { lat, lon },
    quality,
    summary: {
      temp_now: round1(tempNow),
      temp_min_24h: dfDay.length ? round1(Math.min(...dfDay.filter((r) => r.temp !== null && r.temp !== undefined).map((r) => r.temp))) : 0,
      temp_max_24h: dfDay.length ? round1(Math.max(...dfDay.filter((r) => r.temp !== null && r.temp !== undefined).map((r) => r.temp))) : 0,
      rain_24h: round1(rainDay),
      max_wind_24h: round1(maxWind),
      max_gust_24h: round1(maxGust),
    },
    hourly,
    daily: daily.slice(0, 8),
    fine_windows: fineWindows,
    hentet: new Date().toISOString(),
  };
}

function round1(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

function solKategori(symbol, rain) {
  const s = String(symbol || '').toLowerCase();
  if ((rain || 0) >= 0.2) return 'rain';
  if (s.includes('clearsky') || s.includes('fair')) return 'sun';
  if (s.includes('partlycloudy')) return 'partly';
  return 'cloudy';
}

// Aggregér en dag til 4 tidsblokker (YR-stil), med 22-06 som natt.
// Nattblokken inkluderer både 22-23 og 00-05 av samme dato.
export function beregnDagsblokker(hours) {
  const ranges = [
    { key: 'natt',        label: 'Natt',        test: (h) => h >= 22 || h < 6 },
    { key: 'morgen',      label: 'Morgen',      test: (h) => h >= 6 && h < 12 },
    { key: 'ettermiddag', label: 'Ettermiddag', test: (h) => h >= 12 && h < 18 },
    { key: 'kveld',       label: 'Kveld',       test: (h) => h >= 18 && h < 22 },
  ];
  const result = {};
  for (const r of ranges) {
    const filtered = (hours || []).filter((h) => {
      const hr = osloHour(new Date(h.time));
      return r.test(hr);
    });
    if (!filtered.length) { result[r.key] = null; continue; }
    const rain = filtered.reduce((s, h) => s + (Number(h.rain) || 0), 0);
    const temps = filtered.map((h) => h.temp).filter((t) => t !== null && t !== undefined);
    const winds = filtered.map((h) => h.wind).filter((w) => w !== null && w !== undefined);
    const gusts = filtered.map((h) => h.gust).filter((g) => g !== null && g !== undefined);
    result[r.key] = {
      label: r.label,
      symbol: velgBlokkSymbol(filtered),
      rain: round1(rain),
      temp_min: temps.length ? round1(Math.min(...temps)) : null,
      temp_max: temps.length ? round1(Math.max(...temps)) : null,
      wind_max: winds.length ? round1(Math.max(...winds)) : null,
      gust_max: gusts.length ? round1(Math.max(...gusts)) : null,
      hour_count: filtered.length,
    };
  }
  return result;
}

function velgBlokkSymbol(hrs) {
  // Foretrekk "verre" vær når det forekommer i blokken (rain-tunge symboler vinner over sol).
  const order = [
    ['thunder'], ['sleet'], ['snow'], ['heavyrain'], ['rainshowers'], ['rain'],
    ['fog'], ['partlycloudy'], ['cloudy'], ['fair'], ['clearsky'],
  ];
  for (const kws of order) {
    const m = hrs.find((h) => {
      const s = String(h.symbol || '').toLowerCase();
      return kws.some((k) => s.includes(k));
    });
    if (m) return m.symbol;
  }
  return hrs[Math.floor(hrs.length / 2)]?.symbol || 'cloudy';
}

function beste6tBlokk(hrs) {
  const score = (h) => {
    const t = h.temp || 0;
    const r = h.rain || 0;
    const w = h.wind || 0;
    const g = h.gust || 0;
    const c = h.cloud ?? 50;
    const tempPts = Math.max(0, 10 - Math.abs(t - 17));
    const rainPts = Math.max(0, 5 - r * 3);
    const windPts = Math.max(0, 8 - w) + Math.max(0, 12 - g) * 0.5;
    const sunPts = Math.max(0, (100 - c) / 20);
    return tempPts + rainPts + windPts + sunPts;
  };
  const dag = [];
  for (const h of hrs) {
    const hr = osloHour(new Date(h.time));
    if (hr >= 6 && hr <= 22) dag.push({ ...h, _hr: hr });
  }
  if (dag.length < 6) return null;
  const scores = dag.map(score);
  let bestSum = -Infinity, bestIdx = 0;
  for (let i = 0; i <= dag.length - 6; i++) {
    const s = scores.slice(i, i + 6).reduce((a, b) => a + b, 0);
    if (s > bestSum) { bestSum = s; bestIdx = i; }
  }
  const block = dag.slice(bestIdx, bestIdx + 6);
  return {
    start: block[0].time,
    end: new Date(new Date(block[block.length - 1].time).getTime() + 3600 * 1000).toISOString(),
    start_hour: block[0]._hr,
    end_hour: (block[block.length - 1]._hr + 1) % 24,
    avg_temp: round1(block.reduce((s, h) => s + (h.temp || 0), 0) / 6),
    total_rain: round1(block.reduce((s, h) => s + (h.rain || 0), 0)),
    max_wind: round1(block.reduce((s, h) => Math.max(s, h.wind || 0), 0)),
    max_gust: round1(block.reduce((s, h) => Math.max(s, h.gust || 0), 0)),
  };
}

// ---------- Stedssøk via Nominatim ----------
export async function søkSted(q) {
  if (!q || q.trim().length < 2) return [];
  const params = new URLSearchParams({
    q: q.trim(),
    format: 'jsonv2',
    addressdetails: '1',
    limit: '8',
    'accept-language': 'no',
  });
  try {
    const r = await fetch(`${NOMINATIM_SEARCH}?${params.toString()}`);
    if (!r.ok) return [];
    const arr = await r.json();
    return (arr || []).map((it) => ({
      name: it.display_name,
      lat: Number(it.lat),
      lon: Number(it.lon),
    })).filter((it) => Number.isFinite(it.lat) && Number.isFinite(it.lon));
  } catch (_) {
    return [];
  }
}

export async function reverseGeokod(lat, lon) {
  try {
    const params = new URLSearchParams({
      lat: String(lat), lon: String(lon), format: 'jsonv2', 'accept-language': 'no',
    });
    const r = await fetch(`${NOMINATIM_REVERSE}?${params.toString()}`);
    if (!r.ok) return null;
    const d = await r.json();
    const a = d.address || {};
    const loc = a.city || a.town || a.village || a.municipality || a.hamlet;
    const country = a.country;
    if (loc && country) return `${loc}, ${country}`;
    if (loc) return loc;
    if (d.display_name) return String(d.display_name).split(',')[0].trim();
  } catch (_) { /* */ }
  return null;
}
