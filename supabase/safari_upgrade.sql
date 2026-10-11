-- ============================================================================
-- Biga Safari: gerçek dünyada dolaşıp kamerayla hayvan yakalama oyunu
-- Supabase > SQL Editor'de çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: bigocuk_upgrade.sql çalıştırılmış olmalı (cüzdan + ledger).
--
-- Güvenlik modeli (Bigocuk / Pomodoro ile aynı): tablolara istemci doğrudan YAZAMAZ.
-- Hayvanların nerede/ne zaman çıkacağına, yakalama şansına ve ödüle SUNUCU karar verir.
--
--  * Hayvanlar veritabanında saklanmaz; "hücre + sıra + zaman dilimi" anahtarından
--    deterministik üretilir (safari_resolve). Böylece herkes aynı hayvanı aynı yerde görür,
--    sunucu yakalama anında hayvanın konumunu yeniden hesaplayıp oyuncunun yanında
--    olup olmadığını denetler.
--  * Sıradan hayvanlar (Yaygın / Nadir / Epik) her yerde, 15 dakikalık aralıklarla çıkar.
--  * Efsanevi hayvanlar yalnızca "efsane noktalarında" (safari_hotspots) belirli saatlerde çıkar.
--  * Anti-hile: uzaklık denetimi, GPS doğruluğu, ışınlanma (hız) denetimi, atış hız sınırı,
--    günlük Bigcoin sınırı.
--
-- Sabitler (src/lib/bigocuk/safari.ts ile aynı olmalı):
--   hücre: 0.0025° enlem x 0.0033° boylam (~280 m) · hücre başına 4 hayvan · ömür 15 dk
--   nadirlik: yaygin %70 · nadir %25 · epik %5 · efsanevi: yalnızca efsane noktası
--   yakalama yarıçapı 40 m (efsane noktasında nokta yarıçapı)
--   ödül (Bigcoin): 1 / 3 / 8 / 25 · ilk kez yakalama bonusu: +4 / +7 / +12 / +25
--   günlük Bigcoin sınırı: 80
-- ============================================================================

-- 1) Tablolar ---------------------------------------------------------------
-- Efsane noktaları: efsanevi hayvanın belirli saatlerde çıktığı gerçek yerler.
create table if not exists public.safari_hotspots (
  id text primary key check (id !~ ':'),
  name text not null,
  lat double precision not null check (lat between -85 and 85),
  lng double precision not null check (lng between -180 and 180),
  radius_m integer not null default 60 check (radius_m between 20 and 300),
  period_min integer not null default 240 check (period_min >= 30),   -- kaç dakikada bir çıkar
  active_min integer not null default 45 check (active_min between 5 and 720), -- kaç dakika kalır
  phase_min integer not null default 0 check (phase_min >= 0),        -- noktalar aynı anda çıkmasın diye kaydırma
  active boolean not null default true,
  check (active_min < period_min)
);

-- Yakalanan her hayvan (defter bu tablodan hesaplanır)
create table if not exists public.safari_catches (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  spawn_key text not null,
  species text not null,
  rarity text not null check (rarity in ('yaygin','nadir','epik','efsanevi')),
  variant integer not null default 1 check (variant between 1 and 8),
  coins integer not null default 0 check (coins >= 0),
  first_catch boolean not null default false,
  day date not null,
  caught_at timestamptz not null default now(),
  unique (user_id, spawn_key)
);
create index if not exists safari_catches_user_species_idx on public.safari_catches (user_id, species);
create index if not exists safari_catches_user_time_idx on public.safari_catches (user_id, caught_at desc);

-- Bir hayvan için yapılan atış sayısı (hak bitince hayvan kaçar)
create table if not exists public.safari_attempts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  spawn_key text not null,
  tries integer not null default 0,
  fled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, spawn_key)
);

-- Oyuncunun son doğrulanmış konumu (ışınlanma denetimi) ve son atış zamanı
create table if not exists public.safari_players (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_lat double precision,
  last_lng double precision,
  last_at timestamptz,
  last_throw_at timestamptz
);

