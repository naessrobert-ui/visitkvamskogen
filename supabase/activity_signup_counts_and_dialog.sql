alter table public.activities
  add column if not exists organizer_note text,
  add column if not exists qa_text text;

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

grant insert (
  title,
  type,
  date,
  time,
  place,
  price,
  organizer,
  email,
  description,
  organizer_note,
  qa_text,
  status
) on public.activities to anon, authenticated;

create or replace function public.activity_signup_counts()
returns table (
  activity_id uuid,
  signup_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    activity_signups.activity_id,
    coalesce(sum(activity_signups.people_count), 0)::bigint as signup_count
  from public.activity_signups
  join public.activities
    on activities.id = activity_signups.activity_id
  where activities.status = 'published'
    and activities.date >= current_date
  group by activity_signups.activity_id;
$$;

revoke all on function public.activity_signup_counts() from public;
grant execute on function public.activity_signup_counts() to anon, authenticated;
