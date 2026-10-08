import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBolt,
  faBroom,
  faCouch,
  faFaucetDrip,
  faHammer,
  faKey,
  faLaptop,
  faPaintRoller,
  faScrewdriverWrench,
  faSnowflake,
  faTruck,
  faWrench,
} from "@fortawesome/free-solid-svg-icons";

export const USTA_CATEGORIES = [
  "Tesisatçı",
  "Elektrikçi",
  "Mobilyacı & Marangoz",
  "Boyacı & Badanacı",
  "Çilingir",
  "Klima & Kombi Servisi",
  "Beyaz Eşya Tamiri",
  "Bilgisayar & Telefon Tamiri",
  "Nakliyat",
  "Temizlik",
  "Diğer",
] as const;
export type UstaCategory = (typeof USTA_CATEGORIES)[number];

export const CATEGORY_ICON: Record<string, IconDefinition> = {
  Tesisatçı: faFaucetDrip,
  Elektrikçi: faBolt,
  "Mobilyacı & Marangoz": faCouch,
  "Boyacı & Badanacı": faPaintRoller,
  Çilingir: faKey,
  "Klima & Kombi Servisi": faSnowflake,
  "Beyaz Eşya Tamiri": faWrench,
  "Bilgisayar & Telefon Tamiri": faLaptop,
  Nakliyat: faTruck,
  Temizlik: faBroom,
  Diğer: faHammer,
};
export const categoryIcon = (c: string) => CATEGORY_ICON[c] ?? faScrewdriverWrench;

