-- Biga ogrencileri icin temsili ornek veri. Gercek saat/fiyat/iletisim degildir.
insert into public.businesses (name, category, phone, price_info, has_toilet, opens_at, closes_at, address)
select sample.* from (values
  ('Örnek Kampüs Kafe', 'Kafe', '0286 000 00 01', 'Çay 20 TL · Tost 85 TL · Filtre kahve 65 TL', true, '08:00', '23:00', 'Biga merkez · temsili adres'),
  ('Örnek Öğrenci Kırtasiyesi', 'Kırtasiye', '0286 000 00 02', 'Fotokopi 1 TL/sayfa · çıktı 2 TL/sayfa', false, '08:30', '20:00', 'Biga İİBF yakını · temsili adres'),
  ('Örnek Ev Yemeği Lokantası', 'Yemek', '0286 000 00 03', 'Günün menüsü 145 TL · çorba 55 TL', true, '11:00', '21:30', 'Biga çarşı · temsili adres'),
  ('Örnek Öğrenci Çamaşırhanesi', 'Hizmet', '0286 000 00 04', 'Yıkama 90 TL · kurutma 60 TL', true, '09:00', '22:00', 'Biga merkez · temsili adres')
) as sample(name, category, phone, price_info, has_toilet, opens_at, closes_at, address)
where not exists (select 1 from public.businesses existing where existing.name = sample.name);

insert into public.transport_routes (name, type, destination, first_departure, last_departure, price, stops)
select sample.* from (values
  ('Örnek · Merkez – İİBF Kampüsü', 'Otobüs', 'Biga İİBF', '07:00', '22:30', 20, array['Biga Otogar','Çarşı','Hükümet Konağı','İİBF Kampüsü']),
  ('Örnek · Merkez – Biga MYO', 'Servis', 'Biga MYO', '07:30', '18:00', 25, array['Çarşı','Biga Devlet Hastanesi','Biga MYO']),
  ('Örnek · Merkez – Otogar', 'Otobüs', 'Biga Otogar', '06:45', '23:00', 15, array['Cumhuriyet Meydanı','Çarşı','Biga Otogar'])
) as sample(name, type, destination, first_departure, last_departure, price, stops)
where not exists (select 1 from public.transport_routes existing where existing.name = sample.name);