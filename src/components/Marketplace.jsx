import { useMemo, useState } from 'react';
import Icon from './Icons.jsx';
import MarketplaceMap from './MarketplaceMap.jsx';
import { PLOT_OWNERSHIP_LABELS, SAMPLE_LISTINGS } from '../lib/marketplace.js';
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
const PROPERTY_CATEGORIES = ['Hytte til salgs', 'Hytte til leie', 'Tomt til salgs'];
const GIVE_OR_WANTED_CATEGORIES = ['Gis bort', 'Ønskes kjøpt'];
const THINGS_CATEGORIES = ['Ting selges'];
const SERVICES_CATEGORIES = ['Tjenester tilbys'];
const OTHER_CATEGORIES = ['Annet lokalt'];
const MARKET_FILTERS = [
  { label: 'Eiendom', categories: PROPERTY_CATEGORIES },
  { label: 'Ting og utstyr', categories: THINGS_CATEGORIES },
  { label: 'Gis bort', categories: ['Gis bort'] },
  { label: 'Ønskes kjøpt', categories: ['Ønskes kjøpt'] },
  { label: 'Tjenester', categories: SERVICES_CATEGORIES },
  { label: 'Annet lokalt', categories: OTHER_CATEGORIES },
];

const categoryMatchesFilter = (item, activeFilter) => {
  if (activeFilter === ALL) return true;
  const filter = MARKET_FILTERS.find((entry) => entry.label === activeFilter);
  return filter ? filter.categories.includes(item.type) : item.type === activeFilter;
};

const listingGroup = (item) => {
  const filter = MARKET_FILTERS.find((entry) => entry.categories.includes(item.type));
  return filter?.label || 'Annet lokalt';
};

const guessFinnCategory = (ad) => {
  const text = `${ad.title} ${ad.address}`.toLowerCase();
  if (/tomt|hyttetomt|boligtomt|tomteperle/.test(text)) return 'Tomt til salgs';
  if (ad.type === 'fritidsbolig') return 'Hytte til salgs';
  if (/hytte|fritidsbolig|cabin|hytteleilighet/.test(text)) {
    if (/leie|utleie|lei\b/.test(text)) return 'Hytte til leie';
    return 'Hytte til salgs';
  }
  if (/ønskes|søker|leter etter|kjøpes/.test(text)) return 'Ønskes kjøpt';
  if (/tjeneste|hjelp|rydding|vedlikehold|snørydding|måking|vaktmester|transport|levering/.test(text)) return 'Tjenester tilbys';
  if (/gir bort|gratis|gi bort/.test(text)) return 'Gis bort';
  return 'Ting selges';
};

const listingTime = (item) => {
  const value = item.created_at || item.updated_at || item.published_at || item.date || '';
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : 0;
};

const hasListingImage = (item) => Boolean(item.image || item.imageObj);

const sortListings = (items, sort) => {
  const list = [...items];
  if (sort === 'price-low') {
    return list.sort((a, b) => (Number(a.price || Number.MAX_SAFE_INTEGER) - Number(b.price || Number.MAX_SAFE_INTEGER)) || a.sortIndex - b.sortIndex);
  }
  if (sort === 'price-high') {
    return list.sort((a, b) => (Number(b.price || 0) - Number(a.price || 0)) || a.sortIndex - b.sortIndex);
  }
  if (sort === 'newest') {
    return list.sort((a, b) => (listingTime(b) - listingTime(a)) || a.sortIndex - b.sortIndex);
  }
  return list.sort((a, b) => (
    Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured))
    || Number(PROPERTY_CATEGORIES.includes(b.type)) - Number(PROPERTY_CATEGORIES.includes(a.type))
    || a.sortIndex - b.sortIndex
  ));
};

const listingKey = (item) => `${item.source}-${item.id || item.finnkode}`;

const listingTitleKey = (item) => String(item.title || '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const isGoodFeaturedCandidate = (item) => {
  const title = listingTitleKey(item);
  return Boolean(title) && !/\b(skrot|diverse|resteparti)\b/.test(title);
};

