import { hasSupabaseConfig, supabase } from './supabase.js';

const MARKETPLACE_FIELDS = 'id,title,category,listing_type,price,area,address,description,contact_name,expires_at,status,is_featured,created_at,marketplace_listing_images(id,image_path,alt_text,sort_order)';

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

export const SAMPLE_LISTINGS = [
  {
    id: 'sample-market-1',
    title: 'Langrennsski til barn gis bort',
    category: 'Gis bort',
    listing_type: 'free',
    price: 'Gratis',
    area: 'Furedalen',
    address: 'Furedalen',
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
    description: listing.description,
    contact_name: listing.contactName,
    contact_email: listing.contactEmail,
    contact_phone: listing.contactPhone || null,
    status: 'pending_email_verification',
    expires_at: listing.expiresAt || null,
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

  const { data, error } = await supabase.rpc('update_marketplace_listing', {
    p_listing_id: listingId,
    p_token: token,
    p_title: listing.title,
    p_category: listing.category,
    p_listing_type: listing.listingType,
    p_price: listing.price || null,
    p_area: listing.area || null,
    p_address: listing.address,
    p_description: listing.description,
    p_contact_name: listing.contactName,
    p_contact_phone: listing.contactPhone || null,
    p_expires_at: listing.expiresAt || null,
  });

  if (error) throw error;
  return data?.[0] || { ok: true };
};
