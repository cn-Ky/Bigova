import { NextResponse } from "next/server";
import { allow, clientIp, tooMany } from "@/lib/rateLimit";
import { supabasePublic } from "@/lib/supabase/public";

// İşletme rehberi herkese açık veridir (RLS: "businesses: herkes okur"): çerezsiz istemci + CDN önbelleği.
export const revalidate = 60;

export async function GET(req: Request) {
  if (!allow(`biz:${clientIp(req)}`, 60, 60_000)) return tooMany();
  // ilike joker karakterleri (% _ \\) ve PostgREST ayraçları temizlenir; uzunluk sınırlanır
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[%_\\,()*]/g, "").trim().slice(0, 60);
  const { data, error } = await supabasePublic().from("businesses").select("*").ilike("name", `%${q}%`).order("name").limit(100);
  if (error) return NextResponse.json({ error: "Veri alınamadı." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
