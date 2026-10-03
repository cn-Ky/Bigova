# Bigova

> **Biga'nın öğrencileri için keşfet, paylaş, öğren ve hayatını kolaylaştır.**

---

## 🚀 Projenin Amacı

Biga'da öğrencilerin günlük hayatta ihtiyaç duyduğu bilgileri farklı platformlarda aramak zorunda kalmaması ve öğrenciler arasında bilgi paylaşımının kolaylaştırılması amaçlanmaktadır.

Bigova ile kullanıcıların;

- 📍 Biga'daki işletmeleri keşfetmesi
- 💰 Fiyatları incelemesi
- 🚻 İşletmelerde tuvalet bulunup bulunmadığını öğrenmesi
- 🕐 Çalışma saatlerini görüntülemesi
- 📞 İletişim bilgilerine ulaşması
- ⭐ İşletmeleri değerlendirmesi
- 📚 İkinci el ders kitapları satın alması ve satması
- 📝 Ders notlarını paylaşması
- 📄 PDF ve eğitim materyallerine erişmesi
- 🎓 Öğrenci hayatıyla ilgili bilgi ve içeriklere ulaşması

hedeflenmektedir.

## 🎮 Bigocuk

Oyunlar, Bigcoin kazanma ve avatar giydirme bölümü (`/bigocuk`).

- **Yürüyüş** (`/bigocuk/yuruyus`): telefonun hareket sensörüyle adım sayar, her 50 adım = 1 Bigcoin. Günlük sınır 10.000 adım.
- **Avatar** (`/bigocuk/avatar`): Bigcoin ile saç, kıyafet, ayakkabı, gözlük, şapka, aksesuar ve arka plan satın al.
- **Kurulum:** Supabase SQL Editor'de `supabase/bigocuk_upgrade.sql` dosyasını çalıştır (tekrar çalıştırmak güvenlidir).
- **Yeni oyun eklemek:** `src/lib/bigocuk/games.ts` dizisine kayıt ekle, sayfasını `src/app/bigocuk/<oyun>/` altına yaz.
- **Yeni coin kazanma yolu:** `bigocuk_earn_sources` tablosuna kaynak ekle (miktar + günlük sınır), sunucu tarafında `perform public.bigocuk_grant(kullanici_id, 'kaynak')` çağır.
- **Yeni avatar parçası:** `src/lib/bigocuk/items.tsx` dosyasına ekle, SQL dosyasını yeniden çalıştır (fiyat listesi güncellenir).

---

# 📱 Temel Özellikler

## 🏪 Biga İşletmeleri

Biga'daki işletmeler hakkında kapsamlı bilgilerin tek bir platformda sunulması hedeflenmektedir.

Kullanıcılar işletmeler hakkında:

- İşletme adı
- Kategori
- Konum
- Fiyat aralığı
- Çalışma saatleri
- Telefon
- Sosyal medya hesapları
- Menü / hizmet bilgileri
- Tuvalet durumu
- Öğrenci dostu olup olmadığı
- Fotoğraflar
- Kullanıcı değerlendirmeleri

gibi bilgilere ulaşabilecektir.

---

## 💰 Fiyat Bilgileri

Öğrencilerin karar verirken en çok ihtiyaç duyduğu bilgilerden biri olan fiyatların mümkün olduğunca erişilebilir hale getirilmesi hedeflenmektedir.

Örneğin:

> ☕ Kahve — 70₺
> 🥪 Tost — 100₺
> 🍝 Makarna — 150₺

gibi ürün ve hizmet bilgileri işletme profilleri üzerinden görüntülenebilecektir.

Fiyat bilgilerinin güncel tutulması için kullanıcı ve işletme katkısı gibi farklı modeller değerlendirilecektir.

---

## 📚 İkinci El Kitap Pazarı

Öğrencilerin kullanmadıkları ders kitaplarını başka öğrencilere satabilmesini sağlayan bir ikinci el pazar alanı.

Kullanıcılar:

- Kitap ilanı oluşturabilir
- Fotoğraf ekleyebilir
- Fiyat belirleyebilir
- Ders / bölüm bilgisi ekleyebilir
- Satıcıyla iletişime geçebilir
- İlanları favorilerine ekleyebilir

