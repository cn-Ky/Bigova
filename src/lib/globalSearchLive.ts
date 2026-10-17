"use client";
/**
 * Genel aramanın canlı kaynakları (tarayıcıdan, oturumla): her kaynak bağımsız çalışır; biri (tablo yok, giriş yok,
 * ağ hatası) başarısız olsa bile diğerlerinin sonuçları gösterilir.
 */
import { demoBooks, demoBusinesses } from "@/lib/demoData";
import { demoJobs } from "@/lib/jobsData";
import { demoUstalar, fullName } from "@/lib/ustaData";
import { fetchNews } from "@/lib/newsClient";
import { rpc, type FeedPost, type PersonResult, type TrendingTag } from "@/lib/community";
import type { MapPlace } from "@/lib/mapPlaces";
import { supabaseBrowser } from "@/lib/supabase/client";
import { clip, norm, scoreOf, snippet, sqlSafe, type SearchHit } from "@/lib/globalSearch";

const enc = encodeURIComponent;
type Row = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/** `.or()` için: alanlardan herhangi birinde (büyük/küçük harf duyarsız) geçen kayıtlar. */
const orLike = (fields: string[], term: string) => fields.map((f) => `${f}.ilike.%${term}%`).join(",");

/** Sorgunun en uzun kelimesi veritabanında aranır; kelimelerin hepsi sonra istemcide puanlanır. */
const dbTerm = (q: string) => {
  const words = sqlSafe(q).split(" ").filter(Boolean);
  return words.sort((a, b) => b.length - a.length)[0] ?? "";
};

export type Source = (q: string, signal: { cancelled: boolean }) => Promise<SearchHit[]>;

/* ───────── İşletmeler ───────── */
const bizHit = (q: string, b: Row, demo = false): SearchHit | null => {
  const sc = scoreOf(q, s(b.name), s(b.category), s(b.description), s(b.price_info), s(b.address), Array.isArray(b.features) ? (b.features as string[]).join(" ") : "");
  if (!sc) return null;
  return {
    key: `business:${s(b.id)}`,
    kind: "business",
    title: s(b.name),
    sub: [s(b.category), clip(s(b.price_info), 50)].filter(Boolean).join(" · "),
    href: `/isletmeler/${s(b.id)}`,
    demo,
    score: sc,
  };
};
const businesses: Source = async (q) => {
  const term = dbTerm(q);
  const { data, error } = await supabaseBrowser()
    .from("businesses")
    .select("id,name,category,description,price_info,address,features")
    .or(orLike(["name", "category", "description", "price_info"], term))
    .limit(30);
  const rows = !error && Array.isArray(data) && data.length ? (data as Row[]) : null;
  const list = rows ?? (demoBusinesses as unknown as Row[]);
  return list.map((b) => bizHit(q, b, !rows)).filter((x): x is SearchHit => !!x);
};

/* ───────── Haberler ───────── */
const news: Source = async (q) => {
  const all = await fetchNews();
  return all
    .map((n): SearchHit | null => {
      const sc = scoreOf(q, n.title, n.summary, n.category, n.body);
      if (!sc) return null;
      return { key: `news:${n.id}`, kind: "news", title: n.title, sub: `${n.category} · ${snippet(q, n.summary, 70)}`, href: `/haberler/${n.id}`, demo: n.id.startsWith("demo-"), score: sc };
    })
    .filter((x): x is SearchHit => !!x);
};

