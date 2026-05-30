import { useState, useEffect, useCallback, useRef } from 'react';
import { hentAktivtVarsel, søkSted } from '../lib/weather.js';
import {
  weatherEmoji, windStrengthIcon, windArrow,
  verdictBucket, overallVerdict, blokkBakgrunn,
} from '../lib/weather-symbols.js';
import WeatherMainChart from './WeatherMainChart.jsx';
import WeatherDayChart from './WeatherDayChart.jsx';

const KVAMSKOGEN = { name: 'Kvamskogen', lat: 60.37834747146485, lon: 5.979590206513535 };
const CACHE_KEY = 'kvamskogen_aktivt_varsel_place_v1';
const OVERVIEW_PLACES = [
  { name: 'Kvamskogen', lat: 60.3783, lon: 5.9796 },
  { name: 'Bergen', lat: 60.39299, lon: 5.32415 },
  { name: 'Norheimsund', lat: 60.3686, lon: 6.1432 },
  { name: 'Voss', lat: 60.6294, lon: 6.4109 },
  { name: 'Eikedalen', lat: 60.3556, lon: 5.8783 },
];

const fmtTime = (iso) => new Date(iso).toLocaleString('no-NO', {
  timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit',
});
const fmtDayLong = (iso) => new Date(iso).toLocaleDateString('no-NO', {
  timeZone: 'Europe/Oslo', weekday: 'long', day: 'numeric', month: 'long',
});
const fmtDayShort = (iso, todayKey) => {
  if (iso === todayKey) return 'I dag';
  return new Date(iso).toLocaleDateString('no-NO', {
    timeZone: 'Europe/Oslo', weekday: 'short', day: 'numeric', month: 'short',
  });
};
const fmtUpdated = (iso) => new Date(iso).toLocaleString('no-NO', {
  timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
});
const fmtWeekdayShort = (iso) => new Date(iso).toLocaleDateString('no-NO', {
  timeZone: 'Europe/Oslo', weekday: 'short',
});
const todayKeyOslo = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Oslo' });

const loadCachedPlace = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.lat !== 'number' || typeof p?.lon !== 'number') return null;
    return p;
  } catch (_) { return null; }
};
const cachePlace = (place) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(place)); } catch (_) { /* */ }
};

