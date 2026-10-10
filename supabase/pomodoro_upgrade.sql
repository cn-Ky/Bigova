-- ============================================================================
-- Pomodoro: sunucuda doğrulanan odak oturumları + Bigcoin ödülü + istatistikler
-- Supabase > SQL Editor'de çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: bigocuk_upgrade.sql (cüzdan/ledger) ve bigova_v3_upgrade.sql çalıştırılmış olmalı.
--
-- Güvenlik modeli (Bigocuk ile aynı): tablolara istemci doğrudan YAZAMAZ.
--   1) pomodoro_start    : sunucu saatiyle oturumu başlatır (kullanıcı başına tek aktif oturum)
--   2) pomodoro_complete : GEÇEN SÜREYİ SUNUCU saatiyle doğrular. Süre dolmadan çağrılırsa ödül yok.
--                          Ödül = odak dakikası / 5 Bigcoin (en az 15 dk), günde en fazla 50 Bigcoin.
--   3) pomodoro_state    : bugünkü tur/dakika, son 7 gün, seri ve bugün kazanılan Bigcoin
-- Sabitler (src/lib/bigocuk/config.ts ile aynı olmalı):
--   MIN_REWARD_MIN = 15, MIN_PER_COIN = 5, DAILY_COIN_CAP = 50
-- Not: Ödül miktarı süreye bağlı olduğu için bigocuk_earn_sources yerine bu fonksiyon kullanılır;
--      kazanç yine bigocuk_ledger'a 'earn:pomodoro' nedeniyle yazılır.
-- ============================================================================

-- 1) Tablolar ---------------------------------------------------------------
-- Devam eden oturum (kullanıcı başına en fazla bir satır)
create table if not exists public.pomodoro_active (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  minutes integer not null check (minutes between 5 and 120),
  task text
);

-- Tamamlanan oturumların geçmişi (istatistik kaynağı)
create table if not exists public.pomodoro_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  minutes integer not null check (minutes between 5 and 120),
  task text,
  coins integer not null default 0 check (coins >= 0),
  created_at timestamptz not null default now()
);
create index if not exists pomodoro_sessions_user_day_idx on public.pomodoro_sessions (user_id, day);

-- 2) RLS: yalnızca kendi geçmişini OKUR, hiçbir tabloya doğrudan yazılamaz ------
alter table public.pomodoro_active enable row level security;
alter table public.pomodoro_sessions enable row level security;
revoke all on public.pomodoro_active, public.pomodoro_sessions from anon, authenticated;
grant select on public.pomodoro_sessions to authenticated;
drop policy if exists "pomodoro: kendi okur" on public.pomodoro_sessions;
create policy "pomodoro: kendi okur" on public.pomodoro_sessions for select to authenticated using (user_id = auth.uid());

-- 3) Dahili: istatistik durumu ---------------------------------------------------
create or replace function public.pomodoro_build_state(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c_min_reward constant integer := 15;
  c_per_coin constant integer := 5;
  c_daily_cap constant integer := 50;
  v_today date := public.bigocuk_today();
  v_base date;
  v_streak integer;
begin
  -- seri: bugün (yoksa dün) başlayarak aralıksız geriye giden gün sayısı
  v_base := case when exists (
    select 1 from public.pomodoro_sessions s where s.user_id = p_user and s.day = v_today
  ) then v_today else v_today - 1 end;
  select coalesce(min(i), 60) into v_streak
    from generate_series(0, 59) i
   where not exists (select 1 from public.pomodoro_sessions s where s.user_id = p_user and s.day = v_base - i);

  return jsonb_build_object(
    'today', jsonb_build_object(
      'n', (select count(*) from public.pomodoro_sessions s where s.user_id = p_user and s.day = v_today),
      'min', coalesce((select sum(s.minutes) from public.pomodoro_sessions s where s.user_id = p_user and s.day = v_today), 0)
    ),
    'week', (
      select jsonb_agg(jsonb_build_object('day', d.day::text, 'n', coalesce(c.n, 0)) order by d.day)
        from (select (v_today - g)::date as day from generate_series(0, 6) g) d
        left join (
          select s.day, count(*)::integer as n from public.pomodoro_sessions s
           where s.user_id = p_user and s.day >= v_today - 6 group by s.day
        ) c on c.day = d.day
    ),
    'streak', v_streak,
    'earnedToday', coalesce((
      select sum(l.delta) from public.bigocuk_ledger l
       where l.user_id = p_user and l.day = v_today and l.reason = 'earn:pomodoro'
    ), 0),
    'cap', c_daily_cap,
    'perCoin', c_per_coin,
    'minReward', c_min_reward
  );
end $$;

-- 4) İstemcinin çağırdığı fonksiyonlar -------------------------------------------
create or replace function public.pomodoro_state() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  return public.pomodoro_build_state(auth.uid());
end $$;

