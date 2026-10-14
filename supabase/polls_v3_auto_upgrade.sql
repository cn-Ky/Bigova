-- ============================================================================
-- Anketler v3: Her hafta OTOMATİK yeni anketler.
-- Supabase > SQL Editor'de çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: polls_upgrade.sql, bigocuk_upgrade.sql ve polls_v2_upgrade.sql çalıştırılmış olmalı.
--
-- Nasıl çalışır?
--   * poll_bank tablosu soru havuzudur (3 kategori: organizasyon, calisma, uygulama).
--   * Her hafta (pazartesi, İstanbul saati) her kategoriden 1 soru seçilir => haftada 3 anket.
--   * Seçim: en uzun süredir kullanılmayan soru (hiç kullanılmamışlar önce); havuz bitince en eskiden başlayıp döner.
--   * Üretim iki yoldan tetiklenir, ikisi de aynı fonksiyonu çağırır ve tekrar çalışsa da çift anket üretmez:
--       1) Sayfa açılınca poll_ensure_week() (ek kurulum gerektirmez, hafta ilk açılışta oluşur)
--       2) pg_cron (varsa) pazartesi 00:05 UTC = 03:05 İstanbul
--   * Yönetici yine de poll_publish ile elle ek anket ekleyebilir.
--   * Havuza yeni soru eklemek için dosyanın sonundaki örneğe bak.
-- ============================================================================

-- 1) Soru havuzu (istemci erişemez; yalnızca sunucu fonksiyonları okur) ----------
create table if not exists public.poll_bank (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('organizasyon', 'calisma', 'uygulama')),
  question text not null unique check (char_length(question) between 5 and 240),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  active boolean not null default true,
  last_used_week date,
  times_used integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.poll_bank enable row level security;
revoke all on public.poll_bank from anon, authenticated;

-- 2) Anketlere kategori ve havuz bağlantısı ------------------------------------------
alter table public.weekly_polls add column if not exists category text
  check (category is null or category in ('organizasyon', 'calisma', 'uygulama'));
alter table public.weekly_polls add column if not exists bank_id uuid references public.poll_bank(id) on delete set null;
-- Aynı hafta aynı kategoriden iki otomatik anket üretilemesin (yarış durumuna karşı ikinci savunma)
create unique index if not exists weekly_polls_week_category_uq on public.weekly_polls (week_start, category)
  where category is not null;

-- 3) Haftalık üretici (dahili) ----------------------------------------------------
create or replace function public.poll_generate_week() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_start date := date_trunc('week', public.bigocuk_today())::date; -- haftanın pazartesisi
  c text;
  b public.poll_bank;
  v_n integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('bigova_poll_generate_week'));
  foreach c in array array['organizasyon', 'calisma', 'uygulama'] loop
    if exists (select 1 from public.weekly_polls p where p.week_start = v_start and p.category = c) then
      continue;
    end if;
    select * into b from public.poll_bank
     where category = c and active
     order by last_used_week asc nulls first, random()
     limit 1;
    if not found then continue; end if;

    insert into public.weekly_polls (week_start, week_end, question, options, created_by, category, bank_id)
    values (v_start, v_start + 6, b.question, b.options, null, c, b.id);
    update public.poll_bank set last_used_week = v_start, times_used = times_used + 1 where id = b.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- Sayfa açılışında çağrılır: bu haftanın otomatik anketleri eksikse üretir (hafif ve tekrar çalıştırılabilir).
create or replace function public.poll_ensure_week() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_start date := date_trunc('week', public.bigocuk_today())::date;
begin
  if (select count(*) from public.weekly_polls p where p.week_start = v_start and p.category is not null) >= 3 then
    return;
  end if;
  perform public.poll_generate_week();
end $$;

revoke all on function public.poll_generate_week() from public, anon, authenticated;
revoke all on function public.poll_ensure_week() from public;
grant execute on function public.poll_ensure_week() to anon, authenticated;

