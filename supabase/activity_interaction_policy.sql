drop policy if exists "Alle kan melde seg pÃ¥ aktiviteter" on public.activity_signups;

create policy "Alle kan melde seg pÃ¥ aktiviteter"
on public.activity_signups
for insert
with check (
  exists (
    select 1
    from public.activities
    where activities.id = activity_id
      and activities.status = 'published'
  )
);

drop policy if exists "Alle kan stille spÃ¸rsmÃ¥l" on public.activity_questions;

create policy "Alle kan stille spÃ¸rsmÃ¥l"
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
  )
);
