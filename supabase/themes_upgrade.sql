-- ============================================================================
-- Özel temalar: Bigcoin ile satın alınan arayüz temaları
--   Kareli Defter · Piksel Salon · Çizgi Roman · Truva Vazosu · Seyir Feneri
-- Supabase > SQL Editor'de çalıştır. Birden çok kez çalıştırmak güvenlidir
-- (fiyatlar buradan yeniden yazılır, kullanıcıların satın aldıkları korunur).
-- Önkoşul: bigocuk_upgrade.sql ve bigova_v3_upgrade.sql çalıştırılmış olmalı.
--
-- Nasıl çalışır?
--  * Temalar, avatar parçalarıyla aynı mağaza tablosunda ('theme' kategorisi) durur;
--    satın alma mevcut public.bigocuk_buy(...) fonksiyonundan geçer. Fiyat, bakiye ve
--    "zaten sahip" denetimi veritabanında yapılır; istemci tarafı yalnızca gösterir.
--  * Sahip olunan temalar bigocuk_state().owned listesinde 'theme-...' kimliğiyle gelir.
--  * Hangi temanın AÇIK olduğu cihazda tutulur (ücretsiz temalarla aynı davranış).
--  * Fiyatlar src/lib/themes.ts içindeki PREMIUM_THEMES.price ile aynı olmalı.
--  * Yeni tema eklemek: src/styles/themes/<tema>.css yaz, themes.ts'e kayıt ekle,
--    aşağıdaki listeye bir satır ekleyip bu dosyayı yeniden çalıştır.
-- ============================================================================

-- 1) 'theme' kategorisine izin ver (avatar kategorileriyle birlikte)
alter table public.bigocuk_items drop constraint if exists bigocuk_items_slot_check;
alter table public.bigocuk_items add constraint bigocuk_items_slot_check
  check (slot in ('species','hat','glasses','neck','top','hand','back','bg','theme'));

-- 2) Tema kataloğu
insert into public.bigocuk_items (id, slot, name, price) values
  ('theme-defter', 'theme', 'Kareli Defter', 300),
  ('theme-piksel', 'theme', 'Piksel Salon', 350),
  ('theme-cizgi',  'theme', 'Çizgi Roman', 400),
  ('theme-truva',  'theme', 'Truva Vazosu', 450),
  ('theme-fener',  'theme', 'Seyir Feneri', 500)
on conflict (id) do update set slot = excluded.slot, name = excluded.name, price = excluded.price;

-- Not: bigocuk_save_avatar yalnızca avatar kategorilerini denetler; 'theme' parçaları
-- avatarda giyilemez, bu yüzden o fonksiyonda değişiklik gerekmez.

notify pgrst, 'reload schema';
