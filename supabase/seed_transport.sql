-- Örnek güzergâhlar: gerçek saatlerle değiştir.
insert into public.transport_routes (name, type, destination, first_departure, last_departure, price, stops) values
 ('Biga – Kampüs', 'Otobüs', 'Biga İİBF', '07:00', '22:30', 20, array['Merkez Otogar','Çarşı','Hükümet Konağı','İİBF Kampüsü']),
 ('Biga – MYO', 'Servis', 'Biga MYO', '07:30', '18:00', 25, array['Çarşı','Hastane','MYO']);
