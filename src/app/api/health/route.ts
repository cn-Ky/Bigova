import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
// Supabase'e gerçek bir sorgu atar; duraklamayı önleyen düzenli ping bunu çağırır.
export async function GET() {
  const { error } = await supabaseServer().from("businesses").select("id", { head: true, count: "exact" }).limit(1);
  return NextResponse.json({ db: error ? "error" : "ok" }, { status: error ? 500 : 200 });
}
