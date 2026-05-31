import { hasSupabaseConfig, supabase } from './supabase.js';

const ACTIVITY_FIELDS_BASE = 'id,title,type,date,time,place,price,organizer,description,status,created_at';
const ACTIVITY_FIELDS_EXTENDED = `${ACTIVITY_FIELDS_BASE},organizer_note,qa_text`;

const attachSignupCounts = async (activities) => {
  const withDefaults = activities.map((activity) => ({
    ...activity,
    signup_count: Number(activity.signup_count || 0),
  }));

  try {
    const { data, error } = await supabase.rpc('activity_signup_counts');
    if (error) return withDefaults;

    const counts = new Map(
      (data || []).map((row) => [row.activity_id, Number(row.signup_count || 0)])
    );

    return withDefaults.map((activity) => ({
      ...activity,
      signup_count: counts.get(activity.id) || 0,
    }));
  } catch (_) {
    return withDefaults;
  }
};

export const loadActivities = async () => {
  if (!hasSupabaseConfig) {
    return { activities: [], isConfigured: false };
  }

  const queryActivities = (fields) => supabase
    .from('activities')
    .select(fields)
    .eq('status', 'published')
    .gte('date', new Date().toISOString().slice(0, 10))
    .order('date', { ascending: true })
    .order('time', { ascending: true, nullsFirst: false });

  let { data, error } = await queryActivities(ACTIVITY_FIELDS_EXTENDED);
  if (error) {
    const fallback = await queryActivities(ACTIVITY_FIELDS_BASE);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return { activities: await attachSignupCounts(data || []), isConfigured: true };
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
    organizer_note: activity.organizerNote || null,
    qa_text: activity.qaText || null,
    status: 'published',
  };

  const insertActivity = (activityPayload, fields) => supabase
    .from('activities')
    .insert(activityPayload)
    .select(fields)
    .single();

  let { data, error } = await insertActivity(payload, ACTIVITY_FIELDS_EXTENDED);
  if (error) {
    const { organizer_note, qa_text, ...fallbackPayload } = payload;
    const fallback = await insertActivity(fallbackPayload, ACTIVITY_FIELDS_BASE);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return { ...data, signup_count: 0 };
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
