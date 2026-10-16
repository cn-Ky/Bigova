import { classifyDish, monthRange, norm, sumKcal, type DayMenu, type DishCategory, type MealKind, type MenuItem, type Takeaway } from "./types";

/**
 * KYK yurt menüleri: Kepçe açık veri API'si (https://kepce.org, belge: docs/api). Herkese açık okuma uç noktaları
 * anahtarsız çalışır (IP başına dakikada 240 istek); biz ayda yalnızca birkaç istek yaparız.
 * Kepçe, GSB/KYK ile bağlantısı olmayan bağımsız bir topluluk projesidir; arayüzde kaynak olarak anılır.
 *
 * KYK menüleri il bazındadır: Biga'daki iki yurt da Çanakkale menüsünü kullanır.
 * Başka bir sağlayıcıya geçmek için yalnızca bu dosya (fetchKykMonth) değiştirilir; satır biçimi aynı kalır.
 */

const BASE = (process.env.KEPCE_API_BASE ?? "https://kepce.org/api/v1").replace(/\/$/, "");
const CITY_SLUG = process.env.KEPCE_CITY ?? "canakkale";
const CITY_PLATE = 17;
const UA = `BigovaMenuBot/1.0 (${process.env.NEWS_BOT_CONTACT ?? "iletisim: Bigova"})`;

async function getJson(path: string): Promise<{ status: number; body: unknown }> {
  const r = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json", "User-Agent": UA, ...(process.env.KEPCE_API_KEY ? { "X-API-Key": process.env.KEPCE_API_KEY } : {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (r.status === 429) throw new Error(`Kepçe hız sınırı (429); Retry-After: ${r.headers.get("retry-after") ?? "?"} sn`);
  if (r.status === 404) return { status: 404, body: null };
  if (!r.ok) throw new Error(`kepce.org → HTTP ${r.status}`);
  return { status: r.status, body: await r.json() };
}

/** Çanakkale, Kepçe'nin aktif şehirleri arasında mı? Liste alınamazsa varsayılan slug ile devam edilir. */
export async function resolveCity(): Promise<{ slug: string; covered: boolean; checked: boolean }> {
  try {
    const { body } = await getJson("/public/cities");
    const list = (Array.isArray(body) ? body : []) as { id?: number; name?: string; slug?: string }[];
    const hit = list.find((c) => c.slug === CITY_SLUG || c.id === CITY_PLATE || norm(c.name ?? "") === "canakkale");
    return hit ? { slug: hit.slug ?? CITY_SLUG, covered: true, checked: true } : { slug: CITY_SLUG, covered: false, checked: true };
  } catch {
    return { slug: CITY_SLUG, covered: true, checked: false };
  }
}

/* ───────── Eşleme (saf) ───────── */

type RawItem = {
  name?: string;
  amount?: string | null;
  calories?: number | null;
  category?: string | null;
  is_alternative?: boolean;
  order_index?: number;
  master_data?: { is_vegan?: boolean; is_vegetarian?: boolean } | null;
};
type RawMenu = {
  serve_date?: string;
  meal_type?: string;
  status?: string;
  calculated_calories?: number | null;
  items?: RawItem[];
  takeaways?: { name?: string; items?: RawItem[] }[];
};

function categoryOf(raw: string | null | undefined, name: string, meal: MealKind): DishCategory {
  const c = norm(raw ?? "");
  if (/corba/.test(c)) return "corba";
  if (/icecek/.test(c)) return "icecek";
  if (/tatli|meyve/.test(c)) return "tatli";
  if (/salata|meze|garnitur|yan yemek|turşu|tursu/.test(c)) return "yan";
  if (/pilav|makarna|hamur|borek/.test(c)) return "pilav";
  if (/kahvalti/.test(c)) return classifyDish(name) === "icecek" ? "icecek" : "kahvalti";
  if (/ana yemek|et|tavuk|sebze yemegi|baklagil/.test(c)) return "ana";
  // Kategori yoksa/tanınmazsa: kahvaltıda içecek dışındakiler kahvaltılıktır; akşamda ada bakılır.
  const byName = classifyDish(name);
  return meal === "breakfast" && byName !== "icecek" ? "kahvalti" : byName;
}

const mealOf = (t?: string): MealKind | null => (t === "breakfast" ? "breakfast" : t === "dinner" || t === "lunch" ? "dinner" : null);

function mapItems(list: RawItem[] | undefined, meal: MealKind): MenuItem[] {
  return [...(list ?? [])]
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .filter((i) => typeof i.name === "string" && i.name.trim())
    .map((i) => ({
      name: i.name!.trim(),
      ...(typeof i.calories === "number" ? { kcal: Math.round(i.calories) } : {}),
      cat: categoryOf(i.category, i.name!, meal),
      ...(i.is_alternative ? { alt: true } : {}),
      ...(i.amount ? { amount: String(i.amount) } : {}),
      ...(i.master_data?.is_vegan ? { vegan: true } : {}),
      ...(i.master_data?.is_vegetarian ? { vegetarian: true } : {}),
    }));
}

/** Kepçe menü kayıtları → günlük öğünler. Yalnızca onaylı (veya durumu belirtilmemiş) ve geçerli tarihli kayıtlar alınır. */
export function mapKepceMenus(raw: unknown[]): DayMenu[] {
  const byKey = new Map<string, DayMenu>();
  for (const m of raw as RawMenu[]) {
    const date = typeof m.serve_date === "string" ? m.serve_date.slice(0, 10) : "";
    const meal = mealOf(m.meal_type);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !meal) continue;
    if (m.status && m.status !== "approved") continue;
    const items = mapItems(m.items, meal);
    if (!items.length) continue;
    const takeaways: Takeaway[] = (m.takeaways ?? [])
      .map((t) => ({ name: String(t.name ?? "Paket"), items: mapItems(t.items, meal) }))
      .filter((t) => t.items.length);
    const total = sumKcal(items) || (typeof m.calculated_calories === "number" ? m.calculated_calories : null);
    const day: DayMenu = { date, meal, status: "open", items, ...(takeaways.length ? { takeaways } : {}), totalKcal: total || null };
    const key = `${date}|${meal}`;
    const prev = byKey.get(key);
    if (!prev || prev.items.length <= items.length) byKey.set(key, day);
  }
  return [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date) || a.meal.localeCompare(b.meal));
}

/** Bir ayın tüm KYK menüleri. Kepçe aralık sorgusu en fazla 31 gün kabul eder; bir takvim ayı sığar. */
export async function fetchKykMonth(key: string): Promise<{ days: DayMenu[]; covered: boolean; checked: boolean }> {
  const city = await resolveCity();
  if (!city.covered) return { days: [], covered: false, checked: city.checked };
  const { start, end } = monthRange(key);
  const { status, body } = await getJson(`/menus/range?${new URLSearchParams({ city: city.slug, start_date: start, end_date: end })}`);
  if (status === 404 || body == null) return { days: [], covered: true, checked: city.checked };
  const list = Array.isArray(body) ? body : ((body as { menus?: unknown[]; data?: unknown[]; items?: unknown[] }).menus ?? (body as { data?: unknown[] }).data ?? (body as { items?: unknown[] }).items ?? []);
  return { days: mapKepceMenus(list as unknown[]), covered: true, checked: city.checked };
}
