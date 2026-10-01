-- Kitap pazari, bire bir sohbet ve arkadaslik serileri.
create table if not exists public.book_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 120),
  author text check (author is null or char_length(author) <= 120),
  course text check (course is null or char_length(course) <= 80),
  condition text not null check (condition in ('Yeni','Çok iyi','İyi','Kullanılmış')),
  price numeric(10,2) not null check (price >= 0),
  description text check (description is null or char_length(description) <= 500),
  status text not null default 'available' check (status in ('available','sold')),
  created_at timestamptz not null default now()
);
create index if not exists book_listings_available_idx on public.book_listings (created_at desc) where status = 'available';
alter table public.book_listings enable row level security;
drop policy if exists "books herkes okur" on public.book_listings;
drop policy if exists "books kendi ekler" on public.book_listings;
drop policy if exists "books kendi gunceller" on public.book_listings;
drop policy if exists "books kendi siler" on public.book_listings;
create policy "books herkes okur" on public.book_listings for select using (true);
create policy "books kendi ekler" on public.book_listings for insert to authenticated with check (seller_id = auth.uid());
create policy "books kendi gunceller" on public.book_listings for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy "books kendi siler" on public.book_listings for delete to authenticated using (seller_id = auth.uid());

create table if not exists public.friendship_streaks (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  last_activity_date date not null,
  last_mutual_date date,
  today_senders uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
alter table public.friendship_streaks enable row level security;
drop policy if exists "streak arkadaslari okur" on public.friendship_streaks;
create policy "streak arkadaslari okur" on public.friendship_streaks for select to authenticated
  using (auth.uid() in (user_a, user_b) and public.are_friends(user_a, user_b));

create or replace function public.update_friendship_streak() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  first_user uuid := least(new.from_id, new.to_id);
  second_user uuid := greatest(new.from_id, new.to_id);
begin
  insert into public.friendship_streaks (user_a, user_b, current_streak, last_activity_date, today_senders)
  values (first_user, second_user, 0, current_date, array[new.from_id])
  on conflict (user_a, user_b) do update set
    today_senders = case
      when friendship_streaks.last_activity_date = current_date and not (new.from_id = any(friendship_streaks.today_senders)) then array_append(friendship_streaks.today_senders, new.from_id)
      when friendship_streaks.last_activity_date = current_date then friendship_streaks.today_senders
      else array[new.from_id]
    end,
    current_streak = case
      when friendship_streaks.last_activity_date = current_date
        and not (new.from_id = any(friendship_streaks.today_senders))
        and cardinality(friendship_streaks.today_senders) = 1
        and friendship_streaks.last_mutual_date = current_date - 1 then friendship_streaks.current_streak + 1
      when friendship_streaks.last_activity_date = current_date
        and not (new.from_id = any(friendship_streaks.today_senders))
        and cardinality(friendship_streaks.today_senders) = 1 then 1
      else friendship_streaks.current_streak
    end,
    last_mutual_date = case
      when friendship_streaks.last_activity_date = current_date
        and not (new.from_id = any(friendship_streaks.today_senders))
        and cardinality(friendship_streaks.today_senders) = 1 then current_date
      else friendship_streaks.last_mutual_date
    end,
    last_activity_date = current_date,
    updated_at = now();
  return new;
end $$;
drop trigger if exists messages_update_friendship_streak on public.messages;
create trigger messages_update_friendship_streak after insert on public.messages
  for each row execute function public.update_friendship_streak();