import { NextResponse } from "next/server";
import { allow, clientIp, tooMany } from "@/lib/rateLimit";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
  if (!allow(`biz:${clientIp(req)}`, 60, 60_000)) return tooMany();
  const { data, error } = await supabasePublic().from("businesses").select("*").eq("id", params.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Veri alınamadı." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  if (!data) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
