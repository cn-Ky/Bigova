/**
 * Keşfet sayfasındaki "Etkinlik duyurusu" kartının verisi.
 * Şimdilik tek bir öne çıkan etkinlik var; gerçek etkinlik geldiğinde yalnızca bu dosya güncellenir.
 * `sample: true` olan içerik arayüzde "Örnek" etiketiyle gösterilir (siteki diğer örnek kayıtlar gibi).
 */
export type EventHighlight = { icon: "ghost" | "mask" | "camera" | "music" | "pumpkin" | "candy"; title: string; text: string };
export type EventStep = { at: string; time: string; title: string; text: string };
export type CampusEvent = {
  id: string;
  sample: boolean;
  kicker: string;
  title: string;
  tagline: string;
  about: string[];
  /** ISO, saat dilimiyle (Biga = UTC+03:00) */
  start: string;
  end: string;
  dateLabel: string;
  timeLabel: string;
  place: string;
  placeHint: string;
  price: string;
  audience: string;
  dress: string;
  organizer: string;
  highlights: EventHighlight[];
  program: EventStep[];
  bring: string[];
  notes: string[];
};

export const FEATURED_EVENT: CampusEvent = {
  id: "cadilar-bayrami-gecesi-2026",
  sample: true,
  kicker: "Etkinlik duyurusu",
  title: "Cadılar Bayramı Gecesi",
  tagline: "Halloween'e Biga usulü: kostümünü tak, kampüs meydanında geceye karış.",
  about: [
    "Yeni dönemin ilk büyük buluşması! Öğrenci kulüplerinin hazırladığı Cadılar Bayramı gecesinde kostüm yarışması, balkabağı oyma, korku koridoru ve canlı DJ seni bekliyor.",
    "Tanıdığın tanımadığın herkes davetli: arkadaşlarınla grup kostümü yapabilir, yeni insanlarla tanışabilir ve gecenin en iyi kostümü için yarışabilirsin.",
  ],
  start: "2026-10-31T19:00:00+03:00",
  end: "2026-10-31T23:00:00+03:00",
  dateLabel: "31 Ekim Cumartesi",
  timeLabel: "19.00 – 23.00",
  place: "Kampüs meydanı",
  placeHint: "Biga · ana giriş kapısının karşısı",
  price: "Ücretsiz",
  audience: "Tüm öğrenciler (öğrenci kartı ile giriş)",
  dress: "Kostüm serbest · korku, komik, yaratıcı her şey olur",
  organizer: "Öğrenci kulüpleri (örnek)",
  highlights: [
    { icon: "mask", title: "Kostüm yarışması", text: "Bireysel ve grup kategorileri. Jüri ve seyirci oylaması." },
    { icon: "pumpkin", title: "Balkabağı oyma", text: "Malzeme bizden. En yaratıcı balkabağı ödül kazanır." },
    { icon: "ghost", title: "Korku koridoru", text: "Kulüplerin hazırladığı karanlık koridor. Cesaretini getir." },
    { icon: "camera", title: "Fotoğraf köşesi", text: "Dekorlu çekim alanı. Etiket: #BigovaCadılar" },
    { icon: "music", title: "Canlı DJ", text: "Gecenin son saati dans pisti açık." },
    { icon: "candy", title: "Şeker ya da şaka", text: "Standları gez, şekerlerini topla, şakalara hazır ol." },
  ],
  program: [
    { at: "2026-10-31T19:00:00+03:00", time: "19.00", title: "Kapılar açılıyor", text: "Giriş ve kostüm yarışması kaydı başlar." },
    { at: "2026-10-31T19:45:00+03:00", time: "19.45", title: "Balkabağı oyma atölyesi", text: "Masalar kurulu, malzemeler hazır." },
    { at: "2026-10-31T20:30:00+03:00", time: "20.30", title: "Hayalet hikâyeleri", text: "Kulüp üyelerinden Biga'ya özgü şehir efsaneleri." },
    { at: "2026-10-31T21:15:00+03:00", time: "21.15", title: "Kostüm yarışması", text: "Podyum, jüri değerlendirmesi ve seyirci oyu." },
    { at: "2026-10-31T22:00:00+03:00", time: "22.00", title: "Ödüller ve DJ seti", text: "Kazananlar açıklanır, ardından dans başlar." },
  ],
  bring: ["Öğrenci kartın", "Kostümün (maske ve boya serbest)", "Yanına bir arkadaş", "Telefonun: fotoğraf köşesi için"],
  notes: [
    "Gerçek görünümlü silah veya sivri aksesuar ile giriş yapılamaz.",
    "Yüzünü tamamen kapatan maskeler girişte kısa süreliğine kaldırılır.",
    "Hava yağışlıysa etkinlik kapalı salonda yapılır; güncel bilgi bu kartta olacaktır.",
  ],
};
