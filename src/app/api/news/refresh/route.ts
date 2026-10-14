import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/news/fetchers";
import {
  buildStory,
  clusterItems,
  fallbackCopy,
  isRelevant,
  publishable,
  type RawItem,
  type Story,
} from "@/lib/news/pipeline";
import { aiCopy } from "@/lib/news/summarize";
import { loadCommonsPool, pickImage } from "@/lib/news/images";

/**
 * Biga Gündemi otomatik güncelleme. Vercel Cron günlük çağırır (vercel.json).
 * Yetki: `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron bunu kendisi ekler).
 * Elle deneme: GET /api/news/refresh?dry=1  → veritabanına yazmaz, ne yapacağını döndürür.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const WINDOW_DAYS = 7;
const MAX_AI_PER_RUN = 12;
const TERMS = ["Biga", "Karabiga"];

const authorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
};

type Existing = { id: string; sources: { url: string }[] | null; source_count: number | null; status: string };

const keyOf = (s: Story) => createHash("sha1").update(s.items[0].url).digest("hex").slice(0, 24);

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const db = supabaseAdmin();
  if (!db && !dry) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY tanımlı değil" }, { status: 500 });

  const extra = (process.env.NEWS_EXTRA_TERMS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const { items, errors, counts } = await fetchAll({ terms: [...TERMS, ...extra], days: WINDOW_DAYS });

  // 1) ilgililik + bağlantı tekilleştirme + pencere
  const cutoff = Date.now() - WINDOW_DAYS * 86400_000;
  const seen = new Set<string>();
  const relevant: RawItem[] = [];
  for (const it of items) {
    if (seen.has(it.url) || +new Date(it.publishedAt) < cutoff || !isRelevant(it, extra)) continue;
    seen.add(it.url);
    relevant.push(it);
  }

  // 2) kümele → doğrula
  const stories = clusterItems(relevant).map((c) => buildStory(c));

  // 3) mevcut otomatik kayıtlar (örtüşen bağlantıyla eşleştirilir; böylece sonradan gelen 2. kaynak aynı habere eklenir)
  let existing: Existing[] = [];
  if (db) {
    const since = new Date(Date.now() - 2 * WINDOW_DAYS * 86400_000).toISOString();
    const { data } = await db
      .from("news_articles")
      .select("id,sources,source_count,status")
      .eq("is_auto", true)
      .gte("published_at", since);
    existing = (data ?? []) as Existing[];
  }
  const findExisting = (s: Story) => {
    const urls = new Set(s.items.map((i) => i.url));
    return existing.find((e) => (e.sources ?? []).some((x) => urls.has(x.url)));
  };

  const useCommons = (process.env.NEWS_IMAGE_MODE ?? "cover") === "commons";
  const pool = useCommons ? await loadCommonsPool() : [];

  let aiLeft = MAX_AI_PER_RUN;
  const report = { inserted: 0, updated: 0, unchanged: 0, drafts: 0, published: 0, sensitive: 0 };
  const preview: unknown[] = [];

  for (const s of stories) {
    const ex = findExisting(s);
    const willPublish = publishable(s);
    if (s.sensitive) report.sensitive++;

    // Değişmemiş ve durumu aynı kayıtlara dokunma (yapay zekâ maliyeti + gereksiz yazma)
    if (ex && (ex.source_count ?? 0) >= s.items.length && (ex.status === "published") === willPublish) {
      report.unchanged++;
      continue;
    }

    let copy = null;
    if (aiLeft > 0 && (willPublish || s.items.length >= 2)) {
      copy = await aiCopy(s);
      if (copy) aiLeft--;
    }
    copy ??= fallbackCopy(s);

    const img = pickImage(pool, keyOf(s));
    const primary = s.items[0];
    const row = {
      title: copy.title,
      summary: copy.summary,
      body: copy.body,
      category: s.category,
      author_name: "Bigova Otomatik Derleme",
      source_name: (s.items.length > 1 ? `${primary.sourceName} +${s.items.length - 1} kaynak` : primary.sourceName).slice(0, 80),
      source_url: primary.url,
      featured: false,
      status: willPublish ? "published" : "draft",
      published_at: s.publishedAt,
      is_auto: true,
      verification: s.verification,
      source_count: s.items.length,
      sources: s.items.map((i) => ({ name: i.sourceName, url: i.url, title: i.title.slice(0, 200), published_at: i.publishedAt })),
      image_url: img?.url ?? null,
      image_credit: img?.credit ?? null,
      image_link: img?.link ?? null,
    };

    willPublish ? report.published++ : report.drafts++;
    if (dry) {
      preview.push({ title: row.title, status: row.status, verification: row.verification, sources: s.domains, category: row.category });
      continue;
    }
    if (ex) {
      const { error } = await db!.from("news_articles").update(row).eq("id", ex.id);
      if (error) errors.push(`update: ${error.message}`);
      else report.updated++;
    } else {
      const { error } = await db!.from("news_articles").insert({ ...row, cluster_key: keyOf(s) });
      if (error) errors.push(`insert: ${error.message}`);
      else report.inserted++;
    }
  }

  return NextResponse.json(
    { ok: true, dry, fetched: counts, relevant: relevant.length, stories: stories.length, ...report, errors, ...(dry ? { preview } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
