create extension if not exists pgcrypto;

create table if not exists public.vel_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text not null default 'Styremedlem',
  is_admin boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint vel_members_email_lowercase check (email = lower(email))
);

create table if not exists public.vel_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  meeting_date date not null,
  meeting_time time,
  location text,
  agenda_deadline date,
  created_by uuid not null constraint vel_meetings_created_by_fkey references public.vel_members(id),
  created_at timestamptz not null default now(),
  constraint vel_meetings_deadline_before_meeting check (agenda_deadline is null or agenda_deadline <= meeting_date)
);

create table if not exists public.vel_cases (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null check (char_length(trim(description)) > 0),
  priority text not null default 'normal' check (priority in ('normal', 'important')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'decided', 'deferred', 'done')),
  meeting_id uuid constraint vel_cases_meeting_id_fkey references public.vel_meetings(id) on delete set null,
  agenda_order integer not null default 1000,
  decision text,
  created_by uuid not null constraint vel_cases_created_by_fkey references public.vel_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vel_comments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null constraint vel_comments_case_id_fkey references public.vel_cases(id) on delete cascade,
  author_id uuid not null constraint vel_comments_author_id_fkey references public.vel_members(id),
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vel_tasks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null constraint vel_tasks_case_id_fkey references public.vel_cases(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  responsible_id uuid not null constraint vel_tasks_responsible_id_fkey references public.vel_members(id),
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_by uuid not null constraint vel_tasks_created_by_fkey references public.vel_members(id),
  created_at timestamptz not null default now()
);

create table if not exists public.vel_attachments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null constraint vel_attachments_case_id_fkey references public.vel_cases(id) on delete cascade,
  comment_id uuid constraint vel_attachments_comment_id_fkey references public.vel_comments(id) on delete cascade,
  uploaded_by uuid not null constraint vel_attachments_uploaded_by_fkey references public.vel_members(id),
  storage_path text not null unique,
  file_name text not null,
  file_size bigint check (file_size is null or file_size between 0 and 15728640),
  content_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.vel_documents (
  id uuid primary key default gen_random_uuid(),
  folder_path text not null default '',
  file_name text not null check (char_length(trim(file_name)) between 1 and 500),
  file_size bigint check (file_size is null or file_size >= 0),
  content_type text,
  storage_path text unique,
  migration_status text not null default 'available' check (migration_status in ('available', 'review_large', 'needs_manual')),
  theme text not null default 'Annet' constraint vel_documents_theme_check check (theme in ('Møter', 'Prosjekter og parkering', 'Økonomi', 'Styring og rutiner', 'Kommunikasjon', 'Annet')),
  document_type text constraint vel_documents_type_check check (document_type is null or document_type in ('Styremøter', 'Årsmøte', 'Andre møter')),
  document_year smallint constraint vel_documents_year_check check (document_year is null or document_year between 1900 and 2200),
  document_date date,
  search_text text not null default '',
  source_modified_at timestamptz,
  uploaded_by uuid constraint vel_documents_uploaded_by_fkey references public.vel_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vel_documents_available_has_file check (migration_status <> 'available' or storage_path is not null),
  constraint vel_documents_date_matches_year check (document_date is null or document_year is null or extract(year from document_date) = document_year),
  unique (folder_path, file_name)
);

