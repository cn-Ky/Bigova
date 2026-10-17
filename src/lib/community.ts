"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ───────── Tipler (supabase/community_upgrade.sql ile aynı) ───────── */
export type CommunityKind = "general" | "department" | "class" | "study";
export type Community = {
  id: string;
  slug: string;
  kind: CommunityKind;
  name: string;
  description: string | null;
  department: string | null;
  grade: number | null;
  course: string | null;
  meeting_info: string | null;
  max_members: number | null;
  visibility: "public" | "private";
  is_official: boolean;
  member_count: number;
  is_member: boolean;
  my_role: "owner" | "mod" | "member" | null;
};
export type CommunityDetail = Community & { can_moderate: boolean; join_code: string | null; owner_name: string | null };
export type FeedPost = {
  /** Gösterilen gönderi (düz yeniden paylaşımda orijinal gönderi). */
  id: string;
  /** Akıştaki satırın kendi kimliği (yeniden paylaşım satırı orijinalden farklıdır). */
  feed_id: string;
  community_id: string;
  community_name: string;
  community_slug: string;
  author_id: string;
  author_name: string;
  kind: "post" | "question";
  title: string | null;
  body: string;
  course: string | null;
  images: string[];
  like_count: number;
  comment_count: number;
  repost_count: number;
  accepted_comment_id: string | null;
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
  mine: boolean;
  can_moderate: boolean;
  hidden: boolean;
  created_at: string;
  /** Akış sırası ve sayfalama zamanı (yeniden paylaşımda paylaşım zamanı). */
  sort_at: string;
  reposted_by_id: string | null;
  reposted_by_name: string | null;
  quoted_id: string | null;
  quoted_author_id: string | null;
  quoted_author_name: string | null;
  quoted_body: string | null;
  quoted_images: string[] | null;
  quoted_community_name: string | null;
  quoted_created_at: string | null;
  /** Alıntılanan gönderi silinmiş, gizlenmiş veya bu kullanıcıya kapalı. */
  quoted_unavailable: boolean;
};
export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  body: string;
  like_count: number;
  liked: boolean;
  mine: boolean;
  can_moderate: boolean;
  hidden: boolean;
  is_accepted: boolean;
  created_at: string;
  parent_id: string | null;
  reply_to_name: string | null;
};
export type Channel = {
  id: string;
  community_id: string | null;
  category: string | null;
  category_name: string | null;
  category_sort: number | null;
  name: string;
  description: string | null;
  sort: number;
  last_at: string | null;
};
export type ChannelInfo = {
  id: string;
  community_id: string | null;
  community_slug: string | null;
  community_name: string | null;
  category: string | null;
  category_name: string | null;
  name: string;
  description: string | null;
  can_moderate: boolean;
};
export type ChannelMessage = {
  id: string;
  channel_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  deleted: boolean;
  hidden: boolean;
  mine: boolean;
  can_moderate: boolean;
};
export type Member = { user_id: string; name: string; role: "owner" | "mod" | "member"; joined_at: string };
export type AdminReport = {
  target_type: "post" | "comment" | "message";
  target_id: string;
  report_count: number;
  reasons: string[];
  note: string | null;
  author_id: string;
  author_name: string;
  preview: string;
  hidden: boolean;
  place: string;
  first_at: string;
};
export type TargetType = "post" | "comment" | "message";

/* ───────── Metinler ───────── */
export const GRADE_LABELS: Record<number, string> = { 1: "1. sınıf", 2: "2. sınıf", 3: "3. sınıf", 4: "4. sınıf", 5: "Lisansüstü" };
export const KIND_LABEL: Record<CommunityKind, string> = { general: "Genel", department: "Bölüm", class: "Sınıf", study: "Çalışma grubu" };
export const REPORT_REASONS = [
  { id: "spam", label: "Spam veya reklam" },
  { id: "taciz", label: "Taciz veya hakaret" },
  { id: "uygunsuz", label: "Uygunsuz içerik" },
  { id: "yanlis-bilgi", label: "Yanlış bilgi" },
  { id: "diger", label: "Diğer" },
] as const;

