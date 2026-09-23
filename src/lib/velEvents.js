import { supabase } from './supabase.js';

const requireClient = () => {
  if (!supabase) throw new Error('Tjenesten er ikke tilgjengelig akkurat nå.');
  return supabase;
};

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message || 'Noe gikk galt. Prøv igjen.');
  return data;
};

export const loadVelEvent = async (slug) => unwrap(await requireClient().rpc('vel_event_public', { p_slug: slug }));

export const signUpForVelEvent = async (slug, { name, email, peopleCount, website }) => unwrap(await requireClient().rpc('vel_event_signup', {
  p_slug: slug,
  p_name: name,
  p_email: email,
  p_people_count: Number(peopleCount) || 1,
  p_website: website || null,
}));

export const submitVelEventInput = async (slug, { name, email, body, website }) => unwrap(await requireClient().rpc('vel_event_submit_input', {
  p_slug: slug,
  p_name: name,
  p_email: email,
  p_body: body,
  p_website: website || null,
}));
