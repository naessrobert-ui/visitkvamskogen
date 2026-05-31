drop policy if exists "Alle kan lese besvarte spørsmål" on public.activity_questions;
drop policy if exists "Alle kan lese besvarte spÃ¸rsmÃ¥l" on public.activity_questions;

create policy "Alle kan lese publiserte spørsmål"
on public.activity_questions
for select
using (
  status in ('pending', 'answered')
);
