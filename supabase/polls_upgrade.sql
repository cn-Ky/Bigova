-- Haftalık Bigova anketleri. Oylar kullanıcı kimliğiyle haftada bir sınırlandırılır.
create table if not exists public.weekly_polls (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  week_end date not null,
  question text not null check (char_length(question) between 5 and 240),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (week_end >= week_start)
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.weekly_polls(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  option_index smallint not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);
create index if not exists poll_votes_poll_idx on public.poll_votes (poll_id);

alter table public.weekly_polls enable row level security;
alter table public.poll_votes enable row level security;
grant select on public.weekly_polls to anon, authenticated;
grant insert on public.weekly_polls to authenticated;
grant select, insert on public.poll_votes to authenticated;
drop policy if exists "poll herkes okur" on public.weekly_polls;
drop policy if exists "poll admin olusturur" on public.weekly_polls;
drop policy if exists "kullanici kendi oyunu okur" on public.poll_votes;
drop policy if exists "kullanici haftada bir oy verir" on public.poll_votes;
create policy "poll herkes okur" on public.weekly_polls for select
  using (current_date between week_start and week_end);
create policy "poll admin olusturur" on public.weekly_polls for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and created_by = auth.uid());
create policy "kullanici kendi oyunu okur" on public.poll_votes for select to authenticated
  using (voter_id = auth.uid());
create policy "kullanici haftada bir oy verir" on public.poll_votes for insert to authenticated
  with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.weekly_polls p
      where p.id = poll_id and current_date between p.week_start and p.week_end
        and option_index < jsonb_array_length(p.options)
    )
  );

create or replace function public.get_weekly_poll_results(p_poll_id uuid)
returns table(option_index smallint, vote_count bigint)
language sql security definer stable set search_path = public as $$
  select (choice.ordinality - 1)::smallint, count(v.id)::bigint
  from public.weekly_polls p
  cross join lateral jsonb_array_elements(p.options) with ordinality as choice(value, ordinality)
  left join public.poll_votes v on v.poll_id = p.id and v.option_index = choice.ordinality - 1
  where p.id = p_poll_id and current_date between p.week_start and p.week_end
  group by choice.ordinality;
$$;

create or replace function public.get_my_weekly_poll_vote(p_poll_id uuid)
returns smallint language sql security definer stable set search_path = public as $$
  select option_index from public.poll_votes where poll_id = p_poll_id and voter_id = auth.uid();
$$;

revoke all on function public.get_weekly_poll_results(uuid) from public;
revoke all on function public.get_my_weekly_poll_vote(uuid) from public;
grant execute on function public.get_weekly_poll_results(uuid) to anon, authenticated;
grant execute on function public.get_my_weekly_poll_vote(uuid) to authenticated;