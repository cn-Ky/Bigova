-- Telefonla kayıt/giriş desteği (Supabase > SQL Editor'de bir kez çalıştırın; tekrar çalıştırmak güvenlidir).
--
-- Telefonla kayıt olan kullanıcının e-postası yoktur: email_confirmed_at boş kalır, phone_confirmed_at dolar.
-- Davet ödülü (redeem_referral) yalnızca email_confirmed_at'e baktığı için bu kullanıcılar "unverified"
-- görüp ödül alamazdı. Aşağıdaki sürüm e-posta VEYA telefon doğrulanmışsa ödülü verir.
-- (Profil tetikleyicisi handle_new_user e-posta boş olsa da çalışır; değişiklik gerekmez.)

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

  select upper(trim(u.raw_user_meta_data->>'ref_code')), coalesce(u.email_confirmed_at, u.phone_confirmed_at)
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

-- ============================================================================
-- PANEL AYARLARI (SQL ile yapılamaz)
-- ============================================================================
-- 1) Authentication > Providers > Phone: aç, bir SMS sağlayıcısı (Twilio / MessageBird / Vonage) bağla.
--    "Enable phone confirmations" açık kalmalı (kayıtta SMS kodu istenir).
--    SMS gönderim kodu uzunluğu ve süresi aynı sayfadadır (6 hane önerilir).
-- 2) Authentication > Email Templates > "Reset Password": supabase/email_templates/recovery.html içeriğini
--    yapıştır. Şablonda {{ .Token }} bulunmalı; yoksa e-postaya kod değil bağlantı gider.
-- 3) Authentication > Email > OTP uzunluğu/süresi (Email OTP Length / Expiration) ayarlarını kontrol et.
-- 4) Yerleşik e-posta servisi saatte birkaç e-postayla sınırlıdır; canlıda Project Settings > Auth > SMTP
--    ile kendi SMTP'ni (Resend, Brevo, SendGrid…) bağla.
-- 5) Telefonla kaydı kapatmak istersen Vercel ortam değişkeni: NEXT_PUBLIC_PHONE_AUTH=0
