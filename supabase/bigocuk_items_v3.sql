-- ============================================================================
-- Bigocuk · Yeni hayvanlar (2. grup): Civciv, Kuzu, İnek, Fare, Papağan, Fil, Kaplan,
-- Zebra, Flamingo, Hayalet, Galaksi Kedisi
-- Supabase SQL Editor'de bir kez çalıştır (bigocuk_items_v2.sql'den SONRA). Tekrar çalıştırmak güvenlidir.
-- Mevcut envanter ve coinlere dokunmaz; yalnızca bigocuk_items tablosuna satır ekler/günceller.
-- ============================================================================
insert into public.bigocuk_items (id, slot, name, price) values
  ('sp-civciv', 'species', 'Civciv', 60),
  ('sp-kuzu', 'species', 'Kuzu', 70),
  ('sp-inek', 'species', 'İnek', 90),
  ('sp-fare', 'species', 'Fare', 70),
  ('sp-papagan', 'species', 'Papağan', 250),
  ('sp-fil', 'species', 'Fil', 270),
  ('sp-kaplan', 'species', 'Kaplan', 290),
  ('sp-zebra', 'species', 'Zebra', 280),
  ('sp-flamingo', 'species', 'Flamingo', 260),
  ('sp-hayalet', 'species', 'Hayalet', 700),
  ('sp-galaksi', 'species', 'Galaksi Kedisi', 780)
on conflict (id) do update set slot = excluded.slot, name = excluded.name, price = excluded.price;

notify pgrst, 'reload schema';
