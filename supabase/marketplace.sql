create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  listing_type text not null default 'sale',
  price text,
  area text,
  address text,
  address_lat double precision,
  address_lon double precision,
  map_url text,
  description text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  status text not null default 'pending_email_verification',
  contact_email_verified boolean not null default false,
  contact_verification_token uuid not null default gen_random_uuid(),
  contact_verified_at timestamptz,
  is_featured boolean not null default false,
  paid_until timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_listings_status_check
    check (status in ('pending_email_verification', 'pending', 'published', 'rejected', 'expired')),
  constraint marketplace_listings_type_check
    check (listing_type in ('sale', 'free', 'rent', 'wanted', 'service'))
);

alter table public.marketplace_listings
  add column if not exists address text,
  add column if not exists address_lat double precision,
  add column if not exists address_lon double precision,
  add column if not exists map_url text,
  add column if not exists contact_email_verified boolean not null default false,
  add column if not exists contact_verification_token uuid not null default gen_random_uuid(),
  add column if not exists contact_verified_at timestamptz;

alter table public.marketplace_listings
  drop constraint if exists marketplace_listings_status_check;

alter table public.marketplace_listings
  add constraint marketplace_listings_status_check
    check (status in ('pending_email_verification', 'pending', 'published', 'rejected', 'expired'));

create table if not exists public.marketplace_listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  image_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_listings_public_idx
on public.marketplace_listings (status, is_featured desc, created_at desc);

create index if not exists marketplace_listing_images_listing_idx
on public.marketplace_listing_images (listing_id, sort_order);

alter table public.marketplace_listings enable row level security;
alter table public.marketplace_listing_images enable row level security;

insert into storage.buckets (id, name, public)
values ('marketplace-images', 'marketplace-images', true)
on conflict (id) do nothing;

drop policy if exists "Alle kan lese publiserte annonser" on public.marketplace_listings;
create policy "Alle kan lese publiserte annonser"
on public.marketplace_listings
for select
using (
  status = 'published'
  and (expires_at is null or expires_at >= now())
);

drop policy if exists "Alle kan sende inn markedsannonse" on public.marketplace_listings;
create policy "Alle kan sende inn markedsannonse"
on public.marketplace_listings
for insert
with check (
  status = 'pending_email_verification'
  and is_featured = false
  and paid_until is null
  and address is not null
  and address_lat is not null
  and address_lon is not null
  and map_url is not null
);

create or replace function public.verify_marketplace_email(
  p_listing_id uuid,
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
  update public.marketplace_listings
  set
    contact_email_verified = true,
    contact_verified_at = now(),
    status = 'published',
    updated_at = now()
  where marketplace_listings.id = p_listing_id
    and marketplace_listings.contact_verification_token = p_token
    and marketplace_listings.status in ('pending_email_verification', 'pending', 'published');

  if not found then
    raise exception 'Ugyldig eller brukt bekreftelseslenke';
  end if;

  return query select true, 'published'::text;
end;
$$;

revoke all on function public.verify_marketplace_email(uuid, uuid) from public;
grant execute on function public.verify_marketplace_email(uuid, uuid) to anon, authenticated;

drop function if exists public.marketplace_listing_details(uuid, uuid);

create or replace function public.marketplace_listing_details(
  p_listing_id uuid,
  p_token uuid
)
returns table (
  id uuid,
  title text,
  category text,
  listing_type text,
  price text,
  area text,
  address text,
  address_lat double precision,
  address_lon double precision,
  map_url text,
  description text,
  contact_name text,
  contact_email text,
  contact_phone text,
  expires_at timestamptz,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    marketplace_listings.id,
    marketplace_listings.title,
    marketplace_listings.category,
    marketplace_listings.listing_type,
    marketplace_listings.price,
    marketplace_listings.area,
    marketplace_listings.address,
    marketplace_listings.address_lat,
    marketplace_listings.address_lon,
    marketplace_listings.map_url,
    marketplace_listings.description,
    marketplace_listings.contact_name,
    marketplace_listings.contact_email,
    marketplace_listings.contact_phone,
    marketplace_listings.expires_at,
    marketplace_listings.status,
    marketplace_listings.created_at
  from public.marketplace_listings
  where marketplace_listings.id = p_listing_id
    and marketplace_listings.contact_verification_token = p_token;
$$;

revoke all on function public.marketplace_listing_details(uuid, uuid) from public;
grant execute on function public.marketplace_listing_details(uuid, uuid) to anon, authenticated;

drop function if exists public.update_marketplace_listing(uuid, uuid, text, text, text, text, text, text, text, text, text, date);
drop function if exists public.update_marketplace_listing(uuid, uuid, text, text, text, text, text, text, double precision, double precision, text, text, text, text, date);

create or replace function public.update_marketplace_listing(
  p_listing_id uuid,
  p_token uuid,
  p_title text,
  p_category text,
  p_listing_type text,
  p_price text,
  p_area text,
  p_address text,
  p_address_lat double precision,
  p_address_lon double precision,
  p_map_url text,
  p_description text,
  p_contact_name text,
  p_contact_phone text,
  p_expires_at date
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
  select case
    when marketplace_listings.contact_email_verified then 'published'
    else marketplace_listings.status
  end
  into next_status
  from public.marketplace_listings
  where marketplace_listings.id = p_listing_id
    and marketplace_listings.contact_verification_token = p_token;

  if next_status is null then
    raise exception 'Ugyldig annonselenke';
  end if;

  update public.marketplace_listings
  set
    title = p_title,
    category = p_category,
    listing_type = p_listing_type,
    price = p_price,
    area = p_area,
    address = p_address,
    address_lat = p_address_lat,
    address_lon = p_address_lon,
    map_url = p_map_url,
    description = p_description,
    contact_name = p_contact_name,
    contact_phone = p_contact_phone,
    expires_at = p_expires_at,
    status = next_status,
    updated_at = now()
  where marketplace_listings.id = p_listing_id
    and marketplace_listings.contact_verification_token = p_token;

  return query select true, next_status;
end;
$$;

revoke all on function public.update_marketplace_listing(uuid, uuid, text, text, text, text, text, text, double precision, double precision, text, text, text, text, date) from public;
grant execute on function public.update_marketplace_listing(uuid, uuid, text, text, text, text, text, text, double precision, double precision, text, text, text, text, date) to anon, authenticated;

drop policy if exists "Alle kan lese bilder til publiserte annonser" on public.marketplace_listing_images;
create policy "Alle kan lese bilder til publiserte annonser"
on public.marketplace_listing_images
for select
using (
  exists (
    select 1
    from public.marketplace_listings
    where marketplace_listings.id = marketplace_listing_images.listing_id
      and marketplace_listings.status = 'published'
      and (marketplace_listings.expires_at is null or marketplace_listings.expires_at >= now())
  )
);

drop policy if exists "Alle kan legge inn annonsebilder" on public.marketplace_listing_images;
create policy "Alle kan legge inn annonsebilder"
on public.marketplace_listing_images
for insert
with check (true);

drop policy if exists "Alle kan laste opp markedsbilder" on storage.objects;
create policy "Alle kan laste opp markedsbilder"
on storage.objects
for insert
with check (
  bucket_id = 'marketplace-images'
);

drop policy if exists "Alle kan lese markedsbilder" on storage.objects;
create policy "Alle kan lese markedsbilder"
on storage.objects
for select
using (
  bucket_id = 'marketplace-images'
);
