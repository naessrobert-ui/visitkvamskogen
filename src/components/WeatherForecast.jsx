import { useState, useEffect, useCallback, useRef } from 'react';
import { hentAktivtVarsel, søkSted } from '../lib/weather.js';
import {
  weatherEmoji, windStrengthIcon, windArrow,
  weatherStripBucket, weatherStripLabel,
  verdictBucket, overallVerdict,
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

const fmtTime = (iso) => {
  return new Date(iso).toLocaleString('no-NO', {
    timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit',
  });
};

const fmtDateShort = (iso) => {
  return new Date(iso).toLocaleDateString('no-NO', {
    timeZone: 'Europe/Oslo', weekday: 'short', day: 'numeric', month: 'short',
  });
};

const fmtWeekdayShort = (iso) => {
  return new Date(iso).toLocaleDateString('no-NO', { timeZone: 'Europe/Oslo', weekday: 'short' });
};

const fmtDayLong = (iso) => {
  return new Date(iso).toLocaleDateString('no-NO', {
    timeZone: 'Europe/Oslo', weekday: 'long', day: 'numeric', month: 'long',
  });
};

const fmtUpdated = (iso) => new Date(iso).toLocaleString('no-NO', {
  timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
});

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
  const [place, setPlace] = useState(null);
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [openDayIdx, setOpenDayIdx] = useState(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [overviewRows, setOverviewRows] = useState(null);

  const loadingRef = useRef(false);

  const loadForecast = useCallback(async (lat, lon, name) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setStatus('Henter varsel …');
    setOpenDayIdx(null);
    try {
      const d = await hentAktivtVarsel(lat, lon, name || 'Valgt sted');
      setData(d);
      setPlace({ lat, lon, name: d.sted });
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

  // Last "rask oversikt" når brukeren åpner den
  useEffect(() => {
    if (!overviewOpen || overviewRows !== null) return;
    let cancelled = false;
    (async () => {
      const rows = await Promise.all(OVERVIEW_PLACES.map(async (p) => {
        try {
          const d = await hentAktivtVarsel(p.lat, p.lon, p.name);
          return { ok: true, p, d };
        } catch (_) {
          return { ok: false, p };
        }
      }));
      if (!cancelled) setOverviewRows(rows);
    })();
    return () => { cancelled = true; };
  }, [overviewOpen, overviewRows]);

  const verdict = data ? overallVerdict(data.hourly || []) : null;

  return (
    <div className="vf-wrap">
      {/* Søkekort */}
      <div className="vf-search-card">
        <h1 className="vf-h1">🌤️ Værvarsel for aktiviteter</h1>
        <p className="vf-sub">
          Bruk posisjon eller søk sted. Grafen viser døgnet i dag (00:00–23:59) med historikk fram til nå og prognose videre.
          Data fra YR (api.met.no) og Open-Meteo.
        </p>
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

      {data && (
        <>
          {/* Resultat-header med verdict */}
          <div className="vf-result-header">
            <div>
              <div className="vf-place-label">Posisjon</div>
              <div className="vf-place-name">{data.sted}</div>
              <div className="vf-place-coords">
                {data.coords.lat.toFixed(4)}° N, {data.coords.lon.toFixed(4)}° Ø
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

          {/* Hovedgraf */}
          <div className="vf-card vf-chart-card">
            <div className="vf-chart-header">
              <h3>I dag: 00:00–23:59</h3>
              <div className="vf-chart-legend">
                <span><span className="vf-sw vf-sw-sun" />Sol</span>
                <span><span className="vf-sw vf-sw-partly" />Lettskyet</span>
                <span><span className="vf-sw vf-sw-cloudy" />Overskyet</span>
                <span><span className="vf-sw vf-sw-rain" />Nedbør</span>
                <span><span className="vf-sw vf-sw-temp" />Temperatur</span>
                <span><span className="vf-sw vf-sw-rain-exp" />Nedbør (forventet)</span>
                <span><span className="vf-sw vf-sw-rain-unc" />Usikkerhet (maks)</span>
                <span><span className="vf-sw vf-sw-wind" />Vind (stiplet)</span>
              </div>
            </div>
            <div className="vf-verdict-strip">
              {(data.hourly || []).map((h, i) => {
                const b = weatherStripBucket(h);
                const hr = new Date(h.time).toLocaleString('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false }).slice(0, 2);
                return <div key={i} className={`vf-seg vf-seg-${b}`} title={`kl ${hr}:00 – ${weatherStripLabel(b)}`} />;
              })}
            </div>
            <div className="vf-chart-box">
              <WeatherMainChart hourly={data.hourly} />
            </div>
          </div>

          {/* KPI-bånd */}
          <div className="vf-kpi-band">
            <div className="vf-kpi-cell">
              <div className="vf-kpi-lbl">Nåtemp</div>
              <div className="vf-kpi-val">{data.summary.temp_now}°</div>
            </div>
            <div className="vf-kpi-cell">
              <div className="vf-kpi-lbl">Min/maks 24t</div>
              <div className="vf-kpi-val">{data.summary.temp_min_24h}° / {data.summary.temp_max_24h}°</div>
            </div>
            <div className="vf-kpi-cell">
              <div className="vf-kpi-lbl">Nedbør 24t</div>
              <div className="vf-kpi-val">{data.summary.rain_24h}<small> mm</small></div>
            </div>
            <div className="vf-kpi-cell">
              <div className="vf-kpi-lbl">Maks vind</div>
              <div className="vf-kpi-val">{data.summary.max_wind_24h}<small> m/s</small></div>
            </div>
            <div className="vf-kpi-cell">
              <div className="vf-kpi-lbl">Maks kast</div>
              <div className="vf-kpi-val">{data.summary.max_gust_24h}<small> m/s</small></div>
            </div>
          </div>

          {/* Fine vinduer */}
          <div className="vf-card">
            <h3 className="vf-h3">Beste vinduer med fint vær (2+ timer)</h3>
            {data.fine_windows && data.fine_windows.length ? (
              <div>
                {(() => {
                  const maxHours = Math.max(...data.fine_windows.map((w) => w.hours), 1);
                  return data.fine_windows.map((w, i) => (
                    <div key={i} className="vf-window-row">
                      <div className="vf-w-day">{fmtWeekdayShort(w.start)}</div>
                      <div className="vf-w-range">{fmtTime(w.start)}–{fmtTime(w.end)}</div>
                      <div className="vf-w-bar"><div className="vf-w-fill" style={{ width: `${Math.round(w.hours / maxHours * 100)}%` }} /></div>
                      <div className="vf-w-hours">{w.hours} t</div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="vf-muted vf-pad">Ingen tydelige finværsvinduer funnet enda.</div>
            )}
          </div>

          {/* 7-dagers strip */}
          <div className="vf-card">
            <h3 className="vf-h3">Kommende dager</h3>
            <div className="vf-daily-grid">
              {(data.daily || []).map((x, idx) => {
                const sun = x.sun_hours ?? 0;
                let icon = '☀️';
                if ((x.gust_max ?? 0) >= 15) icon = '🌬️';
                else if ((x.rain_total ?? 0) >= 1.5) icon = '🌧️';
                else if (sun < 2) icon = '☁️';
                else if (sun < 5) icon = '⛅';
                const isActive = openDayIdx === idx;
                const onClick = () => setOpenDayIdx(isActive ? null : idx);
                return (
                  <div key={idx} className={`vf-daily-cell${isActive ? ' is-active' : ''}`} onClick={onClick}>
                    <span className="vf-d-arrow">▼</span>
                    <div className="vf-d-day">{fmtDateShort(x.date)}</div>
                    <div className="vf-d-icon-temp">
                      <span className="vf-d-icon">{icon}</span>
                      <span className="vf-d-temp">{x.temp_max ?? '–'}°</span>
                    </div>
                    <div className="vf-d-meta">{x.temp_min ?? '–'}° · {x.rain_total} mm</div>
                    <div className="vf-d-sun">{sun > 0 ? `☀️ ${sun} soltimer` : '☁️ ingen sol'}</div>
                  </div>
                );
              })}
            </div>

            {openDayIdx !== null && data.daily[openDayIdx] && (
              <DayDetail day={data.daily[openDayIdx]} onClose={() => setOpenDayIdx(null)} />
            )}
          </div>

          {/* Detaljert timesoversikt */}
          <HourlyTable
            day={data.daily[openDayIdx ?? 0]}
            fallback={(data.hourly || []).filter((h) => !h.is_history)}
          />

          {/* Rask oversikt */}
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
                  {!overviewRows && (
                    <tr><td colSpan={7} className="vf-muted">Laster oversikt …</td></tr>
                  )}
                  {overviewRows && overviewRows.map((x, i) => {
                    if (!x.ok) {
                      return (
                        <tr key={i}><td>{x.p.name}</td><td colSpan={5} className="vf-muted">Kunne ikke hente</td>
                          <td><span className="vf-risk vf-risk-mid">⚪ Ukjent</span></td></tr>
                      );
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
        </>
      )}
    </div>
  );
};

const DayDetail = ({ day, onClose }) => (
  <div className="vf-day-detail">
    <div className="vf-day-detail-header">
      <h4>{fmtDayLong(day.date)}</h4>
      <button className="vf-day-detail-close" onClick={onClose}>✕ Lukk</button>
    </div>
    {day.best_6h && (
      <div className="vf-best6-banner">
        🎯 <strong>Beste 6-timers vindu:</strong> kl. {String(day.best_6h.start_hour).padStart(2, '0')}:00–{String(day.best_6h.end_hour).padStart(2, '0')}:00 · snitt {day.best_6h.avg_temp}°, {day.best_6h.total_rain} mm nedbør, vind opp til {day.best_6h.max_wind} m/s
      </div>
    )}
    <div className="vf-day-stats">
      <div className="vf-day-stat"><div className="vf-ds-lbl">Temperatur</div><div className="vf-ds-val">{day.temp_min}° – {day.temp_max}°</div></div>
      <div className="vf-day-stat"><div className="vf-ds-lbl">Nedbør totalt</div><div className="vf-ds-val">{day.rain_total}<small> mm</small></div></div>
      <div className="vf-day-stat"><div className="vf-ds-lbl">Soltimer</div><div className="vf-ds-val">{day.sun_hours ?? 0}<small> t</small></div></div>
      <div className="vf-day-stat"><div className="vf-ds-lbl">Maks vind</div><div className="vf-ds-val">{day.wind_max ?? '–'}<small> m/s</small></div></div>
      <div className="vf-day-stat"><div className="vf-ds-lbl">Maks kast</div><div className="vf-ds-val">{day.gust_max ?? '–'}<small> m/s</small></div></div>
    </div>
    <div className="vf-day-chart-box">
      <WeatherDayChart hours={day.hours} best6h={day.best_6h} />
    </div>
  </div>
);

const HourlyTable = ({ day, fallback }) => {
  const hours = (day?.hours || fallback || []).filter((h) => !h.is_history);
  const titleLabel = day ? fmtDayLong(day.date) : 'neste døgn';
  if (!hours.length) return null;
  return (
    <div className="vf-card">
      <h3 className="vf-h3">Detaljert timesoversikt – {titleLabel}</h3>
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
