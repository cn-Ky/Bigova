-- ============================================================================
-- Bigova v3 yükseltmesi
--   1) Avatar/profil kaydı onarımı (eksik profil + cüzdan satırları, güvenli kaydetme)
--   2) İşletme detayları (menü, açıklama, sosyal medya, olanaklar)
--   3) Davet sistemi (+30 Bigcoin: davet eden ve davet edilen)
--   4) Mesaj bildirimleri (okunmamış sayacı)
--   5) Web Push abonelikleri
-- Supabase > SQL Editor'de TEK SEFERDE çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: schema.sql, friends_upgrade.sql, social_marketplace_upgrade.sql,
--          bigocuk_upgrade.sql ve profiles_upgrade.sql daha önce çalıştırılmış olmalı.
-- ============================================================================

-- ============================================================================
-- 1) AVATAR / PROFİL KAYDI ONARIMI
-- ============================================================================

-- 1a) Profili olmayan hesaplara profil aç (cüzdan, profiles tablosuna bağlıdır;
--     profil satırı yoksa cüzdan oluşamaz ve avatar hiç kaydedilemez).
insert into public.profiles (id, student_no, name, first_name, last_name)
select u.id, null,
  coalesce(nullif(trim(concat_ws(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name')), ''), u.raw_user_meta_data->>'name', ''),
  nullif(trim(coalesce(u.raw_user_meta_data->>'first_name','')), ''),
  nullif(trim(coalesce(u.raw_user_meta_data->>'last_name','')), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;

-- 1b) Herkese cüzdan + varsayılan avatar satırı (yoksa) aç
insert into public.bigocuk_wallets (user_id, avatar)
select p.id, public.bigocuk_default_avatar()
from public.profiles p
where not exists (select 1 from public.bigocuk_wallets w where w.user_id = p.id)
on conflict (user_id) do nothing;

-- 1c) Cüzdanı olup avatarı boş ({}), eski insan alanlı ya da tür alanı olmayanlara varsayılan ekle
update public.bigocuk_wallets
   set avatar = public.bigocuk_default_avatar() || avatar
 where not (avatar ? 'species');

-- 1d) ensure_wallet: profil satırı eksikse onu da oluşturur (FK hatasıyla sessizce çökmez)
create or replace function public.bigocuk_ensure_wallet() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  insert into public.profiles (id, name)
  select u.id, coalesce(nullif(trim(concat_ws(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name')), ''), u.raw_user_meta_data->>'name', '')
    from auth.users u where u.id = auth.uid()
  on conflict (id) do nothing;
  insert into public.bigocuk_wallets (user_id, avatar)
  values (auth.uid(), public.bigocuk_default_avatar())
  on conflict (user_id) do nothing;
end $$;

-- 1e) bigocuk_save_avatar: aynı kurallar, ama güncellemenin gerçekten bir satıra yazıldığını doğrular
create or replace function public.bigocuk_save_avatar(p_avatar jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  s_name text;
  v text;
  clean jsonb;
  n integer;
begin
  perform public.bigocuk_ensure_wallet();
  if jsonb_typeof(p_avatar) is distinct from 'object' then raise exception 'Geçersiz avatar.'; end if;
  if coalesce(p_avatar->>'color', '') !~ '^c[1-8]$' then raise exception 'Geçersiz renk.'; end if;
  if coalesce(p_avatar->>'pattern', '') !~ '^p[1-6]$' then raise exception 'Geçersiz desen.'; end if;
  if coalesce(p_avatar->>'eyes', '') !~ '^e[1-8]$' then raise exception 'Geçersiz göz rengi.'; end if;
  if coalesce(p_avatar->>'feature', '') !~ '^f[1-3]$' then raise exception 'Geçersiz özellik.'; end if;
  clean := jsonb_build_object(
    'color', p_avatar->>'color', 'pattern', p_avatar->>'pattern',
    'eyes', p_avatar->>'eyes', 'feature', p_avatar->>'feature');

  foreach s_name in array array['species','hat','glasses','neck','top','hand','back','bg'] loop
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
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Avatar kaydedilemedi (cüzdan bulunamadı).'; end if;
  return public.bigocuk_build_state(v_uid);
end $$;

revoke all on function public.bigocuk_ensure_wallet() from public, anon, authenticated;
revoke all on function public.bigocuk_save_avatar(jsonb) from public, anon;
grant execute on function public.bigocuk_save_avatar(jsonb) to authenticated;

-- PostgREST'in fonksiyon önbelleğini yenile
notify pgrst, 'reload schema';

-- ============================================================================
-- 2) İŞLETME DETAYLARI
-- ============================================================================
alter table public.businesses add column if not exists description text;
alter table public.businesses add column if not exists menu jsonb not null default '[]'::jsonb;
alter table public.businesses add column if not exists features text[] not null default '{}';
alter table public.businesses add column if not exists student_discount text;
alter table public.businesses add column if not exists instagram text;
alter table public.businesses add column if not exists whatsapp text;
alter table public.businesses add column if not exists website text;
alter table public.businesses add column if not exists updated_at timestamptz not null default now();

-- menu biçimi:
-- [ {"section":"Sıcak içecekler","items":[{"name":"Çay","price":"20 TL","note":"Fincan"}, ...]}, ... ]
-- features örnek: {'Wi‑Fi','Priz','Paket servis','Kart geçer','Sigarasız alan'}
--
-- Örnek: bir işletmeye menü eklemek için
-- update public.businesses set
--   description = 'Kampüse beş dakika mesafede, ders arası uğranan sakin bir kafe.',
--   features = array['Wi‑Fi','Priz','Kart geçer'],
--   student_discount = 'Öğrenci kartıyla %10',
--   instagram = 'ornekkafe',
--   menu = '[{"section":"Sıcak içecekler","items":[{"name":"Çay","price":"20 TL"},{"name":"Filtre kahve","price":"65 TL"}]},
--            {"section":"Atıştırmalık","items":[{"name":"Tost","price":"85 TL","note":"Kaşarlı"}]}]'::jsonb
-- where name = 'Örnek Kafe';

-- ============================================================================
-- 3) DAVET SİSTEMİ  (+30 Bigcoin: davet eden VE davet edilen)
-- ============================================================================
-- Çalışma şekli:
--  * Herkesin kalıcı bir davet kodu/linki vardır:  /giris?ref=KOD
--  * Kod kayıt sırasında kullanıcı meta verisine (ref_code) yazılır; bu yüzden e-posta doğrulaması
--    başka tarayıcıda/telefonda yapılsa bile kod kaybolmaz.
--  * Ödül, davet edilen hesap e-postasını doğrulayıp ilk kez giriş yaptığında verilir.
--  * Her hesap yalnızca BİR kez davet ödülü alabilir (referrals.invitee birincil anahtar).
--    Kendi kodunu kullanamaz. Bir kişi en fazla 25 davetten ödül alabilir (aşağıdan değiştirilir).
create table if not exists public.referral_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.referrals (
  invitee uuid primary key references public.profiles(id) on delete cascade,
  inviter uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  reward integer not null,
  created_at timestamptz not null default now(),
  check (invitee <> inviter)
);
create index if not exists referrals_inviter_idx on public.referrals (inviter);

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
revoke all on public.referral_codes, public.referrals from anon, authenticated;
grant select on public.referral_codes, public.referrals to authenticated;
drop policy if exists "referral kod: kendi okur" on public.referral_codes;
drop policy if exists "referral: taraflar okur" on public.referrals;
create policy "referral kod: kendi okur" on public.referral_codes for select to authenticated using (user_id = auth.uid());
create policy "referral: taraflar okur" on public.referrals for select to authenticated using (auth.uid() in (inviter, invitee));

-- Kullanıcının kodu (yoksa üretir) + özet
create or replace function public.my_referral() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  perform public.bigocuk_ensure_wallet();
  select code into v_code from public.referral_codes where user_id = v_uid;
  if v_code is null then
    loop
      v_code := '';
      for i in 1..8 loop
        v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
      end loop;
      begin
        insert into public.referral_codes (user_id, code) values (v_uid, v_code);
        exit;
      exception when unique_violation then
        select code into v_code from public.referral_codes where user_id = v_uid;
        exit when v_code is not null; -- aynı anda başka istek üretti
      end;
    end loop;
  end if;
  return jsonb_build_object(
    'code', v_code,
    'invited', (select count(*) from public.referrals r where r.inviter = v_uid),
    'earned', coalesce((select sum(r.reward) from public.referrals r where r.inviter = v_uid), 0),
    'reward', 30,
    'limit', 25
  );
end $$;

-- Davet ödülünü talep et (idempotent: tekrar çağırmak güvenlidir)
-- Dönüş: {"status": "rewarded"|"already"|"none"|"invalid"|"self"|"limit"|"unverified", "amount": 30, "inviter": "Ad"}
create or replace function public.redeem_referral() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c_reward constant integer := 30;   -- her iki tarafa verilen Bigcoin
  c_limit  constant integer := 25;   -- bir kişinin ödül alabileceği en fazla davet
  v_uid uuid := auth.uid();
  v_code text;
  v_inviter uuid;
  v_confirmed timestamptz;
  v_name text;
  v_count integer;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if exists (select 1 from public.referrals where invitee = v_uid) then
    return jsonb_build_object('status', 'already');
  end if;

  select upper(trim(u.raw_user_meta_data->>'ref_code')), u.email_confirmed_at
    into v_code, v_confirmed
    from auth.users u where u.id = v_uid;
  if v_code is null or v_code = '' then return jsonb_build_object('status', 'none'); end if;
  if v_confirmed is null then return jsonb_build_object('status', 'unverified'); end if;

  select user_id into v_inviter from public.referral_codes where code = v_code;
  if v_inviter is null then return jsonb_build_object('status', 'invalid'); end if;
  if v_inviter = v_uid then return jsonb_build_object('status', 'self'); end if;

  select count(*) into v_count from public.referrals where inviter = v_inviter;
  if v_count >= c_limit then return jsonb_build_object('status', 'limit'); end if;

  perform public.bigocuk_ensure_wallet();
  insert into public.bigocuk_wallets (user_id, avatar) values (v_inviter, public.bigocuk_default_avatar())
    on conflict (user_id) do nothing;

  insert into public.referrals (invitee, inviter, code, reward) values (v_uid, v_inviter, v_code, c_reward);

  update public.bigocuk_wallets set coins = coins + c_reward, updated_at = now() where user_id in (v_uid, v_inviter);
  insert into public.bigocuk_ledger (user_id, delta, reason, day) values
    (v_uid, c_reward, 'referral:invitee', public.bigocuk_today()),
    (v_inviter, c_reward, 'referral:inviter', public.bigocuk_today());

  select name into v_name from public.profiles where id = v_inviter;
  return jsonb_build_object('status', 'rewarded', 'amount', c_reward, 'inviter', coalesce(v_name, ''));
end $$;

revoke all on function public.my_referral() from public, anon;
revoke all on function public.redeem_referral() from public, anon;
grant execute on function public.my_referral() to authenticated;
grant execute on function public.redeem_referral() to authenticated;

-- ============================================================================
-- 4) MESAJ BİLDİRİMLERİ (okunmamış sayacı)
-- ============================================================================
create table if not exists public.message_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);
alter table public.message_reads enable row level security;
revoke all on public.message_reads from anon, authenticated;
grant select on public.message_reads to authenticated;
drop policy if exists "reads: kendi okur" on public.message_reads;
create policy "reads: kendi okur" on public.message_reads for select to authenticated using (user_id = auth.uid());

-- Bu sohbeti "okundu" işaretle
create or replace function public.mark_conversation_read(p_friend uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  insert into public.message_reads (user_id, friend_id, last_read_at)
  values (auth.uid(), p_friend, now())
  on conflict (user_id, friend_id) do update set last_read_at = excluded.last_read_at;
end $$;

-- Her arkadaştan okunmamış mesaj sayısı + son mesaj
-- İlk kez kullanılan sohbetlerde, geçmiş mesajlar "okunmamış" sayılmasın diye son 3 gün baz alınır.
create or replace function public.unread_summary()
returns table (friend_id uuid, name text, unread integer, last_body text, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  with unread as (
    select m.from_id, count(*)::integer as n, max(m.created_at) as last_at
      from public.messages m
      left join public.message_reads r on r.user_id = auth.uid() and r.friend_id = m.from_id
     where m.to_id = auth.uid()
       and m.created_at > coalesce(r.last_read_at, now() - interval '3 days')
     group by m.from_id
  )
  select u.from_id, p.name, u.n,
         (select m2.body from public.messages m2
           where m2.from_id = u.from_id and m2.to_id = auth.uid()
           order by m2.created_at desc limit 1),
         u.last_at
    from unread u
    join public.profiles p on p.id = u.from_id
   where auth.uid() is not null
   order by u.last_at desc
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
revoke all on function public.unread_summary() from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.unread_summary() to authenticated;

-- ============================================================================
-- 5) WEB PUSH ABONELİKLERİ (uygulama kapalıyken bildirim)
-- ============================================================================
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;
drop policy if exists "push: kendi okur" on public.push_subscriptions;
drop policy if exists "push: kendi ekler" on public.push_subscriptions;
drop policy if exists "push: kendi siler" on public.push_subscriptions;
create policy "push: kendi okur" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "push: kendi ekler" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy "push: kendi siler" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

notify pgrst, 'reload schema';