/* ───────── İş ilanları ───────── */
const jobs: Source = async (q) => {
  const term = dbTerm(q);
  const { data, error } = await supabaseBrowser()
    .from("job_listings")
    .select("id,title,company,category,job_type,location,description")
    .eq("status", "active")
    .or(orLike(["title", "company", "description", "location", "category"], term))
    .limit(30);
  const rows = !error && Array.isArray(data) && data.length ? (data as Row[]) : null;
  const list = rows ?? (demoJobs as unknown as Row[]);
  return list
    .map((j): SearchHit | null => {
      const sc = scoreOf(q, s(j.title), s(j.company), s(j.category), s(j.location), s(j.job_type), s(j.description));
      if (!sc) return null;
      return { key: `job:${s(j.id)}`, kind: "job", title: s(j.title), sub: [s(j.company), s(j.job_type), s(j.location)].filter(Boolean).join(" · "), href: `/is-ilanlari?q=${enc(s(j.title))}`, demo: !rows, score: sc };
    })
    .filter((x): x is SearchHit => !!x);
};

/* ───────── Ustalar ───────── */
const ustalar: Source = async (q) => {
  const term = dbTerm(q);
  const { data, error } = await supabaseBrowser()
    .from("service_providers")
    .select("id,first_name,last_name,category,district,description")
    .eq("status", "active")
    .or(orLike(["first_name", "last_name", "category", "district", "description"], term))
    .limit(30);
  const rows = !error && Array.isArray(data) && data.length ? (data as Row[]) : null;
  const list = rows ?? (demoUstalar as unknown as Row[]);
  return list
    .map((u): SearchHit | null => {
      const name = fullName({ first_name: s(u.first_name), last_name: s(u.last_name) });
      const sc = scoreOf(q, `${name} ${s(u.category)}`, s(u.district), s(u.description));
      if (!sc) return null;
      return { key: `usta:${s(u.id)}`, kind: "usta", title: name, sub: [s(u.category), s(u.district)].filter(Boolean).join(" · "), href: `/ustalar?q=${enc(name)}`, demo: !rows, score: sc };
    })
    .filter((x): x is SearchHit => !!x);
};

/* ───────── Kitap pazarı ───────── */
const books: Source = async (q) => {
  const term = dbTerm(q);
  const { data, error } = await supabaseBrowser()
    .from("book_listings")
    .select("id,title,author,course,price,condition")
    .eq("status", "available")
    .or(orLike(["title", "author", "course"], term))
    .limit(30);
  const rows = !error && Array.isArray(data) && data.length ? (data as Row[]) : null;
  const list = rows ?? (demoBooks as unknown as Row[]);
  return list
    .map((b): SearchHit | null => {
      const sc = scoreOf(q, s(b.title), s(b.author), s(b.course));
      if (!sc) return null;
      return { key: `book:${s(b.id)}`, kind: "book", title: s(b.title), sub: [s(b.author), s(b.course), b.price != null ? `${s(b.price)} ₺` : ""].filter(Boolean).join(" · "), href: `/kitap-pazari?q=${enc(s(b.title))}`, demo: !rows, score: sc };
    })
    .filter((x): x is SearchHit => !!x);
};

/* ───────── Ders notları ───────── */
const notes: Source = async (q) => {
  const term = dbTerm(q);
  const { data, error } = await supabaseBrowser()
    .from("notes")
    .select("id,title,course,description")
    .or(orLike(["title", "course", "description"], term))
    .order("created_at", { ascending: false })
    .limit(30);
  if (error || !Array.isArray(data)) return [];
  return (data as Row[])
    .map((n): SearchHit | null => {
      const sc = scoreOf(q, s(n.title), s(n.course), s(n.description));
      if (!sc) return null;
      return { key: `note:${s(n.id)}`, kind: "note", title: s(n.title), sub: [s(n.course), clip(s(n.description), 50)].filter(Boolean).join(" · "), href: `/notlar?q=${enc(s(n.title))}`, score: sc };
    })
    .filter((x): x is SearchHit => !!x);
};

