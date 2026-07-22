-- Bro-kampanjen (Kvamskogen Vel): innsamling via Vipps ePayment.
-- Persondata (navn/e-post) er kun tilgjengelig for service-role (edge functions).
-- Publikum kan bare lese aggregert dagssum via funksjonen kampanje_dagsstats().

create table if not exists public.donasjoner (
  id uuid primary key default gen_random_uuid(),
  belop integer not null check (belop > 0),
  dekker_medlemskap boolean not null default false,
  giver_navn text,
  giver_epost text,
  status text not null default 'opprettet'
    check (status in ('opprettet', 'betalt', 'avbrutt', 'feilet')),
  vipps_referanse text unique,
  betalt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists donasjoner_status_betalt_at_idx
  on public.donasjoner (status, betalt_at);

alter table public.donasjoner enable row level security;

-- Ingen anon-policy: kun service-role (edge functions) leser/skriver rader.
-- Publikum når kun aggregert sum gjennom funksjonen under.

create or replace function public.kampanje_dagsstats()
returns table (dato date, belop bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(betalt_at, created_at)::date as dato,
    sum(belop)::bigint as belop
  from public.donasjoner
  where status = 'betalt'
  group by coalesce(betalt_at, created_at)::date
  order by 1;
$$;

grant execute on function public.kampanje_dagsstats() to anon;
