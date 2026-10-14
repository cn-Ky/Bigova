-- ============================================================================
-- Bigova GÜVENLİK SERTLEŞTİRMESİ
-- Supabase > SQL Editor'de TEK SEFERDE çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: schema.sql ve diğer *_upgrade.sql dosyalarının TAMAMI (özellikle
--          chat_safety_upgrade.sql) daha önce çalıştırılmış olmalı. Bu dosya EN SON çalışır.
--
-- Kapatılan açıklar (ayrıntı: SECURITY.md):
--  1) 403 hatası: is_blocked_between, `authenticated` rolünden geri alındığı için RLS çöküyordu.
--     Yardımcı fonksiyonlar API'ye AÇILMAYAN `private` şemasına taşındı.
--  2) are_friends() herkese (anon dahil) açıktı: arkadaşlık grafiği yoklanabiliyordu.
--  3) friendships UPDATE: alıcı, `requester` sütununu değiştirip başkasıyla SAHTE arkadaşlık
--     kurabiliyordu (ve ardından o kişiye mesaj atabiliyordu). Artık yalnızca `status` güncellenir.
--  4) profiles UPDATE/SELECT: kullanıcı kendi student_no'sunu değiştirebiliyor, herkes tüm
--     öğrenci numaralarını (= okul e-postalarını) okuyabiliyordu. Sütun bazlı yetkiye geçildi.
--  5) messages: istemci created_at / deleted_at / from_id yazabiliyordu; hız sınırı yoktu.
--  6) push_subscriptions: endpoint doğrulanmadığı için sunucu, saldırganın seçtiği adrese istek
--     atıyordu (SSRF). Yalnızca bilinen push servislerine izin verilir.
--  7) notes.file_path başkasının klasörünü gösterebiliyordu.
--  8) İlan / arkadaşlık isteği spam'ine kota.
-- ============================================================================

-- 0) private şema -------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Aşağıdakiler chat_safety_upgrade.sql'de de tanımlıdır; burada garantiye alınır.
create or replace function private.are_friends(a uuid, b uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.friendships where status = 'accepted'
    and ((requester = a and addressee = b) or (requester = b and addressee = a)))
$$;
create or replace function private.is_blocked_between(a uuid, b uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.user_blocks
     where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  )
$$;
revoke all on function private.are_friends(uuid, uuid) from public, anon;
revoke all on function private.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function private.are_friends(uuid, uuid) to authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;

-- public sürümleri artık yalnızca diğer SECURITY DEFINER fonksiyonlar (sahip yetkisiyle) içindir.
-- API üzerinden (anon/authenticated) ÇAĞRILAMAZ.
create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select private.is_blocked_between(a, b)
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- 1) Politikaları private fonksiyonlara bağla ---------------------------------
drop policy if exists "msg: sadece arkadasa yazar" on public.messages;
create policy "msg: sadece arkadasa yazar" on public.messages for insert to authenticated
  with check (
    from_id = auth.uid()
    and private.are_friends(from_id, to_id)
    and not private.is_blocked_between(from_id, to_id)
  );

drop policy if exists "friends: istek gonderir" on public.friendships;
create policy "friends: istek gonderir" on public.friendships for insert to authenticated
  with check (
    requester = auth.uid()
    and status = 'pending'
    and not private.is_blocked_between(requester, addressee)
  );

drop policy if exists "streak arkadaslari okur" on public.friendship_streaks;
create policy "streak arkadaslari okur" on public.friendship_streaks for select to authenticated
  using (auth.uid() in (user_a, user_b) and private.are_friends(user_a, user_b));

drop policy if exists "loc: arkadas okur" on public.user_locations;
create policy "loc: arkadas okur" on public.user_locations for select to authenticated
  using (shared and private.are_friends(user_id, auth.uid()));

-- 2) friendships: yalnızca `status` güncellenebilir, yalnızca alıcı tarafından --------
revoke all on public.friendships from anon;
revoke update on public.friendships from authenticated;
grant update (status) on public.friendships to authenticated;

drop policy if exists "friends: alici kabul eder" on public.friendships;
create policy "friends: alici kabul eder" on public.friendships for update to authenticated
  using (addressee = auth.uid() and status = 'pending')
  with check (
    addressee = auth.uid()
    and status = 'accepted'
    and not private.is_blocked_between(requester, addressee)
  );

-- Bekleyen giden istek sayısı sınırı (spam)
create or replace function private.limit_friend_requests() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.friendships where requester = new.requester and status = 'pending') >= 100 then
    raise exception 'Çok fazla bekleyen arkadaşlık isteğin var.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists friendships_request_limit on public.friendships;
create trigger friendships_request_limit before insert on public.friendships
  for each row execute function private.limit_friend_requests();

-- 3) messages: yalnızca to_id + body yazılır; hız sınırı ----------------------------
revoke all on public.messages from anon;
revoke insert, update, delete, truncate on public.messages from authenticated;
grant select on public.messages to authenticated;
grant insert (to_id, body) on public.messages to authenticated;   -- from_id varsayılanı auth.uid()

create index if not exists messages_from_created_idx on public.messages (from_id, created_at desc);

create or replace function private.limit_message_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.messages
       where from_id = new.from_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Çok hızlı mesaj gönderiyorsun. Biraz bekle.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages
  for each row execute function private.limit_message_rate();

