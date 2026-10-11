import { NextResponse } from "next/server";
import { allow, clientIp, tooMany } from "@/lib/rateLimit";
import { supabasePublic } from "@/lib/supabase/public";

// Ulaşım güzergâhları herkese açık veridir (RLS: "transport: herkes okur").
export const revalidate = 300;

export async function GET(req: Request) {
  if (!allow(`tr:${clientIp(req)}`, 60, 60_000)) return tooMany();
  const type = (new URL(req.url).searchParams.get("type") ?? "").slice(0, 30);
  let q = supabasePublic().from("transport_routes").select("*").order("name").limit(100);
  if (type) q = q.eq("type", type);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "Veri alınamadı." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
