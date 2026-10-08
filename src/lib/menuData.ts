import {
  faCity,
  faFlag,
  faGraduationCap,
  faUsers,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { sideTabs, tabs, settingsTab, type SideTab } from "@/components/tabs";

export type CategoryId = "city" | "school" | "social" | "about";
export type Category = {
  id: CategoryId;
  label: string;
  blurb: string;
  icon: IconDefinition;
  /** Rozet/dalga rengi: tailwind tema renk değişkeni adı */
  tone: "tide" | "sun" | "coral" | "sky";
  /** Kategorideki sayfalar (sırayla) */
  hrefs: string[];
};

/** Keşfet kutuları ile yan menü/çekmece aynı kategorileri kullanır. */
export const CATEGORIES: Category[] = [
  {
    id: "city",
    label: "Şehir & Günlük Hayat",
    blurb: "Haberler, işletmeler, ulaşım, harita, iş ilanları, usta bul",
    icon: faCity,
    tone: "tide",
    hrefs: ["/haberler", "/isletmeler", "/ulasim", "/harita", "/is-ilanlari", "/ustalar"],
  },
  {
    id: "school",
    label: "Okul & Ders",
    blurb: "Notlar, program, kitaplar, dergi, ÜBYS",
    icon: faGraduationCap,
    tone: "sun",
    hrefs: ["/notlar", "/ders-programi", "/kitap-pazari", "/dergi", "https://ubys.comu.edu.tr/"],
  },
  {
    id: "social",
    label: "Sosyal & Eğlence",
    blurb: "Arkadaşlar, Bigocuk, haftalık anket",
    icon: faUsers,
    tone: "coral",
    hrefs: ["/arkadaslar", "/bigocuk", "/anketler"],
  },
  {
    id: "about",
    label: "Bigova & Kültür",
    blurb: "Hakkımızda ve Atatürk Köşesi",
    icon: faFlag,
    tone: "sky",
    hrefs: ["/hakkimizda", "/ataturk"],
  },
];

export const TONE_BG: Record<Category["tone"], string> = {
  tide: "bg-tide text-deep",
  sun: "bg-sun text-deep",
  coral: "bg-coral text-deep",
  sky: "bg-sky text-deep",
};

const allTabs: SideTab[] = [...sideTabs, settingsTab as SideTab];
export const tabByHref = (href: string) => allTabs.find((t) => t.href === href);
export const home = tabs[0] as SideTab;

export const categoryOf = (pathname: string): CategoryId | null => {
  for (const c of CATEGORIES)
    for (const h of c.hrefs) if (!h.startsWith("http") && (pathname === h || pathname.startsWith(`${h}/`))) return c.id;
  return null;
};

/** Kategorilere ayrılmış menü öğeleri (yan menü ve çekmece için). Keşfet ve Ayarlar kategori dışıdır. */
export const groupedTabs = CATEGORIES.map((cat) => ({
  cat,
  items: cat.hrefs.map(tabByHref).filter(Boolean) as SideTab[],
}));

/** Üst şerit için düz liste: kategori sırasına göre, gruplar arasında ayraç için `group` bilgisiyle. */
export const flatLinks: { item: SideTab; group: string }[] = [
  { item: home, group: "home" },
  ...groupedTabs.flatMap(({ cat, items }) => items.map((item) => ({ item, group: cat.id }))),
  { item: settingsTab as SideTab, group: "settings" },
];
