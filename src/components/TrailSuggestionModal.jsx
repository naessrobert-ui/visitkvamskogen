import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from './Icons.jsx';

// GPX er XML — leser ut trackpunkter (eller rutepunkter som fallback) uten ekstra bibliotek.
const parseGpxPoints = (xmlText) => {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) return [];
  const read = (tag) => Array.from(doc.getElementsByTagNameNS('*', tag))
    .map((pt) => [parseFloat(pt.getAttribute('lat')), parseFloat(pt.getAttribute('lon'))])
    .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
  const track = read('trkpt');
  return track.length ? track : read('rtept');
};

// Veldig tette spor tegnes raskere uten å miste formen om vi tynner dem litt.
const decimate = (points, max = 3000) => {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const thinned = points.filter((_, index) => index % step === 0);
  const last = points[points.length - 1];
  if (thinned[thinned.length - 1] !== last) thinned.push(last);
  return thinned;
};

const TrailMap = ({ gpxUrl }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!gpxUrl) {
      setStatus('empty');
      return undefined;
    }

    let cancelled = false;
    setStatus('loading');

    (async () => {
      try {
        const res = await fetch(gpxUrl);
        if (!res.ok) throw new Error('Klarte ikke laste GPX-sporet');
        const points = decimate(parseGpxPoints(await res.text()));
        if (cancelled) return;
        if (points.length < 2 || !containerRef.current) {
          setStatus('empty');
          return;
        }

        const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: true });
        mapRef.current = map;

        L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png', {
          attribution: '© <a href="https://www.kartverket.no/">Kartverket</a>',
          maxZoom: 18,
        }).addTo(map);

        const line = L.polyline(points, {
          color: '#1E4D3F',
          weight: 4,
          opacity: 0.92,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);

        const start = points[0];
        const end = points[points.length - 1];
        const isLoop = Math.abs(start[0] - end[0]) < 5e-4 && Math.abs(start[1] - end[1]) < 5e-4;
        L.marker(start, {
          icon: L.divIcon({
            className: 'route-pin route-pin-start',
            html: isLoop ? '<span>S/M</span>' : '<span>S</span>',
            iconSize: isLoop ? [34, 26] : [26, 26],
            iconAnchor: isLoop ? [17, 13] : [13, 13],
          }),
          title: isLoop ? 'Start og mål' : 'Start',
        }).addTo(map);
        if (!isLoop) {
          L.marker(end, {
            icon: L.divIcon({
              className: 'route-pin route-pin-end',
              html: '<span>M</span>',
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            }),
            title: 'Mål',
          }).addTo(map);
        }

        map.fitBounds(line.getBounds(), { padding: [24, 24] });
        // Modalen får først endelig størrelse etter at den er montert.
        requestAnimationFrame(() => mapRef.current?.invalidateSize());
        setStatus('ready');
      } catch (_) {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [gpxUrl]);

  if (status === 'empty') return null;

  return (
    <div className="route-map-wrap trail-detail-map">
      {status === 'error' && <div className="route-map-error">Kunne ikke vise GPX-sporet.</div>}
      <div ref={containerRef} className="route-map" aria-label="Kart med GPX-spor" />
    </div>
  );
};

const TrailSuggestionModal = ({ suggestion, onClose }) => {
  const images = suggestion.images || [];
  const [active, setActive] = useState(0);
  const hasImages = images.length > 0;
  const current = images[Math.min(active, images.length - 1)];

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (!hasImages) return;
      if (event.key === 'ArrowRight') setActive((i) => (i + 1) % images.length);
      if (event.key === 'ArrowLeft') setActive((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasImages, images.length, onClose]);

  const facts = [
    { label: 'Tid', value: suggestion.duration },
    { label: 'Lengde', value: suggestion.distance },
    { label: 'Høyde', value: suggestion.elevation },
  ].filter((fact) => fact.value);

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal trail-detail" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h3>{suggestion.title}</h3>
            <p>
              <Icon name="map-pin" size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
              {suggestion.area || 'Kvamskogen'} · {suggestion.season} · {suggestion.level}
            </p>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Lukk">
            <Icon name="x" size={20} />
          </button>
        </header>

        <div className="body">
          {hasImages && (
            <div className="trail-gallery">
              <div className="trail-gallery-main">
                <img src={current.url} alt={current.alt_text || suggestion.title} />
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="trail-gallery-nav prev"
                      onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
                      aria-label="Forrige bilde"
                    >
                      <Icon name="arrow-right" size={18} />
                    </button>
                    <button
                      type="button"
                      className="trail-gallery-nav next"
                      onClick={() => setActive((i) => (i + 1) % images.length)}
                      aria-label="Neste bilde"
                    >
                      <Icon name="arrow-right" size={18} />
                    </button>
                    <span className="trail-gallery-count">{active + 1} / {images.length}</span>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="trail-gallery-thumbs">
                  {images.map((image, index) => (
                    <button
                      key={image.id || index}
                      type="button"
                      className={'trail-gallery-thumb' + (index === active ? ' active' : '')}
                      onClick={() => setActive(index)}
                      aria-label={`Bilde ${index + 1}`}
                    >
                      <img src={image.url} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {facts.length > 0 && (
            <dl className="trail-suggestion-facts trail-detail-facts">
              {facts.map((fact) => (
                <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
              ))}
            </dl>
          )}

          {suggestion.description && <p className="trail-detail-text">{suggestion.description}</p>}

          {suggestion.tips && (
            <div className="trail-detail-tips">
              <strong>Tips</strong>
              <p>{suggestion.tips}</p>
            </div>
          )}

          <TrailMap gpxUrl={suggestion.gpx_url} />

          {suggestion.gpx_url && (
            <a className="btn-ghost trail-detail-gpx" href={suggestion.gpx_url} target="_blank" rel="noopener" download>
              <Icon name="arrow-right" size={15} /> Last ned GPX-spor
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrailSuggestionModal;
