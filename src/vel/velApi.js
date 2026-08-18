import { hasSupabaseConfig, supabase } from '../lib/supabase.js';

export { hasSupabaseConfig };

const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase er ikke konfigurert.');
  return supabase;
};

const resultData = (result) => {
  if (result.error) throw result.error;
  return result.data;
};

const cleanFileName = (name) => String(name || 'vedlegg')
  .normalize('NFKD')
  .replace(/[^a-zA-Z0-9._-]/g, '-')
  .replace(/-+/g, '-')
  .slice(-120);

export const getVelSession = async () => {
  const client = requireSupabase();
  return resultData(await client.auth.getSession())?.session || null;
};

export const onVelAuthChange = (callback) => requireSupabase().auth.onAuthStateChange((_event, session) => callback(session));

export const sendVelMagicLink = async (email) => {
  const client = requireSupabase();
  const { error } = await client.functions.invoke('send-vel-login-link', {
    body: {
      email: email.trim().toLowerCase(),
      origin: window.location.origin,
    },
  });
  if (error) throw error;
};

export const signOutVel = async () => {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
};

export const loadCurrentVelMember = async () => {
  const client = requireSupabase();
  const memberId = resultData(await client.rpc('current_vel_member_id'));
  if (!memberId) return null;
  const { data, error } = await client
    .from('vel_members')
    .select('id, email, name, role, is_admin, active')
    .eq('id', memberId)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

export const loadVelWorkspace = async ({ includeInactiveMembers = false } = {}) => {
  const client = requireSupabase();
  const adminMembersQuery = includeInactiveMembers
    ? client.from('vel_members').select('id, email, name, role, is_admin, active').order('active', { ascending: false }).order('name')
    : Promise.resolve({ data: [], error: null });
  const adminNotificationsQuery = includeInactiveMembers
    ? client.from('vel_notifications').select('id, case_id, notification_key, recipient_count, subject, body_text, recipient_emails, failed_recipient_emails, provider_message_ids, delivery_status, sent_at').order('sent_at', { ascending: false })
    : Promise.resolve({ data: [], error: null });
  const [membersResult, adminMembersResult, notificationsResult, meetingsResult, casesResult, commentsResult, tasksResult, attachmentsResult] = await Promise.all([
    client.from('vel_members').select('id, email, name, role, is_admin, active').eq('active', true).order('name'),
    adminMembersQuery,
    adminNotificationsQuery,
    client.from('vel_meetings').select('*').order('meeting_date', { ascending: false }),
    client.from('vel_cases').select('*').order('updated_at', { ascending: false }),
    client.from('vel_comments').select('*').order('created_at', { ascending: true }),
    client.from('vel_tasks').select('*').order('due_date', { ascending: true, nullsFirst: false }),
    client.from('vel_attachments').select('*').order('created_at', { ascending: true }),
  ]);

  return {
    members: resultData(membersResult) || [],
    adminMembers: resultData(adminMembersResult) || [],
    notifications: resultData(notificationsResult) || [],
    meetings: resultData(meetingsResult) || [],
    cases: resultData(casesResult) || [],
    comments: resultData(commentsResult) || [],
    tasks: resultData(tasksResult) || [],
    attachments: resultData(attachmentsResult) || [],
  };
};

export const createVelMember = async (values) => {
  const client = requireSupabase();
  const created = await client.from('vel_members').insert({
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    role: values.role,
    is_admin: values.isAdmin,
    active: true,
  }).select().single();
  return resultData(created);
};

export const updateVelMember = async (memberId, values) => {
  const client = requireSupabase();
  const updated = await client.from('vel_members').update({
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    role: values.role,
    is_admin: values.isAdmin,
    active: values.active,
  }).eq('id', memberId).select().single();
  return resultData(updated);
};

const uploadAttachment = async ({ caseId, commentId = null, memberId, file }) => {
  if (!file) return null;
  if (file.size > 15 * 1024 * 1024) throw new Error('Vedlegget kan ikke være større enn 15 MB.');
  const client = requireSupabase();
  const storagePath = `${memberId}/${caseId}/${crypto.randomUUID()}-${cleanFileName(file.name)}`;
  const upload = await client.storage.from('vel-attachments').upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const metadata = await client.from('vel_attachments').insert({
    case_id: caseId,
    comment_id: commentId,
    uploaded_by: memberId,
    storage_path: storagePath,
    file_name: file.name,
    file_size: file.size,
    content_type: file.type || 'application/octet-stream',
  }).select().single();

  if (metadata.error) {
    await client.storage.from('vel-attachments').remove([storagePath]);
    throw metadata.error;
  }
  return metadata.data;
};

export const createVelCase = async ({ values, memberId, file }) => {
  const client = requireSupabase();
  const created = await client.from('vel_cases').insert({
    title: values.title.trim(),
    description: values.description.trim(),
    priority: values.priority,
    meeting_id: values.meetingId || null,
    created_by: memberId,
  }).select().single();
  const caseItem = resultData(created);
  let attachmentWarning = false;
  try {
    await uploadAttachment({ caseId: caseItem.id, memberId, file });
  } catch (error) {
    if (!file) throw error;
    attachmentWarning = true;
  }
  return { caseItem, attachmentWarning };
};

export const updateVelCase = async (caseId, values) => {
  const client = requireSupabase();
  const updated = await client.from('vel_cases').update({
    priority: values.priority,
    status: values.status,
    meeting_id: values.meetingId || null,
    decision: values.decision.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', caseId).select().single();
  return resultData(updated);
};

export const createVelComment = async ({ caseId, memberId, body, file }) => {
  const client = requireSupabase();
  const created = await client.from('vel_comments').insert({
    case_id: caseId,
    author_id: memberId,
    body: body.trim(),
  }).select().single();
  const comment = resultData(created);
  let attachmentWarning = false;
  try {
    await uploadAttachment({ caseId, commentId: comment.id, memberId, file });
  } catch (error) {
    if (!file) throw error;
    attachmentWarning = true;
  }
  return { comment, attachmentWarning };
};

export const createVelMeeting = async ({ values, memberId }) => {
  const client = requireSupabase();
  const created = await client.from('vel_meetings').insert({
    title: values.title.trim(),
    meeting_date: values.date,
    meeting_time: values.time || null,
    location: values.location.trim() || null,
    agenda_deadline: values.deadline || null,
    created_by: memberId,
  }).select().single();
  return resultData(created);
};

export const updateVelMeeting = async (meetingId, values) => {
  const client = requireSupabase();
  const updated = await client.from('vel_meetings').update({
    title: values.title.trim(),
    meeting_date: values.date,
    meeting_time: values.time || null,
    location: values.location.trim() || null,
    agenda_deadline: values.deadline || null,
  }).eq('id', meetingId).select().single();
  return resultData(updated);
};

export const createVelTask = async ({ caseId, values, memberId }) => {
  const client = requireSupabase();
  const created = await client.from('vel_tasks').insert({
    case_id: caseId,
    title: values.title.trim(),
    responsible_id: values.responsibleId,
    due_date: values.dueDate || null,
    created_by: memberId,
  }).select().single();
  return resultData(created);
};

export const setVelTaskComplete = async (taskId, completed) => {
  const client = requireSupabase();
  const updated = await client.from('vel_tasks').update({
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  }).eq('id', taskId).select().single();
  return resultData(updated);
};

export const openVelAttachment = async (storagePath) => {
  const client = requireSupabase();
  const newTab = window.open('', '_blank');
  const { data, error } = await client.storage.from('vel-attachments').createSignedUrl(storagePath, 60);
  if (error) {
    newTab?.close();
    throw error;
  }
  if (newTab) {
    newTab.opener = null;
    newTab.location = data.signedUrl;
  } else {
    window.location.assign(data.signedUrl);
  }
};

export const notifyVelImportant = async (caseId, notificationKey) => {
  const client = requireSupabase();
  const { error } = await client.functions.invoke('send-vel-important-notification', {
    body: {
      caseId,
      notificationKey,
      origin: window.location.origin,
    },
  });
  if (error) throw error;
};
