/**
 * Hakkımızda > Yasal bilgilendirme içeriği.
 *
 * ÖNEMLİ: Bu metinler Bigova'nın bugünkü işleyişine (kod ve veritabanı yapısına) göre hazırlanmış
 * bir TASLAKTIR. Yayımdan önce bir hukukçu tarafından gözden geçirilmeli ve aşağıdaki
 * CONTROLLER alanları doldurulmalıdır. Boş bırakılan alanlar sayfada "Onay sonrası eklenecek"
 * rozetiyle görünür; metinde {{alan}} biçiminde geçerler.
 */

export const CONTROLLER = {
  /** Veri sorumlusunun unvanı (örn. "Bigova Öğrenci Topluluğu" ya da tüzel kişilik unvanı) */
  unvan: "",
  /** Tebligat / yazışma adresi */
  adres: "",
  /** Başvuruların alınacağı e-posta adresi */
  eposta: "",
  /** Varsa Kayıtlı Elektronik Posta (KEP) adresi */
  kep: "",
  /** Varsa kulüp danışmanı / sorumlu öğretim elemanı */
  sorumlu: "",
} as const;

export const LEGAL_UPDATED = "4 Ekim 2026";
export const LEGAL_VERSION = "Sürüm 1.0 · taslak";

export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "note"; text: string };

export type LegalDoc = {
  id: string;
  title: string;
  law: string; // başlığın altında görünen kısa dayanak
  summary: string;
  blocks: Block[];
};

