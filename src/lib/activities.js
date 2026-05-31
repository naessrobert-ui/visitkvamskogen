import { hasSupabaseConfig, supabase } from './supabase.js';

const ACTIVITY_FIELDS = 'id,title,type,date,time,place,price,organizer,description,status,created_at';

export const loadActivities = async () => {
  if (!hasSupabaseConfig) {
    return { activities: [], isConfigured: false };
  }

  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_FIELDS)
    .eq('status', 'published')
    .gte('date', new Date().toISOString().slice(0, 10))
    .order('date', { ascending: true })
    .order('time', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return { activities: data || [], isConfigured: true };
};

export const createActivity = async (activity) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  const payload = {
    title: activity.title,
    type: activity.type,
    date: activity.date,
    time: activity.time || null,
    place: activity.place,
    price: activity.price || 'Gratis',
    organizer: activity.organizer || null,
    email: activity.email || null,
    description: activity.description,
    status: 'published',
  };

  const { data, error } = await supabase
    .from('activities')
    .insert(payload)
    .select(ACTIVITY_FIELDS)
    .single();

  if (error) throw error;
  return data;
};

export const createSignup = async (signup) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  const payload = {
    activity_id: signup.activityId,
    name: signup.name,
    email: signup.email,
    phone: signup.phone || null,
    people_count: Number(signup.peopleCount || 1),
    message: signup.message || null,
  };

  const { error } = await supabase
    .from('activity_signups')
    .insert(payload);

  if (error) throw error;
  return { ok: true };
};
