import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBullhorn,
  faBus,
  faCity,
  faFutbol,
  faGraduationCap,
  faPalette,
  faTicket,
} from "@fortawesome/free-solid-svg-icons";

export const NEWS_CATEGORIES = [
  "Duyuru",
  "Kampüs",
  "Şehir",
  "Ulaşım",
  "Etkinlik",
  "Spor",
  "Kültür & Sanat",
] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

type Tone = "tide" | "sun" | "coral" | "sky" | "sea";
export const CATEGORY_META: Record<string, { icon: IconDefinition; tone: Tone }> = {
  Duyuru: { icon: faBullhorn, tone: "sea" },
  Kampüs: { icon: faGraduationCap, tone: "sky" },
  Şehir: { icon: faCity, tone: "tide" },
  Ulaşım: { icon: faBus, tone: "sun" },
  Etkinlik: { icon: faTicket, tone: "coral" },
  Spor: { icon: faFutbol, tone: "tide" },
  "Kültür & Sanat": { icon: faPalette, tone: "sun" },
};
export const categoryMeta = (c: string) => CATEGORY_META[c] ?? CATEGORY_META.Duyuru;

export type NewsArticle = {
  id: string;
  title: string;
  /** Liste ve giriş (spot) metni */
  summary: string;
  /** Paragraflar boş satırla (\n\n) ayrılır */
  body: string;
  category: string;
  author_name: string | null;
  source_name: string | null;
  source_url: string | null;
  featured: boolean;
  published_at: string;
};

export const isDemoNews = (a: Pick<NewsArticle, "id">) => a.id.startsWith("demo-");

export const paragraphs = (body: string) =>
  body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

export const readingMinutes = (a: Pick<NewsArticle, "summary" | "body">) =>
  Math.max(1, Math.round(`${a.summary} ${a.body}`.split(/\s+/).filter(Boolean).length / 200));

export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

export const todayLine = () =>
  new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

export function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} dk önce`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Dün";
  if (d < 30) return `${d} gün önce`;
  return longDate(iso);
}

/** Yalnızca http/https kaynak bağlantılarına izin verilir. */
export const safeUrl = (u: string | null) => (u && /^https?:\/\/\S+$/i.test(u) ? u : null);

const ago = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();
const SAMPLE_AUTHOR = "Bigova Editör Ekibi (örnek)";

// Örnek haberler: gerçek bir olayı bildirmez; biçimi göstermek için hazırlanmış genel içeriklerdir.
// Gerçek haberler Supabase `news_articles` tablosundan gelir (supabase/news_upgrade.sql).
export const demoNews: NewsArticle[] = [
  {
    id: "demo-news-hosgeldin",
    title: "Bigova'ya haber bölümü geldi: Biga Gündemi yayında",
    summary:
      "Kampüsten çarşıya, ulaşımdan etkinliklere Biga ile ilgili gelişmeler artık tek yerde. Kategorilere göre gez, beğendiklerini kaydet.",
    body: `Biga Gündemi, Bigova'nın yeni haber bölümü. Amaç basit: Biga'da yaşayan öğrencilerin işine yarayacak haberleri, duyuruları ve rehber içerikleri dağınık kanallar arasında aramadan tek yerde okuyabilmesi.

Haberler Duyuru, Kampüs, Şehir, Ulaşım, Etkinlik, Spor ve Kültür & Sanat kategorilerine ayrılıyor. Üstteki arama kutusuyla başlık ve içerikte arama yapabilir, kategori çipleriyle akışı daraltabilirsin.

Okumak istediğin ama o an vaktin olmayan haberlerin köşesindeki işarete dokunarak kaydedebilir, sonra "Kaydedilenler" filtresinden tekrar bulabilirsin. Kaydettiklerin yalnızca bu tarayıcıda tutulur.

