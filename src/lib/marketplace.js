import { hasSupabaseConfig, supabase } from './supabase.js';

const MARKETPLACE_FIELDS = 'id,title,category,listing_type,price,area,address,address_lat,address_lon,map_url,description,contact_name,expires_at,status,is_featured,created_at,cabin_size_m2,plot_size_m2,plot_ownership,build_year,marketplace_listing_images(id,image_path,alt_text,sort_order)';

export const MARKETPLACE_CATEGORIES = [
  'Ting selges',
  'Gis bort',
  'Hytte til leie',
  'Hytte til salgs',
  'Tomt til salgs',
  'Ønskes kjøpt',
  'Tjenester tilbys',
  'Annet lokalt',
];

const CABIN_CATEGORIES = ['Hytte til salgs', 'Hytte til leie'];
const PLOT_CATEGORIES = ['Tomt til salgs'];

// Kjøps-/leieønsker gjelder ikke en konkret eiendom, så detaljkravene
// gjelder bare når noen tilbyr hytte eller tomt
export const requiresCabinDetails = (category, listingType) =>
  listingType !== 'wanted' && CABIN_CATEGORIES.includes(category);

export const requiresPlotDetails = (category, listingType) =>
  listingType !== 'wanted'
  && (CABIN_CATEGORIES.includes(category) || PLOT_CATEGORIES.includes(category));

export const PLOT_OWNERSHIP_LABELS = {
  eiet: 'Eiet tomt',
  festet: 'Festet tomt',
};

const toPositiveInt = (value) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const propertyFieldsPayload = (listing) => {
  const includeCabin = requiresCabinDetails(listing.category, listing.listingType);
  const includePlot = requiresPlotDetails(listing.category, listing.listingType);
  return {
    cabin_size_m2: includeCabin ? toPositiveInt(listing.cabinSize) : null,
    build_year: includeCabin ? toPositiveInt(listing.buildYear) : null,
    plot_size_m2: includePlot ? toPositiveInt(listing.plotSize) : null,
    plot_ownership: includePlot ? listing.plotOwnership || null : null,
  };
};

export const SAMPLE_LISTINGS = [
  {
    id: 'sample-market-1',
    title: 'Langrennsski til barn gis bort',
    category: 'Gis bort',
    listing_type: 'free',
    price: 'Gratis',
    area: 'Furedalen',
    address: 'Furedalen',
    map_url: '',
    description: 'Pent brukt skipakke for barn. Må hentes på Kvamskogen en helg.',
    contact_name: 'Hyttefolk',
    created_at: '2026-05-28T12:00:00Z',
    marketplace_listing_images: [],
  },
  {
    id: 'sample-market-2',
    title: 'Familiehytte ønskes leid i vinterferien',
    category: 'Hytte til leie',
    listing_type: 'wanted',
    price: 'Etter avtale',
    area: 'Kvamskogen',
    address: 'Etter avtale',
    map_url: '',
    description: 'Familie på fire ser etter hytte med enkel adkomst og plass til skiutstyr.',
    contact_name: 'Besøkende familie',
    created_at: '2026-05-25T12:00:00Z',
    marketplace_listing_images: [],
  },
  {
    id: 'sample-market-3',
    title: 'Vedsekker selges lokalt',
    category: 'Ting selges',
    listing_type: 'sale',
    price: '95 kr per sekk',
    area: 'Tokagjelet',
    address: 'Tokagjelet',
    map_url: '',
    description: 'Tørr bjørkeved kan leveres etter avtale på Kvamskogen.',
    contact_name: 'Lokal selger',
    created_at: '2026-05-22T12:00:00Z',
    marketplace_listing_images: [],
  },
];

const publicImageUrl = (path) => {
  if (!path || !supabase) return '';
  const { data } = supabase.storage.from('marketplace-images').getPublicUrl(path);
  return data?.publicUrl || '';
};

const normalizeListing = (listing) => ({
  ...listing,
  images: (listing.marketplace_listing_images || [])
    .slice()
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((image) => ({
      ...image,
      url: publicImageUrl(image.image_path),
    })),
});

