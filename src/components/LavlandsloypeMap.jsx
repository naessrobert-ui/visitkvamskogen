import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fotostopp fordelt over hele løypen i den rekkefølgen bildene faktisk
// dukker opp langs ruta. Juster lat/lon ved behov.
const PHOTO_STOPS = [
  { lat: 60.37868, lon: 5.98436, title: 'Stopp 1',  body: 'Grussti gjennom myr mot fjellsiden.',                       image: '/assets/photos/lavlandsloypen/lav4.avif' },
  { lat: 60.38743, lon: 5.96656, title: 'Stopp 2',  body: 'Bratt parti opp gjennom granskogen.',                       image: '/assets/photos/lavlandsloypen/lav6.avif' },
  { lat: 60.39191, lon: 5.9384,  title: 'Stopp 3',  body: 'Veiviser mot Røytli i bjørkelund.',                         image: '/assets/photos/lavlandsloypen/lav8.avif' },
  { lat: 60.39203, lon: 5.94438, title: 'Stopp 4',  body: 'Grussti i myrlandskap med snødekt fjelltopp i bakgrunnen.', image: '/assets/photos/lavlandsloypen/lav1.avif' },
  { lat: 60.38562, lon: 5.97283, title: 'Stopp 5',  body: 'Bredt utsyn i åpent fjellterreng under skyet himmel.',     image: '/assets/photos/lavlandsloypen/lav2.avif' },
  { lat: 60.37621, lon: 5.9882,  title: 'Stopp 6',  body: 'Sti på høyde med vidt utsyn og furutrær.',                  image: '/assets/photos/lavlandsloypen/lav3.avif' },
  { lat: 60.3774,  lon: 6.01537, title: 'Stopp 7',  body: 'Snødekt rygg over bjørkemyra.',                             image: '/assets/photos/lavlandsloypen/lav10.avif' },
  { lat: 60.3714,  lon: 6.02995, title: 'Stopp 8',  body: 'Infotavle ved Tokagjelet — 4,2 km til NAF/Røytli.',         image: '/assets/photos/lavlandsloypen/lav5.avif' },
  { lat: 60.37601, lon: 6.02067, title: 'Stopp 9',  body: 'Stien følger et lite tjern med hytter i bakgrunnen.',       image: '/assets/photos/lavlandsloypen/lav7.avif' },
  { lat: 60.37634, lon: 5.99446, title: 'Stopp 10', body: 'Utsyn fra ryggen — fjernt blå dalføre i horisonten.',       image: '/assets/photos/lavlandsloypen/lav9.avif' },
];

const LavlandsloypeMap = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/data/lavlandsloypen.json');
        if (!res.ok) throw new Error('Klarte ikke laste rutedata');
        const data = await res.json();
        if (!cancelled) setRoute(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!route || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png', {
      attribution: '© <a href="https://www.kartverket.no/">Kartverket</a>',
      maxZoom: 18,
    }).addTo(map);

    const latLngs = route.points.map(([lat, lon]) => [lat, lon]);
    const line = L.polyline(latLngs, {
      color: '#1E4D3F',
      weight: 4,
      opacity: 0.92,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(map);

    const start = latLngs[0];
    const end = latLngs[latLngs.length - 1];
    const isLoop = Math.abs(start[0] - end[0]) < 5e-4 && Math.abs(start[1] - end[1]) < 5e-4;
    const startIcon = L.divIcon({
      className: 'route-pin route-pin-start',
      html: isLoop ? '<span>S/M</span>' : '<span>S</span>',
      iconSize: isLoop ? [34, 26] : [26, 26],
      iconAnchor: isLoop ? [17, 13] : [13, 13],
    });
    L.marker(start, { icon: startIcon, title: isLoop ? 'Start og mål' : 'Start' }).addTo(map);
    if (!isLoop) {
      const endIcon = L.divIcon({
        className: 'route-pin route-pin-end',
        html: '<span>M</span>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(end, { icon: endIcon, title: 'Mål' }).addTo(map);
    }

    PHOTO_STOPS.forEach((stop) => {
      const icon = L.divIcon({
        className: 'route-stop',
        html: '<span></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const marker = L.marker([stop.lat, stop.lon], { icon, title: stop.title }).addTo(map);
      const img = stop.image ? `<img src="${stop.image}" alt="${stop.title}" />` : '';
      marker.bindPopup(`<div class="route-popup">${img}<h4>${stop.title}</h4><p>${stop.body || ''}</p></div>`, {
        maxWidth: 260,
      });
    });

    map.fitBounds(line.getBounds(), { padding: [24, 24] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [route]);

  return (
    <section className="section">
      <div className="container">
        <div className="eyebrow summer"><span className="dot"/>Lavlandsløypen</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px,4.5vw,56px)', fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
          En tur langs hele Kvamskogen — året rundt.
        </h2>
        <p className="lede" style={{ maxWidth: 720, marginBottom: 24 }}>
          Lavlandsløypen følger lavereliggende terreng på tvers av Kvamskogen og er åpen hele året. Kartet under viser nøyaktig hvor ruta går — ingen tider, ingen tempo, bare sporet.
        </p>
        <div className="route-map-wrap">
          {error && <div className="route-map-error">{error}</div>}
          <div ref={containerRef} className="route-map" aria-label="Kart over Lavlandsløypen"/>
        </div>
        {route && (
          <div className="route-facts">
            <div><strong>10 km</strong><span>en vei</span></div>
            <div><strong>Tur-retur</strong><span>samme sti tilbake</span></div>
            <div><strong>Hele året</strong><span>kan være våt etter regn</span></div>
          </div>
        )}
      </div>
    </section>
  );
};

export default LavlandsloypeMap;
