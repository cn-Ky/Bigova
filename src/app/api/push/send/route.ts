import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Payload = z.object({
  record: z.object({ from_id: z.string().uuid(), to_id: z.string().uuid(), body: z.string() }),
});

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Supabase veritabanı webhook'u (messages INSERT) buraya POST eder; alıcının cihazlarına push gönderir.
 * Yetki: x-webhook-secret başlığı PUSH_WEBHOOK_SECRET ile eşleşmeli.
 */
export async function POST(req: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || !same(req.headers.get("x-webhook-secret") ?? "", secret))
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const admin = supabaseAdmin();
  if (!pub || !priv || !admin) return NextResponse.json({ error: "Push yapılandırması eksik." }, { status: 503 });

  const parsed = Payload.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz içerik." }, { status: 400 });
  const { from_id, to_id, body } = parsed.data.record;

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:bigova@example.com", pub, priv);

  const [{ data: subs }, { data: sender }] = await Promise.all([
    admin.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", to_id),
    admin.from("profiles").select("name").eq("id", from_id).maybeSingle(),
  ]);
  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const text = body.replace(/\s+/g, " ").trim();
  const message = JSON.stringify({
    title: sender?.name || "Yeni mesaj",
    body: text.length > 110 ? `${text.slice(0, 107)}…` : text,
    url: `/arkadaslar/${from_id}`,
    tag: `msg-${from_id}`,
  });

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message, { TTL: 3600, urgency: "high" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.endpoint); // abonelik artık geçersiz
      }
    }),
  );
  if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
  return NextResponse.json({ sent, removed: gone.length });
}
