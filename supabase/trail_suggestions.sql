create table if not exists public.trail_suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  area text,
  season text not null default 'Sommer',
  level text not null default 'Middels',
  duration text,
  distance text,
  elevation text,
  description text not null,
  tips text,
  gpx_path text,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  status text not null default 'pending_email_verification',
  contact_email_verified boolean not null default false,
  contact_verification_token uuid not null default gen_random_uuid(),
  contact_verified_at timestamptz,
  moderation_token uuid not null default gen_random_uuid(),
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trail_suggestions_status_check
    check (status in ('pending_email_verification', 'pending', 'published', 'rejected', 'removed')),
  constraint trail_suggestions_season_check
    check (season in ('Helår', 'Sommer', 'Vinter')),
  constraint trail_suggestions_level_check
    check (level in ('Lett', 'Middels', 'Krevende'))
);

create table if not exists public.trail_suggestion_images (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.trail_suggestions(id) on delete cascade,
  image_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists trail_suggestions_public_idx
on public.trail_suggestions (status, created_at desc);

create index if not exists trail_suggestion_images_suggestion_idx
on public.trail_suggestion_images (suggestion_id, sort_order);

alter table public.trail_suggestions enable row level security;
alter table public.trail_suggestion_images enable row level security;

insert into storage.buckets (id, name, public)
values ('trail-images', 'trail-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('trail-gpx', 'trail-gpx', true)
on conflict (id) do nothing;

drop policy if exists "Alle kan lese publiserte turforslag" on public.trail_suggestions;
create policy "Alle kan lese publiserte turforslag"
on public.trail_suggestions
for select
using (status = 'published');

drop policy if exists "Alle kan sende inn turforslag" on public.trail_suggestions;
create policy "Alle kan sende inn turforslag"
on public.trail_suggestions
for insert
with check (
  status = 'pending_email_verification'
  and contact_email_verified = false
);

drop policy if exists "Alle kan lese bilder til publiserte turforslag" on public.trail_suggestion_images;
create policy "Alle kan lese bilder til publiserte turforslag"
on public.trail_suggestion_images
for select
using (
  exists (
    select 1
    from public.trail_suggestions
    where trail_suggestions.id = trail_suggestion_images.suggestion_id
      and trail_suggestions.status = 'published'
  )
);

drop policy if exists "Alle kan legge inn turforslagsbilder" on public.trail_suggestion_images;
create policy "Alle kan legge inn turforslagsbilder"
on public.trail_suggestion_images
for insert
with check (true);

drop policy if exists "Alle kan laste opp turbilder" on storage.objects;
create policy "Alle kan laste opp turbilder"
on storage.objects
for insert
with check (bucket_id = 'trail-images');

drop policy if exists "Alle kan lese turbilder" on storage.objects;
create policy "Alle kan lese turbilder"
on storage.objects
for select
using (bucket_id = 'trail-images');

drop policy if exists "Alle kan laste opp gpx" on storage.objects;
create policy "Alle kan laste opp gpx"
on storage.objects
for insert
with check (bucket_id = 'trail-gpx');

drop policy if exists "Alle kan lese gpx" on storage.objects;
create policy "Alle kan lese gpx"
on storage.objects
for select
using (bucket_id = 'trail-gpx');

-- E-postbekreftelse publiserer ikke direkte; turforslaget havner i moderering (pending).
create or replace function public.verify_trail_email(
  p_suggestion_id uuid,
  p_token uuid
)
returns table (
  ok boolean,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.trail_suggestions
  set
    contact_email_verified = true,
    contact_verified_at = now(),
    status = 'pending',
    updated_at = now()
  where trail_suggestions.id = p_suggestion_id
    and trail_suggestions.contact_verification_token = p_token
    and trail_suggestions.status = 'pending_email_verification';

  if not found then
    raise exception 'Ugyldig eller brukt bekreftelseslenke';
  end if;

  return query select true, 'pending'::text;
end;
$$;

revoke all on function public.verify_trail_email(uuid, uuid) from public;
grant execute on function public.verify_trail_email(uuid, uuid) to anon, authenticated;

create or replace function public.moderate_trail_suggestion(
  p_suggestion_id uuid,
  p_token uuid,
  p_action text
)
returns table (
  ok boolean,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  if p_action not in ('godkjenn', 'avvis') then
    raise exception 'Ugyldig handling';
  end if;

  next_status := case when p_action = 'godkjenn' then 'published' else 'rejected' end;

  update public.trail_suggestions
  set
    status = next_status,
    moderated_at = now(),
    updated_at = now()
  where trail_suggestions.id = p_suggestion_id
    and trail_suggestions.moderation_token = p_token
    and trail_suggestions.status = 'pending';

  if not found then
    raise exception 'Turforslaget er allerede behandlet, eller lenken er ugyldig';
  end if;

  return query select true, next_status;
end;
$$;

revoke all on function public.moderate_trail_suggestion(uuid, uuid, text) from public;
grant execute on function public.moderate_trail_suggestion(uuid, uuid, text) to anon, authenticated;