-- 4) profiles: sütun bazlı yetki (student_no artık istemciden okunamaz/yazılamaz) -------
revoke all on public.profiles from anon;
revoke select, insert, update, delete on public.profiles from authenticated;
grant select (id, name, first_name, last_name, created_at, privacy) on public.profiles to authenticated;
grant update (name, first_name, last_name) on public.profiles to authenticated;

drop policy if exists "profiles: kendini gunceller" on public.profiles;
create policy "profiles: kendini gunceller" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

alter table public.profiles drop constraint if exists profiles_name_len;
alter table public.profiles add constraint profiles_name_len
  check (char_length(name) <= 80
     and (first_name is null or char_length(first_name) <= 40)
     and (last_name is null or char_length(last_name) <= 40)) not valid;

-- Kayıt sırasında kullanıcının gönderdiği ad alanlarını kırp
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  fn text := left(nullif(trim(coalesce(new.raw_user_meta_data->>'first_name','')), ''), 40);
  ln text := left(nullif(trim(coalesce(new.raw_user_meta_data->>'last_name','')), ''), 40);
begin
  insert into public.profiles (id, student_no, name, first_name, last_name)
  values (
    new.id,
    case when new.email ~* '^[0-9]{6,12}@ogr\.comu\.edu\.tr$' then split_part(new.email,'@',1) else null end,
    left(coalesce(nullif(trim(concat_ws(' ', fn, ln)), ''), coalesce(new.raw_user_meta_data->>'name', '')), 80),
    fn, ln
  );
  return new;
end $$;

-- 5) notes: dosya yolu yalnızca kendi klasörünü gösterebilir ------------------------
drop policy if exists "notes: kendi ekler" on public.notes;
create policy "notes: kendi ekler" on public.notes for insert to authenticated
  with check (
    author_id = auth.uid()
    and file_path like auth.uid()::text || '/%'
    and position('..' in file_path) = 0
  );
revoke all on public.notes from anon;
revoke update on public.notes from authenticated;

-- 6) Konum aralığı ---------------------------------------------------------------
alter table public.user_locations drop constraint if exists user_locations_range;
alter table public.user_locations add constraint user_locations_range
  check (lat between -90 and 90 and lng between -180 and 180) not valid;
revoke all on public.user_locations from anon;

-- 7) Web Push: yalnızca bilinen push servisleri (SSRF'e karşı) -------------------------
--    Kayıt artık yalnızca sunucu rotasından (service role) yapılır; istemci doğrudan INSERT edemez.
delete from public.push_subscriptions
 where endpoint !~* '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)(:443)?/';
alter table public.push_subscriptions drop constraint if exists push_endpoint_allowed;
alter table public.push_subscriptions add constraint push_endpoint_allowed
  check (
    endpoint ~* '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)(:443)?/'
    and char_length(endpoint) <= 1000
    and char_length(p256dh) <= 300
    and char_length(auth) <= 100
  );
revoke insert, update on public.push_subscriptions from authenticated;

-- 8) İlan kotaları (spam) -----------------------------------------------------------
create or replace function private.limit_listings() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_limit integer := tg_argv[0]::integer;
  v_col text := tg_argv[1];
  n integer;
begin
  execute format(
    'select count(*) from %I.%I where %I = $1 and status in (''active'', ''available'')',
    tg_table_schema, tg_table_name, v_col)
    into n using (to_jsonb(new) ->> v_col)::uuid;
  if n >= v_limit then
    raise exception 'Aynı anda en fazla % aktif ilanın olabilir.', v_limit using errcode = 'P0001';
  end if;
  return new;
end $$;

do $$ begin
  if to_regclass('public.book_listings') is not null then
    drop trigger if exists book_listings_quota on public.book_listings;
    create trigger book_listings_quota before insert on public.book_listings
      for each row execute function private.limit_listings(30, 'seller_id');
  end if;
  if to_regclass('public.job_listings') is not null then
    drop trigger if exists job_listings_quota on public.job_listings;
    create trigger job_listings_quota before insert on public.job_listings
      for each row execute function private.limit_listings(10, 'poster_id');
  end if;
  if to_regclass('public.service_providers') is not null then
    drop trigger if exists service_providers_quota on public.service_providers;
    create trigger service_providers_quota before insert on public.service_providers
      for each row execute function private.limit_listings(5, 'poster_id');
  end if;
end $$;

-- 9) Genel yetki temizliği (RLS'e ek ikinci savunma hattı) ------------------------------
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke insert, update, delete on public.businesses, public.transport_routes, public.magazines from anon, authenticated;
revoke insert, update, delete on public.friendship_streaks from anon, authenticated;

notify pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- DENETİM SORGULARI (isteğe bağlı, çalıştırıp sonucu kontrol et)
--
-- a) Anonim (girişsiz) kullanıcının çağırabildiği fonksiyonlar. Beklenen: tr_norm, bigocuk_today,
--    bigocuk_default_avatar, get_poll_results ve poll_ensure_week dışında bir şey GÖRÜNMEMELİ.
-- select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1;
--
-- b) RLS'i kapalı public tabloları. Beklenen: boş liste.
-- select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
-- ----------------------------------------------------------------------------
