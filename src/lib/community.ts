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
  id: string;
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
  accepted_comment_id: string | null;
  liked: boolean;
  mine: boolean;
  can_moderate: boolean;
  hidden: boolean;
  created_at: string;
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

export const SETUP_MESSAGE = "Topluluk henüz kurulmadı: Supabase'de supabase/community_upgrade.sql dosyasını çalıştır.";
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

export async function removeImages(paths: string[]) {
  if (!paths.length) return;
  try {
    await supabaseBrowser().storage.from("community").remove(paths);
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
    }
    return done;
  } catch (e) {
    await removeImages(done);
    throw e;
  }
}

const urlCache = new Map<string, { url: string; exp: number }>();
const SIGN_SECONDS = 3600;

/** Özel kovadaki fotoğraflar için imzalı adresleri toplu alır (bir istekte) ve önbellekler. */
export function useImageUrls(paths: string[]): Record<string, string> {
  const [, bump] = useState(0);
  const key = useMemo(() => Array.from(new Set(paths)).sort().join("|"), [paths]);
  useEffect(() => {
    const list = key.split("|").filter(Boolean);
    const need = list.filter((p) => !urlCache.has(p) || urlCache.get(p)!.exp < Date.now() + 60_000);
    if (!need.length) return;
    let alive = true;
    supabaseBrowser()
      .storage.from("community")
      .createSignedUrls(need, SIGN_SECONDS)
      .then(({ data }) => {
        for (const r of data ?? []) if (r.path && r.signedUrl) urlCache.set(r.path, { url: r.signedUrl, exp: Date.now() + SIGN_SECONDS * 1000 });
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
  scope: "mine" | "all" | "community";
  community?: string;
  kind?: "post" | "question";
  status?: "open" | "solved";
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
      const rows = (await fetchPage(last.created_at)) ?? [];
      if (id !== seq.current) return;
      setPosts((cur) => [...cur, ...rows.filter((r) => !cur.some((c) => c.id === r.id))]);
      setHasMore(rows.length === PAGE);
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoadingMore(false);
    }
  }, [posts, loadingMore, fetchPage]);

  const patch = useCallback((id: string, p: Partial<FeedPost>) => setPosts((cur) => cur.map((x) => (x.id === id ? { ...x, ...p } : x))), []);
  const remove = useCallback((id: string) => setPosts((cur) => cur.filter((x) => x.id !== id)), []);
  return { posts, loading, loadingMore, hasMore, error, refresh, loadMore, patch, remove };
}
