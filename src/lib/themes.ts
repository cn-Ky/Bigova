/** Ücretsiz temalar: yalnızca renk paleti değiştirir. */
export const THEMES = [
  { id: "sabah", name: "Ege sabahı", dark: false, foam: "#F3F8FA", card: "#FFFFFF", sea: "#0E3A5B", sun: "#FFB84D", tide: "#2CC4B5", ink: "#0E3A5B" },
  { id: "gece", name: "Gece mavisi", dark: true, foam: "#0F1B26", card: "#182A39", sea: "#2F7FB8", sun: "#FFC766", tide: "#3DD6C4", ink: "#E6F1F7" },
  { id: "komur", name: "Kömür (siyah)", dark: true, foam: "#000000", card: "#141414", sea: "#C2410C", sun: "#FACC15", tide: "#22D3EE", ink: "#F2F2F2" },
  { id: "gunbatimi", name: "Gün batımı", dark: false, foam: "#FFF4EA", card: "#FFFFFF", sea: "#D9486B", sun: "#FFB347", tide: "#2FB59B", ink: "#4A1E2E" },
  { id: "orman", name: "Orman", dark: false, foam: "#EEF5EC", card: "#FFFFFF", sea: "#2E7D4F", sun: "#E9C46A", tide: "#2CC4B5", ink: "#173A2A" },
  { id: "lavanta", name: "Lavanta", dark: false, foam: "#F4F0FB", card: "#FFFFFF", sea: "#6B4FD1", sun: "#FFC857", tide: "#35C5C0", ink: "#2B1B4D" },
] as const;

/**
 * Bigcoin ile açılan özel temalar. Renkle kalmazlar: yazı tipi, köşe/çerçeve dili, başlık,
 * kartlar, menüler ve SOHBET düzeni de değişir (src/app/themes.css).
 *
 * `itemId` ve `price`, supabase/themes_upgrade.sql içindeki bigocuk_items kayıtlarıyla aynı olmalı.
 * Gerçek fiyat denetimi sunucuda (bigocuk_buy) yapılır; buradaki fiyat yalnızca ekranda gösterim içindir.
 */
export const PREMIUM_THEMES = [
  {
    id: "defter",
    itemId: "theme-defter",
    name: "Kareli Defter",
    tagline: "Okul sırası: kareli sayfa, yapışkan not baloncukları.",
    price: 300,
    dark: false,
    foam: "#F8FAFF",
    card: "#FFFFFF",
    sea: "#2347C8",
    sun: "#FFE45E",
    tide: "#2FA37A",
    ink: "#1B2A6B",
    changes: ["Kareli kağıt zemin", "Spiral ciltli başlıklar", "Mesajlar yapışkan not", "El yazısı yazı tipi"],
    fonts: "family=Kalam:wght@400;700&family=Patrick+Hand&display=swap",
  },
  {
    id: "piksel",
    itemId: "theme-piksel",
    name: "Piksel Salon",
    tagline: "Atari salonu: köşesiz piksel kutular, RPG diyalog sohbeti.",
    price: 350,
    dark: true,
    foam: "#14112B",
    card: "#221C4A",
    sea: "#C2185B",
    sun: "#FFD23F",
    tide: "#3DF2C0",
    ink: "#F4F0FF",
    changes: ["Köşesiz piksel çerçeveler", "Sert gölgeler, tarama çizgileri", "Sohbet RPG diyalog kutusu", "Piksel yazı tipi"],
    fonts: "family=Pixelify+Sans:wght@500;600;700&display=swap",
  },
  {
    id: "cizgi",
    itemId: "theme-cizgi",
    name: "Çizgi Roman",
    tagline: "Pop-art: kalın çizgiler, noktalı baskı, konuşma balonu sohbeti.",
    price: 400,
    dark: false,
    foam: "#FFF4C2",
    card: "#FFFFFF",
    sea: "#D61F2C",
    sun: "#FFD400",
    tide: "#00A6D6",
    ink: "#141021",
    changes: ["Kalın siyah kontur + ofset gölge", "Noktalı (halftone) baskı", "Kuyruklu konuşma balonları", "Çizgi roman yazı tipi"],
    fonts: "family=Bangers&family=Comic+Neue:wght@400;700&display=swap",
  },
  {
    id: "truva",
    itemId: "theme-truva",
    name: "Truva Vazosu",
    tagline: "Kırmızı figürlü antik vazo: yılan kıvrımı bantlar, taş levha mesajlar.",
    price: 450,
    dark: true,
    foam: "#1B1310",
    card: "#2A1D17",
    sea: "#B8481C",
    sun: "#E8B04B",
    tide: "#5FB7A8",
    ink: "#F3D2AE",
    changes: ["Antik meander (Yunan kıvrımı) bantlar", "Çift çerçeveli kitabe kartlar", "Mesajlar taş levha, altın sikke gönder düğmesi", "Roma serifli yazı tipi"],
    fonts: "family=Cinzel:wght@500;700&family=Spectral:wght@400;600;700&display=swap",
  },
  {
    id: "fener",
    itemId: "theme-fener",
    name: "Seyir Feneri",
    tagline: "Çanakkale gecesi: dönen fener ışığı, seyir defteri düzeninde sohbet.",
    price: 500,
    dark: true,
    foam: "#0A1A2F",
    card: "#10294A",
    sea: "#1B5FA6",
    sun: "#FFC857",
    tide: "#4FD1C5",
    ink: "#DCEBFA",
    changes: ["Başlıkta dönen fener ışığı", "Sohbet dikey seyir defteri çizgisinde", "Fener ışığı parıltılı mesajlar", "Denizci serifli yazı tipi"],
    fonts: "family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,800;1,9..144,600&family=Outfit:wght@400;500;600;700&display=swap",
  },
] as const;

