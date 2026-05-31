alter table public.activities
  add column if not exists organizer_phone text,
  add column if not exists organizer_email_verified boolean not null default false,
  add column if not exists organizer_verification_token uuid not null default gen_random_uuid(),
  add column if not exists organizer_verified_at timestamptz;

grant insert (
  title,
  type,
  date,
  time,
  place,
  price,
  organizer,
  email,
  organizer_phone,
  description,
  organizer_note,
  qa_text,
  status
) on public.activities to anon, authenticated;

grant select (
  id,
  title,
  type,
  date,
  time,
  place,
  price,
  organizer,
  description,
  organizer_note,
  qa_text,
  status,
  created_at
) on public.activities to anon, authenticated;
