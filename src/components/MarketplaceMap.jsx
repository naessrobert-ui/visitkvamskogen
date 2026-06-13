import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const KVAMSKOGEN_CENTER = [60.379, 5.991];
const ZOOM = 12;
const SKI_TRAIL_TILE_URL = 'https://prisanalyse.no/ver/skiloyper-kvamskogen/tiles/segments/{z}/{x}/{y}.pbf';
const SKI_TRAIL_MAP_URL = 'https://prisanalyse.no/ver/skiloyper-kvamskogen';
const VECTOR_GRID_SCRIPT_URL = 'https://unpkg.com/leaflet.vectorgrid@1.3.0/dist/Leaflet.VectorGrid.bundled.js';
const LOCATION_ID = 'kvamskogen';

const SOURCE_COLOR = {
  local: '#1E4D3F',
  finn: '#0063fb',
  hjemno: '#e03e2d',
};

const NEUTRAL_MARKER_COLOR = '#7a8793';

const formatPrice = (price) => {
  if (!price) return null;
  return new Intl.NumberFormat('no-NO').format(price) + ' kr';
};

const formatNumber = (value) => new Intl.NumberFormat('no-NO').format(value);

const clamp01 = (value) => Math.min(1, Math.max(0, value));

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

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

const heatColor = (t) => {
  let r, g, b;
  if (t < 0.5) {
    const s = t * 2;
    r = Math.round(30 + s * (230 - 30));
    g = Math.round(100 + s * (210 - 100));
    b = Math.round(220 - s * (220 - 30));
  } else {
    const s = (t - 0.5) * 2;
    r = Math.round(230 + s * (210 - 230));
    g = Math.round(210 - s * 210);
    b = Math.round(30 - s * 10);
  }
  return `rgb(${r},${g},${b})`;
};

const priceRadius = (price, minLog, maxLog) => {
  if (!price || maxLog === minLog) return 10;
  const t = (Math.log(price) - minLog) / (maxLog - minLog);
  return 8 + t * 14;
};

