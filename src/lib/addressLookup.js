const KVAM_BBOX = {
  west: 5.55,
  south: 60.20,
  east: 6.35,
  north: 60.55,
};

const scoreAddress = (address) => {
  const point = address?.representasjonspunkt;
  if (!point) return 0;

  let score = 0;
  if (address.kommunenummer === '4622') score += 8;
  if (address.kommunenavn === 'KVAM') score += 4;
  if (
    point.lon >= KVAM_BBOX.west &&
    point.lon <= KVAM_BBOX.east &&
    point.lat >= KVAM_BBOX.south &&
    point.lat <= KVAM_BBOX.north
  ) {
    score += 4;
  }
  if (address.nummer) score += 2;
  return score;
};

export const googleMapsUrl = ({ lat, lon }) => {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
};

export const lookupNorwegianAddress = async (addressText) => {
  const query = String(addressText || '').trim();
  if (query.length < 3) {
    throw new Error('Skriv inn en adresse før du sjekker den.');
  }

  const params = new URLSearchParams({
    sok: `${query} Kvam`,
    treffPerSide: '8',
    asciiKompatibel: 'true',
  });

  const response = await fetch(`https://ws.geonorge.no/adresser/v1/sok?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Kunne ikke sjekke adressen akkurat nå.');
  }

  const result = await response.json();
  const matches = (result.adresser || [])
    .filter((address) => address?.representasjonspunkt)
    .sort((a, b) => scoreAddress(b) - scoreAddress(a));
  const best = matches[0];

  if (!best || scoreAddress(best) < 8) {
    throw new Error('Fant ikke adressen i Kartverket. Bruk en registrert adresse, for eksempel "Furedalen 100".');
  }

  const point = best.representasjonspunkt;
  const label = [
    best.adressetekst,
    best.postnummer,
    best.poststed,
  ].filter(Boolean).join(', ');

  return {
    label,
    address: best.adressetekst || query,
    postalCode: best.postnummer || '',
    postalPlace: best.poststed || '',
    municipality: best.kommunenavn || '',
    municipalityNumber: best.kommunenummer || '',
    lat: Number(point.lat),
    lon: Number(point.lon),
    googleMapsUrl: googleMapsUrl({ lat: point.lat, lon: point.lon }),
  };
};