-- 4) Başlangıç soru havuzu (30 soru; her kategoride 10) -------------------------------
insert into public.poll_bank (category, question, options) values
  -- Organizasyon önerileri
  ('organizasyon', 'Bigova olarak bu ay hangi etkinliği düzenlemeliyiz?', '["Kariyer söyleşisi","Kampüs buluşması","Film akşamı","Kulüp tanıtım günü"]'),
  ('organizasyon', 'Etkinlikler için en uygun zaman hangisi?', '["Hafta içi akşam","Cuma","Cumartesi","Pazar"]'),
  ('organizasyon', 'Hangi tür buluşmaya katılırsın?', '["Mezun söyleşisi","Oyun turnuvası","Piknik ve doğa yürüyüşü","Konser veya müzik gecesi","Gönüllülük etkinliği"]'),
  ('organizasyon', 'Dönem başında yeni öğrenciler için en çok neye ihtiyaç var?', '["Tanışma buluşması","Biga rehberi","Kampüs turu","Kulüp fuarı"]'),
  ('organizasyon', 'Sınav haftasında hangi organizasyon işine yarardı?', '["Ortak çalışma maratonu","Çay ve atıştırmalık noktası","Konu anlatımı oturumları","Uzatılmış kütüphane saatleri"]'),
  ('organizasyon', 'Hangi alanda atölye görmek istersin?', '["Yazılım","Tasarım","CV ve mülakat","Girişimcilik","Yabancı dil"]'),
  ('organizasyon', 'Bir etkinliğe katılmanı en çok ne engelliyor?', '["Zaman","Ulaşım","Haberim olmaması","Ücret","İlgimi çekmemesi"]'),
  ('organizasyon', 'Biga''da en çok hangi sosyal etkinlik eksik?', '["Açık hava sineması","Spor turnuvaları","Kitap kulübü","Müzik geceleri"]'),
  ('organizasyon', 'Etkinlik duyurularını nereden takip etmeyi tercih edersin?', '["Bigova bildirimi","Instagram","WhatsApp grubu","Kampüs afişleri"]'),
  ('organizasyon', 'Hangi tür kulüp etkinliğine daha çok katılırsın?', '["Gezi ve doğa","Teknik eğitim","Sanat ve müzik","Spor","Sosyal sorumluluk"]'),
  -- Çalışma önerileri
  ('calisma', 'Ders çalışırken en çok neye ihtiyacın var?', '["Sessiz çalışma alanı","Ders notları","Çalışma arkadaşı","Odaklanma araçları"]'),
  ('calisma', 'En verimli çalışma saatin hangisi?', '["Sabah","Öğleden sonra","Akşam","Gece"]'),
  ('calisma', 'Nerede ders çalışmayı tercih edersin?', '["Kütüphane","Kafe","Yurt veya ev","Fakülte ortak alanı","Açık hava"]'),
  ('calisma', 'Sınav dönemi için en çok hangi içerik işine yarar?', '["Çıkmış sorular","Özet notlar","Video anlatımlar","Çalışma grupları"]'),
  ('calisma', 'Pomodoro''da hangi odak süresi sana uyuyor?', '["15 dakika","25 dakika","45 dakika","60 dakika ve üzeri"]'),
  ('calisma', 'Ders notu paylaşmak için seni ne motive eder?', '["Bigcoin ödülü","Arkadaşlarıma yardım","Teşekkür ve beğeni","Rozet ve sıralama"]'),
  ('calisma', 'Çalışma grubu kurmak ister misin?', '["Evet, bölümümle","Evet, farklı bölümlerle","Belki, konuya göre","Hayır, tek çalışırım"]'),
  ('calisma', 'Hangi alanda ders desteği almak isterdin?', '["Matematik ve sayısal dersler","Yabancı dil","Yazılı anlatım ve rapor","Bölüm meslek dersleri"]'),
  ('calisma', 'Derslerde notlarını nasıl tutuyorsun?', '["Defterde","Telefonda veya bilgisayarda","Slayt üzerine","Düzenli tutmuyorum"]'),
  ('calisma', 'Çalışırken dikkatini en çok ne dağıtıyor?', '["Telefon ve sosyal medya","Gürültü","Yorgunluk","Planlama eksikliği"]'),
  -- Uygulamayı geliştirme
  ('uygulama', 'Bigova''ya ilk hangi özelliği eklemeliyiz?', '["Etkinlik takvimi","Ulaşım bildirimi","Ders notu puanlama","Yemek menüsü"]'),
  ('uygulama', 'Bigova''da en çok hangi bölümü kullanıyorsun?', '["İşletmeler","Ulaşım","Notlar","Topluluk","Bigocuk"]'),
  ('uygulama', 'Bigova''yı ne sıklıkla açıyorsun?', '["Her gün","Haftada birkaç kez","Haftada bir","Ara sıra"]'),
  ('uygulama', 'Bigcoin ile neler satın almak isterdin?', '["Yeni avatar parçaları","İşletme indirimleri","Rozetler","Tema paketleri"]'),
  ('uygulama', 'Bigova''da en çok neyi geliştirmeliyiz?', '["Hız","Tasarım","İçerik çeşitliliği","Bildirimler"]'),
  ('uygulama', 'Bigocuk''a hangi yeni oyun eklenmeli?', '["Bilgi yarışması","Biga''da hazine avı","Hafıza oyunu","Takım yarışmaları"]'),
  ('uygulama', 'Hangi bildirimleri almak istersin?', '["Yalnızca önemli duyurular","Etkinlikler ve duyurular","Arkadaş mesajları dahil hepsi","Hiç bildirim istemem"]'),
  ('uygulama', 'İşletme sayfalarında en çok hangi bilgi eksik?', '["Güncel fiyatlar","Çalışma saatleri","Fotoğraflar","Öğrenci indirimi","Kullanıcı yorumları"]'),
  ('uygulama', 'Bigova''yı arkadaşlarına önermen için ne gerekir?', '["Daha fazla kullanıcı","Daha çok ödül","Daha çok özellik","Zaten öneriyorum"]'),
  ('uygulama', 'Bigova''ya hangi yeni bölüm eklenmeli?', '["Yemek ve kafe menüleri","Spor tesisleri","Ev arkadaşı ve kiralık ev","Kayıp eşya","Staj ve burs duyuruları"]')
on conflict (question) do nothing;

-- 5) İsteğe bağlı: pg_cron ile pazartesi 00:05 UTC (03:05 İstanbul) -------------------
-- pg_cron yoksa ya da yetki yoksa sessizce atlanır; sayfa açılışındaki poll_ensure_week() zaten yeterlidir.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'bigova-weekly-polls';
  perform cron.schedule('bigova-weekly-polls', '5 0 * * 1', 'select public.poll_generate_week()');
exception when others then
  raise notice 'pg_cron kurulamadı (%); sayfa açılışındaki otomatik üretim kullanılacak.', sqlerrm;
end $$;

-- 6) Bu haftanın anketlerini hemen üret ----------------------------------------------
select public.poll_generate_week();

-- PostgREST'in fonksiyon önbelleğini yenile
notify pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- HAVUZA YENİ SORU EKLEMEK (SQL Editor'de, kategori: organizasyon | calisma | uygulama):
--   insert into public.poll_bank (category, question, options)
--   values ('uygulama', 'Yeni sorun?', '["Seçenek 1","Seçenek 2","Seçenek 3"]');
-- Bir soruyu devre dışı bırakmak:
--   update public.poll_bank set active = false where question = 'Silinecek soru?';
-- ----------------------------------------------------------------------------