export const SETUP_MESSAGE = "Topluluk şu anda kullanılamıyor. Biraz sonra tekrar dene.";
export const isMissingSetup = (e: unknown) => {
  const x = e as { code?: string; message?: string };
  return (
    x?.code === "PGRST202" ||
    x?.code === "42883" ||
    x?.code === "42P01" ||
    x?.code === "PGRST205" ||
    /Could not find the (function|table)|does not exist/i.test(x?.message ?? "")
  );
};
export const errText = (e: unknown) =>
  isMissingSetup(e) ? SETUP_MESSAGE : (e as { message?: string })?.message || "İşlem yapılamadı. Tekrar dene.";

/** Tüm topluluk işlemleri sunucu fonksiyonlarından (RPC) geçer; hata olursa fırlatır. */
export async function rpc<T = unknown>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabaseBrowser().rpc(name, args);
  if (error) throw error;
  return data as T;
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "şimdi";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} dk`;
  if (s < 86400) return `${Math.round(s / 3600)} sa`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} g`;
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

/** 1250 → "1,2 B", 3400000 → "3,4 Mn". Sıfır boş gösterilir (X gibi). */
export function formatCount(n: number): string {
  if (!n || n < 0) return "";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(".", ",").replace(/,0$/, "")} B`;
  return `${(n / 1_000_000).toFixed(1).replace(".", ",").replace(/,0$/, "")} Mn`;
}

/** Tam tarih/saat ("14:32 · 16 Eki 2026") — gönderi ayrıntısında gösterilir. */
export function fullDate(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  return `${time} · ${date}`;
}

/** Gönderi bağlantısını paylaşır (destekleyen cihazlarda paylaşım menüsü, değilse panoya kopyalar). */
export async function sharePostLink(id: string, text?: string): Promise<"shared" | "copied" | "failed"> {
  const url = `${window.location.origin}/topluluk/gonderi/${id}`;
  try {
    if (navigator.share) {
      await navigator.share({ url, text: text ? text.slice(0, 120) : undefined, title: "Bigova" });
      return "shared";
    }
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") return "failed";
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Satırdaki #etiketleri ve bağlantıları ayıklamak için: "#Çalışma" gibi. */
export const HASHTAG_RE = /(#[\p{L}\p{N}_]{2,40})/u;

/* ───────── Fotoğraf: küçült, yükle, imzalı adres ───────── */
export const MAX_IMAGES = 4;

/** Büyük telefon fotoğraflarını yüklemeden önce en uzun kenar 1600 px, JPEG'e küçültür. */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Yalnızca JPEG, PNG veya WebP fotoğraf yükleyebilirsin.");
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions).catch(() => null);
  if (!bmp) throw new Error("Fotoğraf okunamadı.");
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Fotoğraf işlenemedi.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Fotoğraf işlenemedi.");
  if (blob.size > 5 * 1024 * 1024) throw new Error("Fotoğraf çok büyük (en fazla 5 MB).");
  return blob;
}

/** Küçük boyutlu (ızgara) kopyanın yolu: "uid/abc.jpg" → "uid/abc_t.jpg". Gönderiye yalnızca asıl yol kaydedilir. */
export const thumbPath = (p: string) => p.replace(/\.jpg$/, "_t.jpg");

export async function removeImages(paths: string[]) {
  if (!paths.length) return;
  try {
    await supabaseBrowser().storage.from("community").remove([...paths, ...paths.map(thumbPath)]);
  } catch {}
}

/** Fotoğrafları kullanıcının kendi klasörüne yükler; biri başarısız olursa yüklenenleri geri alır. */
export async function uploadPostImages(uid: string, files: File[]): Promise<string[]> {
  const sb = supabaseBrowser();
  const done: string[] = [];
  try {
    for (const f of files) {
      const blob = await compressImage(f);
      const path = `${uid}/${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from("community").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      done.push(path);
      // Izgara görünümleri için küçük kopya; yüklenemezse sorun değil, o zaman asıl fotoğraf kullanılır.
      try {
        await sb.storage.from("community").upload(thumbPath(path), await compressImage(f, 480, 0.72), { contentType: "image/jpeg" });
      } catch {}
    }
    return done;
  } catch (e) {
    await removeImages(done);
    throw e;
  }
}

