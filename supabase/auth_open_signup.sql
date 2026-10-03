-- Üyelik: okul maili zorunluluğu askıya alındı.
-- Artık herkes isim, soyisim, e-posta ve şifreyle kayıt olabilir.
-- Supabase > SQL Editor'de bir kez çalıştırın (mevcut kurulumlar için).

-- 1) Sadece okul maili kuralını askıya al (fonksiyon silinmez, geri açılabilir)
drop trigger if exists school_mail_only on auth.users;

-- 2) Profil tablosu: öğrenci no artık zorunlu değil; isim/soyisim ayrı tutulur
alter table public.profiles alter column student_no drop not null;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;

-- 3) Yeni kullanıcı -> profil (isim kayıt formundan gelir)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  fn text := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name','')), '');
  ln text := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name','')), '');
begin
  insert into public.profiles (id, student_no, name, first_name, last_name)
  values (
    new.id,
    case when new.email ~* '^[0-9]{6,12}@ogr\.comu\.edu\.tr$' then split_part(new.email,'@',1) else null end,
    coalesce(nullif(trim(concat_ws(' ', fn, ln)), ''), coalesce(new.raw_user_meta_data->>'name', '')),
    fn, ln
  );
  return new;
end $$;

-- 4) Eski hesapların isim/soyisim alanlarını doldur (varsa)
update public.profiles
set first_name = coalesce(first_name, split_part(name, ' ', 1)),
    last_name  = coalesce(last_name, nullif(trim(substr(name, length(split_part(name, ' ', 1)) + 1)), ''))
where name <> '' and first_name is null;

-- ÖNEMLİ (panelden): Authentication > Providers > Email > "Confirm email" kapalıysa
-- kullanıcılar kayıt olur olmaz giriş yapar. Açıksa e-postadaki bağlantıyı onaylamaları gerekir.

-- ---------------------------------------------------------------
-- GERİ AÇMA (okul maili zorunluluğunu yeniden başlatmak için):
-- create trigger school_mail_only before insert on auth.users
--   for each row execute function public.enforce_school_mail();
-- ve src/lib/authConfig.ts içinde REQUIRE_SCHOOL_MAIL = true yapın.
-- ---------------------------------------------------------------
