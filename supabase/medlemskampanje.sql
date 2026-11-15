create sequence if not exists public.medlemskampanje_nummer_seq start with 1500;

create table if not exists public.medlemskampanje (
  id uuid primary key,
  fornavn text not null,
  etternavn text not null,
  mobil text not null,
  epost text not null,
  stedstype text not null,
  omrade text not null,
  kontingentar integer not null check (kontingentar between 2026 and 2099),
  belop_ore integer not null check (belop_ore > 0),
  status text not null default 'venter' check (status in ('venter', 'betalt', 'avbrutt', 'refundert')),
  vipps_referanse text generated always as ('medlem-' || id::text) stored unique,
  vipps_url text,
  medlemsnummer bigint unique,
  opprettet_at timestamptz not null default now(),
  betalt_at timestamptz,
  epost_sendt_at timestamptz,
  check ((medlemsnummer is null) = (betalt_at is null)),
  check (status <> 'betalt' or medlemsnummer is not null)
);

-- Kolonnene kan legges til uten å endre tidligere betalte innmeldinger.
alter table public.medlemskampanje
  add column if not exists hjemmeadresse text,
  add column if not exists postnummer text,
  add column if not exists poststed text,
  add column if not exists hytteadresse text,
  add column if not exists vognadresse text,
  alter column omrade set default '',
  drop constraint if exists medlemskampanje_stedstype_check,
  add constraint medlemskampanje_stedstype_check
    check (stedstype in ('Hytte', 'Campingvogn', 'Begge', 'Annet'));

alter table public.medlemskampanje enable row level security;
revoke all on public.medlemskampanje from public, anon, authenticated;
revoke all on sequence public.medlemskampanje_nummer_seq from public, anon, authenticated;
grant usage on sequence public.medlemskampanje_nummer_seq to service_role;
grant select, insert, update on public.medlemskampanje to service_role;
grant select (medlemsnummer, fornavn, etternavn, mobil, epost, stedstype, omrade,
  hjemmeadresse, postnummer, poststed, hytteadresse, vognadresse,
  kontingentar, belop_ore, vipps_referanse, betalt_at, epost_sendt_at)
  on public.medlemskampanje to authenticated;

drop policy if exists medlemskampanje_styreadmin_les on public.medlemskampanje;
create policy medlemskampanje_styreadmin_les on public.medlemskampanje
  for select to authenticated
  using (status = 'betalt' and (select public.is_vel_admin()));

create or replace function public.fullfor_medlemsinnmelding(innmelding_id uuid)
returns public.medlemskampanje
language plpgsql
security invoker
set search_path = ''
as $$
declare
  innmelding public.medlemskampanje;
begin
  select * into strict innmelding
  from public.medlemskampanje
  where id = innmelding_id
  for update;

  if innmelding.medlemsnummer is null and innmelding.status <> 'refundert' then
    update public.medlemskampanje
    set status = 'betalt',
        medlemsnummer = nextval('public.medlemskampanje_nummer_seq'::regclass),
        betalt_at = now()
    where id = innmelding_id
    returning * into innmelding;
  end if;

  return innmelding;
end;
$$;

revoke all on function public.fullfor_medlemsinnmelding(uuid) from public, anon, authenticated;
grant execute on function public.fullfor_medlemsinnmelding(uuid) to service_role;