Sayfadaki "Örnek" etiketli içerikler biçimi göstermek için hazırlanmıştır. Gerçek haberler editörler tarafından yayınlandığında etiketsiz görünür.`,
    category: "Duyuru",
    author_name: SAMPLE_AUTHOR,
    source_name: "Bigova",
    source_url: null,
    featured: true,
    published_at: ago(3),
  },
  {
    id: "demo-news-donem-basi",
    title: "Dönem başı kontrol listesi: İlk haftada yapılacak 6 şey",
    summary:
      "Ders programından kitap temine, ulaşım planından kulüp seçimine kadar yeni dönemi rahat başlatmanın pratik yolu.",
    body: `Yeni dönemin ilk haftası genellikle hem heyecanlı hem dağınık geçer. Küçük bir liste, sonraki haftaları belirgin biçimde rahatlatır.

Önce ders programını Bigova'daki Ders Programı sayfasından kontrol et ve kendi bölüm-sınıfına göre sabitle. Çakışan ya da yeri değişen dersleri ilk gün öğrenmek, sonradan koşturmaktan iyidir.

İkinci olarak kitap ihtiyacını belirle. Kitap Pazarı'nda ikinci el kitapları incelemeden yeni kitap almamak bütçeni korur. Hocanın ilk derste önerdiği kaynaklara göre alışveriş yap.

Ulaşım rutinini de ilk haftada netleştir. Ev ile kampüs arasındaki yolu iki farklı saatte dene; yoğun saatte ne kadar sürdüğünü bilmek sabah panikleri önler.

