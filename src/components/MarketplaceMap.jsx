import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const KVAMSKOGEN_CENTER = [60.379, 5.991];
const ZOOM = 12;

const SOURCE_COLOR = {
  local: '#1E4D3F',   // granskog
  finn: '#0063fb',
  hjemno: '#e03e2d',
};

const formatPrice = (price) => {
  if (!price) return null;
  return new Intl.NumberFormat('no-NO').format(price) + ' kr';
};

const makeIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

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

    listings.forEach((item) => {
      const lat = item.lat ?? item.address_lat;
      const lon = item.lon ?? item.address_lon;
      if (!lat || !lon) return;

      const source = item.source || 'local';
      const color = SOURCE_COLOR[source] || SOURCE_COLOR.local;
      const price = formatPrice(item.price);
      const sourceLabel = source === 'finn' ? 'FINN' : source === 'hjemno' ? 'hjem.no' : 'Kvamskogen';

      const popup = L.popup({ maxWidth: 260 }).setContent(`
        <div style="font-family:sans-serif">
          ${item.image ? `<img src="${item.image}" style="width:100%;height:130px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block">` : ''}
          <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${color};margin-bottom:4px">${sourceLabel}</div>
          <div style="font-size:14px;font-weight:600;line-height:1.3;margin-bottom:4px">${item.title || ''}</div>
          ${item.address ? `<div style="font-size:12px;color:#666;margin-bottom:4px">${item.address}</div>` : ''}
          ${price ? `<div style="font-size:14px;font-weight:700;margin-bottom:8px">${price}</div>` : ''}
          ${item.size ? `<div style="font-size:12px;color:#666;margin-bottom:8px">${item.size} m²</div>` : ''}
          <a href="${item.url}" target="_blank" rel="noopener"
            style="display:inline-block;padding:6px 12px;border-radius:6px;background:${color};color:#fff;font-size:12px;font-weight:600;text-decoration:none">
            Se annonse →
          </a>
        </div>
      `);

      L.marker([lat, lon], { icon: makeIcon(color) })
        .addTo(map)
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
        <span><span className="marketplace-map-dot" style={{ background: SOURCE_COLOR.local }} />Kvamskogen Marked</span>
        <span><span className="marketplace-map-dot" style={{ background: SOURCE_COLOR.finn }} />FINN</span>
        <span><span className="marketplace-map-dot" style={{ background: SOURCE_COLOR.hjemno }} />hjem.no</span>
      </div>
    </div>
  );
};

export default MarketplaceMap;
