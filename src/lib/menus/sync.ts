import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { downloadPdf, listMenuPdfs, parsePdfBytes } from "./comuSource";
import { validate } from "./comuParser";
import { fetchKykMonth } from "./kykSource";
import { addMonths, COMU_SCOPE, istanbulToday, KYK_SCOPE, monthKey, monthRange, type DayMenu, type MenuSource, type MenuVariant } from "./types";

/**
 * Menü yenileme: kaynaktan çek → doğrula → upsert → kaldırılan günleri temizle.
 *
 * Güvenlik ilkeleri:
 *  - Kalite kapısı: doğrulamadan geçmeyen ayrıştırma ASLA yazılmaz; mevcut veri korunur.
 *  - Kaynağın içerik özeti (sha256) satırlarda tutulur; değişmeyen PDF tekrar ayrıştırılmaz.
 *  - Temizlik koruması: yeni veri mevcut verinin %60'ından azsa eski günler silinmez (kaynak kesintisine karşı).
 */

export type SyncReport = {
  source: MenuSource;
  month?: string;
  variant?: MenuVariant;
  action: "written" | "unchanged" | "skipped" | "error" | "empty";
  days?: number;
  detail?: string;
  warnings?: string[];
  sample?: unknown;
};

type Db = SupabaseClient | null;

/** Eşitlenecek aylar: bu ay; ayın 18'inden sonra gelecek ay da (kaynaklar yeni ayı genelde önceden yayınlar). */
export function wantedMonths(now = new Date()): string[] {
  const today = istanbulToday(now);
  const cur = monthKey(today);
  return Number(today.slice(8, 10)) >= 18 ? [cur, addMonths(cur, 1)] : [cur];
}

const rowOf = (d: DayMenu, src: { source: MenuSource; scope: string; variant: MenuVariant; url: string | null; hash: string }) => ({
  source: src.source,
  scope: src.scope,
  variant: src.variant,
  menu_date: d.date,
  meal: d.meal,
  status: d.status,
  note: d.note ?? null,
  items: d.items,
  takeaways: d.takeaways ?? null,
  total_kcal: d.totalKcal ?? null,
  source_url: src.url,
  source_hash: src.hash,
  fetched_at: new Date().toISOString(),
});

/** Yaz + (güvenliyse) bu ayda artık kaynakta olmayan günleri sil. */
export async function writeMonth(
  db: NonNullable<Db>,
  src: { source: MenuSource; scope: string; variant: MenuVariant; url: string | null; hash: string },
  key: string,
  days: DayMenu[],
): Promise<{ written: number; warnings: string[] }> {
  const warnings: string[] = [];
  const { start, end } = monthRange(key);
  const { count: existing } = await db
    .from("meal_menus")
    .select("id", { count: "exact", head: true })
    .eq("scope", src.scope)
    .eq("variant", src.variant)
    .gte("menu_date", start)
    .lte("menu_date", end);

  const rows = days.map((d) => rowOf(d, src));
  const { error } = await db.from("meal_menus").upsert(rows, { onConflict: "scope,variant,menu_date,meal" });
  if (error) throw new Error(`upsert: ${error.message}`);

  if ((existing ?? 0) === 0 || rows.length >= (existing ?? 0) * 0.6) {
    const { error: delErr } = await db
      .from("meal_menus")
      .delete()
      .eq("scope", src.scope)
      .eq("variant", src.variant)
      .gte("menu_date", start)
      .lte("menu_date", end)
      .neq("source_hash", src.hash);
    if (delErr) warnings.push(`temizlik: ${delErr.message}`);
  } else {
    warnings.push(`Yeni veri (${rows.length}) mevcut verinin (${existing}) %60'ından az; eski günler silinmedi.`);
  }
  return { written: rows.length, warnings };
}

/* ───────── ÇOMÜ Ağaköy ───────── */