const urlCache = new Map<string, { url: string; exp: number }>();
/** Depoda bulunamayan yollar (eski gönderilerin küçük kopyası yoktur); tekrar tekrar istenmez. */
const missingPaths = new Set<string>();
const SIGN_SECONDS = 3600;

/** Özel kovadaki fotoğraflar için imzalı adresleri toplu alır (bir istekte) ve önbellekler. */
export function useImageUrls(paths: string[]): Record<string, string> {
  const [, bump] = useState(0);
  const key = useMemo(() => Array.from(new Set(paths)).sort().join("|"), [paths]);
  useEffect(() => {
    const list = key.split("|").filter(Boolean);
    const need = list.filter((p) => !missingPaths.has(p) && (!urlCache.has(p) || urlCache.get(p)!.exp < Date.now() + 60_000));
    if (!need.length) return;
    let alive = true;
    supabaseBrowser()
      .storage.from("community")
      .createSignedUrls(need, SIGN_SECONDS)
      .then(({ data }) => {
        for (const r of data ?? []) {
          if (!r.path) continue;
          if (r.signedUrl && !r.error) urlCache.set(r.path, { url: r.signedUrl, exp: Date.now() + SIGN_SECONDS * 1000 });
          else missingPaths.add(r.path);
        }
        if (alive) bump((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);
  const out: Record<string, string> = {};
  for (const p of paths) {
    const hit = urlCache.get(p);
    if (hit) out[p] = hit.url;
  }
  return out;
}

/**
 * Izgara/küçük görünümler için küçük kopyaların adreslerini döndürür (anahtar: asıl fotoğraf yolu).
 * Küçük kopyası olmayan eski fotoğraflarda asıl fotoğrafa geri döner.
 */
export function useThumbUrls(paths: string[]): Record<string, string> {
  const thumbs = useMemo(() => paths.map(thumbPath), [paths]);
  const t = useImageUrls(thumbs);
  const fallback = paths.filter((p) => missingPaths.has(thumbPath(p)));
  const full = useImageUrls(fallback);
  const out: Record<string, string> = {};
  for (const p of paths) {
    const hit = t[thumbPath(p)] ?? full[p];
    if (hit) out[p] = hit;
  }
  return out;
}

/* ───────── Kullanıcının bölümü/sınıfı ve toplulukları ───────── */
export function useMyCommunities(enabled: boolean) {
  const [list, setList] = useState<Community[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const all = await rpc<Community[]>("community_list", {});
      setList((all ?? []).filter((c) => c.is_member));
      setError(null);
    } catch (e) {
      setError(errText(e));
      setList([]);
    }
  }, [enabled]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { list, error, refresh };
}

export function useCommunityProfile(enabled: boolean) {
  const [state, setState] = useState<{ loaded: boolean; department: string | null; grade: number | null }>({ loaded: false, department: null, grade: null });
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const rows = await rpc<{ department: string; grade: number }[]>("community_my_profile");
      setState({ loaded: true, department: rows?.[0]?.department ?? null, grade: rows?.[0]?.grade ?? null });
    } catch {
      setState({ loaded: true, department: null, grade: null });
    }
  }, [enabled]);
  useEffect(() => {
    void load();
  }, [load]);
  return { ...state, reload: load };
}

/* ───────── Akış (sayfalı gönderi listesi) ───────── */
export type FeedParams = {
  scope: "mine" | "all" | "community" | "saved" | "user" | "following";
  community?: string;
  /** scope = "user" için: gönderileri listelenecek kullanıcı. */
  author?: string;
  /** Metin veya #etiket araması. */
  q?: string;
  kind?: "post" | "question";
  status?: "open" | "solved";
  /** Yalnızca fotoğraflı gönderiler (profil ve keşfet ızgaraları için). */
  media?: boolean;
};
const PAGE = 15;

export function useFeed(params: FeedParams, enabled: boolean) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const key = JSON.stringify(params);

  const fetchPage = useCallback(
    async (before: string | null) => {
      return rpc<FeedPost[]>("community_feed", {
        p_scope: params.scope,
        p_community: params.community ?? null,
        p_kind: params.kind ?? null,
        p_status: params.status ?? null,
        p_before: before,
        p_limit: PAGE,
        p_author: params.author ?? null,
        p_q: params.q?.trim() || null,
        // Yalnızca gerektiğinde gönderilir: instagram_upgrade.sql çalıştırılmadan da eski akış bozulmasın.
        ...(params.media ? { p_media: true } : {}),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const id = ++seq.current;
    setLoading(true);
    try {
      const rows = (await fetchPage(null)) ?? [];
      if (id !== seq.current) return;
      setPosts(rows);
      setHasMore(rows.length === PAGE);
      setError(null);
    } catch (e) {
      if (id === seq.current) setError(errText(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [enabled, fetchPage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    const last = posts[posts.length - 1];
    if (!last || loadingMore) return;
    const id = seq.current;
    setLoadingMore(true);
    try {
      const rows = (await fetchPage(last.sort_at ?? last.created_at)) ?? [];
      if (id !== seq.current) return;
      setPosts((cur) => [...cur, ...rows.filter((r) => !cur.some((c) => c.feed_id === r.feed_id))]);
      setHasMore(rows.length === PAGE);
      setError(null);
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoadingMore(false);
    }
  }, [posts, loadingMore, fetchPage]);

  /** Aynı gönderi akışta birden çok satırda (orijinal + yeniden paylaşımlar) olabilir; hepsi birlikte güncellenir. */
  const patch = useCallback((id: string, p: Partial<FeedPost>) => setPosts((cur) => cur.map((x) => (x.id === id ? { ...x, ...p } : x))), []);
  const remove = useCallback((id: string) => setPosts((cur) => cur.filter((x) => x.id !== id)), []);
  /** Yeniden paylaşım geri alınınca o kişinin yeniden paylaşım satırını akıştan kaldırır. */
  const removeRepostRows = useCallback((id: string, byUser: string) => setPosts((cur) => cur.filter((x) => !(x.id === id && x.feed_id !== x.id && x.reposted_by_id === byUser))), []);
  return { posts, loading, loadingMore, hasMore, error, refresh, loadMore, patch, remove, removeRepostRows };
}

/* ───────── Gönderi eylemleri (beğen, yeniden paylaş, kaydet) ───────── */
export const toggleRepost = (id: string) => rpc<{ reposted: boolean; count: number; id: string }>("community_toggle_repost", { p_post: id });
export const toggleBookmark = (id: string) => rpc<{ bookmarked: boolean }>("community_toggle_bookmark", { p_post: id });

/* ───────── Takip sistemi (supabase/instagram_upgrade.sql) ───────── */
export type FollowRelation = "self" | "following" | "pending" | "none";
export type FollowStats = { followers: number; following: number; posts: number; relation: FollowRelation; follows_me: boolean; locked: boolean };
export type FollowListUser = { user_id: string; name: string; relation: FollowRelation; created_at: string };
export type FollowRequest = { user_id: string; name: string; created_at: string };

/** "accepted" (takip ediyorsun) veya "pending" (gizli profile istek gönderildi) döner. */
export const followUser = (id: string) => rpc<"accepted" | "pending">("community_follow", { p_user: id });
export const unfollowUser = (id: string) => rpc<boolean>("community_unfollow", { p_user: id });
export const respondFollow = (id: string, accept: boolean) => rpc<boolean>("community_follow_respond", { p_user: id, p_accept: accept });
export const removeFollower = (id: string) => rpc<boolean>("community_remove_follower", { p_user: id });

export function useFollowStats(userId: string | undefined, enabled = true) {
  const [stats, setStats] = useState<FollowStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!userId || !enabled) return;
    try {
      const rows = await rpc<FollowStats[]>("community_follow_stats", { p_user: userId });
      setStats(rows?.[0] ?? null);
      setError(null);
    } catch (e) {
      setError(errText(e));
    }
  }, [userId, enabled]);
  useEffect(() => {
    setStats(null);
    void reload();
  }, [reload]);
  return { stats, error, reload, setStats };
}

/* ───────── Bildirimler ───────── */
export type NotificationType = "like" | "comment" | "reply" | "repost" | "quote" | "follow" | "follow_request" | "follow_accept";
export type AppNotification = {
  id: string;
  type: NotificationType;
  actor_id: string;
  actor_name: string;
  post_id: string | null;
  comment_id: string | null;
  snippet: string | null;
  image: string | null;
  created_at: string;
  is_read: boolean;
  /** Takip bildirimlerinde actor ile ilişkim: following | pending | incoming | none. */
  follow_state: "following" | "pending" | "incoming" | "none" | null;
};
/** Sayfalar arası "bildirim sayısı değişti" olayı (okundu işaretlenince rozet güncellensin). */
export const NOTIFS_EVENT = "bigova:notifs";

/** Okunmamış bildirim sayısı: açılışta, sekmeye dönünce ve dakikada bir yenilenir. */
export function useUnreadNotifications(enabled: boolean) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const n = await rpc<number>("community_notifications_unread_count");
      setCount(typeof n === "number" ? n : 0);
    } catch {
      /* kurulum yoksa veya geçici hata: rozeti gösterme */
    }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    void load();
    const visible = () => document.visibilityState === "visible" && void load();
    const id = window.setInterval(visible, 60_000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener(NOTIFS_EVENT, load);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener(NOTIFS_EVENT, load);
    };
  }, [enabled, load]);
  return { count, reload: load };
}

