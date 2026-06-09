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

const formatPrice = (price) => {
  if (!price) return null;
  return new Intl.NumberFormat('no-NO').format(price) + ' kr';
};

// Interpoler RGB mellom tre stopppunkt: blå → gul → rød
const heatColor = (t) => {
  // t: 0 = billig (blå), 0.5 = middels (gul), 1 = dyr (rød)
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

// Radius basert på log(pris), skalert til [8, 22]px
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

    // Finn prisspenn for farge- og størrelsesskalering
    const pricesForScale = listings
      .map(a => {
        const sqm = a.size;
        const p = a.price;
        return sqm && p ? p / sqm : p;
      })
      .filter(Boolean);

    const logPrices = listings.map(a => a.price).filter(Boolean).map(Math.log);
    const minLog = logPrices.length ? Math.min(...logPrices) : 0;
    const maxLog = logPrices.length ? Math.max(...logPrices) : 1;

    const minSqmPrice = pricesForScale.length ? Math.min(...pricesForScale) : 0;
    const maxSqmPrice = pricesForScale.length ? Math.max(...pricesForScale) : 1;

    listings.forEach((item) => {
      const lat = item.lat ?? item.address_lat;
      const lon = item.lon ?? item.address_lon;
      if (!lat || !lon) return;

      const source = item.source || 'local';
      const sourceLabel = source === 'finn' ? 'FINN' : source === 'hjemno' ? 'hjem.no' : 'Kvamskogen';
      const sourceColor = SOURCE_COLOR[source] || SOURCE_COLOR.local;

      // Farge: kvm-pris om tilgjengeleg, elles totalpris
      const sqmPrice = item.size && item.price ? item.price / item.size : null;
      const colorBase = sqmPrice ?? item.price;
      const colorT = colorBase && maxSqmPrice > minSqmPrice
        ? (colorBase - minSqmPrice) / (maxSqmPrice - minSqmPrice)
        : 0.5;
      const fillColor = item.price ? heatColor(Math.min(1, Math.max(0, colorT))) : '#aaa';

      const radius = priceRadius(item.price, minLog, maxLog);
      const price = formatPrice(item.price);

      // Tooltip ved hover
      const tooltipLines = [
        `<strong>${item.title || ''}</strong>`,
        item.address ? `<span style="color:#666">${item.address}</span>` : null,
        price ? price : null,
        sqmPrice ? `${new Intl.NumberFormat('no-NO').format(Math.round(sqmPrice))} kr/m²` : null,
      ].filter(Boolean).join('<br>');

      // Popup ved klikk
      const popup = L.popup({ maxWidth: 260 }).setContent(`
        <div style="font-family:sans-serif">
          ${item.image ? `<img src="${item.image}" style="width:100%;height:130px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block">` : ''}
          <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${sourceColor};margin-bottom:4px">${sourceLabel}</div>
          <div style="font-size:14px;font-weight:600;line-height:1.3;margin-bottom:4px">${item.title || ''}</div>
          ${item.address ? `<div style="font-size:12px;color:#666;margin-bottom:4px">${item.address}</div>` : ''}
          ${price ? `<div style="font-size:14px;font-weight:700;margin-bottom:4px">${price}</div>` : ''}
          ${item.size ? `<div style="font-size:12px;color:#666;margin-bottom:4px">${item.size} m²${sqmPrice ? ` · ${new Intl.NumberFormat('no-NO').format(Math.round(sqmPrice))} kr/m²` : ''}</div>` : ''}
          ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener"
            style="display:inline-block;padding:6px 12px;border-radius:6px;background:${sourceColor};color:#fff;font-size:12px;font-weight:600;text-decoration:none;margin-top:4px">
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
        <span style={{ color: '#888', fontSize: 12 }}>Størrelse = totalpris · Klikk for detaljer</span>
      </div>
    </div>
  );
};

export default MarketplaceMap;
