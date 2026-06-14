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

drop policy if exists "Alle kan lese publiserte aktiviteter" on public.activities;
create policy "Alle kan lese publiserte aktiviteter"
on public.activities
for select
using (
  status = 'published'
  and date >= current_date
);
