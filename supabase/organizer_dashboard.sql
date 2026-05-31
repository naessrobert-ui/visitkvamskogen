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
  organizer_verification_token,
  description,
  organizer_note,
  qa_text,
  status
) on public.activities to anon, authenticated;

create or replace function public.organizer_activity_details(
  p_activity_id uuid,
  p_token uuid
)
returns table (
  id uuid,
  title text,
  date date,
  time time,
  place text,
  status text,
  signup_people_count bigint,
  signups jsonb,
  questions jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    activities.id,
    activities.title,
    activities.date,
    activities.time,
    activities.place,
    activities.status,
    coalesce((
      select sum(activity_signups.people_count)::bigint
      from public.activity_signups
      where activity_signups.activity_id = activities.id
    ), 0) as signup_people_count,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', activity_signups.id,
          'name', activity_signups.name,
          'email', activity_signups.email,
          'phone', activity_signups.phone,
          'people_count', activity_signups.people_count,
          'message', activity_signups.message,
          'created_at', activity_signups.created_at
        )
        order by activity_signups.created_at
      )
      from public.activity_signups
      where activity_signups.activity_id = activities.id
    ), '[]'::jsonb) as signups,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', activity_questions.id,
          'question', activity_questions.question,
          'answer', activity_questions.answer,
          'status', activity_questions.status,
          'created_at', activity_questions.created_at,
          'answered_at', activity_questions.answered_at
        )
        order by activity_questions.created_at
      )
      from public.activity_questions
      where activity_questions.activity_id = activities.id
        and activity_questions.status in ('pending', 'answered')
    ), '[]'::jsonb) as questions
  from public.activities
  where activities.id = p_activity_id
    and activities.organizer_verification_token = p_token;
$$;

create or replace function public.answer_activity_question(
  p_activity_id uuid,
  p_token uuid,
  p_question_id uuid,
  p_answer text
)
returns table (
  ok boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.activities
    where activities.id = p_activity_id
      and activities.organizer_verification_token = p_token
  ) then
    raise exception 'Ugyldig arrangørlenke';
  end if;

  update public.activity_questions
  set
    answer = nullif(trim(p_answer), ''),
    status = 'answered',
    answered_at = now()
  where activity_questions.id = p_question_id
    and activity_questions.activity_id = p_activity_id;

  return query select true;
end;
$$;

revoke all on function public.organizer_activity_details(uuid, uuid) from public;
revoke all on function public.answer_activity_question(uuid, uuid, uuid, text) from public;
grant execute on function public.organizer_activity_details(uuid, uuid) to anon, authenticated;
grant execute on function public.answer_activity_question(uuid, uuid, uuid, text) to anon, authenticated;
