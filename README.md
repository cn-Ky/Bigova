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
- **Anketler** (`/bigocuk/anketler`): haftalık öğrenci anketleri, her oy = 1 Bigcoin. Sonuçlar yalnızca yüzde olarak, hafta bitince herkese açılır.
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