/* ───────── Bigola: gönderi, kişi, etiket ───────── */
const posts: Source = async (q) => {
  const rows = await rpc<FeedPost[]>("community_feed", { p_scope: "all", p_community: null, p_kind: null, p_status: null, p_before: null, p_limit: 6, p_author: null, p_q: q.trim() });
  return (rows ?? []).map((p, i) => ({
    key: `post:${p.id}`,
    kind: "post" as const,
    title: clip(p.title || p.body, 80),
    sub: `${p.author_name} · ${snippet(q, p.title ? p.body : "", 60)}`.replace(/ · $/, ""),
    href: `/bigola/gonderi/${p.id}`,
    // RPC zaten alaka/yenilik sırasıyla verir; sırayı korumak için azalan puan
    score: 60 - i,
  }));
};
const people: Source = async (q) => {
  const term = q.replace(/^#/, "").trim();
  if (q.trim().startsWith("#") || term.length < 2) return [];
  const rows = await rpc<PersonResult[]>("community_search_people", { p_q: term, p_limit: 5 });
  return (rows ?? []).map((p, i) => ({
    key: `person:${p.user_id}`,
    kind: "person" as const,
    title: p.name,
    sub: p.department ?? "Bigola",
    href: `/profil/${p.user_id}`,
    score: 80 - i,
  }));
};
const tags: Source = async (q) => {
  const bare = q.replace(/^#/, "").trim();
  if (bare.length < 2 || /\s/.test(bare)) return [];
  const rows = await rpc<TrendingTag[]>("community_trending_tags", { p_limit: 40, p_days: 30 });
  const b = norm(bare);
  const hits = (rows ?? []).filter((t) => norm(t.tag).includes(b)).slice(0, 4);
  const out: SearchHit[] = hits.map((t, i) => ({ key: `tag:${t.tag}`, kind: "tag", title: t.tag, sub: `${t.uses} gönderi`, href: `/bigola/kesfet?q=${enc(t.tag)}`, score: 90 - i }));
  // Kullanıcı "#" ile başladıysa yazdığı etiket her zaman önerilir
  if (q.trim().startsWith("#") && !out.some((o) => norm(o.title) === norm(`#${bare}`)))
    out.unshift({ key: `tag:#${bare}`, kind: "tag", title: `#${bare}`, sub: "Etiketi aç", href: `/bigola/kesfet?q=${enc(`#${bare}`)}`, score: 95 });
  return out;
};

/* ───────── Harita (OSM + elle eklenenler); sunucuda 6 saat önbellekli ───────── */
let placesPromise: Promise<MapPlace[]> | null = null;
export const prefetchPlaces = () => {
  placesPromise ??= fetch("/api/map-places")
    .then((r) => (r.ok ? r.json() : { places: [] }))
    .then((d: { places?: MapPlace[] }) => d.places ?? [])
    .catch(() => {
      placesPromise = null; // sonraki denemede yeniden dene
      return [] as MapPlace[];
    });
  return placesPromise;
};
const places: Source = async (q) => {
  const all = await prefetchPlaces();
  return all
    .filter((p) => p.routeEligible)
    .map((p): SearchHit | null => {
      const sc = scoreOf(q, p.name, p.detail, p.address);
      if (!sc) return null;
      return { key: `place:${p.id}`, kind: "place", title: p.name, sub: [p.detail, p.address].filter(Boolean).join(" · "), href: `/harita?q=${enc(p.name)}`, score: sc };
    })
    .filter((x): x is SearchHit => !!x)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
};

/** Tüm canlı kaynaklar. Girişsiz kullanıcıda Bigola/not kaynakları sessizce boş döner. */
export const LIVE_SOURCES: { id: string; run: Source; needsAuth?: boolean }[] = [
  { id: "business", run: businesses },
  { id: "news", run: news },
  { id: "job", run: jobs },
  { id: "usta", run: ustalar },
  { id: "book", run: books },
  { id: "note", run: notes, needsAuth: true },
  { id: "post", run: posts, needsAuth: true },
  { id: "person", run: people, needsAuth: true },
  { id: "tag", run: tags, needsAuth: true },
  { id: "place", run: places },
];
