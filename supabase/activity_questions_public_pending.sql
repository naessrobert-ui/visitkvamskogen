drop policy if exists "Alle kan lese besvarte sporsmal" on public.activity_questions;
drop policy if exists "Alle kan lese besvarte spÃ¸rsmÃ¥l" on public.activity_questions;
drop policy if exists "Alle kan lese besvarte spÃƒÂ¸rsmÃƒÂ¥l" on public.activity_questions;
drop policy if exists "Alle kan lese publiserte sporsmal" on public.activity_questions;
drop policy if exists "Alle kan lese publiserte spÃ¸rsmÃ¥l" on public.activity_questions;
drop policy if exists "Alle kan lese publiserte spÃƒÂ¸rsmÃƒÂ¥l" on public.activity_questions;

create policy "Alle kan lese publiserte sporsmal"
on public.activity_questions
for select
using (
  status in ('pending', 'answered')
);
