import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from './Link.jsx';
import '../styles/ski-trails-controls.css';

const CENTER = [60.379, 5.991];
const LOCATION_ID = 'kvamskogen';
const VECTOR_GRID_SCRIPT_URL = 'https://unpkg.com/leaflet.vectorgrid@1.3.0/dist/Leaflet.VectorGrid.bundled.js';
const TILE_URL = 'https://prisanalyse.no/ver/skiloyper-kvamskogen/tiles/segments/{z}/{x}/{y}.pbf';
const STATS_URL = 'https://prisanalyse.no/ver/skiloyper-kvamskogen/stats?fresh_hours=12&z=13&radius=2';

const loadVectorGrid = () => {
  if (L.vectorGrid?.protobuf) return Promise.resolve();
  const existing = document.querySelector(`script[src="${VECTOR_GRID_SCRIPT_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = VECTOR_GRID_SCRIPT_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const parseTrailDate = (props) => {
  if (!props?.last_update) return null;
  const date = new Date(String(props.last_update).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
};

const hoursSinceUpdate = (props) => {
  const date = parseTrailDate(props);
  if (!date) return Infinity;
  return (Date.now() - date.getTime()) / 36e5;
};

const formatAge = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return 'ukjent';
  const minutes = Math.max(1, Math.floor(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} t`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 døgn' : `${days} døgn`;
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const trailStyle = (props) => {
  if (String(props.location_id) !== LOCATION_ID) return { opacity: 0, weight: 0 };

  if (props.is_active && props.open_not_groomed) {
    return { color: '#765299', weight: 4, opacity: 1, dashArray: '8,5' };
  }

  if (!props.is_active) return { color: '#59636e', weight: 3, opacity: 0.7, dashArray: '2,7' };

  const ageH = hoursSinceUpdate(props);
  if (ageH <= 1) return { color: '#0057B8', weight: 7, opacity: 1 };
  if (ageH <= 12) return { color: '#277DA8', weight: 6, opacity: 1 };
  if (ageH <= 24) return { color: '#5B8FA8', weight: 5, opacity: 1 };
  if (ageH <= 72) return { color: '#B66B00', weight: 4.5, opacity: 1, dashArray: '12,5' };
  if (ageH <= 168) return { color: '#8B663A', weight: 4, opacity: 0.95, dashArray: '5,5' };
  return { color: '#696574', weight: 3, opacity: 0.8, dashArray: '2,6' };
};

const swatches = [
  ['#0057B8', 'Preparert siste time', 'solid', 7],
  ['#277DA8', 'Preparert for 1–12 timer siden', 'solid', 6],
  ['#5B8FA8', 'Preparert for 12–24 timer siden', 'solid', 5],
  ['#B66B00', 'Preparert for 1–3 døgn siden', 'dashed', 4.5],
  ['#8B663A', 'Preparert for 3–7 døgn siden', 'dashed', 4],
  ['#696574', 'Eldre enn én uke / ukjent tid', 'dotted', 3],
  ['#765299', 'Åpen uten preparering', 'dashed', 4],
  ['#59636e', 'Stengt eller inaktiv', 'dotted', 3],
];

const trailStatus = (props) => {
  if (!props.is_active) return 'Stengt eller inaktiv';
  if (props.open_not_groomed) return 'Åpen uten preparering';
  const date = parseTrailDate(props);
  if (!date) return 'Prepareringstid ukjent';
  return `Sist preparert: ${formatAge((Date.now() - date.getTime()) / 1000)} siden`;
};

const SkiTrails = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const shellRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [stats, setStats] = useState(null);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    const resized = () => {
      setFullscreen(document.fullscreenElement === shellRef.current);
      mapRef.current?.invalidateSize();
    };
    document.addEventListener('fullscreenchange', resized);
    return () => document.removeEventListener('fullscreenchange', resized);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => mapRef.current?.invalidateSize());
    if (!fullscreen) return () => window.cancelAnimationFrame(frame);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keydown = (event) => {
      if (event.key === 'Escape' && !document.fullscreenElement) setFullscreen(false);
      if (event.key !== 'Tab' || document.fullscreenElement) return;
      const items = [...shellRef.current.querySelectorAll('button, a[href], [tabindex="0"]')];
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', keydown);
    };
  }, [fullscreen]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === shellRef.current) await document.exitFullscreen();
      else if (fullscreen) setFullscreen(false);
      else await shellRef.current?.requestFullscreen();
    } catch (_) {
      setFullscreen(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch(STATS_URL)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    let cancelled = false;
    const map = L.map(containerRef.current, { scrollWheelZoom: true, zoomControl: true });
    mapRef.current = map;

    L.tileLayer(
      'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
      { attribution: '© Kartverket', maxZoom: 18 }
    ).addTo(map);
    map.setView(CENTER, 12);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    loadVectorGrid()
      .then(() => {
        if (cancelled || !mapRef.current || !L.vectorGrid?.protobuf) return;
        const layer = L.vectorGrid.protobuf(TILE_URL, {
          maxNativeZoom: 14,
          maxZoom: 18,
          interactive: true,
          attribution: '<a href="https://prisanalyse.no/ver/skiloyper-kvamskogen" target="_blank" rel="noopener">Løypedata</a>',
          vectorTileLayerStyles: { segments: trailStyle },
          getFeatureId: (feature) => {
            const props = feature.properties || {};
            return `${props.id ?? ''}:${props.track_id ?? ''}`;
          },
        });

        layer.on('mouseover', (event) => {
          const props = event.layer?.properties || {};
          if (String(props.location_id) !== LOCATION_ID) return;
          layer.bindTooltip(
            `<strong>${escapeHtml(props.name || 'Skiløype')}</strong><br>${escapeHtml(trailStatus(props))}`,
            { sticky: true, direction: 'top', className: 'ski-trail-tooltip' }
          ).openTooltip(event.latlng);
        });

        layer.on('click', (event) => {
          const props = event.layer?.properties || {};
          if (String(props.location_id) !== LOCATION_ID) return;
          const date = parseTrailDate(props);
          const timestamp = date ? new Intl.DateTimeFormat('nb-NO', {
            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo',
          }).format(date) : '';
          L.popup({ className: 'ski-trail-popup' })
            .setLatLng(event.latlng)
            .setContent(`<strong>${escapeHtml(props.name || 'Skiløype')}</strong><p>${escapeHtml(trailStatus(props))}</p>${timestamp ? `<small>Registrert ${escapeHtml(timestamp)}</small>` : ''}`)
            .openOn(map);
        });

        layer.addTo(map);
      })
      .catch(() => {
        if (!cancelled) setMapError('Kunne ikke laste løypekartet akkurat nå.');
      });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const newestAge = stats?.newest_age_seconds;
  const headline = Number.isFinite(newestAge)
    ? `Siste løypeoppdatering: ${formatAge(newestAge)} siden`
    : 'Direkte løypekart for Kvamskogen';

  return (
    <section className="ski-trails-page">
      <div className="container">
        <div className="ski-trails-head">
          <div>
            <div className="eyebrow winter"><span className="dot"/>Preparerte skiløyper</div>
            <h1>Hva er kjørt akkurat nå?</h1>
            <p className="lede">
              Finn de ferskeste sporene på Kvamskogen. Trykk på en løype for å se status og siste registrerte preparering.
            </p>
          </div>
          <div className="ski-status-card">
            <strong>{headline}</strong>
            <span>Blå heltrukne linjer er preparert siste døgn. Oransje og brune streker er eldre spor. Både farge, mønster og linjetykkelse viser status.</span>
          </div>
        </div>

        <div className="ski-trails-layout">
          <aside className="ski-trails-panel">
            <h2>Les løypekartet</h2>
            <ul>
              {swatches.map(([color, label, pattern, weight]) => (
                <li key={label}>
                  <span aria-hidden="true" style={{ borderTopColor: color, borderTopStyle: pattern, borderTopWidth: weight }}/>
                  {label}
                </li>
              ))}
            </ul>
            <p className="ski-map-help">Trykk på linjene for tekst med nøyaktig status. Registrert preparering er ikke en garanti for dagens føre.</p>
            <Link className="btn btn-primary ski-report-link" to="/loype">Les føremeldingen</Link>
            {stats && (
              <dl className="ski-trails-stats">
                <div><dt>Segmenter</dt><dd>{stats.total_segments ?? '–'}</dd></div>
                <div><dt>Aktive</dt><dd>{stats.active_segments ?? '–'}</dd></div>
                <div><dt>Preparert siste 12 timer</dt><dd>{stats.fresh_segments ?? '–'}</dd></div>
              </dl>
            )}
          </aside>
          <div className={`ski-trails-map-wrap${fullscreen ? ' is-expanded' : ''}`} ref={shellRef} role={fullscreen ? 'dialog' : undefined} aria-modal={fullscreen || undefined} aria-label={fullscreen ? 'Løypekart i fullskjerm' : undefined}>
            <div className="ski-map-toolbar" aria-label="Kartvalg">
              <span>Topografisk kart · Kartverket</span>
              <div>
                <button type="button" onClick={() => mapRef.current?.setView(CENTER, 12)}>Vis hele området</button>
                <button type="button" aria-pressed={fullscreen} onClick={toggleFullscreen}>{fullscreen ? 'Lukk fullskjerm' : 'Fullskjerm'}</button>
              </div>
            </div>
            <div ref={containerRef} className="ski-trails-map" aria-label="Kart over preparerte skiløyper på Kvamskogen"/>
            {mapError && <div className="route-map-error">{mapError}</div>}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkiTrails;

