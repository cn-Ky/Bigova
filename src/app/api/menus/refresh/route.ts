import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { syncComu, syncKyk, wantedMonths, type SyncReport } from "@/lib/menus/sync";

/**
 * Yemekhane menüleri otomatik güncelleme. Vercel Cron günlük çağırır (vercel.json).
 * Menüler aylık yayınlandığı için günlük çalışma bilerek seçildi: yeni ay PDF'i/verisi ayın hangi gününde
 * yayınlanırsa yayınlansın bir sonraki çalışmada yakalanır; içerik değişmediyse hiçbir şey yazılmaz.
 *
 * Yetki: `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron bunu kendisi ekler).
 * Parametreler:
 *   ?dry=1          → veritabanına YAZMAZ; ne yapacağını ve ilk günlerin örneğini döndürür (yayına almadan önce dene).
 *   ?source=comu|kyk → yalnızca bir kaynağı çalıştır.
 *   ?month=YYYY-MM  → yalnızca o ayı çalıştır (örn. eski bir ayı elle doldurmak için).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const authorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
};

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const only = url.searchParams.get("source");
  const forced = url.searchParams.get("month");
  if (forced && !/^\d{4}-(0[1-9]|1[0-2])$/.test(forced)) return NextResponse.json({ error: "month biçimi YYYY-MM olmalı" }, { status: 400 });

  const db = supabaseAdmin();
  if (!db && !dry) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY tanımlı değil" }, { status: 500 });

  const months = forced ? [forced] : wantedMonths();
  const reports: SyncReport[] = [];
  // Kaynaklar birbirinden bağımsızdır: biri hata verse diğeri çalışır.
  if (only !== "kyk") reports.push(...(await syncComu(db, months, { dry })));
  if (only !== "comu") reports.push(...(await syncKyk(db, months, { dry })));

  const errors = reports.filter((r) => r.action === "error");
  const wrote = reports.filter((r) => r.action === "written").length;
  const allFailed = reports.length > 0 && errors.length === reports.length;
  return NextResponse.json(
    { ok: errors.length === 0, dry, months, written: wrote, errors: errors.length, reports },
    // Hepsi başarısızsa 500: Vercel Cron günlüğünde hata olarak görünür.
    { status: allFailed ? 500 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
