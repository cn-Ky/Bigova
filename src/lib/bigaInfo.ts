// Hava panelindeki "Günün Biga'sı" yazıları ve öğrenci rehberi içeriği.
// BURAYI İSTEDİĞİN GİBİ DÜZENLEYEBİLİRSİN: yeni not/ipucu eklemek için diziye bir satır eklemen yeterli.
// Not: Saat, fiyat ve sefer bilgileri zamanla değişir; bu yüzden metinlerde kasıtlı olarak sayı/fiyat verilmedi.

export type BigaNote = { tag: "Tarih" | "Doğa" | "Lezzet" | "Gezi" | "Kampüs" | "Hava"; title: string; text: string };

/** Her gün sırayla bir tanesi gösterilir (tarihe göre döner). Panelde "Sıradaki not" ile de gezilebilir. */
export const BIGA_NOTES: BigaNote[] = [
  { tag: "Tarih", title: "Granikos'ta ilk büyük zafer", text: "Büyük İskender, MÖ 334'te Persler'e karşı Anadolu'daki ilk büyük zaferini Granikos (bugünkü Kocabaş) Çayı kıyısında kazandı. Savaş alanı Biga Ovası çevresinde aranır." },
  { tag: "Tarih", title: "Biga Yarımadası = antik Troas", text: "Biga'nın da içinde bulunduğu yarımada, antik çağda Troas adıyla bilinirdi. Troya efsanesinin geçtiği topraklar tam burası." },
  { tag: "Tarih", title: "Parion Antik Kenti", text: "Biga sınırları içindeki Kemer köyü yakınlarında, Marmara kıyısında kurulmuş Parion adlı antik bir liman kenti var. Kazı çalışmalarıyla her yıl yeni buluntular gün yüzüne çıkıyor." },
  { tag: "Kampüs", title: "ÇOMÜ'nün adı nereden geliyor?", text: "Çanakkale Onsekiz Mart Üniversitesi, adını 18 Mart 1915 Çanakkale Deniz Zaferi'nden alır. Biga İİBF ve Biga MYO da bu üniversitenin Biga'daki yüzleri." },
  { tag: "Tarih", title: "18 Mart", text: "Her yıl 18 Mart'ta Çanakkale Deniz Zaferi ve şehitler anılır. Çanakkale'de bu günlerde anma törenleri ve etkinlikler düzenlenir." },
  { tag: "Gezi", title: "Karabiga'da deniz havası", text: "Karabiga, Biga'ya bağlı Marmara kıyısında bir sahil beldesi. Bahar ve yaz aylarında kampüsten kısa bir kaçamak için güzel bir seçenek." },
  { tag: "Gezi", title: "Troya UNESCO listesinde", text: "Troya Antik Kenti, 1998'de UNESCO Dünya Mirası Listesi'ne girdi. Yanındaki Troya Müzesi ile birlikte gezmek en verimlisi." },
  { tag: "Gezi", title: "Truva Atı kordonda", text: "Çanakkale kordonundaki Truva Atı maketi şehrin simgelerinden. Gün batımında kordon boyunca yürümek öğrenciler için ücretsiz ve keyifli bir plan." },
  { tag: "Gezi", title: "Boğazın iki yakası", text: "Çanakkale'deki Çimenlik Kalesi ile karşı kıyıdaki Kilitbahir Kalesi, Boğaz'ın en dar yerinde birbirine bakar. Çimenlik Kalesi'nde Deniz Müzesi de bulunur." },
  { tag: "Gezi", title: "1915 Çanakkale Köprüsü", text: "2022'de açılan 1915 Çanakkale Köprüsü, orta açıklığıyla dünyanın en uzun asma köprüsü. Avrupa yakasına geçişi çok kolaylaştırdı." },
  { tag: "Tarih", title: "Gelibolu Yarımadası", text: "Gelibolu Yarımadası Tarihi Milli Parkı; Şehitler Abidesi, Conkbayırı ve Kabatepe gibi önemli noktalarıyla Çanakkale Savaşları'nı yerinde anlamanın en iyi yolu." },
  { tag: "Gezi", title: "Assos'ta gün batımı", text: "Behramkale (Assos), Athena Tapınağı kalıntıları ve taş sokaklarıyla Çanakkale'nin en sevilen duraklarından. Aristoteles'in de bir süre burada yaşadığı anlatılır." },
  { tag: "Gezi", title: "Bozcaada", text: "Çanakkale'nin Ege'deki adası Bozcaada; bağları, kalesi ve dar sokaklarıyla bilinir. Geyikli'den feribotla ulaşılır, sefer saatlerini önceden kontrol et." },
  { tag: "Doğa", title: "Gökçeada", text: "Türkiye'nin en büyük adası Gökçeada, sakin köyleri ve kalabalıktan uzak koylarıyla hafta sonu kaçamağı için ideal. Feribot saatleri mevsime göre değişir." },
  { tag: "Doğa", title: "Kazdağları", text: "Antik çağda İda Dağı olarak bilinen Kazdağları, temiz havası ve doğa yürüyüşleriyle ünlü. Gitmeden önce hava durumuna ve yol koşullarına mutlaka bak." },
  { tag: "Doğa", title: "İki denizi birleştiren boğaz", text: "Çanakkale Boğazı yaklaşık 60 kilometre uzunluğunda ve Marmara Denizi ile Ege'yi birbirine bağlar. Kordondan boğazdan geçen dev gemileri izlemek şehrin klasik keyfi." },
  { tag: "Lezzet", title: "Peynir helvası", text: "Çanakkale denilince akla gelen tatlılardan biri peynir helvası. Hediyelik almak istiyorsan fiyatları birkaç yerde karşılaştır." },
  { tag: "Lezzet", title: "Ezine peyniri", text: "Ezine peyniri, Çanakkale'nin tescilli lezzetlerinden. Kahvaltıda ya da hediyelikte listenin başında yer alır." },
  { tag: "Lezzet", title: "Gelibolu'nun sardalyası", text: "Gelibolu yöresi sardalyasıyla tanınır. Çanakkale'ye yolun düşerse deniz ürünlerini yerinde denemek iyi bir fikir." },
  { tag: "Tarih", title: "Çanakkale seramiği", text: "Çanakkale'nin köklü bir seramik geleneği var. Şehirde seramik atölyeleri ve el yapımı ürünler bulmak mümkün; hediye için güzel bir seçenek." },
  { tag: "Hava", title: "Poyraz ve lodos", text: "Çanakkale'de poyraz (kuzeydoğu) ve lodos (güneybatı) rüzgârları günlük hayatı etkiler. Sert rüzgârda feribot seferleri aksayabilir; yola çıkmadan kontrol et." },
  { tag: "Hava", title: "Kısa sürede değişen hava", text: "Marmara ile Ege'nin arasında kalan Biga'da hava kısa sürede değişebilir. Çantanda her zaman ince bir ceket ya da şemsiye bulundurmak akıllıca." },
  { tag: "Doğa", title: "Verimli Biga Ovası", text: "Biga Ovası, verimli tarım toprakları ve Kocabaş Çayı ile bilinir. İlkbaharda çevredeki yeşillik gerçekten görülmeye değer." },
  { tag: "Kampüs", title: "25 + 5 çalışma", text: "25 dakika odaklanıp 5 dakika mola vermek (Pomodoro), sınav haftalarında dikkatini toplamanın en kolay yollarından biri." },
  { tag: "Kampüs", title: "Notlar paylaşıldıkça çoğalır", text: "Ders notlarını Bigova'da PDF olarak paylaşmak hem arkadaşlarına yardım eder hem de sen başkalarının notlarına kolayca ulaşırsın." },
  { tag: "Kampüs", title: "Uyku da çalışmanın parçası", text: "Sınavdan önceki gece sabahlamak yerine 7-8 saat uyumak, bilgiyi hatırlamanı belirgin biçimde kolaylaştırır." },
  { tag: "Kampüs", title: "Haftalık bütçe", text: "Aylık harçlığını 4'e bölüp haftalık bir limit belirlemek, ayın sonunu getirmeni kolaylaştırır. Alışverişten önce İşletmeler sayfasında fiyatlara göz at." },
  { tag: "Kampüs", title: "Kitabı sıfır alma", text: "Ders kitabını almadan önce ikinci el pazarına bak. Çoğu zaman yarı fiyatına, hatta daha ucuza bulabilirsin." },
  { tag: "Gezi", title: "Hafta sonu planı", text: "Biga'dan Çanakkale merkeze günübirlik gidip kordon, kale ve çarşıyı gezmek öğrenciler için hem ekonomik hem keyifli bir hafta sonu planı." },
];

