import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const type = (new URL(req.url).searchParams.get("type") ?? "").slice(0, 30);
  let q = supabaseServer().from("transport_routes").select("*").order("name").limit(100);
  if (type) q = q.eq("type", type);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "Veri alınamadı." }, { status: 500 });
  return NextResponse.json(data);
}
