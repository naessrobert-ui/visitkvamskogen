create table if not exists public.vel_polls (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique constraint vel_polls_case_id_fkey references public.vel_cases(id) on delete cascade,
  deadline timestamptz,
  allow_suggestions boolean not null default true,
  formal_decision boolean not null default true,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid not null constraint vel_polls_created_by_fkey references public.vel_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vel_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null constraint vel_poll_options_poll_id_fkey references public.vel_polls(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 240),
  position integer not null default 1000,
  status text not null default 'active' check (status in ('active', 'pending', 'rejected')),
  proposed_by uuid not null constraint vel_poll_options_proposed_by_fkey references public.vel_members(id),
  approved_by uuid constraint vel_poll_options_approved_by_fkey references public.vel_members(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (poll_id, label),
  unique (id, poll_id)
);

create table if not exists public.vel_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null constraint vel_poll_votes_poll_id_fkey references public.vel_polls(id) on delete cascade,
  option_id uuid not null,
  member_id uuid not null constraint vel_poll_votes_member_id_fkey references public.vel_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (poll_id, member_id),
  constraint vel_poll_votes_option_poll_fkey foreign key (option_id, poll_id) references public.vel_poll_options(id, poll_id) on delete cascade
);

create index if not exists idx_vel_polls_case on public.vel_polls(case_id);
create index if not exists idx_vel_poll_options_poll on public.vel_poll_options(poll_id, status, position);
create index if not exists idx_vel_poll_votes_poll on public.vel_poll_votes(poll_id, option_id);

alter table public.vel_polls enable row level security;
alter table public.vel_poll_options enable row level security;
alter table public.vel_poll_votes enable row level security;

drop policy if exists vel_polls_read on public.vel_polls;
create policy vel_polls_read on public.vel_polls for select to authenticated using (public.is_vel_member());

drop policy if exists vel_poll_options_read on public.vel_poll_options;
create policy vel_poll_options_read on public.vel_poll_options for select to authenticated using (public.is_vel_member());

drop policy if exists vel_poll_options_suggest on public.vel_poll_options;
create policy vel_poll_options_suggest on public.vel_poll_options for insert to authenticated with check (
  public.is_vel_member()
  and proposed_by = public.current_vel_member_id()
  and status = 'pending'
  and exists (
    select 1 from public.vel_polls p
    where p.id = vel_poll_options.poll_id
      and p.allow_suggestions = true
      and p.status = 'open'
      and (p.deadline is null or p.deadline > now())
  )
);

drop policy if exists vel_poll_votes_insert_own on public.vel_poll_votes;
create policy vel_poll_votes_insert_own on public.vel_poll_votes for insert to authenticated with check (
  public.is_vel_member()
  and member_id = public.current_vel_member_id()
  and exists (
    select 1
    from public.vel_polls p
    join public.vel_poll_options o on o.poll_id = p.id
    where p.id = vel_poll_votes.poll_id
      and o.id = vel_poll_votes.option_id
      and o.status = 'active'
      and p.status = 'open'
      and (p.deadline is null or p.deadline > now())
  )
);

drop policy if exists vel_poll_votes_update_own on public.vel_poll_votes;
create policy vel_poll_votes_update_own on public.vel_poll_votes for update to authenticated
using (member_id = public.current_vel_member_id())
with check (
  member_id = public.current_vel_member_id()
  and exists (
    select 1
    from public.vel_polls p
    join public.vel_poll_options o on o.poll_id = p.id
    where p.id = vel_poll_votes.poll_id
      and o.id = vel_poll_votes.option_id
      and o.status = 'active'
      and p.status = 'open'
      and (p.deadline is null or p.deadline > now())
  )
);

drop policy if exists vel_poll_votes_read on public.vel_poll_votes;
create policy vel_poll_votes_read on public.vel_poll_votes for select to authenticated using (public.is_vel_member());

create or replace function public.create_vel_poll(
  p_case_id uuid,
  p_deadline timestamptz,
  p_allow_suggestions boolean,
  p_formal_decision boolean,
  p_options text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid := public.current_vel_member_id();
  v_poll_id uuid;
  v_option text;
  v_position integer := 10;
begin
  if v_member_id is null then
    raise exception 'Ikke tilgang til styrerommet';
  end if;

  if not exists (select 1 from public.vel_cases where id = p_case_id and created_by = v_member_id) then
    raise exception 'Avstemming kan bare opprettes av den som opprettet saken';
  end if;

  if coalesce(array_length(p_options, 1), 0) < 2 then
    raise exception 'Avstemmingen må ha minst to alternativer';
  end if;

  if p_deadline is null or p_deadline <= now() then
    raise exception 'Svarfristen må være i fremtiden';
  end if;

  insert into public.vel_polls (case_id, deadline, allow_suggestions, formal_decision, created_by)
  values (p_case_id, p_deadline, coalesce(p_allow_suggestions, true), coalesce(p_formal_decision, true), v_member_id)
  returning id into v_poll_id;

  foreach v_option in array p_options loop
    if char_length(trim(v_option)) between 1 and 240 then
      insert into public.vel_poll_options (poll_id, label, position, status, proposed_by, approved_by, approved_at)
      values (v_poll_id, trim(v_option), v_position, 'active', v_member_id, v_member_id, now());
      v_position := v_position + 10;
    end if;
  end loop;

  if (select count(*) from public.vel_poll_options where poll_id = v_poll_id and status = 'active') < 2 then
    raise exception 'Avstemmingen må ha minst to gyldige alternativer';
  end if;

  return v_poll_id;
end
$$;

create or replace function public.approve_vel_poll_option(p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll_id uuid;
begin
  if not public.is_vel_admin() then
    raise exception 'Bare styreleder eller administrator kan godkjenne alternativer';
  end if;

  select poll_id into v_poll_id
  from public.vel_poll_options
  where id = p_option_id and status = 'pending'
  for update;

  if v_poll_id is null then
    raise exception 'Alternativet finnes ikke eller er allerede behandlet';
  end if;

  update public.vel_poll_options
  set status = 'active', approved_by = public.current_vel_member_id(), approved_at = now()
  where id = p_option_id;

  update public.vel_polls set updated_at = now() where id = v_poll_id;
end
$$;

create or replace function public.reject_vel_poll_option(p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_vel_admin() then
    raise exception 'Bare styreleder eller administrator kan avvise alternativer';
  end if;

  update public.vel_poll_options
  set status = 'rejected', approved_by = public.current_vel_member_id(), approved_at = now()
  where id = p_option_id and status = 'pending';
end
$$;

revoke all on function public.create_vel_poll(uuid, timestamptz, boolean, boolean, text[]) from public, anon;
revoke all on function public.approve_vel_poll_option(uuid) from public, anon;
revoke all on function public.reject_vel_poll_option(uuid) from public, anon;
grant execute on function public.create_vel_poll(uuid, timestamptz, boolean, boolean, text[]) to authenticated;
grant execute on function public.approve_vel_poll_option(uuid) to authenticated;
grant execute on function public.reject_vel_poll_option(uuid) to authenticated;

revoke all on public.vel_polls, public.vel_poll_options, public.vel_poll_votes from anon;
grant select on public.vel_polls, public.vel_poll_options, public.vel_poll_votes to authenticated;
grant insert on public.vel_poll_options, public.vel_poll_votes to authenticated;
grant update on public.vel_poll_votes to authenticated;
