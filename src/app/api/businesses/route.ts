import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  // ilike joker karakterleri (% _ \\) ve PostgREST ayraçları temizlenir; uzunluk sınırlanır
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[%_\\,()]/g, "").trim().slice(0, 60);
  const { data, error } = await supabaseServer().from("businesses").select("*").ilike("name", `%${q}%`).order("name").limit(100);
  if (error) return NextResponse.json({ error: "Veri alınamadı." }, { status: 500 });
  return NextResponse.json(data);
}
