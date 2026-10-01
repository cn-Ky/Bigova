-- Örnek güzergâhlar: gerçek saatlerle değiştir.
insert into public.transport_routes (name, type, destination, first_departure, last_departure, price, stops)
select sample.* from (values
 ('Biga – Kampüs', 'Otobüs', 'Biga İİBF', '07:00', '22:30', 20, array['Merkez Otogar','Çarşı','Hükümet Konağı','İİBF Kampüsü']),
 ('Biga – MYO', 'Servis', 'Biga MYO', '07:30', '18:00', 25, array['Çarşı','Hastane','MYO'])
) as sample(name, type, destination, first_departure, last_departure, price, stops)
where not exists (select 1 from public.transport_routes existing where existing.name = sample.name);