-- 2) RLS ---------------------------------------------------------------------
alter table public.safari_hotspots enable row level security;
alter table public.safari_catches enable row level security;
alter table public.safari_attempts enable row level security;
alter table public.safari_players enable row level security;

revoke all on public.safari_hotspots, public.safari_catches, public.safari_attempts, public.safari_players from anon, authenticated;
grant select on public.safari_hotspots to anon, authenticated;
grant select on public.safari_catches to authenticated;

drop policy if exists "safari noktalar: herkes okur" on public.safari_hotspots;
drop policy if exists "safari yakalama: kendi okur" on public.safari_catches;
create policy "safari noktalar: herkes okur" on public.safari_hotspots for select using (active);
create policy "safari yakalama: kendi okur" on public.safari_catches for select to authenticated using (user_id = auth.uid());

-- 3) Efsane noktaları ---------------------------------------------------------
-- DİKKAT: Koordinatları gerçek yerlerle DOĞRULA (Google Haritalar'da yere sağ tık > enlem, boylam).
-- Aşağıdaki nokta, uygulamadaki harita merkeziyle (src/lib/mapPlaces.ts BIGA_CENTER) aynıdır.
-- Yeni nokta eklemek için aynı biçimde satır ekleyip dosyayı yeniden çalıştırman yeterli.
-- phase_min: noktaların aynı anda açılmaması için dakika cinsinden kaydırma (0..period_min).
insert into public.safari_hotspots (id, name, lat, lng, radius_m, period_min, active_min, phase_min) values
  ('biga-merkez', 'Biga Merkez', 40.2287, 27.2431, 80, 240, 45, 0)
  -- ('comu-kampus', 'ÇOMÜ Biga Yerleşkesi', <enlem>, <boylam>, 120, 240, 45, 60),
  -- ('biga-cayi',   'Biga Çayı',            <enlem>, <boylam>, 80,  240, 45, 120),
  -- ('cumhuriyet-meydani', 'Cumhuriyet Meydanı', <enlem>, <boylam>, 60, 240, 45, 180)
on conflict (id) do update
  set name = excluded.name, lat = excluded.lat, lng = excluded.lng, radius_m = excluded.radius_m,
      period_min = excluded.period_min, active_min = excluded.active_min, phase_min = excluded.phase_min;

-- 4) Dahili yardımcılar (istemci ÇAĞIRAMAZ) -------------------------------------
-- Anahtardan 0..1 arası deterministik sayı
create or replace function public.safari_u(p_key text, p_n text) returns double precision
language sql immutable as $$
  select (('x' || substr(md5(p_key || '|' || p_n), 1, 8))::bit(32)::bigint)::double precision / 4294967296.0
$$;

-- Nadirliğe göre tür seçimi (src/lib/bigocuk/safari.ts SAFARI_SPECIES ile aynı)
create or replace function public.safari_pick(p_rarity text, p_u double precision) returns text
language sql immutable as $$
  select case p_rarity
    when 'yaygin' then (array['marti','kedi','kopek','tavsan'])[1 + floor(p_u * 4)::int]
    when 'nadir'  then (array['tilki','panda','penguen','kaplumbaga'])[1 + floor(p_u * 4)::int]
    when 'epik'   then (array['baykus','aslan','ahtapot'])[1 + floor(p_u * 3)::int]
    else               (array['ejderha','anka','unicorn'])[1 + floor(p_u * 3)::int]
  end
$$;

-- İki nokta arası metre (Haversine)
create or replace function public.safari_dist(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(least(1,
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))))
$$;