export const LEGAL_DOCS: LegalDoc[] = [
  /* ───────────────────────── 1. AYDINLATMA METNİ ───────────────────────── */
  {
    id: "aydinlatma",
    title: "Kullanıcı Aydınlatma Metni",
    law: "6698 sayılı KVKK m.10 · Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ",
    summary: "Kişisel verilerinizi kim, hangi amaçla, hangi hukuki sebeple işliyor ve haklarınız neler?",
    blocks: [
      { t: "p", text: "Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun (“KVKK”) 10. maddesi ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca, Bigova mobil/web uygulamasını (“Bigova” veya “Platform”) kullanan kişileri (“Kullanıcı” veya “İlgili Kişi”) kişisel verilerinin işlenmesi hakkında bilgilendirmek amacıyla hazırlanmıştır." },

      { t: "h", text: "1. Veri sorumlusu" },
      { t: "p", text: "KVKK m.3/1-(i) uyarınca kişisel verilerin işleme amaçlarını ve vasıtalarını belirleyen, veri kayıt sisteminin kurulmasından ve yönetilmesinden sorumlu olan veri sorumlusu aşağıdadır." },
      { t: "table", head: ["Bilgi", "Ayrıntı"], rows: [
        ["Veri sorumlusu", "{{unvan}}"],
        ["Adres", "{{adres}}"],
        ["E-posta", "{{eposta}}"],
        ["KEP adresi", "{{kep}}"],
        ["Sorumlu kişi / danışman", "{{sorumlu}}"],
      ] },

      { t: "h", text: "2. İşlenen kişisel veriler" },
      { t: "p", text: "Platformda işlenen veriler, kullandığınız özelliğe göre değişir. Yalnızca ilgili özelliği kullanırsanız o özelliğe ait veriler işlenir." },
      { t: "table", head: ["Veri kategorisi", "Kapsam", "Ne zaman oluşur?"], rows: [
        ["Kimlik", "Ad, soyad, kullanıcı tanımlayıcısı (ID); varsa öğrenci numarası", "Kayıt ve profil oluşturma"],
        ["İletişim", "E-posta adresi; ilan verirseniz ilanda yazdığınız telefon, WhatsApp ve e-posta bilgileri", "Kayıt, iş ilanı ve kitap ilanı"],
        ["Hesap ve oturum", "Parola (yalnızca şifrelenmiş/özetlenmiş biçimde), oturum anahtarları, doğrulama kayıtları", "Giriş yapma"],
        ["Sosyal etkileşim", "Arkadaşlık istekleri ve arkadaş listesi, bire bir mesaj içerikleri ve zamanları, arkadaşlık serisi bilgisi, profil gizlilik tercihi", "Arkadaşlar bölümü"],
        ["Kullanıcı içeriği", "Yüklediğiniz ders notu dosyaları ve başlıkları, kitap ve iş ilanları, anket oyları", "İlgili bölümleri kullanma"],
        ["Bigocuk", "Adım sayısı, Bigcoin bakiyesi ve hareketleri, satın alınan parçalar, avatar görünümü", "Bigocuk bölümü"],
        ["Konum", "Haritada “konumum” özelliğini kullanırsanız cihazınızın anlık konumu (bkz. Konum ve Sensör Bilgilendirmesi)", "Harita bölümü, yalnızca izin verirseniz"],
        ["İşlem güvenliği", "IP adresi, tarayıcı/cihaz türü, erişim zamanı gibi barındırma ve güvenlik günlükleri", "Platforma her erişimde"],
        ["Cihaz tercihleri", "Tema, tıklama sesi, gezinme düzeni gibi görünüm tercihleri", "Ayarlar (yalnızca cihazınızda)"],
      ] },
      { t: "note", text: "Platform, açık rıza olmaksızın KVKK m.6 kapsamındaki özel nitelikli kişisel verileri (sağlık, din, etnik köken, biyometrik veri vb.) talep etmez. Lütfen ders notu, ilan, mesaj ve profil alanlarında bu tür verileri paylaşmayın." },

      { t: "h", text: "3. Kişisel verilerin işlenme amaçları" },
      { t: "ul", items: [
        "Üyelik kaydınızı oluşturmak, kimliğinizi doğrulamak ve oturumunuzu yönetmek",
        "Arkadaşlık, bire bir mesajlaşma, profil ve avatar özelliklerini sunmak",
        "Ders notu paylaşımı, ikinci el kitap pazarı, iş ilanları ve anketler gibi topluluk özelliklerini işletmek",
        "Bigocuk bölümünde adım sayma, Bigcoin kazanma/harcama ve avatar mağazasını yürütmek; kötüye kullanımı (hileli adım vb.) önlemek",
        "Harita, işletme, ulaşım ve hava durumu bilgilerini göstermek",
        "Platformun güvenliğini sağlamak, hataları tespit edip gidermek, yetkisiz erişim ve kötüye kullanımı önlemek",
        "Hukuka aykırı içerik bildirimlerini incelemek ve gerekli işlemleri yapmak",
        "Hukuki yükümlülükleri yerine getirmek, yetkili kurum ve mercilerin taleplerini karşılamak",
        "Bir hakkın tesisi, kullanılması veya korunması için gerektiğinde kayıt tutmak",
      ] },
      { t: "p", text: "Verileriniz; reklam, profilleme amaçlı pazarlama ve satış amacıyla işlenmez; üçüncü kişilere pazarlama amacıyla satılmaz veya kiralanmaz." },

      { t: "h", text: "4. İşlemenin hukuki sebepleri" },
      { t: "table", head: ["Hukuki sebep (KVKK m.5/2)", "Dayandığı işlemler"], rows: [
        ["(c) Sözleşmenin kurulması veya ifası", "Üyelik hesabının açılması ve sürdürülmesi; arkadaşlık, mesajlaşma, ilan, not paylaşımı ve Bigocuk özelliklerinin sunulması"],
        ["(ç) Hukuki yükümlülüğün yerine getirilmesi", "5651 sayılı Kanun kapsamındaki kayıt tutma ve içerik kaldırma yükümlülükleri; yetkili merci taleplerinin karşılanması; veri ihlali bildirimi"],
        ["(e) Bir hakkın tesisi, kullanılması veya korunması", "Uyuşmazlık, şikâyet veya hukuki başvuru ihtimaline karşı gerekli kayıtların saklanması"],
        ["(f) Meşru menfaat (ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla)", "Bilgi güvenliğinin sağlanması, kötüye kullanımın ve hileli adım gönderiminin önlenmesi, hizmetin iyileştirilmesi"],
        ["Açık rıza (KVKK m.5/1)", "İsteğe bağlı özellikler: cihaz konumu ve hareket sensörünün kullanımı. İzin cihazınızdan/tarayıcınızdan istenir ve dilediğiniz an geri alınabilir"],
      ] },
      { t: "p", text: "Açık rızaya dayanan işlemlerde rızanızı geri çekmeniz, geri çekmeden önceki işlemlerin hukuka uygunluğunu etkilemez." },

      { t: "h", text: "5. Kişisel verilerin toplanma yöntemi" },
      { t: "p", text: "Verileriniz; kayıt ve giriş formları, profil ve ayar ekranları, mesaj, ilan, not yükleme ve anket alanları gibi tamamen veya kısmen otomatik yollarla elektronik ortamda; ayrıca tarayıcı/cihaz izinleriniz doğrultusunda (konum, hareket sensörü) toplanır. Bu işlemler Platform arayüzü üzerinden, sizin eyleminizle gerçekleşir." },

      { t: "h", text: "6. Kişisel verilerin aktarıldığı taraflar" },
      { t: "p", text: "Verileriniz KVKK m.8 ve m.9 hükümlerine uygun olarak, yalnızca hizmetin sunulması için gerekli olduğu ölçüde aşağıdaki taraflara aktarılabilir veya bu taraflarca işlenebilir. Platformun işletilmesi için kullanılan hizmet sağlayıcılar, Bigova adına işlem yapan “veri işleyen” konumundadır." },
      { t: "table", head: ["Taraf", "Rolü", "Aktarılan/işlenen veri"], rows: [
        ["Supabase", "Kimlik doğrulama, veritabanı ve dosya depolama altyapısı", "Hesap, profil, mesaj, ilan, not dosyası, Bigocuk ve avatar verileri"],
        ["Vercel", "Web uygulaması barındırma ve içerik dağıtımı", "Erişim günlükleri (IP, cihaz/tarayıcı bilgisi), sayfa istekleri"],
        ["Open-Meteo", "Hava durumu verisi", "Yalnızca sabit Biga koordinatları; kullanıcı kimliği veya konumu gönderilmez"],
        ["OpenStreetMap / CARTO", "Harita karoları; yaya/araç rota hesabı", "Harita görüntülemede IP adresi; rota istediğinizde başlangıç ve varış koordinatları"],
        ["Google Fonts", "Yazı tipi dağıtımı", "Sayfa açılırken IP adresi ve tarayıcı bilgisi"],
        ["Yetkili kurum ve kuruluşlar", "Mevzuattan doğan talepler", "Talebin kapsamıyla sınırlı veriler"],
        ["Diğer Kullanıcılar", "Platform özelliklerinin doğası gereği", "Ad, avatar, ilan/iletişim bilgisi, yayımladığınız içerikler (gizlilik tercihinize bağlı olarak)"],
      ] },

      { t: "h", text: "7. Yurt dışına aktarım" },
      { t: "p", text: "Supabase, Vercel, Google ve harita sağlayıcıları gibi hizmet sağlayıcıların sunucuları Türkiye dışında bulunabilir. Bu nedenle verilerinizin bir kısmı KVKK m.9 kapsamında yurt dışına aktarılmış olur. Aktarım; 1 Haziran 2024 tarihinden itibaren yürürlükte olan m.9 düzenlemesi uyarınca yeterlilik kararı, Kurul tarafından ilan edilen standart sözleşme veya diğer uygun güvenceler gibi kanunda sayılan yollardan biriyle ve ilgili bildirim yükümlülükleri yerine getirilerek yapılır. Hangi hizmet sağlayıcının hangi bölgede çalıştığı bilgisi talep üzerine paylaşılır." },

      { t: "h", text: "8. Saklama süresi" },
      { t: "ul", items: [
        "Hesap, profil, mesaj, ilan, not ve Bigocuk verileri: hesabınız açık kaldığı sürece saklanır.",
        "Hesabın kapatılması veya silme talebi halinde: yasal saklama yükümlülüğü bulunmayan veriler makul sürede silinir, yok edilir veya anonim hale getirilir. Hesap silindiğinde profile bağlı kayıtlar sistemden kaldırılır; yüklediğiniz not dosyaları da talep üzerine depolamadan silinir.",
        "Erişim ve güvenlik günlükleri: 5651 sayılı Kanun ve ilgili yönetmelikte öngörülen süre boyunca saklanır.",
        "Uyuşmazlık veya yasal süreç ihtimali bulunan kayıtlar: zamanaşımı süresi sonuna kadar saklanabilir.",
        "Süre sonunda veriler, Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkında Yönetmelik hükümlerine göre silinir, yok edilir veya anonim hale getirilir.",
      ] },

      { t: "h", text: "9. İlgili kişi olarak haklarınız (KVKK m.11)" },
      { t: "p", text: "Veri sorumlusuna başvurarak kendinizle ilgili aşağıdaki taleplerde bulunabilirsiniz:" },
      { t: "ol", items: [
        "Kişisel verilerinizin işlenip işlenmediğini öğrenme,",
        "İşlenmişse buna ilişkin bilgi talep etme,",
        "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,",
        "Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme,",
        "Eksik veya yanlış işlenmişse düzeltilmesini isteme,",
        "KVKK m.7 çerçevesinde silinmesini veya yok edilmesini isteme,",
        "Düzeltme ve silme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,",
        "İşlenen verilerin münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonuç doğmasına itiraz etme,",
        "Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme.",
      ] },

      { t: "h", text: "10. Başvuru yöntemi ve süre" },
      { t: "p", text: "Başvurularınızı, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ uyarınca; yazılı olarak (kimliğinizi tespit edici bilgilerle ve talebinizi açıklayan dilekçeyle), güvenli elektronik imzalı e-posta ile, KEP adresi üzerinden veya Platformda kayıtlı e-posta adresinizden {{eposta}} adresine iletebilirsiniz. Talepleriniz, niteliğine göre en kısa sürede ve en geç otuz gün içinde ücretsiz olarak sonuçlandırılır; işlemin ayrıca bir maliyet gerektirmesi halinde Kurulca belirlenen tarifedeki ücret alınabilir (KVKK m.13)." },
      { t: "p", text: "Başvurunun reddedilmesi, verilen cevabın yetersiz bulunması veya süresinde cevap verilmemesi halinde; cevabı öğrendiğiniz tarihten itibaren otuz gün ve her halde başvuru tarihinden itibaren altmış gün içinde Kişisel Verileri Koruma Kurulu'na şikâyette bulunma hakkınız saklıdır (KVKK m.14)." },
    ],
  },

  /* ───────────────────────── 2. GİZLİLİK POLİTİKASI ───────────────────────── */
  {
    id: "gizlilik",
    title: "Gizlilik Politikası ve Veri Güvenliği",
    law: "KVKK m.4, m.12 · Kişisel Veri Güvenliği Rehberi · Kurul Kararı 2019/10",
    summary: "Verilerinizi hangi ilkelerle işliyor, nasıl koruyoruz ve bir ihlalde ne yapıyoruz?",
    blocks: [
      { t: "h", text: "Temel ilkeler (KVKK m.4)" },
      { t: "ul", items: [
        "Hukuka ve dürüstlük kurallarına uygun işleme",
        "Doğru ve gerektiğinde güncel tutma",
        "Belirli, açık ve meşru amaçlar için işleme",
        "İşlendikleri amaçla bağlantılı, sınırlı ve ölçülü olma (veri minimizasyonu)",
        "İlgili mevzuatta öngörülen veya işlendikleri amaç için gerekli süre kadar muhafaza etme",
      ] },
      { t: "h", text: "Profil gizliliği" },
      { t: "p", text: "Ayarlar bölümünden profilinizin “herkese açık” veya “yalnızca arkadaşlara görünür” olmasını seçebilirsiniz. Yalnızca arkadaşlara görünür profilde avatarınız ve arkadaş sayınız arkadaşlarınız dışındaki kullanıcılara gösterilmez. Bigcoin bakiyeniz, adım sayınız ve envanteriniz başka kullanıcılara gösterilmez; yalnızca avatarınızın görünümü paylaşılır." },
      { t: "h", text: "Alınan güvenlik tedbirleri (KVKK m.12)" },
      { t: "ul", items: [
        "Verilerin iletiminde şifreli bağlantı (HTTPS/TLS) kullanılır.",
        "Veritabanında satır düzeyinde yetkilendirme (Row Level Security) uygulanır; kullanıcılar kural olarak yalnızca kendi verilerine ve paylaşıma açılmış verilere erişebilir.",
        "Bigcoin, adım ve satın alma işlemleri istemciden değil, sunucu tarafındaki denetimli fonksiyonlardan geçer; günlük adım ve hız sınırları uygulanır.",
        "Parolalar düz metin olarak saklanmaz.",
        "Yönetici yetkileri istemci uygulamasından verilemez; yönetici erişimi sınırlı ve amaçla bağlantılıdır.",
        "Hizmet sağlayıcılarla veri işleme ve gizlilik hükümleri içeren koşullar uygulanır.",
      ] },
      { t: "note", text: "Hiçbir sistem tamamen risksiz değildir. Hesabınızın güvenliği için güçlü ve benzersiz bir parola kullanmanızı, parolanızı kimseyle paylaşmamanızı ve ortak cihazlarda oturumu kapatmanızı öneririz." },
      { t: "h", text: "Veri ihlali halinde izlenecek yol" },
      { t: "p", text: "Kişisel verilerin hukuka aykırı olarak başkaları tarafından elde edilmesi halinde durum, KVKK m.12/5 ve Kurul'un 2019/10 sayılı Kararı uyarınca, tespitten itibaren en kısa sürede ve en geç 72 saat içinde Kişisel Verileri Koruma Kurumu'na ve etkilenen ilgili kişilere bildirilir." },
      { t: "h", text: "Çalışma ve bağlantı notu" },
      { t: "p", text: "Platform; işletme, ulaşım ve okul kaynaklarına dış bağlantılar içerebilir. Bu sitelerin gizlilik uygulamalarından Bigova sorumlu değildir; bağlantıya tıklamadan önce ilgili sitenin politikasını incelemenizi öneririz." },
    ],
  },

  /* ───────────────────────── 3. ÇEREZ / YEREL DEPOLAMA ───────────────────────── */
  {
    id: "cerez",
    title: "Çerez ve Yerel Depolama Politikası",
    law: "KVKK m.5 · 6563 sayılı Kanun · Kişisel Verileri Koruma Kurumu rehberleri",
    summary: "Cihazınızda hangi bilgileri saklıyoruz ve bunları nasıl yönetebilirsiniz?",
    blocks: [
      { t: "p", text: "Bigova, reklam, davranışsal profilleme veya üçüncü taraf analitik çerezi kullanmaz. Yalnızca hizmetin çalışması için zorunlu olan oturum bilgilerini ve cihazınızda tuttuğumuz görünüm tercihlerini saklarız." },
      { t: "table", head: ["Tür", "Amaç", "Süre / Yer"], rows: [
        ["Oturum çerezleri (zorunlu)", "Giriş yaptığınızı hatırlamak ve oturumunuzu güvenle yenilemek", "Oturum süresince / tarayıcı çerezi"],
        ["Tercih verileri (yerel depolama)", "Tema, tıklama sesi ve ses stili, mobil ve masaüstü gezinme düzeni", "Siz silene kadar / yalnızca cihazınızda"],
        ["Oturum depolaması", "Açılış animasyonunun aynı oturumda tekrar gösterilmemesi", "Sekme kapanana kadar"],
        ["Deneme (misafir) verileri", "Giriş yapmadan denenen anket, kitap ve sohbet örneklerinin cihazda tutulması", "Siz silene kadar / yalnızca cihazınızda"],
      ] },
      { t: "p", text: "Zorunlu oturum çerezleri, hizmetin sunulabilmesi için gerekli olduğundan sözleşmenin ifası ve meşru menfaat kapsamında kullanılır. Tercih verileri yalnızca cihazınızda kalır, sunucumuza gönderilmez." },
      { t: "h", text: "Nasıl yönetirim?" },
      { t: "p", text: "Tarayıcı ayarlarınızdan çerezleri ve site verilerini silebilir veya engelleyebilirsiniz. Zorunlu çerezleri engellerseniz giriş gerektiren özellikler çalışmayabilir. Görünüm tercihlerinizi Ayarlar sayfasından değiştirebilirsiniz." },
      { t: "note", text: "Platform ileride analitik veya benzeri araçlar eklerse, bu politika güncellenir ve gerekli olduğu hallerde onayınız ayrıca alınır." },
    ],
  },

  /* ───────────────────────── 4. KONUM VE SENSÖR ───────────────────────── */
  {
    id: "konum",
    title: "Konum ve Hareket Sensörü Bilgilendirmesi",
    law: "KVKK m.5/1 (açık rıza) · m.4",
    summary: "Konum ve sensör izinlerini ne için istiyoruz, verileriniz nereye gidiyor?",
    blocks: [
      { t: "h", text: "Harita ve konum" },
      { t: "p", text: "“Konumum” özelliğini kullandığınızda tarayıcınız konum izni ister. İzin verirseniz konumunuz haritada sizi göstermek ve yakın işletmelere odaklanmak için cihazınızda kullanılır; Bigova sunucularına kaydedilmez. Yürüyüş veya araç rotası istediğinizde başlangıç ve varış koordinatları rota hesabı için OpenStreetMap rota servisine gönderilir." },
      { t: "h", text: "Hareket sensörü ve adım sayacı" },
      { t: "p", text: "Bigocuk yürüyüş özelliği, adım saymak için cihazınızın hareket sensörünü kullanır. Ham sensör verileri cihazınızda işlenir ve saklanmaz; sunucuya yalnızca hesaplanan adım sayısı gönderilir. Adım gönderimleri günlük ve hız sınırlarına tabidir." },
      { t: "h", text: "Rızanın yönetimi" },
      { t: "ul", items: [
        "Bu izinler isteğe bağlıdır; vermemeniz diğer özelliklerin kullanımını etkilemez.",
        "İzni tarayıcı veya işletim sistemi ayarlarından istediğiniz an kapatabilirsiniz.",
        "İzni kapatmanız, daha önce sunucuya gönderilmiş adım sayısını silmez; silme için başvuru hakkınızı kullanabilirsiniz.",
      ] },
    ],
  },

  /* ───────────────────────── 5. KULLANIM KOŞULLARI ───────────────────────── */
  {
    id: "kosullar",
    title: "Kullanım Koşulları",
    law: "6098 sayılı Türk Borçlar Kanunu · 5651 sayılı Kanun · 6563 sayılı Kanun",
    summary: "Platformu kullanırken uyulacak kurallar ve tarafların sorumlulukları.",
    blocks: [
      { t: "h", text: "Hizmetin niteliği" },
      { t: "p", text: "Bigova, Biga'daki öğrenciler için bilgi paylaşımı ve topluluk platformudur. Platform bir üniversite birimi, resmî kurum veya işletme değildir; ÇOMÜ ile kurumsal bir ilişkisi bulunduğu izlenimi verilmemelidir. Platformu kullanarak bu koşulları kabul etmiş sayılırsınız." },
      { t: "h", text: "Üyelik ve hesap güvenliği" },
      { t: "ul", items: [
        "Kayıt sırasında doğru, güncel ve size ait bilgileri vermelisiniz.",
        "Hesabınızın güvenliğinden ve hesabınızla yapılan işlemlerden siz sorumlusunuz.",
        "Başkası adına hesap açmak, kimliğe bürünmek ve hesabı devretmek yasaktır.",
        "Hesabınızın kapatılmasını ve verilerinizin silinmesini, Aydınlatma Metni'ndeki başvuru yoluyla talep edebilirsiniz.",
      ] },
      { t: "h", text: "Yasak davranışlar" },
      { t: "ul", items: [
        "Hukuka, genel ahlaka ve kişilik haklarına aykırı; hakaret, tehdit, taciz, nefret söylemi, müstehcen veya şiddet içeren paylaşım yapmak",
        "Başkalarının kişisel verilerini izinsiz paylaşmak (5237 sayılı TCK m.135–138 kapsamında suç oluşturabilir)",
        "Telif hakkı veya üçüncü kişilerin diğer haklarını ihlal eden içerik yüklemek",
        "Spam, dolandırıcılık, yanıltıcı ilan ve izinsiz ticari ileti göndermek",
        "Hileli adım göndermek, sensörü taklit etmek, sistemi otomatik araçlarla manipüle etmek veya güvenlik önlemlerini aşmaya çalışmak",
        "Platformun işleyişini bozacak, yetkisiz erişim sağlamaya yönelik girişimlerde bulunmak",
      ] },
      { t: "h", text: "Tedbirler" },
      { t: "p", text: "Bu koşullara aykırılık halinde ilgili içerik kaldırılabilir, özellikler kısıtlanabilir veya hesap askıya alınabilir/kapatılabilir. Hukuka aykırılık oluşturan durumlarda yetkili makamlara bildirim yapılabilir. Hukuka aykırı içerik bildirimleri için “İçerik Bildirimi ve Kaldırma” başlığına bakınız." },
      { t: "h", text: "Sorumluluğun sınırı" },
      { t: "ul", items: [
        "Bigova, kullanıcıların oluşturduğu içerikler (not, ilan, mesaj, yorum) için 5651 sayılı Kanun anlamında yer sağlayıcıdır; içeriğin doğruluğunu ve hukuka uygunluğunu önceden denetlemekle yükümlü değildir.",
        "İşletme, fiyat, ulaşım saatleri ve benzeri bilgiler bilgilendirme amaçlıdır ve değişebilir; kesin bilgi için ilgili işletme veya resmî kaynak esas alınmalıdır. Ders programı için üniversitenin resmî duyuruları geçerlidir.",
        "Platform mümkün olduğunca kesintisiz sunulmaya çalışılır; bakım, arıza veya üçüncü taraf hizmet kesintilerinden doğan geçici erişim sorunlarından sorumluluk, kanunun izin verdiği ölçüde sınırlıdır. Kasıt ve ağır kusur halleri saklıdır.",
        "Kullanıcılar arasındaki anlaşmazlıklar (ilan, alışveriş, mesajlaşma) esas olarak taraflar arasındadır.",
      ] },
      { t: "h", text: "Uygulanacak hukuk ve yetki" },
      { t: "p", text: "Bu koşullara Türk hukuku uygulanır. Tüketici sıfatıyla yapılan başvurularda tüketici mevzuatındaki yetkili tüketici hakem heyetleri ve mahkemeler; diğer uyuşmazlıklarda kullanıcının veya veri sorumlusunun yerleşim yerindeki Türkiye mahkemeleri yetkilidir." },
    ],
  },

  /* ───────────────────────── 6. KULLANICI İÇERİKLERİ ───────────────────────── */
  {
    id: "icerikler",
    title: "Ders Notları, Kitap Pazarı ve İş İlanları",
    law: "5846 sayılı FSEK · 6563 sayılı Kanun · 6502 sayılı Kanun · 4904 sayılı Kanun · 5651 sayılı Kanun",
    summary: "Kullanıcı içeriklerinin telif, ilan ve ticari işlemler bakımından hukuki çerçevesi.",
    blocks: [
      { t: "h", text: "Ders notları ve PDF materyaller" },
      { t: "ul", items: [
        "Yalnızca kendi hazırladığınız veya paylaşma hakkına sahip olduğunuz notları yükleyin. Hocaların ders slaytlarını, yayıncıların kitaplarını veya başkasının notunu izinsiz yüklemek 5846 sayılı Fikir ve Sanat Eserleri Kanunu'nu ihlal edebilir.",
        "Yüklediğiniz içerik üzerindeki hak size aittir. Yüklemeyle birlikte Bigova'ya içeriği Platform üzerinde göstermek, saklamak ve diğer kullanıcılara sunmak için münhasır olmayan, ücretsiz, Platformla sınırlı bir kullanım izni vermiş olursunuz. İçeriği sildiğinizde bu izin sona erer.",
        "Telif hakkınızın ihlal edildiğini düşünüyorsanız “İçerik Bildirimi ve Kaldırma” bölümündeki yolu kullanabilirsiniz.",
        "Notlar yardımcı kaynaktır; doğruluğu garanti edilmez ve resmî ders materyalinin yerine geçmez.",
      ] },
      { t: "h", text: "İkinci el kitap pazarı" },
      { t: "ul", items: [
        "Bigova yalnızca ilan yayınlanmasına ve alıcı-satıcının iletişim kurmasına aracılık eder; satış sözleşmesinin tarafı, satıcısı, alıcısı veya ödeme aracısı değildir. Bu Platform üzerinden ödeme alınmaz.",
        "Ürünün durumu, fiyatı ve teslimi ilan sahibi ile alıcı arasındadır. Alıcılar ürünü teslim almadan önce kontrol etmeli, buluşmayı güvenli ve kamuya açık yerlerde yapmalıdır.",
        "Ticari faaliyet niteliği taşıyan satışlarda (düzenli satış, ticari amaç) satıcının 6502 sayılı Tüketicinin Korunması Hakkında Kanun, Mesafeli Sözleşmeler Yönetmeliği ve 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamındaki yükümlülükleri kendisine aittir.",
        "Sahte, çalıntı, korsan (fotokopi/PDF kopyası) veya yasaklı ürün ilanı verilemez.",
      ] },
      { t: "h", text: "İş ilanları" },
      { t: "ul", items: [
        "İş ilanlarının doğruluğundan ve mevzuata uygunluğundan ilanı veren sorumludur. Bigova bir özel istihdam bürosu değildir ve işe yerleştirme aracılığı yapmaz; 4904 sayılı Türkiye İş Kurumu Kanunu kapsamındaki izne tabi faaliyetlerde bulunmaz.",
        "Başvuru yapmadan önce işverenin kimliğini ve ilanın güvenilirliğini araştırın. Ön ödeme, kimlik/banka bilgisi veya ücret talep eden ilanlardan kaçının ve bunları bildirin.",
        "İlanda yer alan iletişim bilgileri (telefon, WhatsApp, e-posta), ilan sahibinin kendi tercihiyle herkese açık yayımlanır ve ilan kaldırıldığında Platformdan silinir; ancak başkaları tarafından kopyalanmış olabilir.",
        "Çalışma koşulları, ücret ve sigorta konularında 4857 sayılı İş Kanunu ve ilgili mevzuat geçerlidir; ayrımcı veya yasaya aykırı ilan verilemez.",
      ] },
      { t: "h", text: "Anketler" },
      { t: "p", text: "Haftalık anketlerde gerçek oylar öğrenci hesabıyla ve haftada bir kez kaydedilir." },
    ],
  },

  /* ───────────────────────── 7. BİGOCUK ───────────────────────── */
  {
    id: "bigocuk",
    title: "Bigocuk ve Bigcoin Koşulları",
    law: "6098 sayılı Türk Borçlar Kanunu · 6502 sayılı Kanun",
    summary: "Sanal ödül sisteminin kuralları ve sınırları.",
    blocks: [
      { t: "ul", items: [
        "Bigcoin, Platform içinde kullanılan sanal bir ödül birimidir. Para, elektronik para, kripto varlık veya ödeme aracı değildir; nakde, hediye çekine veya gerçek bir ürüne çevrilemez, kullanıcılar arasında devredilemez, satılamaz.",
        "Bu sürümde Bigcoin gerçek para ile satın alınamaz; yalnızca yürüyüş gibi oyunlar ve Platformun belirlediği işlemlerle kazanılır. Her 50 adım 1 Bigcoin kazandırır; günlük adım ve hız sınırları uygulanır.",
        "Avatar parçaları yalnızca Platform içinde görsel özelleştirme sağlar; mülkiyet, yeniden satış veya iade hakkı doğurmaz.",
        "Hileli, otomatik veya sensörü taklit eden adım gönderimleri tespit edilirse ilgili kazançlar iptal edilebilir, bakiye düzeltilebilir ve hesap kısıtlanabilir.",
        "Bigova; ödül oranlarını, günlük sınırları, mağaza katalogunu ve fiyatları makul bir bildirimle değiştirebilir veya özelliği sonlandırabilir. Katalog değişikliklerinde, kaldırılan parçalar için harcanan Bigcoin'in iade edilmesi esastır.",
        "Adım sayısı, sağlık veya fitness ölçümü olarak tasarlanmamıştır ve tıbbi bir amaç taşımaz.",
        "Yürüyüş sırasında trafik ve çevre güvenliğine dikkat etmek kullanıcının sorumluluğundadır; telefona bakarak yolda yürümeyin.",
      ] },
    ],
  },

  /* ───────────────────────── 8. GENÇ KULLANICILAR ───────────────────────── */
  {
    id: "yas",
    title: "Yaş Sınırı ve Genç Kullanıcılar",
    law: "KVKK m.4, m.5 · 4721 sayılı Türk Medeni Kanunu",
    summary: "Platformu kimler kullanabilir?",
    blocks: [
      { t: "p", text: "Bigova, üniversite öğrencileri başta olmak üzere reşit kullanıcılar için tasarlanmıştır. 18 yaşını doldurmamış kişilerin Platformu kullanması için velisinin veya yasal temsilcisinin bilgisi ve onayı gerekir; küçüklerin açık rızasına dayanan işlemlerde yasal temsilcinin onayı aranır. Bir küçüğe ait verilerin yasal temsilcinin bilgisi olmadan işlendiğini fark ederseniz, lütfen bize bildirin; ilgili veriler gecikmeden silinir." },
    ],
  },

  /* ───────────────────────── 9. İÇERİK BİLDİRİMİ ───────────────────────── */
  {
    id: "bildirim",
    title: "İçerik Bildirimi ve Kaldırma Prosedürü",
    law: "5651 sayılı Kanun m.5 ve m.9 · 5846 sayılı FSEK",
    summary: "Hukuka aykırı içeriği ve hak ihlallerini nasıl bildirirsiniz?",
    blocks: [
      { t: "p", text: "Kişilik haklarınızın veya telif hakkınızın ihlal edildiğini düşünüyorsanız, aşağıdaki bilgilerle {{eposta}} adresine başvurabilirsiniz:" },
      { t: "ol", items: [
        "Adınız, soyadınız ve iletişim bilgileriniz",
        "İhlal iddiasına konu içeriğin yeri (sayfa, ilan veya profil bağlantısı ve açıklaması)",
        "İhlalin nedeni ve dayanağınız (hangi hakkınızın nasıl ihlal edildiği)",
        "Hak sahibi olduğunuza veya hak sahibi adına başvurduğunuza dair bilgi/belge",
        "Bildirimin doğru ve iyi niyetli yapıldığına dair beyanınız",
      ] },
      { t: "p", text: "Bildirimler makul sürede incelenir. Açıkça hukuka aykırı bulunan içerik, 5651 sayılı Kanun'un yer sağlayıcılara yüklediği yükümlülükler çerçevesinde yayından kaldırılır; içeriği yayımlayan kullanıcı, mümkün ise bilgilendirilir. Kişilik haklarının ihlali iddialarında içerik yayımcısına ve hukuki yollara başvuru (içeriğin kaldırılması için sulh ceza hâkimliğine başvuru dahil) hakkınız saklıdır. Hukuka aykırı olmadığı değerlendirilen içerik yerinde bırakılabilir; bu durum yargı yoluna başvuru hakkınızı etkilemez." },
      { t: "p", text: "Mahkeme veya yetkili idari makamlarca verilen kararlar gecikmeksizin uygulanır." },
    ],
  },

  /* ───────────────────────── 10. MEVZUAT ───────────────────────── */
  {
    id: "mevzuat",
    title: "Dayanak Mevzuat",
    law: "Bu sayfada atıf yapılan başlıca kanun ve düzenlemeler",
    summary: "Bilgilendirme metinlerinin dayandığı mevzuatın listesi.",
    blocks: [
      { t: "table", head: ["Mevzuat", "Konu"], rows: [
        ["6698 sayılı Kişisel Verilerin Korunması Kanunu", "Kişisel verilerin işlenmesi, aktarımı, ilgili kişi hakları, veri güvenliği, başvuru ve şikâyet"],
        ["7499 sayılı Kanun (Ceza Muhakemesi Kanunu ile Bazı Kanunlarda Değişiklik)", "KVKK m.6 ve m.9'un yeniden düzenlenmesi; yurt dışı aktarım esasları"],
        ["Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ", "Aydınlatma metninin kapsamı ve şekli"],
        ["Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ", "İlgili kişi başvurularının yöntemi ve süresi"],
        ["Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkında Yönetmelik", "Saklama ve imha esasları"],
        ["Kişisel Verileri Koruma Kurulu'nun 2019/10 sayılı Kararı", "Veri ihlali bildirimi (72 saat)"],
        ["5651 sayılı İnternet Ortamında Yapılan Yayınların Düzenlenmesi ve Bu Yayınlar Yoluyla İşlenen Suçlarla Mücadele Edilmesi Hakkında Kanun", "Yer sağlayıcı yükümlülükleri, içerik kaldırma, trafik bilgisi kaydı"],
        ["6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun", "Aracı hizmet sağlayıcı sorumlulukları, ticari elektronik iletiler"],
        ["6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği", "Tüketici işlemleri ve ticari satışlar"],
        ["5846 sayılı Fikir ve Sanat Eserleri Kanunu", "Telif hakları, ders notu ve materyal paylaşımı"],
        ["5237 sayılı Türk Ceza Kanunu m.135–138", "Kişisel verilere karşı suçlar"],
        ["4904 sayılı Türkiye İş Kurumu Kanunu ve 4857 sayılı İş Kanunu", "İş ilanı ve istihdam aracılığı"],
        ["6098 sayılı Türk Borçlar Kanunu · 4721 sayılı Türk Medeni Kanunu", "Sözleşme ilişkisi, sorumluluk; yaş ve temsil"],
      ] },
      { t: "note", text: "Mevzuat zaman içinde değişebilir. Güncel metinler için mevzuat.gov.tr ve Kişisel Verileri Koruma Kurumu'nun (kvkk.gov.tr) resmî kaynaklarına bakınız." },
    ],
  },

  /* ───────────────────────── 11. GÜNCELLEME ───────────────────────── */
  {
    id: "guncelleme",
    title: "Değişiklikler, İletişim ve Yürürlük",
    law: "KVKK m.10 · Genel hükümler",
    summary: "Bu metinler değiştiğinde ne olur, bize nasıl ulaşırsınız?",
    blocks: [
      { t: "p", text: "Bu metinler mevzuattaki değişiklikler, Platformun yeni özellikleri veya kullandığımız hizmet sağlayıcılardaki değişiklikler nedeniyle güncellenebilir. Güncel sürüm her zaman bu sayfada yayımlanır; esaslı değişiklikler Platform üzerinden duyurulur. Güncellemeden sonra Platformu kullanmaya devam etmeniz, güncel metni okuduğunuz anlamına gelir; rızaya dayanan işlemler için gerektiğinde ayrıca onayınız alınır." },
      { t: "p", text: "Sorularınız, talepleriniz ve bildirimleriniz için: {{eposta}}" },
      { t: "p", text: "Bu metinlerde yer alan hükümlerin bir kısmı geçersiz sayılırsa, diğer hükümlerin geçerliliği etkilenmez. Metinlerin Türkçe hali esastır." },
    ],
  },
];
