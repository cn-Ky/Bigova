"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { registerSW } from "@/lib/push";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type UnreadItem = { friend_id: string; name: string; unread: number; last_body: string | null; last_at: string };
type Toast = { id: string; from_id: string; name: string; body: string };

type Ctx = {
  total: number;
  byFriend: Record<string, number>;
  items: UnreadItem[];
  /** Sohbeti okundu işaretle (sohbet açıkken yeni mesaj gelince de çağrılır). */
  markRead: (friendId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const Empty: Ctx = { total: 0, byFriend: {}, items: [], markRead: async () => {}, refresh: async () => {} };
const NotifCtx = createContext<Ctx>(Empty);
export const useUnread = () => useContext(NotifCtx);

const POLL_MS = 30_000;

function ToastCard({ t, onOpen, onClose }: { t: Toast; onOpen: () => void; onClose: () => void }) {
  const ids = useMemo(() => [t.from_id], [t.from_id]);
  const avatars = useAvatars(ids);
  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: -28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="notif-card"
    >
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${t.name} mesajını aç`}>
        <UserAvatar name={t.name} avatar={avatars[t.from_id]} size={44} />
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate font-display">{t.name}</b>
          <span className="block truncate text-sm text-ink/70">{t.body}</span>
        </span>
      </button>
      <button onClick={onClose} aria-label="Bildirimi kapat" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foam text-xs font-bold">
        ✕
      </button>
    </motion.div>
  );
}

/**
 * Mesaj bildirimleri:
 *  · okunmamış sayacı (menü rozetleri, Keşfet kartı, sohbet listesi)
 *  · yeni mesaj gelince uygulama içi kart (canlı, Supabase Realtime)
 *  · sekme arka plandayken tarayıcı bildirimi, uygulama kapalıyken Web Push (bkz. /api/push/send)
 */
export default function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const uid = user?.id;
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const sb = useMemo(() => {
    try {
      return supabaseBrowser();
    } catch {
      return null;
    }
  }, []);
  const [items, setItems] = useState<UnreadItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const names = useRef(new Map<string, string>());
  const missing = useRef(false); // unread_summary yoksa (SQL kurulmadı) tekrar tekrar denemeyiz

  const refresh = useCallback(async () => {
    if (!sb || !uid || missing.current) return;
    const { data, error } = await sb.rpc("unread_summary");
    if (error) {
      if (error.code === "PGRST202" || /Could not find the function/i.test(error.message)) missing.current = true;
      return;
    }
    const rows = (data as UnreadItem[] | null) ?? [];
    rows.forEach((r) => names.current.set(r.friend_id, r.name));
    setItems(rows.filter((r) => r.unread > 0));
  }, [sb, uid]);

  const markRead = useCallback(
    async (friendId: string) => {
      setItems((cur) => cur.filter((i) => i.friend_id !== friendId));
      if (!sb || !uid || missing.current) return;
      await sb.rpc("mark_conversation_read", { p_friend: friendId });
    },
    [sb, uid],
  );

  // oturum kapanınca temizle
  useEffect(() => {
    if (!uid) {
      setItems([]);
      setToasts([]);
    }
  }, [uid]);

  // service worker (izin istemez, sadece kaydeder) + ilk yükleme + yedek yenileme
  useEffect(() => {
    if (!uid) return;
    void registerSW();
    void refresh();
    const timer = setInterval(() => !document.hidden && void refresh(), POLL_MS);
    const onVisible = () => !document.hidden && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [uid, refresh]);

  // canlı: bana gelen yeni mesaj
  useEffect(() => {
    if (!sb || !uid) return;
    const channel = sb
      .channel(`notif-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `to_id=eq.${uid}` },
        async (payload) => {
          const row = payload.new as { id: string; from_id: string; body: string };
          // o sohbet zaten açık ve görünürse: bildirim yok, okundu say
          if (pathRef.current === `/arkadaslar/${row.from_id}` && !document.hidden) {
            void markRead(row.from_id);
            return;
          }
          let name = names.current.get(row.from_id);
          if (!name) {
            const { data } = await sb.from("profiles").select("name").eq("id", row.from_id).maybeSingle();
            name = (data as { name?: string } | null)?.name || "Arkadaşın";
            names.current.set(row.from_id, name);
          }
          void refresh();
          const body = row.body.replace(/\s+/g, " ").trim();
          const preview = body.length > 90 ? `${body.slice(0, 87)}…` : body;
          if (document.hidden) {
            // sekme arka planda: tarayıcı bildirimi (aynı tag ile Web Push tekrarlanmaz)
            if ("Notification" in window && Notification.permission === "granted") {
              const reg = await navigator.serviceWorker?.getRegistration("/");
              void reg?.showNotification(name, {
                body: preview,
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                tag: `msg-${row.from_id}`,
                data: { url: `/arkadaslar/${row.from_id}` },
              });
            }
            return;
          }
          const t: Toast = { id: row.id, from_id: row.from_id, name, body: preview };
          setToasts((cur) => [t, ...cur.filter((x) => x.from_id !== t.from_id)].slice(0, 3));
          setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), 6500);
        },
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [sb, uid, refresh, markRead]);

  const total = useMemo(() => items.reduce((n, i) => n + i.unread, 0), [items]);
  const byFriend = useMemo(() => Object.fromEntries(items.map((i) => [i.friend_id, i.unread])), [items]);

  // sekme başlığı "(2) Bigova…" ve kurulu uygulama simgesi rozeti
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = total > 0 ? `(${total}) ${base}` : base;
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (total > 0) void nav.setAppBadge?.(total)?.catch?.(() => {});
    else void nav.clearAppBadge?.()?.catch?.(() => {});
    return () => {
      document.title = document.title.replace(/^\(\d+\)\s*/, "");
    };
  }, [total, pathname]);

  const value = useMemo<Ctx>(() => ({ total, byFriend, items, markRead, refresh }), [total, byFriend, items, markRead, refresh]);

  return (
    <NotifCtx.Provider value={value}>
      {children}
      <div className="notif-stack" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard
              key={t.id}
              t={t}
              onClose={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
              onOpen={() => {
                setToasts((cur) => cur.filter((x) => x.id !== t.id));
                router.push(`/arkadaslar/${t.from_id}`);
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotifCtx.Provider>
  );
}
