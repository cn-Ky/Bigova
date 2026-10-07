import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
  const { data, error } = await supabaseServer().from("businesses").select("*").eq("id", params.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Veri alınamadı." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
  return NextResponse.json(data);
}
