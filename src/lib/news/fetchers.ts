import * as cheerio from "cheerio";
import { cleanTitle, hostOf, type RawItem } from "./pipeline";

/**
 * Haber KEŞİF kaynakları. Hiçbiri haber metnini çekmez; yalnızca başlık, tarih, bağlantı ve (RSS'te varsa)
 * yayıncının kendi koyduğu kısa özet alınır.
 *
 *  1) GDELT DOC 2.0  — açık/ücretsiz küresel haber dizini (varsayılan, anahtarsız).
 *  2) NEWS_RSS_FEEDS — virgülle ayrılmış RSS/Atom adresleri (yerel gazeteler, Biga Belediyesi, ÇOMÜ duyuruları…).
 *  3) Google News RSS — yalnızca NEWS_USE_GOOGLE_RSS=1 ise (kullanım koşullarını kendin kontrol et).
 */

const UA = `BigovaNewsBot/1.0 (${process.env.NEWS_BOT_CONTACT ?? "iletisim: Bigova"})`;
const TIMEOUT = 12_000;

async function get(url: string): Promise<Response> {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json, application/rss+xml, application/xml, text/xml, */*" },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!r.ok) throw new Error(`${new URL(url).hostname} → HTTP ${r.status}`);
  return r;
}

const stripHtml = (s: string) =>
  cheerio
    .load(`<div>${s}</div>`)("div")
    .text()
    .replace(/\s+/g, " ")
    .trim();

/** "20260114T093000Z" → ISO */
function gdeltDate(s: string): string | null {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null;
}

export async function fetchGdelt(terms: string[], days: number): Promise<RawItem[]> {
  const q = `(${terms.join(" OR ")}) sourcelang:turkish`;
  const url =
    "https://api.gdeltproject.org/api/v2/doc/doc?" +
    new URLSearchParams({
      query: q,
      mode: "artlist",
      format: "json",
      maxrecords: "120",
      sort: "datedesc",
      timespan: `${days}d`,
    });
  const r = await get(url);
  const text = await r.text();
  let json: { articles?: { url: string; title: string; seendate: string; domain: string }[] };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("GDELT geçersiz yanıt döndürdü (sorgu hatası ya da hız sınırı).");
  }
  const out: RawItem[] = [];
  for (const a of json.articles ?? []) {
    const publishedAt = gdeltDate(a.seendate);
    const domain = (a.domain || hostOf(a.url)).replace(/^www\./, "").toLowerCase();
    if (!publishedAt || !a.title || !/^https?:\/\//i.test(a.url) || !domain) continue;
    out.push({ title: a.title.trim(), url: a.url, domain, sourceName: domain, publishedAt, origin: "gdelt" });
  }
  return out;
}

/** RSS 2.0 ve Atom. `origin` Google News ise <source> öğesinden asıl yayıncı alınır. */
export async function fetchRss(feedUrl: string, origin: "rss" | "gnews" = "rss"): Promise<RawItem[]> {
  const xml = await (await get(feedUrl)).text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const out: RawItem[] = [];
  const feedHost = hostOf(feedUrl);
  const feedTitle = $("channel > title, feed > title").first().text().trim();

  $("item, entry").each((_, el) => {
    const n = $(el);
    const rawTitle = n.children("title").first().text().trim();
    const link =
      n.children("link").first().attr("href") || n.children("link").first().text().trim() || n.children("guid").first().text().trim();
    const date = n.children("pubDate, published, updated").first().text().trim();
    const t = date ? new Date(date) : null;
    if (!rawTitle || !/^https?:\/\//i.test(link) || !t || Number.isNaN(+t)) return;

    let sourceName = feedTitle || feedHost;
    let domain = hostOf(link);
    if (origin === "gnews") {
      const src = n.children("source").first();
      if (src.text().trim()) sourceName = src.text().trim();
      const sUrl = src.attr("url");
      if (sUrl) domain = hostOf(sUrl) || domain;
      else domain = sourceName.toLowerCase();
    }
    const desc = stripHtml(n.children("description, summary").first().text()).slice(0, 300);
    out.push({
      title: cleanTitle(rawTitle, sourceName),
      url: link,
      domain,
      sourceName,
      publishedAt: t.toISOString(),
      // Google News açıklaması yalnızca başlık tekrarıdır; atla
      snippet: origin === "gnews" ? undefined : desc || undefined,
      origin,
    });
  });
  return out;
}

export const googleNewsUrl = (days: number) =>
  `https://news.google.com/rss/search?${new URLSearchParams({
    q: `Biga when:${days}d`,
    hl: "tr",
    gl: "TR",
    ceid: "TR:tr",
  })}`;

/** Tüm kaynakları paralel çeker; biri çökerse diğerleri sürer. Hatalar `errors` içinde döner. */
export async function fetchAll(opts: { terms: string[]; days: number }) {
  const feeds = (process.env.NEWS_RSS_FEEDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
  const jobs: { name: string; run: () => Promise<RawItem[]> }[] = [
    { name: "gdelt", run: () => fetchGdelt(opts.terms, opts.days) },
    ...feeds.map((f) => ({ name: `rss:${hostOf(f)}`, run: () => fetchRss(f, "rss") })),
    ...(process.env.NEWS_USE_GOOGLE_RSS === "1"
      ? [{ name: "google-news", run: () => fetchRss(googleNewsUrl(opts.days), "gnews") }]
      : []),
  ];
  const results = await Promise.allSettled(jobs.map((j) => j.run()));
  const items: RawItem[] = [];
  const errors: string[] = [];
  const counts: Record<string, number> = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      items.push(...r.value);
      counts[jobs[i].name] = r.value.length;
    } else errors.push(`${jobs[i].name}: ${(r.reason as Error)?.message ?? "hata"}`);
  });
  return { items, errors, counts };
}