const WeatherForecast = () => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [openDayIdx, setOpenDayIdx] = useState(0); // åpne første rad ("I dag") som default
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [overviewRows, setOverviewRows] = useState(null);

  const loadingRef = useRef(false);

  const loadForecast = useCallback(async (lat, lon, name) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setStatus('Henter varsel …');
    try {
      const d = await hentAktivtVarsel(lat, lon, name || 'Valgt sted');
      setData(d);
      cachePlace({ lat, lon, name: d.sted });
      setStatus('');
    } catch (e) {
      setStatus(`Kunne ikke hente varsel: ${e.message || e}`);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const cached = loadCachedPlace();
    const start = cached || KVAMSKOGEN;
    loadForecast(start.lat, start.lon, start.name);
  }, [loadForecast]);

  const onUseLocation = () => {
    if (!navigator.geolocation) { setStatus('Nettleseren støtter ikke posisjon.'); return; }
    setStatus('Henter posisjon …');
    navigator.geolocation.getCurrentPosition(
      (pos) => loadForecast(pos.coords.latitude, pos.coords.longitude, 'Min posisjon'),
      () => setStatus('Kunne ikke hente posisjon.'),
    );
  };

  const onSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) { setStatus('Skriv minst 2 tegn for stedsøk.'); return; }
    setStatus('Søker sted …');
    const items = await søkSted(q);
    if (!items.length) { setStatus('Fant ingen treff.'); setSearchResults([]); return; }
    if (items.length === 1) {
      setSearchResults([]);
      setStatus('');
      loadForecast(items[0].lat, items[0].lon, items[0].name);
    } else {
      setSearchResults(items);
      setStatus('');
    }
  };

  const onPickPlace = (it) => {
    setSearchResults([]);
    loadForecast(it.lat, it.lon, it.name);
  };

  const tilbakeKvamskogen = () => loadForecast(KVAMSKOGEN.lat, KVAMSKOGEN.lon, KVAMSKOGEN.name);

  useEffect(() => {
    if (!overviewOpen || overviewRows !== null) return;
    let cancelled = false;
    (async () => {
      const rows = await Promise.all(OVERVIEW_PLACES.map(async (p) => {
        try {
          const d = await hentAktivtVarsel(p.lat, p.lon, p.name);
          return { ok: true, p, d };
        } catch (_) { return { ok: false, p }; }
      }));
      if (!cancelled) setOverviewRows(rows);
    })();
    return () => { cancelled = true; };
  }, [overviewOpen, overviewRows]);

  if (!data && !status) {
    return <div className="vf-wrap"><div className="vf-status">Henter varsel for Kvamskogen …</div></div>;
  }
  if (!data) {
    return <div className="vf-wrap"><div className="vf-status">{status}</div></div>;
  }

  const verdict = overallVerdict(data.hourly || []);
  const todayKey = todayKeyOslo();
  const erKvamskogen = Math.abs(data.coords.lat - KVAMSKOGEN.lat) < 0.001 && Math.abs(data.coords.lon - KVAMSKOGEN.lon) < 0.001;

  // "Været nå" hentes fra første prognose-time
  const naa = (data.hourly || []).find((h) => !h.is_history) || (data.hourly || [])[0];
  const naaTemp = naa?.temp;
  const naaWind = naa?.wind;
  const naaWindDeg = naa?.wind_deg;
  const naaWindDir = naa?.wind_dir;
  const naaSymbol = naa?.symbol;
  const naaRainNextHour = naa?.rain;

  return (
    <div className="vf-wrap">
      {/* Header med verdict */}
      <div className="vf-result-header">
        <div>
          <div className="vf-place-label">Værvarsel</div>
          <div className="vf-place-name">{data.sted}</div>
          <div className="vf-place-coords">
            {data.coords.lat.toFixed(4)}° N, {data.coords.lon.toFixed(4)}° Ø
            {!erKvamskogen && (
              <> · <button className="vf-link-btn" onClick={tilbakeKvamskogen}>Tilbake til Kvamskogen</button></>
            )}
          </div>
          <div className="vf-place-updated">Oppdatert {fmtUpdated(data.hentet)}</div>
        </div>
        <div className={`vf-verdict-banner vf-verdict-${verdict.cls}`}>
          <div className="vf-verdict-icon">{verdict.icon}</div>
          <div>
            <div className="vf-verdict-label">Verdikt i dag</div>
            <div className="vf-verdict-text">{verdict.text}</div>
          </div>
        </div>
      </div>

      <div className="vf-quality">
        <span className="vf-quality-chip">Kvalitet {data.quality.score} · {data.quality.label}</span>
        <span>{data.quality.reason}</span>
      </div>

      {/* Været nå */}
      <div className="vf-now-card">
        <div className="vf-now-row">
          <div className="vf-now-icon">{weatherEmoji(naaSymbol)}</div>
          <div className="vf-now-temp">{naaTemp ?? '–'}°</div>
          <div className="vf-now-meta">
            <div className="vf-now-cap">Været nå</div>
            <div className="vf-now-detail">
              💨 {naaWind ?? '–'} m/s {windArrow(naaWindDeg)} {naaWindDir}
              {' · '}
              ☔ {naaRainNextHour && naaRainNextHour > 0 ? `${naaRainNextHour} mm neste time` : 'Opphold neste time'}
            </div>
          </div>
        </div>
      </div>

      {/* Dagstabell */}
      <div className="vf-day-table">
        <div className="vf-day-table-head">
          <div className="vf-col-day">Dag</div>
          <div className="vf-col-block">Natt</div>
          <div className="vf-col-block">Morgen</div>
          <div className="vf-col-block">Ettermiddag</div>
          <div className="vf-col-block">Kveld</div>
          <div className="vf-col-temp">Temp h/l</div>
          <div className="vf-col-rain">Nedbør</div>
          <div className="vf-col-wind">Vind</div>
        </div>
        {(data.daily || []).map((d, idx) => (
          <DayRow
            key={d.date}
            day={d}
            idx={idx}
            isOpen={openDayIdx === idx}
            onToggle={() => setOpenDayIdx(openDayIdx === idx ? null : idx)}
            todayKey={todayKey}
            hourly={d.date === todayKey ? (data.hourly || []) : null}
            summary={d.date === todayKey ? data.summary : null}
          />
        ))}
      </div>

      {/* Fine vinduer */}
      <div className="vf-card">
        <h3 className="vf-h3">Beste vinduer med fint vær (2+ timer)</h3>
        {data.fine_windows && data.fine_windows.length ? (
          (() => {
            const maxHours = Math.max(...data.fine_windows.map((w) => w.hours), 1);
            return (
              <div>
                {data.fine_windows.map((w, i) => (
                  <div key={i} className="vf-window-row">
                    <div className="vf-w-day">{fmtWeekdayShort(w.start)}</div>
                    <div className="vf-w-range">{fmtTime(w.start)}–{fmtTime(w.end)}</div>
                    <div className="vf-w-bar"><div className="vf-w-fill" style={{ width: `${Math.round(w.hours / maxHours * 100)}%` }} /></div>
                    <div className="vf-w-hours">{w.hours} t</div>
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          <div className="vf-muted vf-pad">Ingen tydelige finværsvinduer funnet enda.</div>
        )}
      </div>

      {/* Søk + nære steder helt nederst */}
      <div className="vf-card vf-bottom-tools">
        <h3 className="vf-h3">Vil du sjekke et annet sted?</h3>
        <p className="vf-sub">Siden er primært for Kvamskogen, men du kan slå opp andre steder også.</p>
        <div className="vf-search-row">
          <button className="vf-btn vf-btn-primary" onClick={onUseLocation}>📍 Bruk min posisjon</button>
          <input
            className="vf-input"
            placeholder="Søk sted, f.eks. Voss eller Bergen sentrum"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
          />
          <button className="vf-btn vf-btn-secondary" onClick={onSearch}>Søk</button>
        </div>
        {status && <div className="vf-status">{status}</div>}
        {!!searchResults.length && (
          <div className="vf-chips">
            {searchResults.map((it, i) => (
              <button key={i} className="vf-chip" onClick={() => onPickPlace(it)} title={it.name}>{it.name}</button>
            ))}
          </div>
        )}
      </div>

      <details className="vf-overview-card" onToggle={(e) => setOverviewOpen(e.currentTarget.open)}>
        <summary className="vf-overview-summary">
          <span>🗺️ Rask oversikt – nære steder</span>
          <span className="vf-arrow">▶</span>
        </summary>
        <div className="vf-overview-body">
          <table className="vf-overview-table">
            <thead>
              <tr>
                <th>Sted</th><th>Nå</th><th>I dag</th><th>I morgen</th><th>+2d</th><th>+3d</th><th>Vurdering</th>
              </tr>
            </thead>
            <tbody>
              {!overviewRows && (<tr><td colSpan={7} className="vf-muted">Laster oversikt …</td></tr>)}
              {overviewRows && overviewRows.map((x, i) => {
                if (!x.ok) {
                  return (<tr key={i}><td>{x.p.name}</td><td colSpan={5} className="vf-muted">Kunne ikke hente</td>
                    <td><span className="vf-risk vf-risk-mid">⚪ Ukjent</span></td></tr>);
                }
                const d = x.d;
                const daily = d.daily || [];
                const dayCell = (dd) => {
                  if (!dd) return '–';
                  const ic = (dd.gust_max ?? 0) >= 15 ? '🌬️' : (dd.rain_total ?? 0) >= 1.5 ? '🌧️' : '☀️';
                  return `${ic} ${dd.temp_max ?? '–'}°`;
                };
                const risk = (() => {
                  const s = d.summary || {};
                  if ((s.max_gust_24h ?? 0) >= 16 || (s.rain_24h ?? 0) >= 12) return <span className="vf-risk vf-risk-high">🔴 Krevende</span>;
                  if ((s.max_gust_24h ?? 0) >= 11 || (s.rain_24h ?? 0) >= 5) return <span className="vf-risk vf-risk-mid">🟡 Følg med</span>;
                  return <span className="vf-risk vf-risk-ok">🟢 Bra</span>;
                })();
                return (
                  <tr key={i}>
                    <td><strong>{d.sted}</strong></td>
                    <td className="vf-num">{d.summary.temp_now}°</td>
                    <td className="vf-day">{dayCell(daily[0])}</td>
                    <td className="vf-day">{dayCell(daily[1])}</td>
                    <td className="vf-day">{dayCell(daily[2])}</td>
                    <td className="vf-day">{dayCell(daily[3])}</td>
                    <td>{risk}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

// ---------- En rad i dagstabellen ----------
const DayRow = ({ day, idx, isOpen, onToggle, todayKey, hourly, summary }) => {
  const blokker = day.blokker || {};
  const blokkRekkefølge = ['natt', 'morgen', 'ettermiddag', 'kveld'];
  const dayLabel = day.date === todayKey
    ? 'I dag'
    : new Date(day.date).toLocaleDateString('no-NO', { timeZone: 'Europe/Oslo', weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <>
      <div className={`vf-day-row${isOpen ? ' is-open' : ''}`} onClick={onToggle}>
        <div className="vf-col-day">
          <span className="vf-day-arrow">{isOpen ? '▾' : '▸'}</span>
          <span className="vf-day-label">{dayLabel}</span>
        </div>
        {blokkRekkefølge.map((key) => {
          const b = blokker[key];
          const cls = blokkBakgrunn(b);
          return (
            <div key={key} className={`vf-col-block vf-blokk ${cls}`}>
              <div className="vf-blokk-icon">{b ? weatherEmoji(b.symbol) : ''}</div>
              {b && b.rain >= 0.1 && <div className="vf-blokk-rain">{b.rain} mm</div>}
            </div>
          );
        })}
        <div className="vf-col-temp">
          <span className="vf-temp-hi">{day.temp_max ?? '–'}°</span>
          <span className="vf-temp-sep">/</span>
          <span className="vf-temp-lo">{day.temp_min ?? '–'}°</span>
        </div>
        <div className="vf-col-rain">{day.rain_total > 0 ? `${day.rain_total} mm` : '–'}</div>
        <div className="vf-col-wind">{day.wind_max ?? '–'} <small>m/s</small></div>
      </div>
      {isOpen && <DayExpanded day={day} hourly={hourly} summary={summary} />}
    </>
  );
};

// ---------- Utvidet dag-detalj ----------
const DayExpanded = ({ day, hourly, summary }) => {
  const erIdag = !!hourly;
  // Time-data for grafen: I dag = full 24t med historikk + NÅ-linje (bruker hovedgrafen).
  // Andre dager = day.hours (prognose).
  return (
    <div className="vf-day-expanded">
      {day.best_6h && (
        <div className="vf-best6-banner">
          🎯 <strong>Beste 6-timers vindu:</strong> kl. {String(day.best_6h.start_hour).padStart(2, '0')}:00–{String(day.best_6h.end_hour).padStart(2, '0')}:00 · snitt {day.best_6h.avg_temp}°, {day.best_6h.total_rain} mm nedbør, vind opp til {day.best_6h.max_wind} m/s
        </div>
      )}

      {/* KPI: bruk summary for i dag, ellers dag-statistikk */}
      <div className="vf-kpi-band">
        {erIdag && summary ? (
          <>
            <div className="vf-kpi-cell"><div className="vf-kpi-lbl">Nåtemp</div><div className="vf-kpi-val">{summary.temp_now}°</div></div>
            <div className="vf-kpi-cell"><div className="vf-kpi-lbl">Min/maks 24t</div><div className="vf-kpi-val">{summary.temp_min_24h}° / {summary.temp_max_24h}°</div></div>
            <div className="vf-kpi-cell"><div className="vf-kpi-lbl">Nedbør 24t</div><div className="vf-kpi-val">{summary.rain_24h}<small> mm</small></div></div>
            <div className="vf-kpi-cell"><div className="vf-kpi-lbl">Maks vind</div><div className="vf-kpi-val">{summary.max_wind_24h}<small> m/s</small></div></div>
            <div className="vf-kpi-cell"><div className="vf-kpi-lbl">Maks kast</div><div className="vf-kpi-val">{summary.max_gust_24h}<small> m/s</small></div></div>
          </>
        ) : (
          <>
            <div className="vf-kpi-cell"><div className="vf-kpi-lbl">Min/maks</div><div className="vf-kpi-val">{day.temp_min}° / {day.temp_max}°</div></div>
            <div className="vf-kpi-cell"><div className="vf-kpi-lbl">Nedbør totalt</div><div className="vf-kpi-val">{day.rain_total}<small> mm</small></div></div>
            <div className="vf-kpi-cell"><div className="vf-kpi-lbl">Soltimer</div><div className="vf-kpi-val">{day.sun_hours ?? 0}<small> t</small></div></div>
            <div className="vf-kpi-cell"><div className="vf-kpi-lbl">Maks vind</div><div className="vf-kpi-val">{day.wind_max ?? '–'}<small> m/s</small></div></div>
            <div className="vf-kpi-cell"><div className="vf-kpi-lbl">Maks kast</div><div className="vf-kpi-val">{day.gust_max ?? '–'}<small> m/s</small></div></div>
          </>
        )}
      </div>

      {/* Graf */}
      <div className="vf-day-chart-wrap">
        {erIdag
          ? <WeatherMainChart hourly={hourly} />
          : <WeatherDayChart hours={day.hours} best6h={day.best_6h} />}
      </div>

      {/* Timestabell */}
      <HourlyTable day={day} />
    </div>
  );
};

const HourlyTable = ({ day }) => {
  const hours = (day?.hours || []).filter((h) => !h.is_history);
  if (!hours.length) return null;
  return (
    <div className="vf-hourly-wrap">
      <h4 className="vf-h4">Time for time – {fmtDayLong(day.date)}</h4>
      <div className="vf-hourly-scroll">
        <table className="vf-hourly-table">
          <thead>
            <tr>
              <th>Tid</th>
              <th className="vf-num">Temp</th>
              <th className="vf-num">Nedbør</th>
              <th className="vf-num">Vind/kast</th>
              <th>Retning</th>
              <th>Vurdering</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h, i) => {
              const b = verdictBucket(h.activity, h.time);
              const cls = b === 'good' ? 'vf-row-good' : (b === 'night' ? 'vf-row-night' : '');
              const rainProb = (h.rain_prob != null && h.rain_prob > 0) ? ` (${h.rain_prob}%)` : '';
              const rainRange = (h.rain_min != null && h.rain_max != null && (h.rain_min !== h.rain_max)) ? ` (${h.rain_min}–${h.rain_max})` : '';
              return (
                <tr key={i} className={cls}>
                  <td className="vf-time-cell">{weatherEmoji(h.symbol)} kl. {fmtTime(h.time)}</td>
                  <td className="vf-num">{h.temp ?? '–'}°</td>
                  <td className="vf-num">{h.rain ?? 0} mm<span className="vf-muted">{rainProb}{rainRange}</span></td>
                  <td className="vf-num">{windStrengthIcon(h.wind)} {h.wind} m/s <span className="vf-muted">(kast {h.gust})</span></td>
                  <td>{windArrow(h.wind_deg)} {h.wind_dir || '–'}</td>
                  <td>{h.activity || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeatherForecast;
