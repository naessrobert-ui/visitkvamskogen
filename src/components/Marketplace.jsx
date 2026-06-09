import { useMemo, useState } from 'react';
import Icon from './Icons.jsx';
import MarketplaceMap from './MarketplaceMap.jsx';
import { MARKETPLACE_CATEGORIES, SAMPLE_LISTINGS } from '../lib/marketplace.js';
import finnData from '../data/finn_kvamskogen.json';

const categoryLabel = (category) => category || 'Annet lokalt';

const listingDate = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('no-NO', { day: 'numeric', month: 'short' }).format(new Date(value));
};

const formatPrice = (price) => {
  if (!price) return null;
  return new Intl.NumberFormat('no-NO').format(price) + ' kr';
};

// Konverter Supabase-annonse til felles format
const toUnified = (listing) => ({
  id: listing.id,
  source: 'local',
  type: listing.category,
  title: listing.title,
  address: listing.address || '',
  price: typeof listing.price === 'number' ? listing.price : null,
  priceText: listing.price || 'Etter avtale',
  size: null,
  lat: listing.address_lat ?? null,
  lon: listing.address_lon ?? null,
  image: listing.marketplace_listing_images?.[0]
    ? null  // hentes via Supabase storage URL — vises via MarketplaceCard
    : null,
  imageObj: listing.marketplace_listing_images?.[0] ?? null,
  url: null,
  created_at: listing.created_at,
  area: listing.area,
  map_url: listing.map_url,
  is_featured: listing.is_featured,
  contact_name: listing.contact_name,
  description: listing.description,
});

const SOURCE_BADGE = {
  finn: { label: 'FINN', color: '#0063fb' },
  hjemno: { label: 'hjem.no', color: '#e03e2d' },
};

