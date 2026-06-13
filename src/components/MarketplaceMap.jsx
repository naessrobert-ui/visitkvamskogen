import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const KVAMSKOGEN_CENTER = [60.379, 5.991];
const ZOOM = 12;

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

// Interpoler RGB mellom tre stopppunkt: blå -> gul -> rød
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

const MarketplaceMap = ({ listings }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: true });
    mapRef.current = map;

    L.tileLayer(
      'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
      { attribution: '© Kartverket', maxZoom: 18 }
    ).addTo(map);

    map.setView(KVAMSKOGEN_CENTER, ZOOM);

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
      map.remove();
      mapRef.current = null;
    };
  }, [listings]);

  return (
    <div className="marketplace-map-wrap">
      <div ref={containerRef} className="marketplace-map" />
      <div className="marketplace-map-legend">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-flex', gap: 2 }}>
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <span key={t} style={{ width: 12, height: 12, borderRadius: '50%', background: heatColor(t), display: 'inline-block' }} />
            ))}
          </span>
          Lav → høy kvm-pris
        </span>
        <span style={{ color: '#888', fontSize: 12 }}>Størrelse = totalpris · Grå = mangler m² · Klikk for detaljer</span>
      </div>
    </div>
  );
};

export default MarketplaceMap;