-- Bir anahtarın verdiği hayvanı, p_now (epoch sn) anında geçerliyse JSON olarak döndürür; değilse null.
--   Sıradan anahtar : <hücreX>:<hücreY>:<sıra 0-3>:<dönem>
--   Efsane anahtarı : H:<nokta id>:<dönem>
-- p_grace: bitişten sonra tanınan ek süre (sn) — atış sırasında hayvan "bitmesin" diye.
create or replace function public.safari_resolve(p_key text, p_now double precision, p_grace double precision default 0)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  c_period constant double precision := 900; -- 15 dk
  parts text[] := string_to_array(p_key, ':');
  v_cx integer; v_cy integer; v_idx integer;
  v_epoch bigint;
  v_phase double precision; v_start double precision; v_end double precision;
  r double precision; v_rar text; v_species text; v_variant integer;
  h public.safari_hotspots;
begin
  if p_key is null or p_key = '' or length(p_key) > 80 then return null; end if;

  if parts[1] = 'H' then
    if coalesce(array_length(parts, 1), 0) <> 3 or parts[3] !~ '^-?[0-9]{1,12}$' then return null; end if;
    select * into h from public.safari_hotspots where id = parts[2] and active;
    if not found then return null; end if;
    v_epoch := parts[3]::bigint;
    v_start := h.phase_min * 60.0 + v_epoch * (h.period_min * 60.0);
    v_end := v_start + h.active_min * 60.0;
    if p_now < v_start or p_now > v_end + p_grace then return null; end if;
    v_species := public.safari_pick('efsanevi', public.safari_u(p_key, 's'));
    return jsonb_build_object(
      'key', p_key, 'species', v_species, 'rarity', 'efsanevi',
      'variant', 1 + floor(public.safari_u(p_key, 'v') * 8)::int,
      'lat', h.lat, 'lng', h.lng, 'start', v_start, 'end', v_end,
      'radius', h.radius_m, 'hotspot', h.name);
  end if;

  if coalesce(array_length(parts, 1), 0) <> 4
     or parts[1] !~ '^-?[0-9]{1,7}$' or parts[2] !~ '^-?[0-9]{1,7}$'
     or parts[3] !~ '^[0-3]$' or parts[4] !~ '^-?[0-9]{1,12}$' then
    return null;
  end if;
  v_cx := parts[1]::integer; v_cy := parts[2]::integer; v_idx := parts[3]::integer; v_epoch := parts[4]::bigint;

  v_phase := floor(public.safari_u(v_cx || ':' || v_cy || ':' || v_idx, 'ph') * c_period);
  v_start := v_phase + v_epoch * c_period;
  v_end := v_start + c_period;
  if p_now < v_start or p_now > v_end + p_grace then return null; end if;

  r := public.safari_u(p_key, 'r');
  v_rar := case when r < 0.70 then 'yaygin' when r < 0.95 then 'nadir' else 'epik' end;
  v_species := public.safari_pick(v_rar, public.safari_u(p_key, 's'));
  v_variant := 1 + floor(public.safari_u(p_key, 'v') * 8)::int;
  return jsonb_build_object(
    'key', p_key, 'species', v_species, 'rarity', v_rar, 'variant', v_variant,
    'lat', (v_cy + 0.1 + 0.8 * public.safari_u(p_key, 'la')) * 0.0025,
    'lng', (v_cx + 0.1 + 0.8 * public.safari_u(p_key, 'lo')) * 0.0033,
    'start', v_start, 'end', v_end, 'radius', 40, 'hotspot', null);
end $$;

-- Oyuncunun defteri ve günlük istatistikleri
create or replace function public.safari_build_state(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'dex', coalesce((
      select jsonb_agg(jsonb_build_object('species', d.species, 'count', d.n, 'first', d.first_at, 'rarity', d.rarity) order by d.first_at)
        from (
          select c.species, count(*)::integer as n, min(c.caught_at) as first_at, min(c.rarity) as rarity
            from public.safari_catches c where c.user_id = p_user group by c.species
        ) d
    ), '[]'::jsonb),
    'total', (select count(*) from public.safari_catches c where c.user_id = p_user),
    'catchesToday', (select count(*) from public.safari_catches c where c.user_id = p_user and c.day = public.bigocuk_today()),
    'earnedToday', coalesce((
      select sum(l.delta) from public.bigocuk_ledger l
       where l.user_id = p_user and l.day = public.bigocuk_today() and l.reason = 'earn:safari'
    ), 0),
    'cap', 80
  )
