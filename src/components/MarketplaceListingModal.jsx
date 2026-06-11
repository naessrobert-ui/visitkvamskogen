import { useMemo, useState } from 'react';
import Icon from './Icons.jsx';
import { lookupNorwegianAddress } from '../lib/addressLookup.js';
import {
  MARKETPLACE_CATEGORIES,
  requiresCabinDetails,
  requiresPlotDetails,
} from '../lib/marketplace.js';

const listingTypes = [
  { value: 'sale', label: 'Selges' },
  { value: 'free', label: 'Gis bort' },
  { value: 'rent', label: 'Leies ut' },
  { value: 'wanted', label: 'Ønskes kjøpt/leid' },
  { value: 'service', label: 'Tjeneste' },
];

const MarketplaceListingModal = ({ onClose, onSubmit }) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingAddress, setCheckingAddress] = useState(false);
  const [addressStatus, setAddressStatus] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    category: 'Ting selges',
    listingType: 'sale',
    price: '',
    area: '',
    cabinSize: '',
    plotSize: '',
    plotOwnership: '',
    buildYear: '',
    address: '',
    addressLat: null,
    addressLon: null,
    addressLabel: '',
    mapUrl: '',
    description: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    expiresAt: '',
    images: [],
  });

  const needsCabinDetails = requiresCabinDetails(form.category, form.listingType);
  const needsPlotDetails = requiresPlotDetails(form.category, form.listingType);
  const currentYear = new Date().getFullYear();

  const imageSummary = useMemo(() => {
    const count = form.images.length;
    if (!count) return 'Ingen bilder valgt';
    if (count === 1) return '1 bilde valgt';
    return `${count} bilder valgt`;
  }, [form.images]);

  const update = (key) => (event) => {
    const nextForm = { ...form, [key]: event.target.value };
    if (key === 'address') {
      nextForm.addressLat = null;
      nextForm.addressLon = null;
      nextForm.addressLabel = '';
      nextForm.mapUrl = '';
      setAddressStatus('');
    }
    setForm(nextForm);
  };

  const updateImages = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 6);
    setForm({ ...form, images: files });
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
    setSubmitting(true);
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
      await onSubmit?.(listing);
      setSubmitted(true);
    } catch (submitError) {
      console.error(submitError);
      setError(submitError?.message || 'Kunne ikke sende inn annonsen akkurat nå. Prøv igjen om litt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal marketplace-modal" onClick={(event) => event.stopPropagation()}>
        {submitted ? (
          <div className="success">
            <div className="icon"><Icon name="check" size={26} /></div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, margin: '0 0 6px' }}>
              Annonsen er sendt inn
            </h3>
            <p style={{ margin: 0, color: 'var(--color-fg-subtle)', fontSize: 14 }}>
              Takk! Du får en e-post for å bekrefte annonsen. Den samme e-posten har en privat lenke for å endre annonsen senere.
            </p>
            <div style={{ marginTop: 18 }}>
              <button className="btn btn-primary" onClick={onClose}>Lukk</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <header>
              <div>
                <h3>Legg inn annonse</h3>
                <p>Gratis i første versjon. Kontaktinfo vises ikke offentlig før annonsen er godkjent.</p>
              </div>
              <button type="button" className="close" onClick={onClose} aria-label="Lukk">
                <Icon name="x" size={20} />
              </button>
            </header>
            <div className="body">
              <div className="field">
                <label htmlFor="listing-title">Tittel</label>
                <input id="listing-title" required value={form.title} onChange={update('title')} placeholder="F.eks. Hytte ønskes leid i vinterferien" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="listing-category">Kategori</label>
                  <select id="listing-category" value={form.category} onChange={update('category')}>
                    {MARKETPLACE_CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="listing-type">Annonsetype</label>
                  <select id="listing-type" value={form.listingType} onChange={update('listingType')}>
                    {listingTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="listing-price">Pris</label>
                  <input id="listing-price" value={form.price} onChange={update('price')} placeholder="Gratis, 2 500 kr, etter avtale" />
                </div>
                <div className="field">
                  <label htmlFor="listing-area">Område</label>
                  <input id="listing-area" value={form.area} onChange={update('area')} placeholder="F.eks. Furedalen, Mødalen, Tokagjelet" />
                </div>
              </div>
              {needsCabinDetails && (
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="listing-cabin-size">Hyttestørrelse (m²)</label>
                    <input
                      id="listing-cabin-size"
                      required
                      type="number"
                      min="1"
                      value={form.cabinSize}
                      onChange={update('cabinSize')}
                      placeholder="F.eks. 85"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="listing-build-year">Byggeår (ferdigstilt)</label>
                    <input
                      id="listing-build-year"
                      required
                      type="number"
                      min="1900"
                      max={currentYear}
                      value={form.buildYear}
                      onChange={update('buildYear')}
                      placeholder={`F.eks. ${currentYear - 25}`}
                    />
                  </div>
                </div>
              )}
              {needsPlotDetails && (
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="listing-plot-size">Tomtestørrelse (m²)</label>
                    <input
                      id="listing-plot-size"
                      required
                      type="number"
                      min="1"
                      value={form.plotSize}
                      onChange={update('plotSize')}
                      placeholder="F.eks. 1200"
                    />
                  </div>
                  <div className="field">
                    <label>Eierform tomt</label>
                    <div className="field-radio-row">
                      <label>
                        <input
                          type="radio"
                          name="listing-plot-ownership"
                          value="eiet"
                          required
                          checked={form.plotOwnership === 'eiet'}
                          onChange={update('plotOwnership')}
                        />
                        Eiet
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="listing-plot-ownership"
                          value="festet"
                          required
                          checked={form.plotOwnership === 'festet'}
                          onChange={update('plotOwnership')}
                        />
                        Festet
                      </label>
                    </div>
                  </div>
                </div>
              )}
              <div className="field">
                <label htmlFor="listing-address">Adresse</label>
                <div className="address-check-row">
                  <input
                    id="listing-address"
                    required
                    value={form.address}
                    onChange={update('address')}
                    placeholder="F.eks. Furedalen 100"
                  />
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
                <label htmlFor="listing-description">Beskrivelse</label>
                <textarea
                  id="listing-description"
                  required
                  rows={5}
                  value={form.description}
                  onChange={update('description')}
                  placeholder="Beskriv hva som selges, leies ut eller ønskes. Ta med tilstand, størrelse, henting og praktiske detaljer."
                />
              </div>
              <div className="field">
                <label htmlFor="listing-images">Bilder</label>
                <input id="listing-images" type="file" accept="image/*" multiple onChange={updateImages} />
                <span className="field-help">{imageSummary}. Maks 6 bilder i første versjon.</span>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="listing-name">Navn</label>
                  <input id="listing-name" required value={form.contactName} onChange={update('contactName')} placeholder="Navn eller firma" />
                </div>
                <div className="field">
                  <label htmlFor="listing-email">E-post</label>
                  <input id="listing-email" required type="email" value={form.contactEmail} onChange={update('contactEmail')} placeholder="Vises ikke offentlig" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="listing-phone">Telefon</label>
                  <input id="listing-phone" type="tel" value={form.contactPhone} onChange={update('contactPhone')} placeholder="Valgfritt" />
                </div>
                <div className="field">
                  <label htmlFor="listing-expires">Vises til</label>
                  <input id="listing-expires" type="date" value={form.expiresAt} onChange={update('expiresAt')} />
                </div>
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Avbryt</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sender...' : 'Send inn annonse'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MarketplaceListingModal;
