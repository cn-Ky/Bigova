-- ============================================================================
-- Bigocuk: Bigcoin cüzdanı, adım sayar ve avatar mağazası
-- Supabase > SQL Editor'de çalıştır. Birden çok kez çalıştırmak güvenlidir
-- (mağaza fiyatları aşağıdaki listeden yeniden yazılır, kullanıcı verisi korunur).
-- Önkoşul: supabase/schema.sql çalıştırılmış olmalı (public.profiles tablosu).
--
-- Güvenlik modeli: Bigcoin tablolarına istemci doğrudan YAZAMAZ. Tüm kazanma ve
-- harcama işlemleri aşağıdaki SECURITY DEFINER fonksiyonlarından geçer; sınırlar
-- (günlük adım, hız, fiyat, sahiplik) veritabanında denetlenir.
-- ============================================================================

-- 1) Tablolar ---------------------------------------------------------------
create table if not exists public.bigocuk_items (
  id text primary key,
  slot text not null check (slot in ('bg','hair','top','bottom','shoes','glasses','hat','extra')),
  name text not null,
  price integer not null default 0 check (price >= 0)
);

create table if not exists public.bigocuk_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  total_steps bigint not null default 0,
  walk_remainder integer not null default 0 check (walk_remainder between 0 and 49),
  last_walk_at timestamptz,
  avatar jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bigocuk_inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.bigocuk_items(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.bigocuk_daily (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  steps integer not null default 0 check (steps >= 0),
  primary key (user_id, day)
);

-- Her Bigcoin hareketinin kaydı (+ kazanç, - harcama)
create table if not exists public.bigocuk_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  reason text not null,
  day date not null,
  created_at timestamptz not null default now()
);
create index if not exists bigocuk_ledger_user_day_idx on public.bigocuk_ledger (user_id, day, reason);

-- Adım dışındaki coin kazanma yolları (yeni oyunlar / işlemler için)
create table if not exists public.bigocuk_earn_sources (
  source text primary key,
  label text not null,
  coins integer not null check (coins > 0),
  daily_limit integer not null check (daily_limit > 0),
  active boolean not null default true
);

-- 2) Mağaza kataloğu (src/lib/bigocuk/items.tsx ile aynı) -------------------
insert into public.bigocuk_items (id, slot, name, price) values
  ('hair-short', 'hair', 'Kısa saç', 0),
  ('hair-long', 'hair', 'Uzun saç', 40),
  ('hair-bun', 'hair', 'Topuz', 40),
  ('hair-pony', 'hair', 'At kuyruğu', 50),
  ('hair-curly', 'hair', 'Kıvırcık', 60),
  ('hair-afro', 'hair', 'Kabarık', 60),
  ('top-tee', 'top', 'Beyaz tişört', 0),
  ('top-bigova', 'top', 'Bigova tişörtü', 80),
  ('top-jersey', 'top', 'Turkuaz forma', 140),
  ('top-stripe', 'top', 'Çizgili sweat', 100),
  ('top-hoodie', 'top', 'Kırmızı hoodie', 120),
  ('top-rain', 'top', 'Sarı yağmurluk', 150),
  ('top-blazer', 'top', 'Ceket', 200),
  ('bottom-jeans', 'bottom', 'Mavi kot', 0),
  ('bottom-black', 'bottom', 'Siyah pantolon', 60),
  ('bottom-shorts', 'bottom', 'Şort', 50),
  ('bottom-skirt', 'bottom', 'Etek', 70),
  ('bottom-cargo', 'bottom', 'Kargo pantolon', 80),
  ('bottom-track', 'bottom', 'Eşofman', 60),
  ('shoes-white', 'shoes', 'Beyaz spor ayakkabı', 0),
  ('shoes-red', 'shoes', 'Kırmızı spor ayakkabı', 60),
  ('shoes-boots', 'shoes', 'Siyah bot', 70),
  ('shoes-rain', 'shoes', 'Sarı çizme', 90),
  ('glasses-none', 'glasses', 'Gözlüksüz', 0),
  ('glasses-round', 'glasses', 'Yuvarlak gözlük', 50),
  ('glasses-sun', 'glasses', 'Güneş gözlüğü', 80),
  ('glasses-heart', 'glasses', 'Kalp gözlük', 100),
  ('hat-none', 'hat', 'Şapkasız', 0),
  ('hat-beanie', 'hat', 'Bere', 60),
  ('hat-cap', 'hat', 'Kep', 70),
  ('hat-bucket', 'hat', 'Bucket şapka', 80),
  ('hat-crown', 'hat', 'Altın taç', 400),
  ('extra-none', 'extra', 'Aksesuarsız', 0),
  ('extra-phones', 'extra', 'Kulaklık', 100),
  ('extra-scarf', 'extra', 'Atkı', 80),
  ('extra-pack', 'extra', 'Sırt çantası', 120),
  ('extra-badge', 'extra', 'Martı rozeti', 60),
  ('bg-sky', 'bg', 'Açık gökyüzü', 0),
  ('bg-sea', 'bg', 'Ege denizi', 40),
  ('bg-sunset', 'bg', 'Gün batımı', 40),
  ('bg-forest', 'bg', 'Orman', 40),
  ('bg-lav', 'bg', 'Lavanta', 40),
  ('bg-night', 'bg', 'Yıldızlı gece', 60),
  ('bg-gold', 'bg', 'Altın ışıltı', 300)
