import { supabase } from '../lib/supabase.js';

const client = () => {
  if (!supabase) throw new Error('Supabase er ikke konfigurert.');
  return supabase;
};

const data = ({ data: rows, error }) => {
  if (error) throw error;
  return rows;
};

export const loadVelEvents = async () => data(await client()
  .from('vel_events')
  .select('*')
  .order('starts_at', { ascending: false }));

export const loadVelEventDetails = async (eventId) => {
  const [signups, input] = await Promise.all([
    client().from('vel_event_signups').select('*').eq('event_id', eventId).order('created_at'),
    client().from('vel_event_input').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
  ]);
  return { signups: data(signups), input: data(input) };
};

export const updateVelEvent = async (eventId, { invitedCount, invitedOn, signupOpen }) => data(await client()
  .from('vel_events')
  .update({
    invited_count: Math.max(0, Number.parseInt(invitedCount, 10) || 0),
    invited_on: invitedOn || null,
    signup_open: Boolean(signupOpen),
  })
  .eq('id', eventId)
  .select()
  .single());

export const setVelEventInputStatus = async (inputId, status, memberId) => data(await client()
  .from('vel_event_input')
  .update({ status, reviewed_by: memberId, reviewed_at: new Date().toISOString() })
  .eq('id', inputId)
  .select()
  .single());

export const deleteVelEventSignups = async (eventId) => data(await client()
  .from('vel_event_signups')
  .delete()
  .eq('event_id', eventId));
