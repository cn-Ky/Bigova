/**
 * Yemekhane bölümü: ortak tipler, yapılandırma ve saf yardımcılar (ağ/veritabanı yok; istemcide de kullanılır).
 *
 * İki kaynak vardır:
 *  - "kyk":  Biga'daki KYK yurtları. KYK menüsü İL bazında hazırlanır; aynı ildeki tüm yurtlar aynı menüyü alır.
 *            Bu yüzden menü "kyk-canakkale" kapsamında tutulur ve Biga'daki her yurt bu kapsama bağlanır.
 *  - "comu": ÇOMÜ Prof. Dr. Ramazan Aydın (Biga Ağaköy) Yerleşkesi Yemekhanesi. SKS'nin yayınladığı aylık PDF.
 */

export type MenuSource = "kyk" | "comu";
export type MenuVariant = "normal" | "vegan";
/** "daily": ÇOMÜ gibi tek listeli günlük menü. KYK'da kahvaltı ve akşam ayrı yayınlanır. */
export type MealKind = "breakfast" | "dinner" | "daily";

/** Yemeğin tabaktaki rolü (arayüzde simge/renk belirler). */
export type DishCategory = "corba" | "ana" | "pilav" | "yan" | "tatli" | "icecek" | "kahvalti";

export type MenuItem = {
  name: string;
  kcal?: number;
  cat: DishCategory;
  /** Ana yemek yerine seçilebilen alternatif ("veya"). */
  alt?: boolean;
  amount?: string;
  vegan?: boolean;
  vegetarian?: boolean;
};

export type Takeaway = { name: string; items: MenuItem[] };

/** Bir günün bir öğünü (veritabanı satırıyla bire bir). */
export type DayMenu = {
  /** YYYY-MM-DD (Türkiye takvim günü) */
  date: string;
  meal: MealKind;
  status: "open" | "closed";
  /** "29 EKİM CUMHURİYET BAYRAMI" gibi gün notu */
  note?: string;
  items: MenuItem[];
  takeaways?: Takeaway[];
  totalKcal?: number | null;
};

export type MenuRow = DayMenu & {
  source: MenuSource;
  scope: string;
  variant: MenuVariant;
  fetchedAt?: string;
};

/* ───────── Yapılandırma ───────── */

export const KYK_SCOPE = "kyk-canakkale";
export const COMU_SCOPE = "comu-biga-agakoy";

/** Biga'daki KYK yurtları. Yeni yurt eklemek için bu diziye bir kayıt eklemek yeterli. */
export const BIGA_DORMS: { id: string; name: string; gender: "kiz" | "erkek"; area: string; scope: string }[] = [
  { id: "biga-kiz", name: "Biga KYK Kız Öğrenci Yurdu", gender: "kiz", area: "Ağaköy / Kayapınar", scope: KYK_SCOPE },
  { id: "ahmet-bican-erkek", name: "Ahmet Bican KYK Erkek Öğrenci Yurdu", gender: "erkek", area: "Şirintepe", scope: KYK_SCOPE },
];

export const COMU_CAMPUS = {
  name: "Prof. Dr. Ramazan Aydın Yerleşkesi Yemekhanesi",
  short: "Biga Ağaköy",
  /** SKS duyurusuna göre: birinci öğretim öğle, ikinci öğretim akşam servisi (Ağaköy akşam hizmeti verilen yemekhanelerden). */
  lunch: { from: "11:30", to: "14:00" },
  dinner: { from: "16:00", to: "18:00" },
  pageUrl: "https://sks.comu.edu.tr/tr/sayfa/yemek-listesi-65.html",
};

export const SOURCE_LINKS = {
  comu: { label: "ÇOMÜ SKS Daire Başkanlığı", url: COMU_CAMPUS.pageUrl },
  kepce: { label: "Kepçe (açık KYK menü verisi)", url: "https://kepce.org" },
};

export const CATEGORY_META: Record<DishCategory, { label: string; plural: string }> = {
  kahvalti: { label: "Kahvaltılık", plural: "Kahvaltılıklar" },
  corba: { label: "Çorba", plural: "Çorbalar" },
  ana: { label: "Ana yemek", plural: "Ana yemekler" },
  pilav: { label: "Pilav & hamur", plural: "Pilav & hamur" },
  yan: { label: "Yanında", plural: "Yanında" },
  tatli: { label: "Tatlı & meyve", plural: "Tatlı & meyve" },
  icecek: { label: "İçecek", plural: "İçecekler" },
};

/** Tabak sırası: çorba → ana → pilav → yan → tatlı → içecek. */
export const CATEGORY_ORDER: DishCategory[] = ["kahvalti", "corba", "ana", "pilav", "yan", "tatli", "icecek"];