const parseTrailDate = (props) => {
  if (!props?.last_update) return null;
  const date = new Date(String(props.last_update).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
};

const trailHoursSinceUpdate = (props) => {
  const date = parseTrailDate(props);
  if (!date) return Infinity;
  return (Date.now() - date.getTime()) / 36e5;
};

const skiTrailStyle = (props) => {
  if (String(props.location_id) !== LOCATION_ID) return { opacity: 0, weight: 0 };

  if (props.is_active && props.open_not_groomed) {
    return { color: '#1e3a8a', weight: 3.5, opacity: 0.9, dashArray: '7,6' };
  }

  if (!props.is_active) {
    return { color: '#6b7280', weight: 2.8, opacity: 0.55 };
  }

  const ageH = trailHoursSinceUpdate(props);
  if (ageH <= 1) return { color: '#dc2626', weight: 5, opacity: 1 };
  if (ageH <= 12) return { color: '#16a34a', weight: 4.5, opacity: 0.96 };
  if (ageH <= 24) return { color: '#4ade80', weight: 4, opacity: 0.92 };
  if (ageH <= 72) return { color: '#2563eb', weight: 3.5, opacity: 0.88 };
  if (ageH <= 168) return { color: '#93c5fd', weight: 3, opacity: 0.82 };
  return { color: '#475569', weight: 2.8, opacity: 0.62 };
};

const formatTrailAge = (props) => {
  const hours = trailHoursSinceUpdate(props);
  if (!Number.isFinite(hours)) return 'ukjent';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `${Math.round(hours)} t`;
  return `${Math.round(hours / 24)} d`;
};

const createSkiTrailLayer = () => L.vectorGrid.protobuf(SKI_TRAIL_TILE_URL, {
  maxNativeZoom: 14,
  maxZoom: 18,
  interactive: true,
  attribution: '<a href="https://prisanalyse.no/ver/skiloyper-kvamskogen" target="_blank" rel="noopener">Løypedata</a>',
  vectorTileLayerStyles: {
    segments: skiTrailStyle,
  },
  getFeatureId: (feature) => {
    const props = feature.properties || {};
    return `${props.id ?? ''}:${props.track_id ?? ''}`;
  },
});

const MarketplaceMap = ({ listings }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const trailLayerRef = useRef(null);
  const showSkiTrailsRef = useRef(true);
  const [showSkiTrails, setShowSkiTrails] = useState(true);
  const [trailLayerAvailable, setTrailLayerAvailable] = useState(true);

  useEffect(() => {
    showSkiTrailsRef.current = showSkiTrails;
  }, [showSkiTrails]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: true });
    mapRef.current = map;

    L.tileLayer(
      'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
      { attribution: '© Kartverket', maxZoom: 18 }
    ).addTo(map);

    map.setView(KVAMSKOGEN_CENTER, ZOOM);

    loadVectorGrid()
      .then(() => {
        if (cancelled || !mapRef.current || !L.vectorGrid?.protobuf) return;
        const layer = createSkiTrailLayer();
        trailLayerRef.current = layer;
        layer.on('mouseover', (event) => {
          const props = event.layer?.properties || {};
          if (String(props.location_id) !== LOCATION_ID) return;
          const title = escapeHtml(props.name || 'Skiløype');
          layer.bindTooltip(
            `<strong>${title}</strong><br>Sist preparert: ${formatTrailAge(props)} siden`,
            { sticky: true, direction: 'top', className: 'marketplace-trail-tooltip' }
          ).openTooltip(event.latlng);
        });
        if (showSkiTrailsRef.current) layer.addTo(map);
      })
      .catch(() => {
        if (!cancelled) setTrailLayerAvailable(false);
      });

    const sqmPricesForScale = listings
      .map((item) => (item.size && item.price ? item.price / item.size : null))
      .filter(Boolean);

    const logPrices = listings.map((item) => item.price).filter(Boolean).map(Math.log);
    const minLog = logPrices.length ? Math.min(...logPrices) : 0;
    const maxLog = logPrices.length ? Math.max(...logPrices) : 1;

    const minSqmPrice = percentile(sqmPricesForScale, 0.1);
    const maxSqmPrice = percentile(sqmPricesForScale, 0.9);

    listings.forEach((item) => {
      const lat = item.lat ?? item.address_lat;
      const lon = item.lon ?? item.address_lon;
      if (!lat || !lon) return;

      const source = item.source || 'local';
      const sourceLabel = source === 'finn' ? 'FINN' : source === 'hjemno' ? 'hjem.no' : 'Kvamskogen';
      const sourceColor = SOURCE_COLOR[source] || SOURCE_COLOR.local;
      const sqmPrice = item.size && item.price ? item.price / item.size : null;
      const colorT = sqmPrice && maxSqmPrice > minSqmPrice
        ? (sqmPrice - minSqmPrice) / (maxSqmPrice - minSqmPrice)
        : 0.5;
      const fillColor = sqmPrice ? heatColor(clamp01(colorT)) : NEUTRAL_MARKER_COLOR;
      const radius = priceRadius(item.price, minLog, maxLog);
      const price = formatPrice(item.price);
      const roundedSqmPrice = sqmPrice ? Math.round(sqmPrice) : null;

      const tooltipLines = [
        `<strong>${escapeHtml(item.title)}</strong>`,
        item.address ? `<span style="color:#666">${escapeHtml(item.address)}</span>` : null,
        price ? escapeHtml(price) : null,
        roundedSqmPrice ? `${formatNumber(roundedSqmPrice)} kr/m²` : null,
      ].filter(Boolean).join('<br>');

      const popup = L.popup({
        minWidth: 320,
        maxWidth: 420,
        className: 'marketplace-listing-popup',
      }).setContent(`
        <div style="font-family:sans-serif;max-width:380px">
          ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" style="width:100%;height:150px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block">` : ''}
          <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${sourceColor};margin-bottom:4px">${sourceLabel}</div>
          <div style="font-size:15px;font-weight:600;line-height:1.3;margin-bottom:4px">${escapeHtml(item.title)}</div>
          ${item.address ? `<div style="font-size:12px;color:#666;margin-bottom:4px">${escapeHtml(item.address)}</div>` : ''}
          ${price ? `<div style="font-size:14px;font-weight:700;margin-bottom:4px">${escapeHtml(price)}</div>` : ''}
          ${item.size ? `<div style="font-size:12px;color:#666;margin-bottom:4px">${formatNumber(item.size)} m²${roundedSqmPrice ? ` · ${formatNumber(roundedSqmPrice)} kr/m²` : ''}</div>` : ''}
          ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener"
            style="display:inline-block;padding:7px 13px;border-radius:6px;background:${sourceColor};color:#fff;font-size:12px;font-weight:600;text-decoration:none;margin-top:4px">
            Se annonse →
          </a>` : ''}
        </div>
      `);

      L.circleMarker([lat, lon], {
        radius,
        fillColor,
        fillOpacity: 0.85,
        color: '#fff',
        weight: 1.5,
      })
        .addTo(map)
        .bindTooltip(tooltipLines, { direction: 'top', offset: [0, -radius] })
        .bindPopup(popup);
    });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
      trailLayerRef.current = null;
    };
  }, [listings]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = trailLayerRef.current;
    if (!map || !layer) return;

    if (showSkiTrails) {
      if (!map.hasLayer(layer)) layer.addTo(map);
    } else if (map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  }, [showSkiTrails]);

  return (
    <div className="marketplace-map-wrap">
      <div ref={containerRef} className="marketplace-map" />
      <div className="marketplace-map-legend">
        <button
          className={'marketplace-map-toggle' + (showSkiTrails ? ' active' : '')}
          type="button"
          onClick={() => setShowSkiTrails((value) => !value)}
          disabled={!trailLayerAvailable}
        >
          Skiløyper
        </button>
        <span className="marketplace-trail-legend">
          <span className="trail-line trail-line-red" />
          &lt; 1 t
          <span className="trail-line trail-line-green" />
          &lt; 12 t
          <span className="trail-line trail-line-blue" />
          &lt; 3 d
          <span className="trail-line trail-line-dashed" />
          Åpen
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-flex', gap: 2 }}>
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <span key={t} style={{ width: 12, height: 12, borderRadius: '50%', background: heatColor(t), display: 'inline-block' }} />
            ))}
          </span>
          Lav → høy kvm-pris
        </span>
        <span style={{ color: '#888', fontSize: 12 }}>
          Størrelse = totalpris · Grå = mangler m² · Klikk for detaljer · <a href={SKI_TRAIL_MAP_URL} target="_blank" rel="noopener">Stort løypekart</a>
        </span>
      </div>
    </div>
  );
};

export default MarketplaceMap;