-- Odak oturumunu başlatır. Önceki bitmemiş oturum varsa üzerine yazılır.
create or replace function public.pomodoro_start(p_minutes integer, p_task text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 120 then
    raise exception 'Süre 5 ile 120 dakika arasında olmalı.';
  end if;
  perform public.bigocuk_ensure_wallet(); -- profil + cüzdan satırını garanti eder
  insert into public.pomodoro_active (user_id, started_at, minutes, task)
  values (v_uid, now(), p_minutes, nullif(left(trim(coalesce(p_task, '')), 80), ''))
  on conflict (user_id) do update
    set started_at = now(), minutes = excluded.minutes, task = excluded.task;
  return public.pomodoro_build_state(v_uid);
end $$;

-- Oturumu tamamlar. status değerleri:
--   ok         : oturum sayıldı (earned > 0 ise Bigcoin yazıldı; note: 'short' = 15 dk altı, 'cap' = günlük sınır)
--   too_early  : süre henüz dolmadı (satır silinmez; wait = kalan saniye, istemci bekleyip yeniden dener)
--   expired    : planlanan bitişten 2 saatten fazla geçti, sayılmaz
--   no_session : sunucuda aktif oturum yok
create or replace function public.pomodoro_complete() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c_min_reward constant integer := 15;
  c_per_coin constant integer := 5;
  c_daily_cap constant integer := 50;
  c_tolerance constant numeric := 2;   -- ağ gecikmesi payı (sn)
  c_expire constant numeric := 7200;   -- planlanan bitişten sonra en geç 2 saat
  v_uid uuid := auth.uid();
  v_day date := public.bigocuk_today();
  a public.pomodoro_active;
  v_elapsed numeric;
  v_planned numeric;
  v_used integer;
  v_reward integer := 0;
  v_status text := 'ok';
  v_note text := '';
  v_wait integer := 0;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  perform public.bigocuk_ensure_wallet();

  select * into a from public.pomodoro_active where user_id = v_uid for update;
  if not found then
    v_status := 'no_session';
  else
    v_planned := a.minutes * 60;
    v_elapsed := extract(epoch from (now() - a.started_at));
    if v_elapsed < v_planned - c_tolerance then
      v_status := 'too_early';
      v_wait := ceil(v_planned - c_tolerance - v_elapsed)::integer;
    else
      delete from public.pomodoro_active where user_id = v_uid;
      if v_elapsed > v_planned + c_expire then
        v_status := 'expired';
      else
        if a.minutes < c_min_reward then
          v_note := 'short';
        else
          select coalesce(sum(l.delta), 0) into v_used from public.bigocuk_ledger l
           where l.user_id = v_uid and l.day = v_day and l.reason = 'earn:pomodoro';
          v_reward := greatest(0, least(a.minutes / c_per_coin, c_daily_cap - v_used));
          if v_reward = 0 then v_note := 'cap'; end if;
        end if;

        insert into public.pomodoro_sessions (user_id, day, minutes, task, coins)
        values (v_uid, v_day, a.minutes, a.task, v_reward);

        if v_reward > 0 then
          update public.bigocuk_wallets set coins = coins + v_reward, updated_at = now() where user_id = v_uid;
          insert into public.bigocuk_ledger (user_id, delta, reason, day)
          values (v_uid, v_reward, 'earn:pomodoro', v_day);
        end if;
      end if;
    end if;
  end if;

  return public.bigocuk_build_state(v_uid) || jsonb_build_object(
    'status', v_status, 'earned', v_reward, 'note', v_note, 'wait', v_wait,
    'pomodoro', public.pomodoro_build_state(v_uid)
  );
end $$;

-- 5) Yetkiler -----------------------------------------------------------------
revoke all on function public.pomodoro_build_state(uuid) from public, anon, authenticated;
revoke all on function public.pomodoro_state() from public, anon;
revoke all on function public.pomodoro_start(integer, text) from public, anon;
revoke all on function public.pomodoro_complete() from public, anon;
grant execute on function public.pomodoro_state() to authenticated;
grant execute on function public.pomodoro_start(integer, text) to authenticated;
grant execute on function public.pomodoro_complete() to authenticated;

-- PostgREST'in fonksiyon önbelleğini yenile
notify pgrst, 'reload schema';