/* ───────── Keşfet, arama, öneriler (supabase/explore_stories_upgrade.sql) ───────── */
export type ExploreTile = { id: string; image: string; image_count: number; like_count: number; comment_count: number };
export type TrendingTag = { tag: string; uses: number };
export type PersonResult = { user_id: string; name: string; relation: "following" | "pending" | "none"; department: string | null };
export type SuggestedPerson = { user_id: string; name: string; reason: "mutual" | "department" | "active"; mutual: number; department: string | null };

export const SUGGEST_REASON: Record<SuggestedPerson["reason"], string> = {
  mutual: "Takip ettiklerin takip ediyor",
  department: "Aynı bölümden",
  active: "Toplulukta aktif",
};

const EXPLORE_PAGE = 24;

/** Keşfet ızgarası: popüler ve yeni fotoğraflı gönderiler, sayfa sayfa (offset). */
export function useExplore(enabled: boolean) {
  const [tiles, setTiles] = useState<ExploreTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const fetchPage = useCallback((offset: number) => rpc<ExploreTile[]>("community_explore", { p_limit: EXPLORE_PAGE, p_offset: offset }), []);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    const id = ++seq.current;
    setLoading(true);
    try {
      const rows = (await fetchPage(0)) ?? [];
      if (id !== seq.current) return;
      setTiles(rows);
      setHasMore(rows.length === EXPLORE_PAGE);
      setError(null);
    } catch (e) {
      if (id === seq.current) setError(errText(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [enabled, fetchPage]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !tiles.length) return;
    const id = seq.current;
    setLoadingMore(true);
    try {
      const rows = (await fetchPage(tiles.length)) ?? [];
      if (id !== seq.current) return;
      setTiles((cur) => [...cur, ...rows.filter((r) => !cur.some((c) => c.id === r.id))]);
      setHasMore(rows.length === EXPLORE_PAGE);
      setError(null);
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, tiles, fetchPage]);
  return { tiles, loading, loadingMore, hasMore, error, refresh, loadMore };
}

/** Gündem etiketleri (yüklenemezse sessizce boş liste: keşfet sayfası yine çalışır). */
export function useTrendingTags(enabled: boolean) {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    rpc<TrendingTag[]>("community_trending_tags", { p_limit: 12, p_days: 7 })
      .then((r) => live && setTags(r ?? []))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [enabled]);
  return tags;
}

