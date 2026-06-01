create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  listing_type text not null default 'sale',
  price text,
  area text,
  description text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  status text not null default 'pending',
  is_featured boolean not null default false,
  paid_until timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_listings_status_check
    check (status in ('pending', 'published', 'rejected', 'expired')),
  constraint marketplace_listings_type_check
    check (listing_type in ('sale', 'free', 'rent', 'wanted', 'service'))
);

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
  status = 'pending'
  and is_featured = false
  and paid_until is null
);

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
with check (
  exists (
    select 1
    from public.marketplace_listings
    where marketplace_listings.id = marketplace_listing_images.listing_id
      and marketplace_listings.status = 'pending'
  )
);

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
