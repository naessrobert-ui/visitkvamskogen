import { useMemo, useState } from 'react';
import Icon from './Icons.jsx';
import { MARKETPLACE_CATEGORIES, SAMPLE_LISTINGS } from '../lib/marketplace.js';
import finnData from '../data/finn_kvamskogen.json';

const categoryLabel = (category) => category || 'Annet lokalt';

const listingDate = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
};

const MarketplaceCard = ({ listing }) => {
  const image = listing.images?.[0]?.url;

  return (
    <article className="market-card">
      <div className={"market-card-media" + (!image ? ' market-card-media-empty' : '')}>
        {image ? (
          <img src={image} alt={listing.images[0]?.alt_text || listing.title} />
        ) : (
          <Icon name="mountain" size={34} />
        )}
        {listing.is_featured && <span className="market-featured">Fremhevet</span>}
      </div>
      <div className="market-card-body">
        <div className="market-card-top">
          <span className="tag tag-ok"><span className="dot" />{categoryLabel(listing.category)}</span>
          <span className="market-date">{listingDate(listing.created_at)}</span>
        </div>
        <h3>{listing.title}</h3>
        <p>{listing.description}</p>
        <dl className="market-meta">
          <div>
            <dt><Icon name="map-pin" size={15} />Område</dt>
            <dd>{listing.area || 'Kvamskogen'}</dd>
          </div>
          <div>
            <dt><Icon name="map" size={15} />Adresse</dt>
            <dd>{listing.address || 'Ikke oppgitt'}</dd>
          </div>
          <div>
            <dt><Icon name="heart" size={15} />Pris</dt>
            <dd>{listing.price || 'Etter avtale'}</dd>
          </div>
        </dl>
        <button className="btn btn-secondary btn-sm" type="button" disabled>
          Kontakt kommer
        </button>
        {listing.map_url && (
          <a className="btn btn-secondary btn-sm" href={listing.map_url} target="_blank" rel="noopener">
            Åpne i Google Maps
          </a>
        )}
      </div>
    </article>
  );
};

const formatPrice = (price) => {
  if (!price) return null;
  return new Intl.NumberFormat('no-NO').format(price) + ' kr';
};

const FinnCard = ({ ad }) => (
  <a
    className="finn-card"
    href={ad.url}
    target="_blank"
    rel="noopener noreferrer"
  >
    <div className="finn-card-media">
      {ad.image ? (
        <img src={ad.image} alt={ad.title} loading="lazy" />
      ) : (
        <Icon name="mountain" size={32} />
      )}
      <span className="finn-badge">FINN</span>
    </div>
    <div className="finn-card-body">
      <p className="finn-card-title">{ad.title}</p>
      {ad.address && <p className="finn-card-address">{ad.address}</p>}
      {ad.price ? (
        <p className="finn-card-price">{formatPrice(ad.price)}</p>
      ) : (
        <p className="finn-card-price finn-card-price--na">Pris ikke oppgitt</p>
      )}
      {ad.size ? <p className="finn-card-size">{ad.size} m²</p> : null}
    </div>
  </a>
);

const FinnSection = () => {
  const [activeType, setActiveType] = useState('fritidsbolig');
  const types = [
    { key: 'fritidsbolig', label: 'Fritidsboliger' },
    { key: 'torget', label: 'Torget' },
  ];
  const ads = finnData.annonser.filter(a => a.type === activeType);
  const oppdatert = finnData.oppdatert
    ? new Intl.DateTimeFormat('no-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(finnData.oppdatert))
    : null;

  if (finnData.annonser.length === 0) return null;

  return (
    <div className="finn-section">
      <div className="finn-section-head">
        <div>
          <h2>Fra FINN.no</h2>
          <p>
            Automatisk hentet fra FINN — kun annonser knyttet til Kvamskogen.
            {oppdatert && <> Sist oppdatert {oppdatert}.</>}
          </p>
        </div>
        <div className="finn-tabs">
          {types.map(t => (
            <button
              key={t.key}
              className={`chip${activeType === t.key ? ' active' : ''}`}
              onClick={() => setActiveType(t.key)}
            >
              {t.label}
              <span className="finn-tab-count">
                {finnData.annonser.filter(a => a.type === t.key).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      {ads.length === 0 ? (
        <div className="community-empty">Ingen {activeType === 'fritidsbolig' ? 'fritidsboliger' : 'torget-annonser'} funnet akkurat nå.</div>
      ) : (
        <div className="finn-grid">
          {ads.map(ad => <FinnCard key={ad.finnkode} ad={ad} />)}
        </div>
      )}
    </div>
  );
};

const Marketplace = ({
  listings = [],
  loading = false,
  error = '',
  supabaseConfigured = false,
  onAdd,
}) => {
  const [category, setCategory] = useState('Alle');
  const visibleListings = supabaseConfigured ? listings : SAMPLE_LISTINGS;
  const filteredListings = useMemo(() => {
    if (category === 'Alle') return visibleListings;
    return visibleListings.filter((listing) => listing.category === category);
  }, [category, visibleListings]);
  const sourceText = supabaseConfigured
    ? 'Annonser hentes fra Supabase og publiseres etter e-postbekreftelse.'
    : 'Eksempelannonser vises til Supabase-tabellene er klare.';

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
            <p>{loading ? 'Henter annonser...' : sourceText}</p>
          </div>
          <span>{filteredListings.length} annonser</span>
        </div>

        <div className="market-filters" aria-label="Filtrer annonser">
          {['Alle', ...MARKETPLACE_CATEGORIES].map((item) => (
            <button
              key={item}
              className={"chip" + (category === item ? ' active' : '')}
              type="button"
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {error && <div className="community-alert">{error}</div>}
        {supabaseConfigured && !loading && !error && filteredListings.length === 0 && (
          <div className="community-empty">
            Det ligger ingen annonser i denne kategorien ennå.
          </div>
        )}

        <div className="market-grid">
          {filteredListings.map((listing) => (
            <MarketplaceCard key={listing.id} listing={listing} />
          ))}
        </div>

        <FinnSection />
      </div>
    </section>
  );
};

export default Marketplace;