---

## 📝 Ders Notları

Öğrencilerin ders notlarını birbirleriyle paylaşabileceği bir içerik alanı.

İçerikler bölüm, ders ve sınıf bazında kategorize edilebilir.

## Uygulama Veritabanı Kurulumu

Supabase SQL Editor'de ilk kurulumda `supabase/schema.sql` dosyasını çalıştırın. Mevcut kurulumda not alanları eksikse `supabase/notes_upgrade.sql` dosyasını, kitap pazarı/arkadaşlık serileri için `supabase/social_marketplace_upgrade.sql` dosyasını, haftalık anketler için `supabase/polls_upgrade.sql` dosyasını çalıştırın. İşletme ve ulaşım için temsili örnek kayıt eklemek üzere son olarak `supabase/sample_data.sql` dosyasını çalıştırabilirsiniz. Bu dosyadaki fiyat, telefon, adres, güzergâh ve saatler gerçek bilgi değildir; yayından önce doğrulanmış bilgilerle değiştirin.

Notlar sayfasındaki iki örnek PDF ile kitap pazarı örnek ilanları uygulama içi demo içeriğidir. Kitap ilanı yayınlama, arkadaş arama/istek gönderme ve bire bir sohbet için öğrencinin giriş yapmış olması gerekir. Seri, iki arkadaşın aynı gün birbirine en az birer mesaj göndermesiyle başlar ve ardışık karşılıklı mesaj günlerinde artar.

Anketler girişsiz deneme oylarını tarayıcıda tutar; gerçek oylar öğrenci hesabıyla haftada bir kez kaydedilir. Yeni haftalık anket yayımlayacak hesabın Supabase Dashboard'daki `app_metadata` alanında `role: admin` yetkisi olmalıdır. Bu yetkiyi istemci uygulamasından vermeyin. Anket sayfasında yetkili hesap, o haftanın sorusunu ve 2–8 seçeneğini yayımlayabilir.

Ders programı sayfası Biga İİBF ve Biga MYO'nun resmî 2026–2027 güz dönemi kaynaklarına bağlanır. Yeni dönem duyurusu yayımlandığında bölüm PDF adreslerini `src/lib/scheduleData.ts` içinde güncelleyin. Hakkımızda sayfasındaki kulüp/ekip kişi bilgileri ve tüzük metni, resmî bilgiler ve kulüp danışmanı onayı geldikten sonra güncellenmelidir; mevcut tüzük metni taslaktır.

---

## 📄 PDF ve Eğitim Materyalleri

Öğrencilerin eğitim amacıyla kullanabilecekleri PDF ve benzeri materyallerin paylaşılabileceği bir sistem.

İçerikler:

- Ders
- Bölüm
- Öğretim yılı
- İçerik türü

gibi kriterlere göre kategorize edilebilir.

---

# 🗺️ Keşfet

Bigova'nın temel özelliklerinden biri Biga'yı öğrencilerin gözünden keşfetmeyi sağlamaktır.

Kullanıcılar;

🍔 Yemek
☕ Kafe
🛒 Market
💻 Teknoloji
💊 Eczane
🏦 Banka
🏋️ Spor
📚 Kırtasiye
🧺 Çamaşırhane
🏠 Konaklama
🎮 Eğlence

gibi kategoriler üzerinden işletmeleri keşfedebilir.

---

# 👥 Öğrenci Topluluğu

Bigova yalnızca bir işletme rehberi değil, aynı zamanda öğrenciler arasında bir bilgi paylaşım platformu olmayı hedeflemektedir.

Öğrenciler:

- Bilgi paylaşabilir
- Ders materyali paylaşabilir
- İkinci el ürün satabilir
- İşletmeleri değerlendirebilir
- İçeriklere katkıda bulunabilir

Böylece platformun temel veri yapısının önemli bir bölümü topluluk tarafından oluşturulabilir.

# 🌐 Proje

**Bigova**

Biga'dan başlayan, öğrenciler için geliştirilen yerel dijital yaşam platformu.