Son olarak bir kulübe ya da topluluğa uğra. Yeni insanlarla tanışmak ve CV'ni güçlendirmek için en kolay yoldur.`,
    category: "Kampüs",
    author_name: SAMPLE_AUTHOR,
    source_name: null,
    source_url: null,
    featured: false,
    published_at: ago(20),
  },
  {
    id: "demo-news-ulasim",
    title: "Biga'da ulaşımı kolaylaştıran 5 küçük alışkanlık",
    summary:
      "Kalkış saatini kontrol etmek, yağmurlu günlerde erken çıkmak ve alternatif hat bilmek günlük yolculuğu belirgin biçimde rahatlatır.",
    body: `Günlük ulaşımda en büyük sorun çoğu zaman yolun uzunluğu değil, belirsizliktir. Birkaç küçük alışkanlık bu belirsizliği azaltır.

Çıkmadan önce Bigova'daki Ulaşım sayfasından güncel hat ve saat bilgisine bak. Saatler dönem ve gün tipine göre değişebilir; eski bir ekran görüntüsüne güvenmek yerine güncel kaynağı kullan.

Yağmurlu ve soğuk günlerde yola 10-15 dakika erken çık. Durakta beklemek de yürümek de bu havalarda daha uzun sürer.

Her zaman bir alternatif planın olsun. Ana hattın aksadığı bir gün hangi hatla ya da yürüyerek nereye ulaşabileceğini önceden bilmek stresi azaltır.

Sınav günlerinde ise yolculuğu iki katı tampon süreyle planla.`,
    category: "Ulaşım",
    author_name: SAMPLE_AUTHOR,
    source_name: null,
    source_url: null,
    featured: false,
    published_at: ago(30),
  },
  {
    id: "demo-news-hava",
    title: "Hava durumuna göre günlük planını nasıl yaparsın?",
    summary:
      "Sıcaklık, rüzgâr ve yağış bilgisini sabah bir kez kontrol etmek; giyim, yol ve açık hava planlarını kolaylaştırır.",
    body: `Biga'da hava gün içinde hızlı değişebilir. Sabah çıkmadan önce hava durumuna bakmak, gününü planlamanın en ucuz yoludur.

Bigova ana sayfasındaki hava kartında anlık sıcaklığın yanında rüzgâr ve yağış bilgisini de görebilirsin. Kart ayrıca o güne uygun kısa öneriler sunar: şemsiye almak, kat giymek ya da güneş koruyucusu sürmek gibi.

Akşam dersin varsa dönüş saatindeki sıcaklığı da düşün. Gündüz rahat geçen bir gün akşam serinleyebilir.

Hafta sonu yürüyüş ya da açık hava planı yapıyorsan, rüzgâr ve yağış olasılığını bir gün önceden kontrol etmek planının bozulmasını önler.`,
    category: "Şehir",
    author_name: SAMPLE_AUTHOR,
    source_name: null,
    source_url: null,
    featured: false,
    published_at: ago(52),
  },
  {
    id: "demo-news-etkinlik",
    title: "Etkinlik duyurusu nasıl hazırlanır? Kulüpler için 5 ipucu",
    summary:
      "Net başlık, tarih-saat-yer bilgisi ve tek bir iletişim yolu: Duyurunun daha çok kişiye ulaşması için küçük bir kılavuz.",
    body: `İyi hazırlanmış bir duyuru, etkinliğe gelen kişi sayısını doğrudan etkiler. Kulüpler için işe yarayan birkaç ilke var.

Başlıkta etkinliğin ne olduğunu açıkça yaz. "Büyük buluşma" yerine "Fotoğraf yürüyüşü: Cumartesi 14.00" gibi bir başlık okuyucuya gerekli bilgiyi anında verir.

Tarih, saat ve yeri mutlaka ilk paragrafta ver. İnsanlar çoğunlukla yalnızca ilk iki cümleyi okur.

Katılım koşullarını belirt: ücretli mi, kayıt gerekli mi, kontenjan var mı? Belirsizlik katılımı düşürür.

Tek ve ulaşılabilir bir iletişim yolu paylaş. Birden fazla kanal vermek yanıtların dağılmasına yol açar.

Etkinlikten sonra kısa bir teşekkür ve fotoğraf paylaşımı bir sonraki etkinliğin duyurusunu da güçlendirir.`,
    category: "Etkinlik",
    author_name: SAMPLE_AUTHOR,
    source_name: null,
    source_url: null,
    featured: false,
    published_at: ago(80),
  },
  {
    id: "demo-news-spor",
    title: "Sınav haftasında bile hareket: 20 dakikalık haftalık plan önerisi",
    summary:
      "Yoğun dönemde spora ayıracak uzun vakit bulamıyorsan kısa ve düzenli bir program yeterli olabilir.",
    body: `Düzenli hareket, uyku kalitesini ve ders çalışırken odaklanmayı destekler. Uzun antrenmanlara vakit bulamadığın haftalarda kısa seanslar işe yarar.

Haftada üç gün 20 dakika yürüyüş ya da hafif tempolu koşu ile başlayabilirsin. Ders aralarında yapılan kısa yürüyüşler de sayılır.

Haftada iki gün evde ya da yurtta yapabileceğin temel egzersizleri ekle: squat, şınav, plank gibi. Ekipman gerektirmez.

Önemli olan mükemmel bir program değil, sürdürülebilir bir programdır. Bir hafta aksattıysan bırakma, kaldığın yerden devam et.

Bu içerik genel bilgi amaçlıdır; sağlık sorunun varsa spora başlamadan önce bir sağlık profesyoneline danış.`,
    category: "Spor",
    author_name: SAMPLE_AUTHOR,
    source_name: null,
    source_url: null,
    featured: false,
    published_at: ago(110),
  },
  {
    id: "demo-news-harita",
    title: "Biga Haritası ile kendi şehrini keşfet: 3 rota fikri",
    summary:
      "Haritadaki yer işaretlerini kullanarak kafe, park ve kültür duraklarını tek bir yürüyüşte birleştirebilirsin.",
    body: `Biga Haritası yalnızca adres bulmak için değil, kendi küçük rotalarını oluşturmak için de kullanışlı.

Ders çıkışı rotası: Kampüse yakın bir kafede başla, kırtasiye ve market gibi ihtiyaç duraklarını yol üstüne ekle. Böylece tek bir çıkışta işlerini toparlarsın.

Hafta sonu yürüyüşü: Haritada park ve açık alan işaretlerini seç, aralarındaki mesafeyi gör ve yürüyerek bağlayacağın bir güzergâh çiz.

Arkadaşlarla buluşma: Herkes için merkezi bir nokta seç, oradan yürüme mesafesindeki işletmeleri Bigova'daki İşletmeler sayfasından fiyat ve çalışma saatine göre karşılaştır.

Rotanı planlarken çalışma saatlerini önceden kontrol etmeyi unutma.`,
    category: "Kültür & Sanat",
    author_name: SAMPLE_AUTHOR,
    source_name: null,
    source_url: null,
    featured: false,
    published_at: ago(150),
  },
];