export const PRICE_UNITS = ["işlem başı", "saat", "gün", "m²", "adet", "sefer"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export const SORTS = [
  { id: "new", label: "En yeni" },
  { id: "price", label: "Fiyat: düşükten yükseğe" },
  { id: "exp", label: "Deneyim: çoktan aza" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];

export type Usta = {
  id: string;
  first_name: string;
  last_name: string;
  category: string;
  phone: string;
  whatsapp: string | null;
  district: string | null;
  /** Başlangıç fiyatı (TL). Boşsa "Görüşmede belirlenir". */
  price_from: number | null;
  price_unit: string | null;
  price_note: string | null;
  experience_years: number | null;
  /** Acil çağrıya / gece-hafta sonu hizmetine uygun */
  emergency: boolean;
  description: string | null;
  created_at: string;
};

export const fullName = (u: Pick<Usta, "first_name" | "last_name">) =>
  `${u.first_name} ${u.last_name}`.trim();

export const isDemoUsta = (u: Pick<Usta, "id">) => u.id.startsWith("demo-");

export const formatPrice = (u: Pick<Usta, "price_from" | "price_unit">) =>
  u.price_from == null
    ? "Görüşmede belirlenir"
    : `${u.price_from.toLocaleString("tr-TR")} ₺'den başlayan${u.price_unit ? ` · ${u.price_unit}` : ""}`;

export const digits = (s: string) => s.replace(/\D/g, "");
/** 0505... / 505... / +90505... -> 90505... */
export const toWa = (s: string) => {
  const d = digits(s);
  if (d.startsWith("90") && d.length >= 12) return d;
  if (d.startsWith("0")) return `90${d.slice(1)}`;
  return d.length === 10 ? `90${d}` : d;
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

// Temsili örnek kayıtlar: gerçek kişi, fiyat veya telefon numarası değildir.
export const demoUstalar: Usta[] = [
  {
    id: "demo-usta-tesisat",
    first_name: "Mehmet",
    last_name: "Örnek",
    category: "Tesisatçı",
    phone: "0286 000 01 01",
    whatsapp: "905000000101",
    district: "Biga merkez · temsili",
    price_from: 300,
    price_unit: "işlem başı",
    price_note: "Keşif ücretsiz, malzeme ayrı hesaplanır · temsili",
    experience_years: 15,
    emergency: true,
    description: "Su kaçağı, musluk-batarya değişimi, gider açma ve petek bakımı. Gece acil çağrılara da bakılır.",
    created_at: daysAgo(1),
  },
  {
    id: "demo-usta-elektrik",
    first_name: "Hasan",
    last_name: "Örnek",
    category: "Elektrikçi",
    phone: "0286 000 01 02",
    whatsapp: null,
    district: "Biga · tüm mahalleler (temsili)",
    price_from: 250,
    price_unit: "işlem başı",
    price_note: "Priz/anahtar, avize montajı, sigorta arızası · temsili",
    experience_years: 10,
    emergency: true,
    description: "Ev ve işyeri elektrik arızaları, sayaç sonrası tesisat yenileme, aydınlatma montajı.",
    created_at: daysAgo(2),
  },
  {
    id: "demo-usta-mobilya",
    first_name: "Ali",
    last_name: "Örnek",
    category: "Mobilyacı & Marangoz",
    phone: "0286 000 01 03",
    whatsapp: "905000000103",
    district: "Biga sanayi · temsili",
    price_from: 500,
    price_unit: "gün",
    price_note: "Ölçüye özel dolap ve raf için ücretsiz keşif · temsili",
    experience_years: 20,
    emergency: false,
    description: "Mobilya montajı ve tamiri, ölçüye göre dolap, kitaplık ve çalışma masası yapımı. Öğrenci evlerine taşınma montajı yapılır.",
    created_at: daysAgo(3),
  },
  {
    id: "demo-usta-klima",
    first_name: "Murat",
    last_name: "Örnek",
    category: "Klima & Kombi Servisi",
    phone: "0286 000 01 04",
    whatsapp: "905000000104",
    district: "Biga merkez · temsili",
    price_from: 400,
    price_unit: "işlem başı",
    price_note: "Yıllık kombi bakımı · temsili",
    experience_years: 8,
    emergency: false,
    description: "Kombi ve klima bakımı, gaz dolumu, montaj ve arıza tespiti.",
    created_at: daysAgo(5),
  },
  {
    id: "demo-usta-cilingir",
    first_name: "Serkan",
    last_name: "Örnek",
    category: "Çilingir",
    phone: "0286 000 01 05",
    whatsapp: null,
    district: "Biga çarşı · temsili",
    price_from: 350,
    price_unit: "işlem başı",
    price_note: "Kapı açma, kilit değişimi · temsili",
    experience_years: 12,
    emergency: true,
    description: "Kapıda kaldıysan 7/24 ulaşılabilir. Kilit değişimi ve çelik kapı ayarı da yapılır.",
    created_at: daysAgo(6),
  },
  {
    id: "demo-usta-boya",
    first_name: "İbrahim",
    last_name: "Örnek",
    category: "Boyacı & Badanacı",
    phone: "0286 000 01 06",
    whatsapp: "905000000106",
    district: "Biga ve çevresi · temsili",
    price_from: 120,
    price_unit: "m²",
    price_note: "Malzeme dahil/hariç seçenekli · temsili",
    experience_years: 18,
    emergency: false,
    description: "İç cephe boya-badana, alçı sıva ve çatlak onarımı. Kiralık evden çıkış boyası için uygundur.",
    created_at: daysAgo(8),
  },
  {
    id: "demo-usta-beyazesya",
    first_name: "Emre",
    last_name: "Örnek",
    category: "Beyaz Eşya Tamiri",
    phone: "0286 000 01 07",
    whatsapp: "905000000107",
    district: "Biga merkez · temsili",
    price_from: 300,
    price_unit: "işlem başı",
    price_note: "Arıza tespit ücreti tamire sayılır · temsili",
    experience_years: 9,
    emergency: false,
    description: "Çamaşır ve bulaşık makinesi, buzdolabı, fırın arızaları. Öğrenci indirimi için sor.",
    created_at: daysAgo(10),
  },
  {
    id: "demo-usta-bilgisayar",
    first_name: "Burak",
    last_name: "Örnek",
    category: "Bilgisayar & Telefon Tamiri",
    phone: "0286 000 01 08",
    whatsapp: "905000000108",
    district: "Biga üniversite yakını · temsili",
    price_from: null,
    price_unit: null,
    price_note: "Arıza tespitinden sonra net fiyat verilir · temsili",
    experience_years: 6,
    emergency: false,
    description: "Laptop format ve temizlik, ekran-batarya değişimi, telefon tamiri. Öğrencilere indirimli.",
    created_at: daysAgo(12),
  },
  {
    id: "demo-usta-nakliyat",
    first_name: "Kemal",
    last_name: "Örnek",
    category: "Nakliyat",
    phone: "0286 000 01 09",
    whatsapp: "905000000109",
    district: "Biga ve çevre ilçeler · temsili",
    price_from: 1500,
    price_unit: "sefer",
    price_note: "1+1 öğrenci evi taşımacılığı · temsili",
    experience_years: 14,
    emergency: false,
    description: "Eşya taşıma, asansörlü taşıma ve montaj desteği. Dönem başı-sonu için önceden randevu al.",
    created_at: daysAgo(15),
  },
];

export function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "Bugün";
  if (d === 1) return "Dün";
  if (d < 30) return `${d} gün önce`;
  return `${Math.floor(d / 30)} ay önce`;
}
