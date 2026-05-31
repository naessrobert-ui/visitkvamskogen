alter table public.activities
  add column if not exists organizer_email_verified boolean not null default false,
  add column if not exists organizer_verification_token uuid not null default gen_random_uuid(),
  add column if not exists organizer_verified_at timestamptz;

drop policy if exists "Alle kan sende inn aktivitet til e-postbekreftelse" on public.activities;

create policy "Alle kan sende inn aktivitet til e-postbekreftelse"
on public.activities
for insert
with check (
  status = 'pending_email_verification'
);

create or replace function public.verify_activity_email(
  p_activity_id uuid,
  p_token uuid
)
returns table (
  ok boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.activities
  set
    organizer_email_verified = true,
    organizer_verified_at = now(),
    status = 'published'
  where activities.id = p_activity_id
    and activities.organizer_verification_token = p_token
    and activities.status = 'pending_email_verification';

  if not found then
    raise exception 'Ugyldig eller brukt bekreftelseslenke';
  end if;

  return query select true;
end;
$$;

revoke all on function public.verify_activity_email(uuid, uuid) from public;
grant execute on function public.verify_activity_email(uuid, uuid) to anon, authenticated;