/* ───────── Metin yardımcıları ───────── */

/** Türkçe küçük harf + aksan temizliği: "Yoğurtlu Köz Patlıcan" → "yogurtlu koz patlican" */
export const norm = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Yemek adından kategori çıkarır (kaynak liste kategori vermediğinde). Sıra önemlidir. */
export function classifyDish(name: string): DishCategory {
  const n = ` ${norm(name)} `;
  if (/ corba/.test(n) || /corbasi /.test(n)) return "corba";
  if (/ ayran | meyve suyu | salgam | limonata /.test(n) || /^ ([0-9]+ ?ml )?(bardak )?(su|cay|bitki cayi|kahve|sut) $/.test(n)) return "icecek";
  if (/tatli|baklava|helva|revani|tulumba|puding|muhallebi| kek |keskul|sutlac|kadayif|kazandibi|asure|komposto|supangle|profiterol|balim|trilece|brownie|dondurma| muz | elma | portakal | mandalina | armut | uzum | meyve | kavun | karpuz /.test(n))
    return "tatli";
  if (/salata|yogurt |cacik|haydari|soguk|tursu|borani| koz |kozl|hasl[a-z]* sebze|zeytinyagli|mezze|ezme/.test(n) && !/manti/.test(n)) return "yan";
  if (/pilav|makarna|kuskus|eriste|bulgur|sehriye|manti|borek|boreg|patates|kizartma|pide|lahmacun|pogaca|gozleme|noodle|spagetti|nohut pilav|mantisi/.test(n))
    return "pilav";
  return "ana";
}

const ABBR: [RegExp, string][] = [
  [/(?<![A-Za-zÇĞİÖŞÜçğıöşü])Dom\.\s*Sos\.?\s*/g, "Domates Soslu "],
  [/(?<![A-Za-zÇĞİÖŞÜçğıöşü])Kre\.\s*/g, "Kremalı "],
  [/(?<![A-Za-zÇĞİÖŞÜçğıöşü])Garn\.\s*/g, "Garnitürlü "],
  [/(?<![A-Za-zÇĞİÖŞÜçğıöşü])Zerd\.\s*/g, "Zerdeçallı "],
  [/(?<![A-Za-zÇĞİÖŞÜçğıöşü])Yoğ\.\s*/g, "Yoğurtlu "],
  [/(?<![A-Za-zÇĞİÖŞÜçğıöşü])Közl\.\s*/g, "Közlenmiş "],
  [/(?<![A-Za-zÇĞİÖŞÜçğıöşü])Şeh\.\s*/g, "Şehriyeli "],
  [/(?<![A-Za-zÇĞİÖŞÜçğıöşü])Dom\.\s*/g, "Domates "],
];

/** PDF'teki kısaltma ve yapışık yazımları okunur hale getirir ("Tavuk.Hünkarbeğendi", "PeynirliErişte"). */
export function cleanDishName(raw: string): string {
  let s = raw.replace(/\s+/g, " ").trim();
  for (const [re, to] of ABBR) s = s.replace(re, to);
  s = s.replace(/([a-zçğıöşü])\.([A-ZÇĞİÖŞÜ])/g, "$1 $2");
  s = s.replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, "$1 $2");
  return s.replace(/\s+/g, " ").trim();
}

/* ───────── Tarih yardımcıları (Europe/Istanbul) ───────── */

const TR_TZ = "Europe/Istanbul";

/** İstanbul takvimine göre bugünün YYYY-MM-DD değeri. */
export function istanbulToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TR_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** İstanbul saatiyle dakika cinsinden günün saati (0–1439) ve haftanın günü (0=Pzt … 6=Paz). */
export function istanbulClock(now: Date = new Date()): { minutes: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TR_TZ, hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  return { minutes: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10), weekday: wd < 0 ? 0 : wd };
}

export const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export const monthKey = (date: string) => date.slice(0, 7);
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** 0=Pzt … 6=Paz (UTC tabanlı; saf tarih aritmetiği). */
export const weekdayOf = (date: string) => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
export const addDays = (date: string, n: number) => new Date(new Date(`${date}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
export const addMonths = (key: string, n: number) => {
  const [y, m] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
};
export const monthRange = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return { start: ymd(y, m, 1), end: ymd(y, m, daysInMonth(y, m)) };
};

/** Bir öğünün toplam kalorisi (alternatifler sayılmaz; yalnızca standart kalemler). */
export const sumKcal = (items: MenuItem[]) => items.filter((i) => !i.alt).reduce((a, i) => a + (i.kcal ?? 0), 0);
