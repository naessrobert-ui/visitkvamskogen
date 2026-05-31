import { hasSupabaseConfig, supabase } from './supabase.js';

const ACTIVITY_FIELDS_BASE = 'id,title,type,date,time,place,price,organizer,description,status,created_at';
const ACTIVITY_FIELDS_EXTENDED = `${ACTIVITY_FIELDS_BASE},organizer_note,qa_text`;

const attachQuestions = async (activities) => {
  const withDefaults = activities.map((activity) => ({
    ...activity,
    questions: [],
  }));
  const activityIds = withDefaults.map((activity) => activity.id);
  if (!activityIds.length) return withDefaults;

  try {
    const { data, error } = await supabase
      .from('activity_questions')
      .select('id,activity_id,question,answer,status,created_at,answered_at')
      .in('activity_id', activityIds)
      .in('status', ['pending', 'answered'])
      .order('created_at', { ascending: true });

    if (error) return withDefaults;

    const questionsByActivity = new Map();
    for (const question of data || []) {
      const questions = questionsByActivity.get(question.activity_id) || [];
      questions.push(question);
      questionsByActivity.set(question.activity_id, questions);
    }

    return withDefaults.map((activity) => ({
      ...activity,
      questions: questionsByActivity.get(activity.id) || [],
    }));
  } catch (_) {
    return withDefaults;
  }
};

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
  const withSignupCounts = await attachSignupCounts(data || []);
  return { activities: await attachQuestions(withSignupCounts), isConfigured: true };
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
    organizer_phone: activity.organizerPhone,
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
    const { organizer_note, qa_text, organizer_phone, ...fallbackPayload } = payload;
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

export const createQuestion = async (question) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase er ikke konfigurert.');
  }

  const payload = {
    activity_id: question.activityId,
    asker_name: question.name || null,
    asker_email: question.email || null,
    question: question.question,
    status: 'pending',
  };

  const { error } = await supabase
    .from('activity_questions')
    .insert(payload);

  if (error) throw error;
  return { ok: true };
};
