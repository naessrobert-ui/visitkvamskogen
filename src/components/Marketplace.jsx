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

// Gjer eit kvalifisert gjettverk på kva kategori ein FINN-annonse høyrer til
const guessFinnCategory = (ad) => {
  if (ad.type === 'fritidsbolig') return 'Hytte til salgs';
  const text = `${ad.title} ${ad.address}`.toLowerCase();
  if (/hytte|fritidsbolig|cabin|hytteleilighet/.test(text)) {
    if (/leie|utleie|lei\b/.test(text)) return 'Hytte til leie';
    return 'Hytte til salgs';
  }
  if (/tomt|eiendom|hyttetomt/.test(text)) return 'Tomt til salgs';
  if (/ønskes|søker|leter etter/.test(text)) return 'Ønskes kjøpt';
  if (/tjeneste|hjelp|rydding|vedlikehold|snørydding/.test(text)) return 'Tjenester tilbys';
  if (/gir bort|gratis|gi bort/.test(text)) return 'Gis bort';
  return 'Ting selges';
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
  image: listing.images?.[0]?.url || null,
  imageObj: listing.images?.[0] ?? null,
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
const HJEMNO_SEARCH_URL = 'https://hjem.no/list?keywords=Kvamskogen&sorting=relevance&address=vestland%2Ckvam';
const SOURCES = ['Alle kilder', 'Kvamskogen', 'FINN'];
const SOURCE_MAP = { 'Kvamskogen': 'local', 'FINN': 'finn' };

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
  const [search, setSearch] = useState('');

  const supabaseListings = (supabaseConfigured ? listings : SAMPLE_LISTINGS).map(toUnified);

  // Alle FINN/hjem.no-annonser med automatisk kategori
  const externalListings = finnData.annonser.map(a => ({
    ...a,
    source: a.source || 'finn',
    priceText: a.price_text,
    type: guessFinnCategory(a),
  }));

  const allListings = [...supabaseListings, ...externalListings];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allListings.filter(item => {
      if (category !== ALL && item.type !== category) return false;
      if (source !== 'Alle kilder' && item.source !== SOURCE_MAP[source]) return false;
      if (q && !`${item.title} ${item.address} ${item.description || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allListings, category, source, search]);

  const mapListings = useMemo(() => {
    return allListings.filter(a => (a.lat ?? a.address_lat) && (a.lon ?? a.address_lon));
  }, [allListings]);

  const sourceText = supabaseConfigured
    ? 'Annonser hentes fra Supabase og publiseres etter e-postbekreftelse og godkjenning.'
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
              {oppdatert && <> FINN oppdatert {oppdatert}.</>}
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

        <div className="activity-filter-bar" style={{ marginBottom: 16 }}>
          <div className="activity-search-wrap">
            <Icon name="search" size={15} className="activity-search-icon" />
            <input
              type="search"
              className="activity-search"
              placeholder="Søk i annonser…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="activity-filter-right">
            <div className="market-source-filters" style={{ margin: 0 }}>
              {SOURCES.map(s => (
                <button key={s} className={'chip' + (source === s ? ' active' : '')} type="button" onClick={() => setSource(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="market-hjemno-banner">
          <span>Se også fritidsboliger på</span>
          <a href={HJEMNO_SEARCH_URL} target="_blank" rel="noopener noreferrer" className="market-hjemno-link">
            hjem.no →
          </a>
        </div>

        <div className="market-filters" aria-label="Filtrer annonser">
          {[ALL, ...MARKETPLACE_CATEGORIES].map((item) => (
            <button key={item} className={'chip' + (category === item ? ' active' : '')} type="button" onClick={() => setCategory(item)}>
              {item}
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
            {filtered.length === 0 && (
              <div className="community-empty">
                {search ? 'Ingen annonser matcher søket ditt.' : 'Det ligger ingen annonser i denne kategorien ennå.'}
              </div>
            )}
            <div className="market-grid">
              {filtered.map((item) => (
                <UnifiedCard key={`${item.source}-${item.id || item.finnkode}`} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Marketplace;