$$;

-- 5) İstemcinin çağırdığı fonksiyonlar -------------------------------------------
-- Oyuncunun çevresindeki hayvanlar ve efsane noktaları. Giriş yapmamış kullanıcı da görebilir (yakalayamaz).
create or replace function public.safari_nearby(p_lat double precision, p_lng double precision) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c_period constant double precision := 900;
  v_now double precision := extract(epoch from now());
  v_uid uuid := auth.uid();
  v_cx integer; v_cy integer;
  dx integer; dy integer; i integer;
  v_phase double precision; v_epoch bigint; v_key text;
  v_skip text[] := '{}';
  v_spawn jsonb;
  v_spawns jsonb := '[]'::jsonb;
  v_hots jsonb := '[]'::jsonb;
  h public.safari_hotspots;
  v_per double precision; v_rel double precision; v_hstart double precision; v_hactive boolean;
begin
  if p_lat is null or p_lng is null or p_lat not between -85 and 85 or p_lng not between -180 and 180 then
    raise exception 'Geçersiz konum.';
  end if;

  if v_uid is not null then
    select coalesce(array_agg(k), '{}') into v_skip from (
      select c.spawn_key as k from public.safari_catches c where c.user_id = v_uid and c.caught_at > now() - interval '13 hours'
      union
      select a.spawn_key from public.safari_attempts a where a.user_id = v_uid and a.fled and a.updated_at > now() - interval '13 hours'
    ) s;
  end if;

  v_cx := floor(p_lng / 0.0033)::integer;
  v_cy := floor(p_lat / 0.0025)::integer;
  for dy in -1..1 loop
    for dx in -1..1 loop
      for i in 0..3 loop
        v_phase := floor(public.safari_u((v_cx + dx) || ':' || (v_cy + dy) || ':' || i, 'ph') * c_period);
        v_epoch := floor((v_now - v_phase) / c_period)::bigint;
        v_key := (v_cx + dx) || ':' || (v_cy + dy) || ':' || i || ':' || v_epoch;
        if v_key = any(v_skip) then continue; end if;
        v_spawn := public.safari_resolve(v_key, v_now);
        if v_spawn is not null then v_spawns := v_spawns || jsonb_build_array(v_spawn); end if;
      end loop;
    end loop;
  end loop;

  -- yaklaşık 5 km içindeki efsane noktaları (kapalı olanlar da, ne zaman açılacağı görünsün)
  for h in
    select * from public.safari_hotspots
     where active and abs(lat - p_lat) < 0.05 and abs(lng - p_lng) < 0.07
  loop
    v_per := h.period_min * 60.0;
    v_rel := v_now - h.phase_min * 60.0;
    v_epoch := floor(v_rel / v_per)::bigint;
    v_hstart := h.phase_min * 60.0 + v_epoch * v_per;
    v_hactive := v_rel >= 0 and v_now < v_hstart + h.active_min * 60.0;
    v_key := 'H:' || h.id || ':' || v_epoch;
    if v_hactive and not (v_key = any(v_skip)) then
      v_spawn := public.safari_resolve(v_key, v_now);
      if v_spawn is not null then v_spawns := v_spawns || jsonb_build_array(v_spawn); end if;
    end if;
    v_hots := v_hots || jsonb_build_array(jsonb_build_object(
      'id', h.id, 'name', h.name, 'lat', h.lat, 'lng', h.lng, 'radius', h.radius_m,
      'active', v_hactive and not (v_key = any(v_skip)),
      'caught', v_hactive and (v_key = any(v_skip)),
      'endsIn', case when v_hactive then ceil(v_hstart + h.active_min * 60.0 - v_now) else 0 end,
      'startsIn', case when v_hactive then 0 else ceil(v_hstart + v_per - v_now) end));
  end loop;

  return jsonb_build_object('now', v_now, 'spawns', v_spawns, 'hotspots', v_hots);
end $$;

