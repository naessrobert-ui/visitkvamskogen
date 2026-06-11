import { useEffect, useState } from 'react';
import Icon from './Icons.jsx';
import { lookupNorwegianAddress } from '../lib/addressLookup.js';
import { MARKETPLACE_CATEGORIES, loadOwnerMarketplaceListing, updateOwnerMarketplaceListing } from '../lib/marketplace.js';

const listingTypes = [
  { value: 'sale', label: 'Selges' },
  { value: 'free', label: 'Gis bort' },
  { value: 'rent', label: 'Leies ut' },
  { value: 'wanted', label: 'Ønskes kjøpt/leid' },
  { value: 'service', label: 'Tjeneste' },
];

const statusText = {
  pending_email_verification: 'Venter på e-postbekreftelse',
  pending: 'Venter på godkjenning',
  published: 'Publisert',
  rejected: 'Avvist',
  expired: 'Utløpt',
};

const dateValue = (value) => value ? String(value).slice(0, 10) : '';

const MarketplaceListingDashboard = ({ access }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingAddress, setCheckingAddress] = useState(false);
  const [addressStatus, setAddressStatus] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const listing = await loadOwnerMarketplaceListing(access);
        if (cancelled) return;
        if (!listing) {
          setError('Fant ikke annonsen.');
          return;
        }
        setStatus(listing.status);
        setForm({
          title: listing.title || '',
          category: listing.category || 'Ting selges',
          listingType: listing.listing_type || 'sale',
          price: listing.price || '',
          area: listing.area || '',
          address: listing.address || '',
          addressLat: listing.address_lat || null,
          addressLon: listing.address_lon || null,
          addressLabel: listing.address || '',
          mapUrl: listing.map_url || '',
          description: listing.description || '',
          contactName: listing.contact_name || '',
          contactEmail: listing.contact_email || '',
          contactPhone: listing.contact_phone || '',
          expiresAt: dateValue(listing.expires_at),
        });
      } catch (_) {
        if (!cancelled) setError('Kunne ikke hente annonsen. Lenken kan være ugyldig.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [access]);

  const update = (key) => (event) => {
    setForm((current) => {
      const next = { ...current, [key]: event.target.value };
      if (key === 'address') {
        next.addressLat = null;
        next.addressLon = null;
        next.addressLabel = '';
        next.mapUrl = '';
        setAddressStatus('');
      }
      return next;
    });
  };

  const checkAddress = async () => {
    setCheckingAddress(true);
    setError('');
    try {
      const result = await lookupNorwegianAddress(form.address);
      setForm((current) => ({
        ...current,
        address: result.address,
        area: current.area || result.postalPlace || result.municipality,
        addressLat: result.lat,
        addressLon: result.lon,
        addressLabel: result.label,
        mapUrl: result.googleMapsUrl,
      }));
      setAddressStatus(`Adresse funnet: ${result.label}`);
      return result;
    } catch (addressError) {
      setAddressStatus('');
      setError(addressError?.message || 'Kunne ikke sjekke adressen akkurat nå.');
      throw addressError;
    } finally {
      setCheckingAddress(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      let listing = form;
      if (!form.addressLat || !form.addressLon) {
        const result = await checkAddress();
        listing = {
          ...form,
          address: result.address,
          area: form.area || result.postalPlace || result.municipality,
          addressLat: result.lat,
          addressLon: result.lon,
          addressLabel: result.label,
          mapUrl: result.googleMapsUrl,
        };
      }
      const result = await updateOwnerMarketplaceListing({
        listingId: access.listingId,
        token: access.token,
        listing,
      });
      setStatus(result.status || 'published');
      setError('Endringene er lagret.');
    } catch (_) {
      setError('Kunne ikke lagre endringene akkurat nå.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="section organizer-page">
      <div className="container">
        <div className="organizer-header">
          <h1>Endre annonse</h1>
          <p>Dette er en privat lenke. Ikke del den med andre.</p>
        </div>

        {loading && <div className="community-empty">Henter annonsen...</div>}
        {!loading && error && !form && <div className="community-alert">{error}</div>}

        {form && (
          <form className="organizer-panel marketplace-owner-form" onSubmit={submit}>
            <div className="market-owner-status">
              <Icon name="check" size={16} />
              {statusText[status] || status}
            </div>
            <div className="field">
              <label htmlFor="owner-listing-title">Tittel</label>
              <input id="owner-listing-title" required value={form.title} onChange={update('title')} />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="owner-listing-category">Kategori</label>
                <select id="owner-listing-category" value={form.category} onChange={update('category')}>
                  {MARKETPLACE_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="owner-listing-type">Annonsetype</label>
                <select id="owner-listing-type" value={form.listingType} onChange={update('listingType')}>
                  {listingTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="owner-listing-price">Pris</label>
                <input id="owner-listing-price" value={form.price} onChange={update('price')} />
              </div>
              <div className="field">
                <label htmlFor="owner-listing-area">Område</label>
                <input id="owner-listing-area" value={form.area} onChange={update('area')} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="owner-listing-address">Adresse</label>
              <div className="address-check-row">
                <input id="owner-listing-address" required value={form.address} onChange={update('address')} />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={checkAddress}
                  disabled={checkingAddress}
                >
                  {checkingAddress ? 'Sjekker...' : 'Sjekk'}
                </button>
              </div>
              {addressStatus && <span className="field-help field-help-success">{addressStatus}</span>}
            </div>
            <div className="field">
              <label htmlFor="owner-listing-description">Beskrivelse</label>
              <textarea id="owner-listing-description" required rows={5} value={form.description} onChange={update('description')} />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="owner-listing-name">Navn</label>
                <input id="owner-listing-name" required value={form.contactName} onChange={update('contactName')} />
              </div>
              <div className="field">
                <label htmlFor="owner-listing-email">E-post</label>
                <input id="owner-listing-email" type="email" readOnly value={form.contactEmail} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="owner-listing-phone">Telefon</label>
                <input id="owner-listing-phone" type="tel" value={form.contactPhone} onChange={update('contactPhone')} />
              </div>
              <div className="field">
                <label htmlFor="owner-listing-expires">Vises til</label>
                <input id="owner-listing-expires" type="date" value={form.expiresAt} onChange={update('expiresAt')} />
              </div>
            </div>
            {error && <div className={error.includes('lagret') ? 'community-alert community-alert-success' : 'community-alert'}>{error}</div>}
            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Lagrer...' : 'Lagre endringer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default MarketplaceListingDashboard;