const UnifiedCard = ({ item, onSignup }) => {
  const isExternal = item.source !== 'local';
  const badge = SOURCE_BADGE[item.source];

  const content = (
    <article className={`market-card${isExternal ? ' market-card-external' : ''}`}>
      <div className={'market-card-media' + (!item.image && !item.imageObj ? ' market-card-media-empty' : '')}>
        {item.image ? (
          <img src={item.image} alt={item.title} loading="lazy" />
        ) : item.imageObj ? (
          <img src={item.imageObj.url} alt={item.imageObj.alt_text || item.title} loading="lazy" />
        ) : (
          <Icon name="mountain" size={34} />
        )}
        {item.is_featured && <span className="market-featured">Fremhevet</span>}
        {badge && (
          <span className="market-source-badge" style={{ background: badge.color }}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="market-card-body">
        <div className="market-card-top">
          <span className="tag tag-ok">
            <span className="dot" />
            {isExternal ? 'Fritidsbolig' : categoryLabel(item.type)}
          </span>
          {item.created_at && <span className="market-date">{listingDate(item.created_at)}</span>}
        </div>
        <h3>{item.title}</h3>
        {item.description && <p>{item.description}</p>}
        <dl className="market-meta">
          {(item.area || item.address) && (
            <div>
              <dt><Icon name="map-pin" size={15} />Sted</dt>
              <dd>{item.area || item.address}</dd>
            </div>
          )}
          {item.size && (
            <div>
              <dt><Icon name="mountain" size={15} />Størrelse</dt>
              <dd>{item.size} m²</dd>
            </div>
          )}
          <div>
            <dt><Icon name="heart" size={15} />Pris</dt>
            <dd>{item.price ? formatPrice(item.price) : (item.priceText || 'Etter avtale')}</dd>
          </div>
        </dl>
        {isExternal ? (
          <span className="btn btn-secondary btn-sm market-card-ext-link">
            Se på {badge.label} →
          </span>
        ) : (
          <button className="btn btn-secondary btn-sm" type="button" disabled>
            Kontakt kommer
          </button>
        )}
        {!isExternal && item.map_url && (
          <a className="btn btn-secondary btn-sm" href={item.map_url} target="_blank" rel="noopener">
            Åpne i Google Maps
          </a>
        )}
      </div>
    </article>
  );

  if (isExternal && item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="market-card-link">
        {content}
      </a>
    );
  }
  return content;
};

const ALL = 'Alle';
const SOURCES = ['Alle kilder', 'Kvamskogen', 'FINN', 'hjem.no'];
const SOURCE_MAP = { 'Kvamskogen': 'local', 'FINN': 'finn', 'hjem.no': 'hjemno' };

const Marketplace = ({
  listings = [],
  loading = false,
  error = '',
  supabaseConfigured = false,
  onAdd,
}) => {
  const [category, setCategory] = useState(ALL);
  const [source, setSource] = useState('Alle kilder');
  const [view, setView] = useState('grid');

  const supabaseListings = (supabaseConfigured ? listings : SAMPLE_LISTINGS).map(toUnified);

  const finnListings = finnData.annonser
    .filter(a => a.type === 'fritidsbolig')
    .map(a => ({ ...a, source: a.source || 'finn', priceText: a.price_text }));

  const torgetListings = finnData.annonser
    .filter(a => a.type === 'torget')
    .map(a => ({ ...a, source: a.source || 'finn', priceText: a.price_text }));

  const allListings = [...supabaseListings, ...finnListings];

  const filtered = useMemo(() => {
    return allListings.filter(item => {
      if (category !== ALL && item.type !== category) return false;
      if (source !== 'Alle kilder' && item.source !== SOURCE_MAP[source]) return false;
      return true;
    });
  }, [allListings, category, source]);

  const mapListings = useMemo(() => {
    const combined = [...allListings, ...torgetListings];
    return combined.filter(a => (a.lat ?? a.address_lat) && (a.lon ?? a.address_lon));
  }, [allListings, torgetListings]);

  const sourceText = supabaseConfigured
    ? 'Annonser hentes fra Supabase og publiseres etter e-postbekreftelse.'
    : 'Eksempelannonser vises til Supabase-tabellene er klare.';

  const oppdatert = finnData.oppdatert
    ? new Intl.DateTimeFormat('no-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(finnData.oppdatert))
    : null;

  return (
    <section className="section market-page">
      <div className="container">
        <div className="market-hero">
          <div className="market-hero-content">
            <div className="eyebrow autumn"><span className="dot" />Kvamskogen Marked</div>
            <h1>Kjøp, selg, lei ut og gi bort lokalt.</h1>
            <p className="lede">
              En gratis markedsplass for hyttefolk, fastboende og besøkende på Kvamskogen.
              Legg inn alt fra ski og utstyr til hytter, tomter, tjenester og ønsker om kjøp.
            </p>
            <div className="market-actions">
              <button className="btn btn-accent" onClick={onAdd}>
                <Icon name="plus" size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
                Legg inn annonse
              </button>
            </div>
          </div>
          <aside className="market-note" aria-label="Slik fungerer Kvamskogen Marked">
            <strong>Gratis start</strong>
            <p>
              Første versjon er enkel og moderert. Senere kan markedsplassen få fremhevede
              annonser, lengre visningstid og egne valg for næringsdrivende.
            </p>
            <ul>
              <li>Bilder og kategori</li>
              <li>Hytte, tomt, utstyr og tjenester</li>
              <li>E-postbekreftelse før publisering</li>
              <li>Kontakt uten å vise e-post åpent</li>
            </ul>
          </aside>
        </div>

        <div className="market-toolbar">
          <div>
            <h2>Annonser</h2>
            <p>
              {loading ? 'Henter annonser...' : sourceText}
              {oppdatert && <> FINN og hjem.no oppdatert {oppdatert}.</>}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{filtered.length} annonser</span>
            <div className="activity-view-toggle" style={{ marginLeft: 8 }}>
              <button className={`chip${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')}>
                <Icon name="list" size={14} /> Grid
              </button>
              <button className={`chip${view === 'map' ? ' active' : ''}`} onClick={() => setView('map')}>
                <Icon name="map-pin" size={14} /> Kart
              </button>
            </div>
          </div>
        </div>

        <div className="market-filters" aria-label="Filtrer annonser">
          {[ALL, ...MARKETPLACE_CATEGORIES].map((item) => (
            <button key={item} className={'chip' + (category === item ? ' active' : '')} type="button" onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="market-source-filters">
          {SOURCES.map(s => (
            <button key={s} className={'chip' + (source === s ? ' active' : '')} type="button" onClick={() => setSource(s)}>
              {s}
            </button>
          ))}
        </div>

        {error && <div className="community-alert">{error}</div>}

        {view === 'map' ? (
          <MarketplaceMap listings={mapListings} />
        ) : (
          <>
            {supabaseConfigured && !loading && !error && filtered.length === 0 && (
              <div className="community-empty">Det ligger ingen annonser i denne kategorien ennå.</div>
            )}
            <div className="market-grid">
              {filtered.map((item) => (
                <UnifiedCard key={`${item.source}-${item.id || item.finnkode}`} item={item} />
              ))}
            </div>

            {torgetListings.length > 0 && source === 'Alle kilder' && (
              <div className="finn-section">
                <div className="finn-section-head">
                  <div>
                    <h2>Torget – FINN</h2>
                    <p>Ting til salgs fra Kvamskogen-søk på FINN torget.</p>
                  </div>
                  <span className="finn-tab-count" style={{ fontSize: 13, padding: '4px 10px' }}>
                    {torgetListings.length}
                  </span>
                </div>
                <div className="finn-grid">
                  {torgetListings.map(ad => (
                    <a key={ad.finnkode} className="finn-card" href={ad.url} target="_blank" rel="noopener noreferrer">
                      <div className="finn-card-media">
                        {ad.image ? <img src={ad.image} alt={ad.title} loading="lazy" /> : <Icon name="mountain" size={32} />}
                        <span className="finn-badge">FINN</span>
                      </div>
                      <div className="finn-card-body">
                        <p className="finn-card-title">{ad.title}</p>
                        {ad.address && <p className="finn-card-address">{ad.address}</p>}
                        {ad.price
                          ? <p className="finn-card-price">{formatPrice(ad.price)}</p>
                          : <p className="finn-card-price finn-card-price--na">Pris ikke oppgitt</p>}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default Marketplace;
