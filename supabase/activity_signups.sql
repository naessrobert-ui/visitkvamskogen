create table public.activity_signups (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  people_count integer not null default 1 check (people_count > 0 and people_count <= 20),
  message text,
  created_at timestamptz not null default now()
);

alter table public.activity_signups enable row level security;

revoke select on public.activity_signups from anon, authenticated;

grant insert (
  activity_id,
  name,
  email,
  phone,
  people_count,
  message
) on public.activity_signups to anon, authenticated;

create policy "Alle kan melde seg på aktiviteter"
on public.activity_signups
for insert
with check (
  exists (
    select 1
    from public.activities
    where activities.id = activity_id
      and activities.status = 'published'
      and activities.date >= current_date
  )
);
