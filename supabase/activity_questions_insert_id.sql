grant insert (
  id,
  activity_id,
  asker_name,
  asker_email,
  question,
  status
) on public.activity_questions to anon, authenticated;