create or replace function public.safari_state() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  return public.safari_build_state(auth.uid());
end $$;

-- Bir hayvana top atar (istemci yalnızca topun hayvana isabet ettiği atışı gönderir).
-- status değerleri:
--   caught   : yakalandı (earned = kazanılan Bigcoin, first = defterde yeni)
--   broke    : top kırıldı, hayvan hâlâ orada (tries / maxTries)
--   fled     : hak bitti, hayvan kaçtı
--   too_far  : hayvana yeterince yakın değilsin (dist = mesafe, need = gereken)
--   bad_gps  : GPS doğruluğu yetersiz
--   too_fast : son konumundan imkânsız hızda uzaklaştın (wait = kalan sn)
--   expired  : hayvan kayboldu
--   already  : bu hayvanı zaten yakaladın / kaçtı
--   slow     : çok hızlı atış
create or replace function public.safari_throw(
  p_key text, p_lat double precision, p_lng double precision,
  p_acc double precision default 30, p_bonus integer default 0
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c_cap constant integer := 80;
  c_speed constant double precision := 15;   -- m/sn (54 km/sa) üzeri hareket = ışınlanma
  c_slack constant double precision := 150;  -- GPS oynaması için sabit pay (m)
  v_uid uuid := auth.uid();
  v_now double precision := extract(epoch from now());
  v_day date := public.bigocuk_today();
  pl public.safari_players;
  sp jsonb;
  att public.safari_attempts;
  v_status text := 'broke';
  v_rarity text; v_species text; v_variant integer;
  v_dist double precision; v_need double precision;
  v_move double precision; v_elapsed double precision;
  v_base double precision; v_prob double precision; v_max integer;
  v_reward integer := 0; v_first boolean := false; v_used integer; v_grant integer := 0;
  v_wait integer := 0; v_tries integer := 0;
  v_bonus integer := greatest(0, least(coalesce(p_bonus, 0), 3));
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_lat is null or p_lng is null or p_lat not between -85 and 85 or p_lng not between -180 and 180 then
    raise exception 'Geçersiz konum.';
  end if;
  perform public.bigocuk_ensure_wallet();
  insert into public.safari_players (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into pl from public.safari_players where user_id = v_uid for update;

  if random() < 0.02 then
    delete from public.safari_attempts where updated_at < now() - interval '1 day';
  end if;

  sp := public.safari_resolve(p_key, v_now, 30);
  if pl.last_throw_at is not null and now() - pl.last_throw_at < interval '800 milliseconds' then
    v_status := 'slow';
  elsif sp is null then
    v_status := 'expired';
  elsif exists (select 1 from public.safari_catches c where c.user_id = v_uid and c.spawn_key = p_key) then
    v_status := 'already';
  else
    v_species := sp->>'species'; v_rarity := sp->>'rarity'; v_variant := (sp->>'variant')::integer;
    v_dist := public.safari_dist(p_lat, p_lng, (sp->>'lat')::double precision, (sp->>'lng')::double precision);
    v_need := (sp->>'radius')::double precision;
    insert into public.safari_attempts (user_id, spawn_key) values (v_uid, p_key) on conflict do nothing;
    select * into att from public.safari_attempts where user_id = v_uid and spawn_key = p_key for update;

    if att.fled then
      v_status := 'already';
    elsif p_acc is null or p_acc > 100 then
      v_status := 'bad_gps';
    elsif v_dist > v_need + least(p_acc, 25) then
      v_status := 'too_far';
    else
      v_move := 0; v_elapsed := 0;
      if pl.last_lat is not null and pl.last_at is not null then
        v_move := public.safari_dist(pl.last_lat, pl.last_lng, p_lat, p_lng);
        v_elapsed := extract(epoch from (now() - pl.last_at));
      end if;
      if v_move > c_speed * v_elapsed + c_slack then
        v_status := 'too_fast';
        v_wait := ceil((v_move - c_slack) / c_speed - v_elapsed)::integer;
      else
        -- konum ve atış zamanı yalnızca geçerli atışta güncellenir (aksi halde ışınlanma denetimi atlatılırdı)
        update public.safari_players set last_lat = p_lat, last_lng = p_lng, last_at = now(), last_throw_at = now()
         where user_id = v_uid;

        v_base := case v_rarity when 'yaygin' then 0.80 when 'nadir' then 0.60 when 'epik' then 0.40 else 0.22 end;
        v_max  := case v_rarity when 'yaygin' then 5    when 'nadir' then 4    when 'epik' then 3    else 3    end;
        v_prob := least(0.95, v_base * (1 + 0.15 * v_bonus));
        v_tries := att.tries + 1;

        if random() < v_prob then
          v_status := 'caught';
          v_first := not exists (select 1 from public.safari_catches c where c.user_id = v_uid and c.species = v_species);
          v_reward := case v_rarity when 'yaygin' then 1 when 'nadir' then 3 when 'epik' then 8 else 25 end;
          if v_first then
            v_reward := v_reward + case v_rarity when 'yaygin' then 4 when 'nadir' then 7 when 'epik' then 12 else 25 end;
          end if;
          select coalesce(sum(l.delta), 0) into v_used from public.bigocuk_ledger l
           where l.user_id = v_uid and l.day = v_day and l.reason = 'earn:safari';
          v_grant := greatest(0, least(v_reward, c_cap - v_used));

          insert into public.safari_catches (user_id, spawn_key, species, rarity, variant, coins, first_catch, day)
          values (v_uid, p_key, v_species, v_rarity, v_variant, v_grant, v_first, v_day);
          if v_grant > 0 then
            update public.bigocuk_wallets set coins = coins + v_grant, updated_at = now() where user_id = v_uid;
            insert into public.bigocuk_ledger (user_id, delta, reason, day) values (v_uid, v_grant, 'earn:safari', v_day);
          end if;
          update public.safari_attempts set tries = v_tries, updated_at = now() where user_id = v_uid and spawn_key = p_key;
        elsif v_tries >= v_max then
          v_status := 'fled';
          update public.safari_attempts set tries = v_tries, fled = true, updated_at = now() where user_id = v_uid and spawn_key = p_key;
        else
          v_status := 'broke';
          update public.safari_attempts set tries = v_tries, updated_at = now() where user_id = v_uid and spawn_key = p_key;
        end if;
      end if;
    end if;
  end if;

  return public.bigocuk_build_state(v_uid) || jsonb_build_object(
    'status', v_status,
    'earned', v_grant,
    'reward', v_reward,
    'first', v_first,
    'tries', v_tries,
    'maxTries', case coalesce(v_rarity, '') when 'yaygin' then 5 when 'nadir' then 4 when 'epik' then 3 when 'efsanevi' then 3 else 0 end,
    'species', v_species,
    'rarity', v_rarity,
    'dist', coalesce(round(v_dist::numeric), 0),
    'need', coalesce(v_need, 0),
    'wait', v_wait,
    'safari', public.safari_build_state(v_uid)
  );
end $$;

-- 6) Yetkiler -----------------------------------------------------------------
revoke all on function public.safari_u(text, text) from public, anon, authenticated;
revoke all on function public.safari_pick(text, double precision) from public, anon, authenticated;
revoke all on function public.safari_dist(double precision, double precision, double precision, double precision) from public, anon, authenticated;
revoke all on function public.safari_resolve(text, double precision, double precision) from public, anon, authenticated;
revoke all on function public.safari_build_state(uuid) from public, anon, authenticated;
revoke all on function public.safari_nearby(double precision, double precision) from public;
revoke all on function public.safari_state() from public, anon;
revoke all on function public.safari_throw(text, double precision, double precision, double precision, integer) from public, anon;
grant execute on function public.safari_nearby(double precision, double precision) to anon, authenticated;
grant execute on function public.safari_state() to authenticated;
grant execute on function public.safari_throw(text, double precision, double precision, double precision, integer) to authenticated;

-- PostgREST'in fonksiyon önbelleğini yenile
notify pgrst, 'reload schema';