export async function syncComu(db: Db, months: string[], opts: { dry: boolean }): Promise<SyncReport[]> {
  const reports: SyncReport[] = [];
  let links;
  try {
    links = (await listMenuPdfs()).slice(0, 8);
  } catch (e) {
    return [{ source: "comu", action: "error", detail: `SKS sayfası okunamadı: ${(e as Error).message}` }];
  }
  if (!links.length) return [{ source: "comu", action: "empty", detail: "SKS sayfasında menü PDF'i bulunamadı (sayfa yapısı değişmiş olabilir)." }];

  // Daha önce işlenmiş PDF özetleri
  const known = new Set<string>();
  if (db) {
    const { data } = await db.from("meal_menus").select("source_hash").eq("scope", COMU_SCOPE).gte("menu_date", `${addMonths(months[0], -1)}-01`).limit(500);
    for (const r of (data ?? []) as { source_hash: string | null }[]) if (r.source_hash) known.add(r.source_hash);
  }

  for (const link of links) {
    try {
      const { bytes, hash } = await downloadPdf(link.url);
      if (known.has(hash)) {
        reports.push({ source: "comu", action: "unchanged", detail: link.url });
        continue;
      }
      const parsed = await parsePdfBytes(bytes);
      const key = `${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
      const base = { source: "comu" as const, month: key, variant: parsed.variant };
      if (!months.includes(key)) {
        reports.push({ ...base, action: "skipped", detail: `${key} eşitleme penceresinin dışında (${months.join(", ")}).` });
        continue;
      }
      const v = validate(parsed.days, parsed.year, parsed.month);
      if (!v.ok) {
        reports.push({ ...base, action: "error", detail: `Doğrulama başarısız, veri YAZILMADI: ${v.reasons.join(" ")}`, warnings: parsed.warnings });
        continue;
      }
      const sample = opts.dry ? parsed.days.slice(0, 3) : undefined;
      if (opts.dry || !db) {
        reports.push({ ...base, action: "written", days: parsed.days.length, detail: `KURU ÇALIŞMA (yazılmadı) · strateji=${parsed.strategy} · ${v.filled}/${v.expected} hafta içi gün dolu`, warnings: parsed.warnings, sample });
        continue;
      }
      const w = await writeMonth(db, { source: "comu", scope: COMU_SCOPE, variant: parsed.variant, url: link.url, hash }, key, parsed.days);
      reports.push({ ...base, action: "written", days: w.written, warnings: [...parsed.warnings, ...w.warnings] });
    } catch (e) {
      reports.push({ source: "comu", action: "error", detail: `${link.url}: ${(e as Error).message}` });
    }
  }
  return reports;
}

/* ───────── KYK (Çanakkale) ───────── */

export async function syncKyk(db: Db, months: string[], opts: { dry: boolean }): Promise<SyncReport[]> {
  const reports: SyncReport[] = [];
  for (const key of months) {
    try {
      const r = await fetchKykMonth(key);
      if (!r.covered) {
        reports.push({ source: "kyk", month: key, action: "empty", detail: "Çanakkale, Kepçe'nin aktif şehirleri arasında değil. Menü kaynağı eklenene ya da /api/menus/import ile elle yüklenene kadar KYK sekmesi boş görünür." });
        continue;
      }
      if (!r.days.length) {
        reports.push({ source: "kyk", month: key, action: "empty", detail: "Kepçe bu ay için Çanakkale menüsü döndürmedi." });
        continue;
      }
      const hash = createHash("sha256").update(JSON.stringify(r.days)).digest("hex");
      const warnings = r.checked ? [] : ["Şehir listesi doğrulanamadı; varsayılan 'canakkale' ile denendi."];
      if (opts.dry || !db) {
        reports.push({ source: "kyk", month: key, action: "written", days: r.days.length, detail: "KURU ÇALIŞMA (yazılmadı)", warnings, sample: opts.dry ? r.days.slice(0, 2) : undefined });
        continue;
      }
      const w = await writeMonth(db, { source: "kyk", scope: KYK_SCOPE, variant: "normal", url: "https://kepce.org", hash }, key, r.days);
      reports.push({ source: "kyk", month: key, action: "written", days: w.written, warnings: [...warnings, ...w.warnings] });
    } catch (e) {
      reports.push({ source: "kyk", month: key, action: "error", detail: (e as Error).message });
    }
  }
  return reports;
}

