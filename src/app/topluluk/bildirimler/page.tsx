"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { BackHeader, NeedLogin, Notice } from "@/components/community/CommunityHeader";
import { FollowButton } from "@/components/community/FollowBar";
import { EmptyState, SoftButton, TIMELINE_CLASS } from "@/components/community/ui";
import { TimelineSkeleton } from "@/components/community/FeedList";
import Mascot from "@/components/Mascot";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import {
  NOTIFS_EVENT,
  errText,
  respondFollow,
  rpc,
  timeAgo,
  useThumbUrls,
  type AppNotification,
  type FollowRelation,
  type FollowRequest,
  type NotificationType,
} from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faComment, faHeart, faQuoteLeft, faReply, faRetweet, faUserCheck, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAGE = 30;

const META: Record<NotificationType, { icon: IconDefinition; tone: string; text: string; quote?: boolean }> = {
  like: { icon: faHeart, tone: "bg-coral/15 text-coral", text: "gönderini beğendi" },
  comment: { icon: faComment, tone: "bg-sea/15 text-sea", text: "gönderine yorum yaptı", quote: true },
  reply: { icon: faReply, tone: "bg-sea/15 text-sea", text: "yorumuna yanıt verdi", quote: true },
  repost: { icon: faRetweet, tone: "bg-tide/20 text-tide", text: "gönderini yeniden paylaştı" },
  quote: { icon: faQuoteLeft, tone: "bg-tide/20 text-tide", text: "gönderini alıntıladı", quote: true },
  follow: { icon: faUserPlus, tone: "bg-sun/25 text-deep", text: "seni takip etmeye başladı" },
  follow_request: { icon: faUserPlus, tone: "bg-sun/25 text-deep", text: "seni takip etmek istiyor" },
  follow_accept: { icon: faUserCheck, tone: "bg-sun/25 text-deep", text: "takip isteğini kabul etti" },
};

