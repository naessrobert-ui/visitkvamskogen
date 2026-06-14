import { hasSupabaseConfig, supabase } from './supabase.js';

const TRAIL_FIELDS = 'id,title,area,season,level,duration,distance,elevation,description,tips,gpx_path,status,created_at,trail_suggestion_images(id,image_path,alt_text,sort_order)';

export const TRAIL_SEASONS = ['Helår', 'Sommer', 'Vinter'];
export const TRAIL_LEVELS = ['Lett', 'Middels', 'Krevende'];

const publicImageUrl = (path) => {
  if (!path || !supabase) return '';
  const { data } = supabase.storage.from('trail-images').getPublicUrl(path);
  return data?.publicUrl || '';
};

const publicGpxUrl = (path) => {
  if (!path || !supabase) return '';
  const { data } = supabase.storage.from('trail-gpx').getPublicUrl(path);
  return data?.publicUrl || '';
};

const normalizeSuggestion = (suggestion) => ({
  ...suggestion,
  gpx_url: publicGpxUrl(suggestion.gpx_path),
  images: (suggestion.trail_suggestion_images || [])
    .slice()
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((image) => ({
      ...image,
      url: publicImageUrl(image.image_path),
    })),
});

export const loadTrailSuggestions = async () => {
  if (!hasSupabaseConfig) {
    return { suggestions: [], isConfigured: false };
  }

  const { data, error } = await supabase
    .from('trail_suggestions')
    .select(TRAIL_FIELDS)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    const message = String(error.message || '');
    if (error.code === '42P01' || error.code === 'PGRST205' || message.includes('trail_suggestions')) {
      return { suggestions: [], isConfigured: false };
    }
    throw error;
  }
  return { suggestions: (data || []).map(normalizeSuggestion), isConfigured: true };
};

const uploadSuggestionImages = async ({ suggestionId, title, files }) => {
  const images = [];
  const selectedFiles = Array.from(files || []).slice(0, 6);

  for (const [index, file] of selectedFiles.entries()) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${suggestionId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from('trail-images')
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || undefined,
        upsert: false,
      });

    if (error) throw error;
    images.push({
      suggestion_id: suggestionId,
      image_path: path,
      alt_text: title,
      sort_order: index,
    });
  }

  if (images.length) {
    const { error } = await supabase
      .from('trail_suggestion_images')
      .insert(images);
    if (error) throw error;
  }

  return images;
};

const uploadGpxFile = async ({ suggestionId, file }) => {
  if (!file) return null;
  const extension = file.name.split('.').pop()?.toLowerCase() || 'gpx';
  const path = `${suggestionId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('trail-gpx')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/gpx+xml',
      upsert: false,
    });

  if (error) throw error;
  return path;
};

export const createTrailSuggestion = async (suggestion) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  const suggestionId = crypto.randomUUID();
  // GPX lastes opp før innsetting slik at stien kan lagres direkte på raden.
  const gpxPath = await uploadGpxFile({ suggestionId, file: suggestion.gpx });

  const payload = {
    id: suggestionId,
    title: suggestion.title,
    area: suggestion.area || null,
    season: suggestion.season || 'Sommer',
    level: suggestion.level || 'Middels',
    duration: suggestion.duration || null,
    distance: suggestion.distance || null,
    elevation: suggestion.elevation || null,
    description: suggestion.description,
    tips: suggestion.tips || null,
    gpx_path: gpxPath,
    contact_name: suggestion.contactName,
    contact_email: suggestion.contactEmail,
    contact_phone: suggestion.contactPhone || null,
    status: 'pending_email_verification',
    contact_email_verified: false,
  };

  const { error } = await supabase
    .from('trail_suggestions')
    .insert(payload);

  if (error) throw error;
  await uploadSuggestionImages({ suggestionId, title: suggestion.title, files: suggestion.images });

  const { error: notificationError } = await supabase.functions.invoke('send-trail-notification', {
    body: {
      suggestionId,
      origin: window.location.origin,
    },
  });
  if (notificationError) {
    console.warn('Kunne ikke sende turforslagsvarsel.', notificationError);
  }

  return { ...payload, images: [] };
};

export const verifyTrailEmail = async ({ suggestionId, token }) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  const { data, error } = await supabase.rpc('verify_trail_email', {
    p_suggestion_id: suggestionId,
    p_token: token,
  });

  if (error) throw error;

  const { error: notificationError } = await supabase.functions.invoke('send-trail-moderation', {
    body: {
      suggestionId,
      origin: window.location.origin,
    },
  });
  if (notificationError) {
    console.warn('Kunne ikke varsle moderator.', notificationError);
    return {
      ...(data?.[0] || { ok: true }),
      moderatorNotified: false,
      moderatorError: notificationError.message || 'Kunne ikke sende varsel til administrator.',
    };
  }

  return {
    ...(data?.[0] || { ok: true }),
    moderatorNotified: true,
  };
};

export const moderateTrailSuggestion = async ({ suggestionId, token, action }) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  const { data, error } = await supabase.rpc('moderate_trail_suggestion', {
    p_suggestion_id: suggestionId,
    p_token: token,
    p_action: action,
  });

  if (error) throw error;
  return data?.[0] || { ok: true };
};