/** "Tanıyor olabilirsin" önerileri; takip edilince ya da kapatılınca listeden çıkarılabilir. */
export function useSuggestedPeople(enabled: boolean, limit = 10) {
  const [people, setPeople] = useState<SuggestedPerson[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    rpc<SuggestedPerson[]>("community_suggested_people", { p_limit: limit })
      .then((r) => live && setPeople(r ?? []))
      .catch(() => live && setPeople([]));
    return () => {
      live = false;
    };
  }, [enabled, limit]);
  const dismiss = useCallback((id: string) => setPeople((cur) => (cur ? cur.filter((p) => p.user_id !== id) : cur)), []);
  return { people, dismiss };
}

/** Ada göre kişi arama (250 ms bekleyerek); en az 2 karakter. */
export function useSearchPeople(q: string, enabled: boolean) {
  const [results, setResults] = useState<PersonResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const term = q.replace(/^#/, "").trim();
  useEffect(() => {
    if (!enabled || term.length < 2 || q.startsWith("#")) {
      setResults(null);
      setError(null);
      return;
    }
    let live = true;
    const t = window.setTimeout(() => {
      rpc<PersonResult[]>("community_search_people", { p_q: term, p_limit: 12 })
        .then((r) => {
          if (!live) return;
          setResults(r ?? []);
          setError(null);
        })
        .catch((e) => live && setError(errText(e)));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [term, q, enabled]);
  return { results, error };
}

/* ───────── Hikayeler (24 saat) ───────── */
export type StoryTrayItem = { user_id: string; name: string; story_count: number; unseen_count: number; latest_at: string; is_self: boolean };
export type Story = { id: string; image: string; caption: string; created_at: string; expires_at: string; seen: boolean; view_count: number };
export type StoryViewerRow = { user_id: string; name: string; viewed_at: string };

/** Halka şeridi verisi. Açılışta kendi süresi dolmuş hikayelerini depodan da temizler. */
export function useStoryTray(enabled: boolean) {
  const [tray, setTray] = useState<StoryTrayItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      setTray((await rpc<StoryTrayItem[]>("community_stories_tray")) ?? []);
    } catch {
      /* kurulum yoksa veya geçici hata: şerit gösterilmez */
    } finally {
      setLoaded(true);
    }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    void reload();
    rpc<string[]>("community_story_collect_expired")
      .then((paths) => (paths?.length ? removeImages(paths) : undefined))
      .catch(() => {});
  }, [enabled, reload]);
  return { tray, loaded, reload };
}

/** Fotoğrafı yükleyip hikaye olarak paylaşır; paylaşım başarısız olursa yüklenen dosyayı geri siler. */
export async function postStory(userId: string, file: File, caption: string) {
  const paths = await uploadPostImages(userId, [file]);
  try {
    await rpc("community_story_create", { p_image: paths[0], p_caption: caption.trim() });
  } catch (e) {
    await removeImages(paths);
    throw e;
  }
}

/** Kendi hikayeni siler; fotoğrafı depodan da kaldırır. */
export async function deleteStory(id: string) {
  const path = await rpc<string | null>("community_story_delete", { p_id: id });
  if (path) await removeImages([path]);
}
