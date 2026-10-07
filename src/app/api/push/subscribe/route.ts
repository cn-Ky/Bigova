import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Sub = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(300), auth: z.string().min(10).max(100) }),
});

async function currentUser() {
  const { data } = await supabaseServer().auth.getUser();
  return data.user;
}

/** Bu cihazın push aboneliğini kaydeder (aynı uç nokta başka hesaba aitse devralır). */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const parsed = Sub.safeParse((await req.json().catch(() => null))?.subscription);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz abonelik." }, { status: 400 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Sunucu yapılandırması eksik (SUPABASE_SERVICE_ROLE_KEY)." }, { status: 503 });
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      endpoint: parsed.data.endpoint,
      user_id: user.id,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 200),
    },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: "Abonelik kaydedilemedi." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const endpoint = z.string().url().safeParse((await req.json().catch(() => null))?.endpoint);
  if (!endpoint.success) return NextResponse.json({ error: "Geçersiz uç nokta." }, { status: 400 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Sunucu yapılandırması eksik." }, { status: 503 });
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint.data).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