on conflict (id) do update set slot = excluded.slot, name = excluded.name, price = excluded.price;

-- 3) RLS: herkes yalnızca kendi verisini OKUR, hiç kimse doğrudan yazamaz -----
alter table public.bigocuk_items enable row level security;
alter table public.bigocuk_wallets enable row level security;
alter table public.bigocuk_inventory enable row level security;
alter table public.bigocuk_daily enable row level security;
alter table public.bigocuk_ledger enable row level security;
alter table public.bigocuk_earn_sources enable row level security;

revoke all on public.bigocuk_items, public.bigocuk_wallets, public.bigocuk_inventory,
  public.bigocuk_daily, public.bigocuk_ledger, public.bigocuk_earn_sources from anon, authenticated;
grant select on public.bigocuk_items to anon, authenticated;
grant select on public.bigocuk_wallets, public.bigocuk_inventory, public.bigocuk_daily, public.bigocuk_ledger to authenticated;

drop policy if exists "bigocuk items: herkes okur" on public.bigocuk_items;
drop policy if exists "bigocuk wallet: kendi okur" on public.bigocuk_wallets;
drop policy if exists "bigocuk envanter: kendi okur" on public.bigocuk_inventory;
drop policy if exists "bigocuk gunluk: kendi okur" on public.bigocuk_daily;
drop policy if exists "bigocuk defter: kendi okur" on public.bigocuk_ledger;
create policy "bigocuk items: herkes okur" on public.bigocuk_items for select using (true);
create policy "bigocuk wallet: kendi okur" on public.bigocuk_wallets for select to authenticated using (user_id = auth.uid());
create policy "bigocuk envanter: kendi okur" on public.bigocuk_inventory for select to authenticated using (user_id = auth.uid());
create policy "bigocuk gunluk: kendi okur" on public.bigocuk_daily for select to authenticated using (user_id = auth.uid());
create policy "bigocuk defter: kendi okur" on public.bigocuk_ledger for select to authenticated using (user_id = auth.uid());

-- 4) Yardımcı (dahili) fonksiyonlar ------------------------------------------
create or replace function public.bigocuk_today() returns date
language sql stable as $$ select (now() at time zone 'Europe/Istanbul')::date $$;

create or replace function public.bigocuk_default_avatar() returns jsonb
language sql immutable as $$
  select '{"skin":"s2","hairColor":"h2","bg":"bg-sky","hair":"hair-short","top":"top-tee","bottom":"bottom-jeans","shoes":"shoes-white","glasses":"glasses-none","hat":"hat-none","extra":"extra-none"}'::jsonb
$$;

create or replace function public.bigocuk_ensure_wallet() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  insert into public.bigocuk_wallets (user_id, avatar)
  values (auth.uid(), public.bigocuk_default_avatar())
  on conflict (user_id) do nothing;
end $$;

