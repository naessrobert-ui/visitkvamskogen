-- Medlemsmøter i Kvamskogen Vel: offentlig påmelding og innspill, moderert i styrerommet.
-- Krever at vel_styrerom.sql er kjørt (is_vel_member, is_vel_admin, current_vel_member_id).
-- Kan kjøres flere ganger.

create table if not exists public.vel_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null check (char_length(trim(title)) between 1 and 160),
  starts_at timestamptz not null,
  location text,
  invited_count integer not null default 0 check (invited_count >= 0),
  invited_on date,
  signup_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vel_event_signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.vel_events(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  email text not null check (email = lower(email) and char_length(email) <= 200),
  people_count integer not null default 1 check (people_count between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, email)
);

create table if not exists public.vel_event_input (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.vel_events(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  email text not null check (email = lower(email) and char_length(email) <= 200),
  body text not null check (char_length(trim(body)) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'approved', 'rejected')),
  reviewed_by uuid references public.vel_members(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Loggen brukes bare til rate-limit og ryddes løpende; IP lagres som hash.
create table if not exists public.vel_event_rate_log (
  id bigint generated always as identity primary key,
  client_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_vel_event_signups_event on public.vel_event_signups(event_id);
create index if not exists idx_vel_event_input_event on public.vel_event_input(event_id, status, created_at);
create index if not exists idx_vel_event_rate_log on public.vel_event_rate_log(client_key, created_at);

alter table public.vel_events enable row level security;
alter table public.vel_event_signups enable row level security;
alter table public.vel_event_input enable row level security;
alter table public.vel_event_rate_log enable row level security;

revoke all on public.vel_events, public.vel_event_signups, public.vel_event_input, public.vel_event_rate_log from anon;
revoke all on public.vel_event_rate_log from authenticated;

drop policy if exists vel_events_read on public.vel_events;
create policy vel_events_read on public.vel_events for select to authenticated using (public.is_vel_member());
drop policy if exists vel_events_admin_update on public.vel_events;
create policy vel_events_admin_update on public.vel_events for update to authenticated using (public.is_vel_admin()) with check (public.is_vel_admin());
drop policy if exists vel_events_admin_insert on public.vel_events;
create policy vel_events_admin_insert on public.vel_events for insert to authenticated with check (public.is_vel_admin());

drop policy if exists vel_event_signups_read on public.vel_event_signups;
create policy vel_event_signups_read on public.vel_event_signups for select to authenticated using (public.is_vel_member());
drop policy if exists vel_event_signups_admin_delete on public.vel_event_signups;
create policy vel_event_signups_admin_delete on public.vel_event_signups for delete to authenticated using (public.is_vel_admin());

drop policy if exists vel_event_input_read on public.vel_event_input;
create policy vel_event_input_read on public.vel_event_input for select to authenticated using (public.is_vel_member());
drop policy if exists vel_event_input_moderate on public.vel_event_input;
create policy vel_event_input_moderate on public.vel_event_input for update to authenticated
  using (public.is_vel_member())
  with check (public.is_vel_member() and reviewed_by = public.current_vel_member_id());
drop policy if exists vel_event_input_admin_delete on public.vel_event_input;
create policy vel_event_input_admin_delete on public.vel_event_input for delete to authenticated using (public.is_vel_admin());

grant select, update on public.vel_events to authenticated;
grant insert on public.vel_events to authenticated;
grant select, delete on public.vel_event_signups to authenticated;
grant select, delete on public.vel_event_input to authenticated;
grant update (status, reviewed_by, reviewed_at) on public.vel_event_input to authenticated;

-- Felles kontroll for offentlige innsendinger: maks 5 per IP og 5 per e-post i timen.
create or replace function public.vel_event_check_rate(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip text := coalesce(
    v_headers ->> 'cf-connecting-ip',
    v_headers ->> 'x-real-ip',
    split_part(v_headers ->> 'x-forwarded-for', ',', 1)
  );
  v_keys text[] := array['e:' || md5(p_email)];
begin
  delete from public.vel_event_rate_log where created_at < now() - interval '1 day';
  if nullif(trim(v_ip), '') is not null then
    v_keys := v_keys || ('i:' || md5(trim(v_ip)));
  end if;
  if exists (
    select 1 from public.vel_event_rate_log
    where client_key = any (v_keys) and created_at > now() - interval '1 hour'
    group by client_key having count(*) >= 5
  ) then
    raise exception 'For mange innsendinger. Prøv igjen senere.' using errcode = 'P0001';
  end if;
  insert into public.vel_event_rate_log (client_key) select unnest(v_keys);
end;
$$;

create or replace function public.vel_event_clean_contact(p_name text, p_email text, out clean_name text, out clean_email text)
language plpgsql
immutable
as $$
begin
  clean_name := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 100);
  clean_email := left(lower(trim(coalesce(p_email, ''))), 200);
  if char_length(clean_name) < 2 then
    raise exception 'Skriv inn navnet ditt.' using errcode = 'P0001';
  end if;
  if clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    raise exception 'Skriv inn en gyldig e-postadresse.' using errcode = 'P0001';
  end if;
end;
$$;

-- Offentlig status: tellere og godkjente innspill med fornavn. Aldri e-post eller påmeldte navn.
create or replace function public.vel_event_public(p_slug text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'slug', e.slug,
    'title', e.title,
    'starts_at', e.starts_at,
    'location', e.location,
    'invited_count', e.invited_count,
    'invited_on', e.invited_on,
    'signup_open', e.signup_open and e.starts_at > now(),
    'signup_count', coalesce((select sum(s.people_count) from public.vel_event_signups s where s.event_id = e.id), 0),
    'input', coalesce((
      select json_agg(json_build_object(
        'id', i.id,
        'first_name', split_part(trim(i.name), ' ', 1),
        'body', i.body,
        'created_at', i.created_at
      ) order by i.created_at)
      from public.vel_event_input i
      where i.event_id = e.id and i.status = 'approved'
    ), '[]'::json)
  )
  from public.vel_events e
  where e.slug = p_slug;
$$;

create or replace function public.vel_event_signup(
  p_slug text,
  p_name text,
  p_email text,
  p_people_count integer default 1,
  p_website text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.vel_events%rowtype;
  v_contact record;
  v_total bigint;
begin
  select * into v_event from public.vel_events where slug = p_slug;
  if not found then
    raise exception 'Fant ikke arrangementet.' using errcode = 'P0001';
  end if;
  -- Roboter fyller ut det skjulte feltet; de får et vanlig svar uten at noe lagres.
  if nullif(trim(coalesce(p_website, '')), '') is not null then
    return json_build_object('ok', true, 'signup_count', (select coalesce(sum(people_count), 0) from public.vel_event_signups where event_id = v_event.id));
  end if;
  if not v_event.signup_open or v_event.starts_at <= now() then
    raise exception 'Påmeldingen er stengt.' using errcode = 'P0001';
  end if;
  select * into v_contact from public.vel_event_clean_contact(p_name, p_email);
  perform public.vel_event_check_rate(v_contact.clean_email);

  insert into public.vel_event_signups (event_id, name, email, people_count)
  values (v_event.id, v_contact.clean_name, v_contact.clean_email, greatest(1, least(10, coalesce(p_people_count, 1))))
  on conflict (event_id, email)
  do update set name = excluded.name, people_count = excluded.people_count, updated_at = now();

  select coalesce(sum(people_count), 0) into v_total from public.vel_event_signups where event_id = v_event.id;
  return json_build_object('ok', true, 'signup_count', v_total);
end;
$$;

create or replace function public.vel_event_submit_input(
  p_slug text,
  p_name text,
  p_email text,
  p_body text,
  p_website text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_contact record;
  v_body text := trim(coalesce(p_body, ''));
begin
  select id into v_event_id from public.vel_events where slug = p_slug;
  if v_event_id is null then
    raise exception 'Fant ikke arrangementet.' using errcode = 'P0001';
  end if;
  if nullif(trim(coalesce(p_website, '')), '') is not null then
    return json_build_object('ok', true);
  end if;
  select * into v_contact from public.vel_event_clean_contact(p_name, p_email);
  if char_length(v_body) not between 10 and 2000 then
    raise exception 'Innspillet må være mellom 10 og 2000 tegn.' using errcode = 'P0001';
  end if;
  perform public.vel_event_check_rate(v_contact.clean_email);

  insert into public.vel_event_input (event_id, name, email, body)
  values (v_event_id, v_contact.clean_name, v_contact.clean_email, v_body);
  return json_build_object('ok', true);
end;
$$;

revoke all on function public.vel_event_check_rate(text) from public, anon, authenticated;
revoke all on function public.vel_event_clean_contact(text, text) from public, anon, authenticated;
revoke all on function public.vel_event_public(text) from public;
revoke all on function public.vel_event_signup(text, text, text, integer, text) from public;
revoke all on function public.vel_event_submit_input(text, text, text, text, text) from public;
grant execute on function public.vel_event_public(text) to anon, authenticated;
grant execute on function public.vel_event_signup(text, text, text, integer, text) to anon, authenticated;
grant execute on function public.vel_event_submit_input(text, text, text, text, text) to anon, authenticated;

insert into public.vel_events (slug, title, starts_at, location)
values ('medlemsmote-2026-10-24', 'Medlemsmøte: Hva skal Vel''et jobbe med?', '2026-10-24 16:00:00+02', 'Eikedalen')
on conflict (slug) do nothing;