const pickFeaturedListings = (items) => {
  const sorted = sortListings(items, 'newest').sort((a, b) => (
    Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured))
    || Number(hasListingImage(b)) - Number(hasListingImage(a))
    || listingTime(b) - listingTime(a)
    || a.sortIndex - b.sortIndex
  ));
  const picked = [];
  const seen = new Set();
  const seenTitles = new Set();
  const groupCounts = new Map();
  const typeCounts = new Map();

  const markPicked = (item) => {
    const group = listingGroup(item);
    picked.push(item);
    seen.add(listingKey(item));
    seenTitles.add(listingTitleKey(item));
    groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
    typeCounts.set(item.type, (typeCounts.get(item.type) || 0) + 1);
  };

  const take = (predicate, limit) => {
    let count = 0;
    for (const item of sorted) {
      const key = listingKey(item);
      const titleKey = listingTitleKey(item);
      if (seen.has(key) || seenTitles.has(titleKey) || !isGoodFeaturedCandidate(item) || !predicate(item)) continue;
      markPicked(item);
      count += 1;
      if (count >= limit) break;
    }
  };

  take((item) => item.is_featured, 1);
  for (const group of MARKET_FILTERS.map((filter) => filter.label)) {
    take((item) => listingGroup(item) === group, 1);
  }

  const groupHasMore = (group) => sorted.some((item) => {
    const key = listingKey(item);
    const titleKey = listingTitleKey(item);
    return listingGroup(item) !== group
      && !seen.has(key)
      && !seenTitles.has(titleKey)
      && isGoodFeaturedCandidate(item);
  });
  const typeHasMore = (type) => sorted.some((item) => {
    const key = listingKey(item);
    const titleKey = listingTitleKey(item);
    return item.type !== type
      && !seen.has(key)
      && !seenTitles.has(titleKey)
      && isGoodFeaturedCandidate(item);
  });

  for (const item of sorted) {
    if (picked.length >= 6) break;
    const key = listingKey(item);
    const titleKey = listingTitleKey(item);
    const group = listingGroup(item);
    if ((groupCounts.get(group) || 0) >= 2 && groupHasMore(group)) continue;
    if ((typeCounts.get(item.type) || 0) >= 3 && typeHasMore(item.type)) continue;
    if (!seen.has(key) && !seenTitles.has(titleKey) && isGoodFeaturedCandidate(item)) {
      markPicked(item);
    }
  }

  return picked.slice(0, 6);
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
  size: listing.cabin_size_m2 ?? null,
  plotSize: listing.plot_size_m2 ?? null,
  plotOwnership: listing.plot_ownership || null,
  buildYear: listing.build_year ?? null,
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
            {categoryLabel(item.type)}
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
          {item.plotSize && (
            <div>
              <dt><Icon name="map" size={15} />Tomt</dt>
              <dd>
                {new Intl.NumberFormat('no-NO').format(item.plotSize)} m²
                {item.plotOwnership ? ` · ${PLOT_OWNERSHIP_LABELS[item.plotOwnership] || item.plotOwnership}` : ''}
              </dd>
            </div>
          )}
          {item.buildYear && (
            <div>
              <dt><Icon name="calendar" size={15} />Byggeår</dt>
              <dd>{item.buildYear}</dd>
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
const SOURCES = ['Alle kilder', 'Kvamskogen', 'FINN', 'hjem.no'];
const SOURCE_MAP = { 'Kvamskogen': 'local', 'FINN': 'finn', 'hjem.no': 'hjemno' };
const SORT_OPTIONS = [
  { value: 'newest', label: 'Nyeste først' },
  { value: 'price-low', label: 'Laveste pris' },
  { value: 'price-high', label: 'Høyeste pris' },
  { value: 'recommended', label: 'Anbefalt' },
];

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
  const [sort, setSort] = useState('newest');

  const supabaseListings = (supabaseConfigured ? listings : SAMPLE_LISTINGS).map((listing, index) => ({
    ...toUnified(listing),
    sortIndex: index,
  }));

  // Alle FINN/hjem.no-annonser med automatisk kategori
  const externalListings = finnData.annonser.map((a, index) => ({
    ...a,
    source: a.source || 'finn',
    priceText: a.price_text,
    type: guessFinnCategory(a),
    sortIndex: supabaseListings.length + index,
  }));

  const allListings = [...supabaseListings, ...externalListings];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allListings.filter(item => {
      if (!categoryMatchesFilter(item, category)) return false;
      if (source !== 'Alle kilder' && item.source !== SOURCE_MAP[source]) return false;
      if (q && !`${item.title} ${item.type} ${item.address} ${item.description || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allListings, category, source, search]);

  const sortedListings = useMemo(() => sortListings(filtered, sort), [filtered, sort]);
  const featuredListings = useMemo(() => pickFeaturedListings(allListings), [allListings]);
  const showFeatured = view === 'grid' && category === ALL && source === 'Alle kilder' && !search.trim();
  const featuredKeys = new Set(featuredListings.map(listingKey));
  const gridListings = showFeatured
    ? sortedListings.filter((item) => !featuredKeys.has(listingKey(item)))
    : sortedListings;

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
              <li>Eiendom, utstyr og tjenester</li>
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
            <span>{sortedListings.length} annonser</span>
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
            <select className="market-sort-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sorter annonser">
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="market-hjemno-banner">
          <span>Se også fritidsboliger på</span>
          <a href={HJEMNO_SEARCH_URL} target="_blank" rel="noopener noreferrer" className="market-hjemno-link">
            hjem.no →
          </a>
        </div>

        <div className="market-filters" aria-label="Filtrer annonser">
          {[ALL, ...MARKET_FILTERS.map((filter) => filter.label)].map((item) => (
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
            {showFeatured && featuredListings.length > 0 && (
              <section className="market-featured-section" aria-label="Utvalgte annonser">
                <div className="market-section-head">
                  <div>
                    <h2>Aktuelt nå</h2>
                    <p>Et ferskt tverrsnitt av eiendom, utstyr og lokale funn.</p>
                  </div>
                </div>
                <div className="market-grid market-grid-featured">
                  {featuredListings.map((item) => (
                    <UnifiedCard key={`featured-${listingKey(item)}`} item={item} />
                  ))}
                </div>
              </section>
            )}
            {supabaseConfigured && !loading && !error && sortedListings.length === 0 && (
              <div className="community-empty">Det ligger ingen annonser i denne kategorien ennå.</div>
            )}
            {sortedListings.length === 0 && (
              <div className="community-empty">
                {search ? 'Ingen annonser matcher søket ditt.' : 'Det ligger ingen annonser i denne kategorien ennå.'}
              </div>
            )}
            {showFeatured && gridListings.length > 0 && (
              <div className="market-section-head market-section-head-list">
                <div>
                  <h2>Alle annonser</h2>
                  <p>Sorter, søk eller velg kategori for å snevre inn.</p>
                </div>
              </div>
            )}
            <div className="market-grid">
              {gridListings.map((item) => (
                <UnifiedCard key={listingKey(item)} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Marketplace;
