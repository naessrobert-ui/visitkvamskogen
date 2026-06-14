import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
    return { color: '#1e3a8a', weight: 4, opacity: 0.95, dashArray: '7,6' };
  }

  if (!props.is_active) return { color: '#6b7280', weight: 3, opacity: 0.58 };

  const ageH = hoursSinceUpdate(props);
  if (ageH <= 1) return { color: '#dc2626', weight: 5.5, opacity: 1 };
  if (ageH <= 12) return { color: '#16a34a', weight: 5, opacity: 0.98 };
  if (ageH <= 24) return { color: '#4ade80', weight: 4.4, opacity: 0.94 };
  if (ageH <= 72) return { color: '#2563eb', weight: 3.8, opacity: 0.9 };
  if (ageH <= 168) return { color: '#93c5fd', weight: 3.4, opacity: 0.84 };
  return { color: '#475569', weight: 3, opacity: 0.68 };
};

const swatches = [
  ['#dc2626', 'Preparert siste time'],
  ['#16a34a', 'Preparert siste 12 timer'],
  ['#4ade80', 'Preparert siste døgn'],
  ['#2563eb', 'Preparert siste 3 døgn'],
  ['#93c5fd', 'Preparert siste uke'],
  ['#1e3a8a', 'Åpen uten prepping', true],
  ['#6b7280', 'Stengt eller inaktiv'],
];

const SkiTrails = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [mapError, setMapError] = useState('');

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
          const date = parseTrailDate(props);
          const age = date ? formatAge((Date.now() - date.getTime()) / 1000) : 'ukjent';
          layer.bindTooltip(
            `<strong>${escapeHtml(props.name || 'Skiløype')}</strong><br>Sist preparert: ${age} siden`,
            { sticky: true, direction: 'top', className: 'ski-trail-tooltip' }
          ).openTooltip(event.latlng);
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
              Kartet viser status for løypenettet på Kvamskogen med samme løypedata som tidligere lå på prisanalyse.no.
            </p>
          </div>
          <div className="ski-status-card">
            <strong>{headline}</strong>
            <span>Rødt og grønt betyr nylig preparert. Blått er eldre spor, og grått er stengt eller inaktivt.</span>
          </div>
        </div>

        <div className="ski-trails-layout">
          <aside className="ski-trails-panel">
            <h2>Statusfarger</h2>
            <ul>
              {swatches.map(([color, label, dashed]) => (
                <li key={label}>
                  <span className={dashed ? 'dashed' : ''} style={{ borderTopColor: color }}/>
                  {label}
                </li>
              ))}
            </ul>
            {stats && (
              <dl className="ski-trails-stats">
                <div><dt>Segmenter</dt><dd>{stats.total_segments ?? '–'}</dd></div>
                <div><dt>Aktive</dt><dd>{stats.active_segments ?? '–'}</dd></div>
                <div><dt>Nylig preparert</dt><dd>{stats.fresh_segments ?? '–'}</dd></div>
              </dl>
            )}
          </aside>
          <div className="ski-trails-map-wrap">
            <div ref={containerRef} className="ski-trails-map" aria-label="Kart over preparerte skiløyper på Kvamskogen"/>
            {mapError && <div className="route-map-error">{mapError}</div>}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkiTrails;