create or replace function public.bigocuk_build_state(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'coins', w.coins,
    'totalSteps', w.total_steps,
    'remainder', w.walk_remainder,
    'todaySteps', coalesce((select d.steps from public.bigocuk_daily d where d.user_id = p_user and d.day = public.bigocuk_today()), 0),
    'owned', coalesce((select jsonb_agg(i.item_id) from public.bigocuk_inventory i where i.user_id = p_user), '[]'::jsonb),
    'avatar', public.bigocuk_default_avatar() || w.avatar
  )
  from public.bigocuk_wallets w where w.user_id = p_user
$$;

-- 5) İstemcinin çağırdığı fonksiyonlar -----------------------------------------
create or replace function public.bigocuk_state() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.bigocuk_ensure_wallet();
  return public.bigocuk_build_state(auth.uid());
end $$;

-- Adım ekler. Her 50 adım = 1 Bigcoin. Kurallar:
--  * günlük en fazla 10000 adım sayılır (200 Bigcoin)
--  * tek istekte en fazla 100 adım
--  * fiziksel hız sınırı: son kayıttan bu yana geçen süreye göre en fazla 4,5 adım/sn
--    (süre dolmadan gelen istek hiç adım kazandırmaz; hakkı birikir, kaybolmaz)
-- Fazla gelen adımlar sessizce sayılmaz; istemci dönen duruma göre kendini düzeltir.
create or replace function public.bigocuk_add_steps(p_steps integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c_cap constant integer := 10000;
  c_sync constant integer := 100;
  c_per_coin constant integer := 50;
  v_uid uuid := auth.uid();
  v_day date := public.bigocuk_today();
  w public.bigocuk_wallets;
  v_elapsed numeric;
  v_allowed integer;
  v_used integer;
  v_counted integer := 0;
  v_total integer;
  v_earned integer := 0;
begin
  perform public.bigocuk_ensure_wallet();
  select * into w from public.bigocuk_wallets where user_id = v_uid for update;

  if p_steps is not null and p_steps > 0 then
    v_elapsed := case when w.last_walk_at is null then 60
                      else extract(epoch from (now() - w.last_walk_at)) end;
    v_allowed := least(p_steps, c_sync, floor(v_elapsed * 4.5)::integer);

    insert into public.bigocuk_daily (user_id, day, steps) values (v_uid, v_day, 0)
    on conflict (user_id, day) do nothing;
    select d.steps into v_used from public.bigocuk_daily d where d.user_id = v_uid and d.day = v_day for update;

    v_counted := greatest(0, least(v_allowed, c_cap - v_used));
    if v_counted > 0 then
      update public.bigocuk_daily set steps = steps + v_counted where user_id = v_uid and day = v_day;
      v_total := w.walk_remainder + v_counted;
      v_earned := v_total / c_per_coin;
      update public.bigocuk_wallets
         set coins = coins + v_earned,
             total_steps = total_steps + v_counted,
             walk_remainder = v_total % c_per_coin,
             last_walk_at = now(),
             updated_at = now()
       where user_id = v_uid;
      if v_earned > 0 then
        insert into public.bigocuk_ledger (user_id, delta, reason, day) values (v_uid, v_earned, 'walk', v_day);
      end if;
    end if;
  end if;

  return public.bigocuk_build_state(v_uid) || jsonb_build_object('accepted', v_counted, 'earned', v_earned);
end $$;

-- Mağazadan parça satın alır (ücretsiz parçalar zaten herkesin).
create or replace function public.bigocuk_buy(p_item_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  it public.bigocuk_items;
  w public.bigocuk_wallets;
begin
  perform public.bigocuk_ensure_wallet();
  select * into it from public.bigocuk_items where id = p_item_id;
  if not found then raise exception 'Bu parça bulunamadı.'; end if;
  select * into w from public.bigocuk_wallets where user_id = v_uid for update;

  if it.price > 0 and not exists (
    select 1 from public.bigocuk_inventory i where i.user_id = v_uid and i.item_id = it.id
  ) then
    if w.coins < it.price then raise exception 'Yeterli Bigcoin yok.'; end if;
    update public.bigocuk_wallets set coins = coins - it.price, updated_at = now() where user_id = v_uid;
    insert into public.bigocuk_inventory (user_id, item_id) values (v_uid, it.id);
    insert into public.bigocuk_ledger (user_id, delta, reason, day)
    values (v_uid, -it.price, 'buy:' || it.id, public.bigocuk_today());
  end if;
  return public.bigocuk_build_state(v_uid);
end $$;

-- Avatarı kaydeder. Sadece ücretsiz ya da satın alınmış parçalar giyilebilir.
create or replace function public.bigocuk_save_avatar(p_avatar jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  s_name text;
  v text;
  clean jsonb;
begin
  perform public.bigocuk_ensure_wallet();
  if jsonb_typeof(p_avatar) is distinct from 'object' then raise exception 'Geçersiz avatar.'; end if;
  if coalesce(p_avatar->>'skin', '') !~ '^s[1-6]$' then raise exception 'Geçersiz ten rengi.'; end if;
  if coalesce(p_avatar->>'hairColor', '') !~ '^h[1-8]$' then raise exception 'Geçersiz saç rengi.'; end if;
  clean := jsonb_build_object('skin', p_avatar->>'skin', 'hairColor', p_avatar->>'hairColor');

  foreach s_name in array array['bg','hair','top','bottom','shoes','glasses','hat','extra'] loop
    v := p_avatar->>s_name;
    if v is null or not exists (
      select 1 from public.bigocuk_items i
      where i.id = v and i.slot = s_name
        and (i.price = 0 or exists (
          select 1 from public.bigocuk_inventory inv where inv.user_id = v_uid and inv.item_id = i.id))
    ) then
      raise exception 'Bu parçayı giyemezsin (%).', s_name;
    end if;
    clean := clean || jsonb_build_object(s_name, v);
  end loop;

  update public.bigocuk_wallets set avatar = clean, updated_at = now() where user_id = v_uid;
  return public.bigocuk_build_state(v_uid);
end $$;

-- 6) Sunucu tarafı ödül fonksiyonu (istemciden ÇAĞRILAMAZ) ------------------------
-- Yeni oyunlar / işlemler (anket oyu, not yükleme vb.) kendi doğrulamasını yaptıktan sonra
-- bir tetikleyici ya da kendi security definer fonksiyonu içinden çağırır:
--   perform public.bigocuk_grant(new.voter_id, 'poll_vote');
-- Ödül miktarı ve günlük sınır bigocuk_earn_sources tablosundan gelir. Kazanılan coini döndürür.
create or replace function public.bigocuk_grant(p_user uuid, p_source text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  s public.bigocuk_earn_sources;
  v_count integer;
begin
  select * into s from public.bigocuk_earn_sources where source = p_source and active;
  if not found then return 0; end if;
  select count(*) into v_count from public.bigocuk_ledger l
   where l.user_id = p_user and l.reason = 'earn:' || p_source and l.day = public.bigocuk_today();
  if v_count >= s.daily_limit then return 0; end if;
  insert into public.bigocuk_wallets (user_id, avatar) values (p_user, public.bigocuk_default_avatar())
  on conflict (user_id) do nothing;
  update public.bigocuk_wallets set coins = coins + s.coins, updated_at = now() where user_id = p_user;
  insert into public.bigocuk_ledger (user_id, delta, reason, day)
  values (p_user, s.coins, 'earn:' || p_source, public.bigocuk_today());
  return s.coins;
end $$;

-- 7) Yetkiler: dahili fonksiyonlar kapalı, istemci fonksiyonları yalnızca giriş yapanlara açık
revoke all on function public.bigocuk_ensure_wallet() from public, anon, authenticated;
revoke all on function public.bigocuk_build_state(uuid) from public, anon, authenticated;
revoke all on function public.bigocuk_grant(uuid, text) from public, anon, authenticated;
revoke all on function public.bigocuk_state() from public, anon;
revoke all on function public.bigocuk_add_steps(integer) from public, anon;
revoke all on function public.bigocuk_buy(text) from public, anon;
revoke all on function public.bigocuk_save_avatar(jsonb) from public, anon;
grant execute on function public.bigocuk_state() to authenticated;
grant execute on function public.bigocuk_add_steps(integer) to authenticated;
grant execute on function public.bigocuk_buy(text) to authenticated;
grant execute on function public.bigocuk_save_avatar(jsonb) to authenticated;
