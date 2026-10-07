/** İşletme veri modeli ve yardımcılar (liste, detay sayfası ve API ortak kullanır). */
export type MenuItem = { name: string; price?: string; note?: string };
export type MenuSection = { section: string; items: MenuItem[] };

export type Business = {
  id: string;
  name: string;
  category: string;
  phone?: string | null;
  price_info?: string | null;
  has_toilet: boolean;
  opens_at?: string | null;
  closes_at?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  description?: string | null;
  features?: string[] | null;
  student_discount?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  menu?: MenuSection[] | null;
};

const PRICE_AT_END = /^(.*?)[\s:–-]+((?:\d[\d.,]*)\s?(?:TL|₺)(?:\s?\/\s?[\p{L}.]+)?)$/u;

/** Menü girilmemiş işletmelerde, "Çay 20 TL · Tost 85 TL" biçimindeki fiyat metninden menü üretir. */
export function menuOf(b: Business): MenuSection[] {
  const raw = Array.isArray(b.menu) ? b.menu : [];
  const clean = raw
    .filter((s) => s && Array.isArray(s.items) && s.items.length)
    .map((s) => ({ section: String(s.section || "Menü"), items: s.items }));
  if (clean.length) return clean;
  const parts = (b.price_info ?? "")
    .split(/\s[·•|]\s|;|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return [];
  const items: MenuItem[] = parts.map((p) => {
    const m = PRICE_AT_END.exec(p);
    return m ? { name: m[1].trim(), price: m[2].trim() } : { name: p };
  });
  return [{ section: "Fiyatlar", items }];
}

const mins = (hhmm?: string | null) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Türkiye saatine göre şu an açık mı? Saat bilgisi yoksa null döner. */
export function openState(b: Pick<Business, "opens_at" | "closes_at">, now = new Date()) {
  const open = mins(b.opens_at);
  const close = mins(b.closes_at);
  if (open === null || close === null) return null;
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const cur = h * 60 + m;
  // gece yarısını aşan çalışma saatleri (örn. 18:00–02:00)
  const isOpen = open <= close ? cur >= open && cur < close : cur >= open || cur < close;
  return { isOpen, until: isOpen ? b.closes_at! : b.opens_at! };
}

export const igUrl = (handle: string) => `https://instagram.com/${handle.replace(/^@/, "").trim()}`;
export const waUrl = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "90")}`;
export const telUrl = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;
export const isDemo = (b: Pick<Business, "id" | "name">) => b.id.startsWith("demo-") || b.name.startsWith("Örnek ");
