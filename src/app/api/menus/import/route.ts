import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeMonth } from "@/lib/menus/sync";
import { monthKey, sumKcal } from "@/lib/menus/types";

/**
 * Elle menü yükleme (yedek yol). Otomatik kaynak çalışmadığında ya da bir ay elle düzeltilmek istendiğinde:
 *   curl -X POST https://<site>/api/menus/import -H "Authorization: Bearer $CRON_SECRET" \
 *        -H "Content-Type: application/json" -d @menu.json
 * Gövde biçimi için scripts/menu-import.example.json dosyasına bakın. Gelen ay, o aydaki mevcut günlerin yerini alır.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const authorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
};

const Item = z.object({
  name: z.string().min(2).max(80),
  kcal: z.number().int().min(0).max(3000).optional(),
  cat: z.enum(["kahvalti", "corba", "ana", "pilav", "yan", "tatli", "icecek"]),
  alt: z.boolean().optional(),
  amount: z.string().max(40).optional(),
  vegan: z.boolean().optional(),
  vegetarian: z.boolean().optional(),
});
const Body = z.object({
  source: z.enum(["kyk", "comu"]),
  scope: z.enum(["kyk-canakkale", "comu-biga-agakoy"]),
  variant: z.enum(["normal", "vegan"]).default("normal"),
  source_url: z.string().url().optional(),
  days: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        meal: z.enum(["breakfast", "dinner", "daily"]),
        status: z.enum(["open", "closed"]).default("open"),
        note: z.string().max(120).optional(),
        items: z.array(Item).max(40),
        takeaways: z.array(z.object({ name: z.string().max(80), items: z.array(Item).max(20) })).max(12).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz gövde", issues: parsed.error.issues.slice(0, 8) }, { status: 400 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY tanımlı değil" }, { status: 500 });

  const { source, scope, variant, source_url, days } = parsed.data;
  const hash = createHash("sha256").update(JSON.stringify(days)).digest("hex");
  const byMonth = new Map<string, typeof days>();
  for (const d of days) byMonth.set(monthKey(d.date), [...(byMonth.get(monthKey(d.date)) ?? []), d]);

  const out: { month: string; written: number; warnings: string[] }[] = [];
  try {
    for (const [key, list] of byMonth) {
      const w = await writeMonth(
        db,
        { source, scope, variant, url: source_url ?? null, hash },
        key,
        list.map((d) => ({ ...d, totalKcal: d.items.length ? sumKcal(d.items) || null : null })),
      );
      out.push({ month: key, ...w });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, months: out }, { headers: { "Cache-Control": "no-store" } });
}