export type TipIcon = "calendar" | "notes" | "books" | "timer" | "bell" | "food" | "budget" | "cheese" | "snack" | "handshake" | "bus" | "map" | "ferry" | "wind" | "night" | "horse" | "castle" | "museum" | "medal" | "sunset" | "friends" | "poll" | "magazine" | "game" | "club" | "job" | "cv" | "water" | "sleep" | "emergency";
export type Tip = { icon: TipIcon; title: string; text: string; href?: string; cta?: string };
export type TipSection = { id: string; title: string; icon: "kampus" | "yemek" | "ulasim" | "gezi" | "sosyal" | "yasam"; tips: Tip[] };

export const GUIDE: TipSection[] = [
  {
    id: "kampus", title: "Kampüs & Ders", icon: "kampus",
    tips: [
      { icon: "calendar", title: "Ders programın tek yerde", text: "Biga İİBF ve MYO programlarına Bigova'dan hızlıca bak.", href: "/ders-programi", cta: "Programa git" },
      { icon: "notes", title: "Notları paylaş, notlara ulaş", text: "Ders notlarını PDF olarak yükle ya da arkadaşlarının notlarına göz at.", href: "/notlar", cta: "Notlar" },
      { icon: "books", title: "Kitabı ikinci elden bul", text: "Sıfır kitap almadan önce kitap pazarındaki ilanlara bak.", href: "/kitap-pazari", cta: "Kitap pazarı" },
      { icon: "timer", title: "25 dakika çalış, 5 dakika dinlen", text: "Sınav haftasında Pomodoro tekniği dikkatini toplamana yardım eder." },
      { icon: "bell", title: "Duyuruları kaçırma", text: "Dönem başında kulüp ve kampüs etkinlikleri için ana sayfadaki duyuruları takip et." },
    ],
  },
  {
    id: "yemek", title: "Yeme-İçme & Bütçe", icon: "yemek",
    tips: [
      { icon: "food", title: "Çıkmadan önce bak", text: "İşletmeler sayfasında fiyat, çalışma saati ve tuvalet bilgisine göz atıp boşuna yola çıkma.", href: "/isletmeler", cta: "İşletmeler" },
      { icon: "budget", title: "Haftalık limit koy", text: "Aylık bütçeni 4'e böl, hafta içinde limitini aşmamaya çalış." },
      { icon: "cheese", title: "Yöresel lezzetler", text: "Çanakkale peynir helvası ve Ezine peyniri hem lezzetli hem hediyelik için iyi seçenekler." },
      { icon: "snack", title: "Ders arası için hazırlık", text: "Uzun ders günlerinde yanına küçük bir atıştırmalık ve su şişesi almak hem tasarruf hem enerji demek." },
      { icon: "handshake", title: "Hesabı bölüşün", text: "Arkadaşlarla kafeye giderken ortak masa ve paylaşımlı sipariş bütçeyi rahatlatır." },
    ],
  },
  {
    id: "ulasim", title: "Ulaşım & Rota", icon: "ulasim",
    tips: [
      { icon: "bus", title: "Servis ve otobüs saatleri", text: "Kalkış saatlerini Ulaşım sayfasından kontrol et, son seferi kaçırma.", href: "/ulasim", cta: "Ulaşım" },
      { icon: "map", title: "Biga'yı haritada keşfet", text: "İşletmeleri ve önemli noktaları harita üzerinde gör.", href: "/harita", cta: "Harita" },
      { icon: "ferry", title: "Feribot saatleri değişir", text: "Çanakkale–Eceabat, Geyikli–Bozcaada gibi hatların saatleri mevsime ve hava koşullarına göre değişebilir. Gitmeden kontrol et." },
      { icon: "wind", title: "Rüzgârlı günlerde", text: "Sert poyraz ya da lodosta deniz seferleri aksayabilir, planına yedek bir seçenek ekle." },
      { icon: "night", title: "Geç saatlerde", text: "Gece dönüşlerinde ışıklı ve işlek yolları seç, konumunu bir arkadaşınla paylaş." },
    ],
  },
  {
    id: "gezi", title: "Çanakkale Gezi", icon: "gezi",
    tips: [
      { icon: "horse", title: "Kordon & Truva Atı", text: "Gün batımında kordonda yürümek, boğazdan geçen gemileri izlemek ücretsiz ve keyifli." },
      { icon: "castle", title: "Çimenlik Kalesi & Deniz Müzesi", text: "Boğaz manzarası ve Çanakkale Savaşları'na dair ilginç parçalar bir arada." },
      { icon: "museum", title: "Troya Antik Kenti & Müzesi", text: "UNESCO Dünya Mirası alanı; müze ile birlikte gezmek en verimlisi." },
      { icon: "medal", title: "Gelibolu Yarımadası", text: "Şehitler Abidesi, Conkbayırı ve Kabatepe gibi noktaları gün boyu planlayarak gez." },
      { icon: "sunset", title: "Assos & Bozcaada", text: "Assos'ta gün batımı, Bozcaada'da bağlar ve dar sokaklar. Hafta sonu için harika iki durak." },
    ],
  },
  {
    id: "sosyal", title: "Sosyal & Kulüp", icon: "sosyal",
    tips: [
      { icon: "friends", title: "Arkadaşlarını bul", text: "Bigova'da arkadaş ekle, mesajlaş ve ortak seri başlat.", href: "/arkadaslar", cta: "Arkadaşlar" },
      { icon: "poll", title: "Haftalık ankete katıl", text: "Biga öğrencilerinin neler düşündüğünü gör, sen de oy ver.", href: "/anketler", cta: "Anketler" },
      { icon: "magazine", title: "Dergiyi oku", text: "Öğrenci dergisinde kampüs ve şehir yaşamıyla ilgili yazılara göz at.", href: "/dergi", cta: "Dergi" },
      { icon: "game", title: "Yürü, Bigcoin kazan", text: "Bigocuk'ta adım atarak Bigcoin topla, avatarını giydir.", href: "/bigocuk", cta: "Bigocuk" },
      { icon: "club", title: "Bir kulübe katıl", text: "Yeni insanlarla tanışmanın ve CV'ni güçlendirmenin en kolay yollarından biri bir kulüp ya da topluluğa katılmak." },
    ],
  },
  {
    id: "yasam", title: "Kariyer & Yaşam", icon: "yasam",
    tips: [
      { icon: "job", title: "Yarı zamanlı iş & staj", text: "Biga'daki güncel iş ve staj ilanlarına göz at.", href: "/is-ilanlari", cta: "İş ilanları" },
      { icon: "cv", title: "CV'ni güncel tut", text: "Kulüp, proje ve gönüllü deneyimlerini ekle; her başvuruda küçük bir fark yaratır." },
      { icon: "water", title: "Su iç, hareket et", text: "Uzun çalışma saatlerinde her saat başı kalkıp bir bardak su iç, biraz yürü." },
      { icon: "sleep", title: "Uyku düzeni", text: "Sınav haftasında bile 7-8 saat uyku hafızanı korur, sabahlamaktan daha verimlidir." },
      { icon: "emergency", title: "Acil durumda 112", text: "Acil bir sağlık ya da güvenlik durumunda 112'yi ara. Konumunu net söylemeye çalış." },
    ],
  },
];
