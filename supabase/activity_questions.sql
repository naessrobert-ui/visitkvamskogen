create table if not exists public.activity_questions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  asker_name text,
  asker_email text,
  question text not null,
  answer text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

alter table public.activity_questions enable row level security;

revoke all on public.activity_questions from anon, authenticated;

grant insert (
  activity_id,
  asker_name,
  asker_email,
  question,
  status
) on public.activity_questions to anon, authenticated;

grant select (
  id,
  activity_id,
  question,
  answer,
  status,
  created_at,
  answered_at
) on public.activity_questions to anon, authenticated;

create policy "Alle kan stille spørsmål"
on public.activity_questions
for insert
with check (
  status = 'pending'
  and answer is null
  and exists (
    select 1
    from public.activities
    where activities.id = activity_id
      and activities.status = 'published'
      and activities.date >= current_date
  )
);

create policy "Alle kan lese besvarte spørsmål"
on public.activity_questions
for select
using (
  status = 'answered'
  and answer is not null
);