export const ALL_THEMES = [...THEMES, ...PREMIUM_THEMES] as const;
export type ThemeId = (typeof ALL_THEMES)[number]["id"];
export type PremiumTheme = (typeof PREMIUM_THEMES)[number];

export const THEME_KEY = "bigova-theme";
/** Önizleme sırasında tema kalıcı kaydedilmez; bu bayrak ThemeGuard'ın araya girmesini engeller. */
export const THEME_PREVIEW_ATTR = "themePreview";

export const isPremiumTheme = (id: string | null | undefined) =>
  PREMIUM_THEMES.some((t) => t.id === id);
export const premiumTheme = (id: string | null | undefined) =>
  PREMIUM_THEMES.find((t) => t.id === id);

/** Özel temaların Google Fonts adresleri (yalnızca o tema seçilince yüklenir). */
export const THEME_FONT_URLS: Record<string, string> = Object.fromEntries(
  PREMIUM_THEMES.map((t) => [t.id, `https://fonts.googleapis.com/css2?${t.fonts}`]),
);

/** Temanın yazı tiplerini (bir kez) <head>'e ekler. */
export function loadThemeFonts(id: string) {
  const href = THEME_FONT_URLS[id];
  if (!href || typeof document === "undefined") return;
  if (document.querySelector(`link[data-theme-font="${id}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.themeFont = id;
  document.head.appendChild(link);
}

/**
 * Temayı uygular. persist=false → yalnızca önizleme (localStorage'a yazılmaz).
 * Satın alma denetimi çağıranın işidir (Ayarlar) ve ThemeGuard tarafından yeniden doğrulanır.
 */
export function applyTheme(id: string, persist = true) {
  const t = ALL_THEMES.find((x) => x.id === id) ?? THEMES[0];
  const root = document.documentElement;
  loadThemeFonts(t.id);
  root.dataset.theme = t.id;
  if (persist) {
    delete root.dataset[THEME_PREVIEW_ATTR];
    try { localStorage.setItem(THEME_KEY, t.id); } catch {}
  } else {
    root.dataset[THEME_PREVIEW_ATTR] = "1";
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t.sea);
}

