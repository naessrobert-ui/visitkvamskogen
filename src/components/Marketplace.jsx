import { useMemo, useState } from 'react';
import Icon from './Icons.jsx';
import { MARKETPLACE_CATEGORIES, SAMPLE_LISTINGS } from '../lib/marketplace.js';

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
      </div>
    </article>
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
    ? 'Annonser hentes fra Supabase og publiseres etter godkjenning.'
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
              <li>Manuell godkjenning før publisering</li>
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
      </div>
    </section>
  );
};

export default Marketplace;