alter table public.vel_documents add column if not exists theme text not null default 'Annet';
alter table public.vel_documents add column if not exists document_type text;
alter table public.vel_documents add column if not exists document_year smallint;
alter table public.vel_documents add column if not exists document_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vel_documents_theme_check' and conrelid = 'public.vel_documents'::regclass) then
    alter table public.vel_documents add constraint vel_documents_theme_check check (theme in ('Møter', 'Prosjekter og parkering', 'Økonomi', 'Styring og rutiner', 'Kommunikasjon', 'Annet'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vel_documents_type_check' and conrelid = 'public.vel_documents'::regclass) then
    alter table public.vel_documents add constraint vel_documents_type_check check (document_type is null or document_type in ('Styremøter', 'Årsmøte', 'Andre møter'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vel_documents_year_check' and conrelid = 'public.vel_documents'::regclass) then
    alter table public.vel_documents add constraint vel_documents_year_check check (document_year is null or document_year between 1900 and 2200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vel_documents_date_matches_year' and conrelid = 'public.vel_documents'::regclass) then
    alter table public.vel_documents add constraint vel_documents_date_matches_year check (document_date is null or document_year is null or extract(year from document_date) = document_year);
  end if;
end
$$;

with parsed as (
  select
    id,
    folder_path,
    file_name,
    split_part(folder_path, '/', 1) as p1,
    nullif(split_part(folder_path, '/', 2), '') as p2,
    nullif(split_part(folder_path, '/', 3), '') as p3,
    nullif(split_part(folder_path, '/', 4), '') as p4
  from public.vel_documents
  where theme = 'Annet' and document_year is null and document_date is null
), classified as (
  select
    *,
    case
      when p1 ~ '^[0-9]{4}-[0-9]{4}$' and p2 ~ '^(19|20)[0-9]{2}$' then p3
      when p1 ~ '^(19|20)[0-9]{2}$' then p2
      else nullif(p1, '')
    end as raw_theme,
    case
      when p1 ~ '^[0-9]{4}-[0-9]{4}$' and p2 ~ '^(19|20)[0-9]{2}$' then p2::smallint
      when p1 ~ '^(19|20)[0-9]{2}$' then p1::smallint
      else null
    end as inferred_year,
    case
      when p1 ~ '^[0-9]{4}-[0-9]{4}$' and p2 ~ '^(19|20)[0-9]{2}$' then p4
      when p1 ~ '^(19|20)[0-9]{2}$' then p3
      else null
    end as raw_type
  from parsed
), normalized as (
  select
    *,
    case
      when raw_theme = 'Møter' then 'Møter'
      when raw_theme in ('Prosjekter', 'Parkering') then 'Prosjekter og parkering'
      when raw_theme = 'Økonomi' then 'Økonomi'
      when raw_theme in ('Styrende dokumenter', 'Gjeldende dokumenter', 'Faste rutiner og nøkkelpersoner', 'How to - Bruksanvisninger') then 'Styring og rutiner'
      when raw_theme = 'Kommunikasjon' then 'Kommunikasjon'
      else 'Annet'
    end as inferred_theme
  from classified
)
update public.vel_documents as document
set
  theme = normalized.inferred_theme,
  document_type = case
    when normalized.inferred_theme = 'Møter' and normalized.raw_type in ('Styremøter', 'Årsmøte', 'Andre møter') then normalized.raw_type
    when normalized.inferred_theme = 'Møter' then 'Andre møter'
    else null
  end,
  document_year = normalized.inferred_year,
  search_text = concat_ws(' ', normalized.inferred_theme, normalized.raw_type, normalized.inferred_year, normalized.folder_path, normalized.file_name)
from normalized
where document.id = normalized.id;

create table if not exists public.vel_notifications (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null constraint vel_notifications_case_id_fkey references public.vel_cases(id) on delete cascade,
  notification_key text not null,
  recipient_count integer not null default 0,
  sent_at timestamptz not null default now(),
  unique (case_id, notification_key)
);

alter table public.vel_notifications add column if not exists subject text;
alter table public.vel_notifications add column if not exists body_text text;
alter table public.vel_notifications add column if not exists recipient_emails text[] not null default '{}';
alter table public.vel_notifications add column if not exists failed_recipient_emails text[] not null default '{}';
alter table public.vel_notifications add column if not exists provider_message_ids text[] not null default '{}';
alter table public.vel_notifications add column if not exists delivery_status text not null default 'accepted';

create table if not exists public.vel_login_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null constraint vel_login_requests_member_id_fkey references public.vel_members(id) on delete cascade,
  requested_at timestamptz not null default now()
);

create index if not exists idx_vel_cases_meeting_order on public.vel_cases(meeting_id, agenda_order, created_at);
create index if not exists idx_vel_cases_status_priority on public.vel_cases(status, priority, updated_at desc);
create index if not exists idx_vel_comments_case_created on public.vel_comments(case_id, created_at);
create index if not exists idx_vel_tasks_responsible_open on public.vel_tasks(responsible_id, due_date) where completed = false;
create index if not exists idx_vel_attachments_case on public.vel_attachments(case_id, created_at);
create index if not exists idx_vel_documents_folder_name on public.vel_documents(folder_path, file_name);
create index if not exists idx_vel_documents_status on public.vel_documents(migration_status, file_size desc);
create index if not exists idx_vel_documents_theme_year_date on public.vel_documents(theme, document_year desc, document_date desc);
create index if not exists idx_vel_login_requests_member_time on public.vel_login_requests(member_id, requested_at desc);

create or replace function public.current_vel_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.vel_members
  where active = true
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

create or replace function public.is_vel_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_vel_member_id() is not null
$$;

create or replace function public.is_vel_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vel_members
    where id = public.current_vel_member_id()
      and active = true
      and is_admin = true
  )
$$;

revoke all on function public.current_vel_member_id() from public, anon;
revoke all on function public.is_vel_member() from public, anon;
revoke all on function public.is_vel_admin() from public, anon;
grant execute on function public.current_vel_member_id() to authenticated;
grant execute on function public.is_vel_member() to authenticated;
grant execute on function public.is_vel_admin() to authenticated;

alter table public.vel_members enable row level security;
alter table public.vel_meetings enable row level security;
alter table public.vel_cases enable row level security;
alter table public.vel_comments enable row level security;
alter table public.vel_tasks enable row level security;
alter table public.vel_attachments enable row level security;
alter table public.vel_documents enable row level security;
alter table public.vel_notifications enable row level security;
alter table public.vel_login_requests enable row level security;

drop policy if exists vel_members_read on public.vel_members;
create policy vel_members_read on public.vel_members for select to authenticated using (public.is_vel_member());
drop policy if exists vel_members_admin_insert on public.vel_members;
create policy vel_members_admin_insert on public.vel_members for insert to authenticated with check (public.is_vel_admin());
drop policy if exists vel_members_admin_update on public.vel_members;
create policy vel_members_admin_update on public.vel_members for update to authenticated using (public.is_vel_admin()) with check (public.is_vel_admin());

drop policy if exists vel_meetings_read on public.vel_meetings;
create policy vel_meetings_read on public.vel_meetings for select to authenticated using (public.is_vel_member());
drop policy if exists vel_meetings_insert on public.vel_meetings;
create policy vel_meetings_insert on public.vel_meetings for insert to authenticated with check (public.is_vel_member() and created_by = public.current_vel_member_id());
drop policy if exists vel_meetings_update on public.vel_meetings;
create policy vel_meetings_update on public.vel_meetings for update to authenticated using (public.is_vel_admin()) with check (public.is_vel_admin());
drop policy if exists vel_meetings_delete on public.vel_meetings;
create policy vel_meetings_delete on public.vel_meetings for delete to authenticated using (public.is_vel_admin());

drop policy if exists vel_cases_read on public.vel_cases;
create policy vel_cases_read on public.vel_cases for select to authenticated using (public.is_vel_member());
drop policy if exists vel_cases_insert on public.vel_cases;
create policy vel_cases_insert on public.vel_cases for insert to authenticated with check (public.is_vel_member() and created_by = public.current_vel_member_id());
drop policy if exists vel_cases_update on public.vel_cases;
create policy vel_cases_update on public.vel_cases for update to authenticated using (public.is_vel_member()) with check (public.is_vel_member());
drop policy if exists vel_cases_delete on public.vel_cases;
create policy vel_cases_delete on public.vel_cases for delete to authenticated using (public.is_vel_admin());

drop policy if exists vel_comments_read on public.vel_comments;
create policy vel_comments_read on public.vel_comments for select to authenticated using (public.is_vel_member());
drop policy if exists vel_comments_insert on public.vel_comments;
create policy vel_comments_insert on public.vel_comments for insert to authenticated with check (public.is_vel_member() and author_id = public.current_vel_member_id());
drop policy if exists vel_comments_update_own on public.vel_comments;
create policy vel_comments_update_own on public.vel_comments for update to authenticated using (author_id = public.current_vel_member_id()) with check (author_id = public.current_vel_member_id());
drop policy if exists vel_comments_delete_own on public.vel_comments;
create policy vel_comments_delete_own on public.vel_comments for delete to authenticated using (author_id = public.current_vel_member_id() or public.is_vel_admin());

drop policy if exists vel_tasks_read on public.vel_tasks;
create policy vel_tasks_read on public.vel_tasks for select to authenticated using (public.is_vel_member());
drop policy if exists vel_tasks_insert on public.vel_tasks;
create policy vel_tasks_insert on public.vel_tasks for insert to authenticated with check (public.is_vel_member() and created_by = public.current_vel_member_id());
drop policy if exists vel_tasks_update on public.vel_tasks;
create policy vel_tasks_update on public.vel_tasks for update to authenticated using (public.is_vel_member()) with check (public.is_vel_member());
drop policy if exists vel_tasks_delete on public.vel_tasks;
create policy vel_tasks_delete on public.vel_tasks for delete to authenticated using (public.is_vel_member());

drop policy if exists vel_attachments_read on public.vel_attachments;
create policy vel_attachments_read on public.vel_attachments for select to authenticated using (public.is_vel_member());
drop policy if exists vel_attachments_insert on public.vel_attachments;
create policy vel_attachments_insert on public.vel_attachments for insert to authenticated with check (public.is_vel_member() and uploaded_by = public.current_vel_member_id());
drop policy if exists vel_attachments_delete on public.vel_attachments;
create policy vel_attachments_delete on public.vel_attachments for delete to authenticated using (uploaded_by = public.current_vel_member_id() or public.is_vel_admin());

drop policy if exists vel_documents_read on public.vel_documents;
create policy vel_documents_read on public.vel_documents for select to authenticated using (public.is_vel_member());
drop policy if exists vel_documents_insert on public.vel_documents;
create policy vel_documents_insert on public.vel_documents for insert to authenticated with check (public.is_vel_member() and uploaded_by = public.current_vel_member_id());
drop policy if exists vel_documents_update on public.vel_documents;
create policy vel_documents_update on public.vel_documents for update to authenticated
using (uploaded_by = public.current_vel_member_id() or public.is_vel_admin())
with check (uploaded_by = public.current_vel_member_id() or public.is_vel_admin());
drop policy if exists vel_documents_delete on public.vel_documents;
create policy vel_documents_delete on public.vel_documents for delete to authenticated using (uploaded_by = public.current_vel_member_id() or public.is_vel_admin());

drop policy if exists vel_notifications_admin_read on public.vel_notifications;
create policy vel_notifications_admin_read on public.vel_notifications for select to authenticated using (public.is_vel_admin());

revoke all on public.vel_members, public.vel_meetings, public.vel_cases, public.vel_comments, public.vel_tasks, public.vel_attachments, public.vel_documents, public.vel_notifications, public.vel_login_requests from anon;
revoke all on public.vel_login_requests from authenticated;
grant select on public.vel_members, public.vel_meetings, public.vel_cases, public.vel_comments, public.vel_tasks, public.vel_attachments, public.vel_documents to authenticated;
grant select on public.vel_notifications to authenticated;
grant insert, update, delete on public.vel_meetings, public.vel_cases, public.vel_comments, public.vel_tasks, public.vel_attachments, public.vel_documents to authenticated;
grant insert, update on public.vel_members to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('vel-attachments', 'vel-attachments', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = 15728640;

insert into storage.buckets (id, name, public, file_size_limit)
values ('vel-documents', 'vel-documents', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = 15728640;

drop policy if exists vel_storage_read on storage.objects;
create policy vel_storage_read on storage.objects for select to authenticated using (bucket_id = 'vel-attachments' and public.is_vel_member());
drop policy if exists vel_storage_insert on storage.objects;
create policy vel_storage_insert on storage.objects for insert to authenticated with check (bucket_id = 'vel-attachments' and public.is_vel_member());
drop policy if exists vel_storage_delete on storage.objects;
create policy vel_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'vel-attachments' and public.is_vel_member());

drop policy if exists vel_documents_storage_read on storage.objects;
create policy vel_documents_storage_read on storage.objects for select to authenticated using (bucket_id = 'vel-documents' and public.is_vel_member());
drop policy if exists vel_documents_storage_insert on storage.objects;
create policy vel_documents_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'vel-documents'
  and public.is_vel_member()
  and (storage.foldername(name))[1] = public.current_vel_member_id()::text
);
drop policy if exists vel_documents_storage_update on storage.objects;
create policy vel_documents_storage_update on storage.objects for update to authenticated
using (
  bucket_id = 'vel-documents'
  and public.is_vel_member()
  and ((storage.foldername(name))[1] = public.current_vel_member_id()::text or public.is_vel_admin())
)
with check (
  bucket_id = 'vel-documents'
  and public.is_vel_member()
  and ((storage.foldername(name))[1] = public.current_vel_member_id()::text or public.is_vel_admin())
);
drop policy if exists vel_documents_storage_delete on storage.objects;
create policy vel_documents_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'vel-documents'
  and public.is_vel_member()
  and ((storage.foldername(name))[1] = public.current_vel_member_id()::text or public.is_vel_admin())
);

insert into public.vel_members (email, name, role, is_admin, active) values
  ('robert.naess@online.no', 'Robert Næss', 'Styreleder', true, true),
  ('sanddahl@online.no', 'Svein Anders Dahl', 'Nestleder', false, true),
  ('komidtbo@gmail.com', 'Karl Ole Midtbø', 'Styremedlem', false, true),
  ('kasserer@kvamskogen-vel.no', 'Karoline Oen', 'Kasserer og parkeringsansvarlig', false, true),
  ('martinhli@hotmail.com', 'Martin Hlinka', 'Styremedlem', false, true),
  ('thereselund79@gmail.com', 'Therese Lund-Ringstad', 'Varamedlem', false, true),
  ('linda.telle@asplanviak.no', 'Linda Telle', 'Varamedlem', false, true)
on conflict (email) do nothing;

analyze public.vel_cases;
analyze public.vel_comments;
analyze public.vel_tasks;
analyze public.vel_documents;