export const loadMarketplaceListings = async () => {
  if (!hasSupabaseConfig) {
    return { listings: [], isConfigured: false };
  }

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(MARKETPLACE_FIELDS)
    .eq('status', 'published')
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    const message = String(error.message || '');
    if (error.code === '42P01' || error.code === 'PGRST205' || message.includes('marketplace_listings')) {
      return { listings: [], isConfigured: false };
    }
    throw error;
  }
  return { listings: (data || []).map(normalizeListing), isConfigured: true };
};

const uploadListingImages = async ({ listingId, title, files }) => {
  const images = [];
  const selectedFiles = Array.from(files || []).slice(0, 6);

  for (const [index, file] of selectedFiles.entries()) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${listingId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from('marketplace-images')
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || undefined,
        upsert: false,
      });

    if (error) throw error;
    images.push({
      listing_id: listingId,
      image_path: path,
      alt_text: title,
      sort_order: index,
    });
  }

  if (images.length) {
    const { error } = await supabase
      .from('marketplace_listing_images')
      .insert(images);
    if (error) throw error;
  }

  return images;
};

export const createMarketplaceListing = async (listing) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  const listingId = crypto.randomUUID();
  const payload = {
    id: listingId,
    title: listing.title,
    category: listing.category,
    listing_type: listing.listingType,
    price: listing.price || null,
    area: listing.area || null,
    address: listing.address,
    address_lat: listing.addressLat,
    address_lon: listing.addressLon,
    map_url: listing.mapUrl || null,
    description: listing.description,
    contact_name: listing.contactName,
    contact_email: listing.contactEmail,
    contact_phone: listing.contactPhone || null,
    status: 'pending_email_verification',
    expires_at: listing.expiresAt || null,
    ...propertyFieldsPayload(listing),
  };

  const { error } = await supabase
    .from('marketplace_listings')
    .insert(payload);

  if (error) throw error;
  await uploadListingImages({ listingId, title: listing.title, files: listing.images });

  const { error: notificationError } = await supabase.functions.invoke('send-marketplace-notification', {
    body: {
      listingId,
      origin: window.location.origin,
    },
  });
  if (notificationError) {
    console.warn('Kunne ikke sende markedsvarsel.', notificationError);
  }

  return { ...payload, images: [] };
};

export const verifyMarketplaceEmail = async ({ listingId, token }) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  const { data, error } = await supabase.rpc('verify_marketplace_email', {
    p_listing_id: listingId,
    p_token: token,
  });

  if (error) throw error;

  const { error: notificationError } = await supabase.functions.invoke('send-moderation-notification', {
    body: {
      listingId,
      origin: window.location.origin,
    },
  });
  if (notificationError) {
    console.warn('Kunne ikke varsle moderator.', notificationError);
  }

  return data?.[0] || { ok: true };
};

export const moderateMarketplaceListing = async ({ listingId, token, action }) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  const { data, error } = await supabase.rpc('moderate_marketplace_listing', {
    p_listing_id: listingId,
    p_token: token,
    p_action: action,
  });

  if (error) throw error;
  return data?.[0] || { ok: true };
};

export const loadOwnerMarketplaceListing = async ({ listingId, token }) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  const { data, error } = await supabase.rpc('marketplace_listing_details', {
    p_listing_id: listingId,
    p_token: token,
  });

  if (error) throw error;
  return data?.[0] || null;
};

export const updateOwnerMarketplaceListing = async ({ listingId, token, listing }) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  const propertyFields = propertyFieldsPayload(listing);
  const { data, error } = await supabase.rpc('update_marketplace_listing', {
    p_listing_id: listingId,
    p_token: token,
    p_title: listing.title,
    p_category: listing.category,
    p_listing_type: listing.listingType,
    p_price: listing.price || null,
    p_area: listing.area || null,
    p_address: listing.address,
    p_address_lat: listing.addressLat || null,
    p_address_lon: listing.addressLon || null,
    p_map_url: listing.mapUrl || null,
    p_description: listing.description,
    p_contact_name: listing.contactName,
    p_contact_phone: listing.contactPhone || null,
    p_expires_at: listing.expiresAt || null,
    p_cabin_size_m2: propertyFields.cabin_size_m2,
    p_plot_size_m2: propertyFields.plot_size_m2,
    p_plot_ownership: propertyFields.plot_ownership,
    p_build_year: propertyFields.build_year,
  });

  if (error) throw error;
  return data?.[0] || { ok: true };
};