/** Gelen takip istekleri: kabul / reddet. */
function Requests({ list, onDone }: { list: FollowRequest[]; onDone: (id: string, accepted: boolean) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const ids = useMemo(() => list.map((r) => r.user_id), [list]);
  const avatars = useAvatars(ids);
  if (!list.length) return null;
  const answer = async (id: string, accept: boolean) => {
    setBusy(id);
    setErr("");
    try {
      await respondFollow(id, accept);
      onDone(id, accept);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <section aria-label="Takip istekleri" className="rounded-[24px] bg-card p-4 shadow-sm">
      <h2 className="font-display text-base font-extrabold">Takip istekleri · {list.length}</h2>
      <ul className="mt-2 grid gap-1">
        {list.map((r) => (
          <li key={r.user_id} className="flex items-center gap-3 py-1.5">
            <Link href={`/profil/${r.user_id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar name={r.name} avatar={avatars[r.user_id]} size={44} />
              <span className="min-w-0 leading-tight">
                <b className="block truncate">{r.name || "Öğrenci"}</b>
                <span className="text-xs text-ink/55">{timeAgo(r.created_at)}</span>
              </span>
            </Link>
            <motion.button whileTap={{ scale: 0.92 }} type="button" disabled={busy === r.user_id} onClick={() => answer(r.user_id, true)} className="rounded-full bg-sea px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60">
              Kabul et
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} type="button" disabled={busy === r.user_id} onClick={() => answer(r.user_id, false)} className="rounded-full bg-foam px-4 py-1.5 text-xs font-bold disabled:opacity-60">
              Reddet
            </motion.button>
          </li>
        ))}
      </ul>
      {err && (
        <p role="alert" className="mt-2 text-xs font-bold text-coral">
          {err}
        </p>
      )}
    </section>
  );
}

function Row({ n, avatar, thumb, onFollow }: { n: AppNotification; avatar?: Parameters<typeof UserAvatar>[0]["avatar"]; thumb?: string; onFollow: (r: FollowRelation) => void }) {
  const m = META[n.type];
  const href = n.post_id ? `/topluluk/gonderi/${n.post_id}` : `/profil/${n.actor_id}`;
  const isFollow = n.type === "follow" || n.type === "follow_accept";
  return (
    <li className={`relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foam/60 ${n.is_read ? "" : "bg-sea/[0.06]"}`}>
      {!n.is_read && <span aria-label="Okunmadı" className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-sea" />}
      <Link href={`/profil/${n.actor_id}`} aria-label={`${n.actor_name} profili`} className="relative shrink-0">
        <UserAvatar name={n.actor_name} avatar={avatar} size={46} />
        <span aria-hidden className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-[9px] ring-2 ring-card ${m.tone}`}>
          <FontAwesomeIcon icon={m.icon} />
        </span>
      </Link>
      <Link href={href} className="min-w-0 flex-1 text-sm leading-snug">
        <b className="font-extrabold">{n.actor_name || "Öğrenci"}</b> {m.text}
        {m.quote && n.snippet ? <span className="text-ink/70">: “{n.snippet}”</span> : null}
        <span className="ml-1.5 text-xs text-ink/55">{timeAgo(n.created_at)}</span>
      </Link>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
      ) : n.image ? (
        <span className="shimmer h-12 w-12 shrink-0 rounded-xl" aria-hidden />
      ) : null}
      {isFollow && n.follow_state && n.follow_state !== "incoming" && (
        <FollowButton compact userId={n.actor_id} name={n.actor_name} relation={n.follow_state === "following" ? "following" : n.follow_state === "pending" ? "pending" : "none"} onChange={onFollow} />
      )}
    </li>
  );
}

export default function Bildirimler() {
  const { user } = useUser();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const marked = useRef(false);

  const load = useCallback(async (before: string | null) => {
    setLoading(true);
    try {
      const page = (await rpc<AppNotification[]>("community_notifications_list", { p_before: before, p_limit: PAGE })) ?? [];
      setItems((cur) => (before ? [...cur, ...page.filter((p) => !cur.some((c) => c.id === p.id))] : page));
      setMore(page.length === PAGE);
      setError("");
      return true;
    } catch (e) {
      setError(errText(e));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const ok = await load(null);
      rpc<FollowRequest[]>("community_follow_requests").then((r) => setRequests(r ?? [])).catch(() => {});
      // Listeyi (okunmamış vurgusu korunarak) gösterdikten sonra hepsini okundu say; rozet sıfırlansın.
      if (ok && !marked.current) {
        marked.current = true;
        rpc("community_notifications_mark_read")
          .then(() => window.dispatchEvent(new Event(NOTIFS_EVENT)))
          .catch(() => {});
      }
    })();
  }, [user, load]);

  const actorIds = useMemo(() => [...items.map((i) => i.actor_id)], [items]);
  const avatars = useAvatars(actorIds);
  const imagePaths = useMemo(() => Array.from(new Set(items.map((i) => i.image).filter((x): x is string => !!x))), [items]);
  const thumbs = useThumbUrls(imagePaths);

  if (user === undefined) return <main className="p-5"><TimelineSkeleton n={3} /></main>;
  if (!user) return <NeedLogin what="Bildirimleri görmek" />;

  const setFollowState = (actor: string, rel: FollowRelation) =>
    setItems((cur) => cur.map((x) => (x.actor_id === actor && x.follow_state ? { ...x, follow_state: rel === "following" ? "following" : rel === "pending" ? "pending" : "none" } : x)));

  return (
    <main className="pb-28">
      <BackHeader title="Bildirimler" subtitle="Beğeni, yorum ve takip hareketleri" />
      <div className="grid gap-4 px-5 pt-5">
        <Requests
          list={requests}
          onDone={(id) => {
            setRequests((cur) => cur.filter((r) => r.user_id !== id));
            void load(null);
          }}
        />
        {error && <Notice text={error} />}
        {loading && !items.length ? (
          <TimelineSkeleton n={4} />
        ) : !items.length && !error ? (
          <EmptyState>
            <Mascot size={96} className="mx-auto" />
            <p className="font-display text-lg font-extrabold">Henüz bildirim yok</p>
            <p className="mt-1 text-sm text-ink/70">Biri gönderini beğenince, yorum yapınca veya seni takip edince burada görürsün.</p>
          </EmptyState>
        ) : (
          <ul className={TIMELINE_CLASS}>
            {items.map((n) => (
              <Row key={n.id} n={n} avatar={avatars[n.actor_id]} thumb={n.image ? thumbs[n.image] : undefined} onFollow={(r) => setFollowState(n.actor_id, r)} />
            ))}
          </ul>
        )}
        {more && !loading && (
          <SoftButton type="button" onClick={() => load(items[items.length - 1]?.created_at ?? null)} className="mx-auto">
            Daha eski bildirimler
          </SoftButton>
        )}
      </div>
    </main>
  );
}
