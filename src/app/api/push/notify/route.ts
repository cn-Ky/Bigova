import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { z } from "zod";
import { isAllowedPushEndpoint } from "@/lib/pushEndpoint";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Payload = z.object({
  record: z.object({
    user_id: z.string().uuid(),
    actor_id: z.string().uuid(),
    type: z.enum(["like", "comment", "reply", "repost", "quote", "follow", "follow_request", "follow_accept"]),
    post_id: z.string().uuid().nullable().optional(),
  }),
});

const TEXT = {
  like: "gönderini beğendi",
  comment: "gönderine yorum yaptı",
  reply: "yorumuna yanıt verdi",
  repost: "gönderini yeniden paylaştı",
  quote: "gönderini alıntıladı",
  follow: "seni takip etmeye başladı",
  follow_request: "seni takip etmek istiyor",
  follow_accept: "takip isteğini kabul etti",
} as const;

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Supabase veritabanı webhook'u (community_notifications INSERT) buraya POST eder; alıcının cihazlarına push gönderir.
 * Yetki: x-webhook-secret başlığı PUSH_WEBHOOK_SECRET ile eşleşmeli (mesaj bildirimleriyle aynı gizli anahtar).
 * Kurulum: supabase/push_notify_webhook.sql
 */
export async function POST(req: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || !same(req.headers.get("x-webhook-secret") ?? "", secret)) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const admin = supabaseAdmin();
  if (!pub || !priv || !admin) return NextResponse.json({ error: "Push yapılandırması eksik." }, { status: 503 });

  const parsed = Payload.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz içerik." }, { status: 400 });
  const { user_id, actor_id, type, post_id } = parsed.data.record;

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:bigova@example.com", pub, priv);

  const [{ data: subs }, { data: actor }] = await Promise.all([
    admin.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", user_id),
    admin.from("profiles").select("name").eq("id", actor_id).maybeSingle(),
  ]);
  // Savunma amaçlı: veritabanına başka yoldan girmiş uç noktalara asla istek atma
  const safeSubs = (subs ?? []).filter((s) => isAllowedPushEndpoint(s.endpoint));
  if (!safeSubs.length) return NextResponse.json({ sent: 0 });

  const message = JSON.stringify({
    title: "Bigola",
    body: `${actor?.name || "Bir öğrenci"} ${TEXT[type]}`,
    url: post_id ? `/bigola/gonderi/${post_id}` : type === "follow_request" ? "/bigola/bildirimler" : `/profil/${actor_id}`,
    tag: `topluluk-${type}-${post_id ?? actor_id}`,
  });

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    safeSubs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message, { TTL: 3600, urgency: "normal", timeout: 5000 });
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
