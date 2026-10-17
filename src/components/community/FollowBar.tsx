"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import {
  errText,
  followUser,
  formatCount,
  rpc,
  SETUP_MESSAGE,
  unfollowUser,
  useFollowStats,
  type FollowListUser,
  type FollowRelation,
} from "@/lib/community";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Sheet from "./Sheet";

/**
 * Takip et / İstek gönderildi / Takiptesin düğmesi. Gizli profillerde takip bir istek olarak başlar.
 * "İstek gönderildi" düğmesine basmak isteği geri çeker; "Takiptesin" onaydan sonra takibi bırakır.
 */
export function FollowButton({
  userId,
  name,
  relation,
  followsMe = false,
  compact = false,
  onChange,
}: {
  userId: string;
  name?: string;
  relation: FollowRelation;
  followsMe?: boolean;
  compact?: boolean;
  onChange: (r: FollowRelation) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (relation === "self") return null;

  const act = async () => {
    if (busy) return;
    if (relation === "following" && !window.confirm(`${name || "Bu kişi"} takipten çıkarılsın mı?`)) return;
    setBusy(true);
    setErr("");
    try {
      if (relation === "none") onChange((await followUser(userId)) === "pending" ? "pending" : "following");
      else {
        await unfollowUser(userId);
        onChange("none");
      }
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const label = relation === "none" ? (followsMe ? "Sen de takip et" : "Takip et") : relation === "pending" ? "İstek gönderildi" : "Takiptesin";
  const tone = relation === "none" ? "bg-sea text-white" : "bg-card text-ink/70 ring-1 ring-ink/10";
  return (
    <div className="flex flex-col items-center">
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={act}
        disabled={busy}
        aria-pressed={relation === "following"}
        className={`rounded-full font-bold transition-opacity disabled:opacity-60 ${compact ? "px-4 py-1.5 text-xs" : "px-6 py-3 text-sm"} ${tone}`}
      >
        {busy ? "…" : label}
      </motion.button>
      {err && (
        <p role="alert" className="mt-1 max-w-[14rem] text-center text-[11px] font-bold text-coral">
          {err}
        </p>
      )}
    </div>
  );
}

const PAGE = 30;

/** Takipçi / takip edilen listesi (alttan açılan pencere). */
function FollowListSheet({ userId, following, onClose, onChanged }: { userId: string; following: boolean; onClose: () => void; onChanged: () => void }) {
  const [rows, setRows] = useState<FollowListUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (before: string | null) => {
      setLoading(true);
      try {
        const page = (await rpc<FollowListUser[]>("community_follow_list", { p_user: userId, p_following: following, p_before: before, p_limit: PAGE })) ?? [];
        setRows((cur) => (before ? [...cur, ...page] : page));
        setMore(page.length === PAGE);
        setError("");
      } catch (e) {
        setError(errText(e));
      } finally {
        setLoading(false);
      }
    },
    [userId, following],
  );
  useEffect(() => {
    void load(null);
  }, [load]);

  const ids = useMemo(() => rows.map((r) => r.user_id), [rows]);
  const avatars = useAvatars(ids);

  return (
    <Sheet title={following ? "Takip edilenler" : "Takipçiler"} onClose={onClose}>
      {error && (
        <p role="alert" className="mb-3 rounded-2xl bg-coral/25 px-4 py-3 text-sm font-bold">
          {error}
        </p>
      )}
      {!loading && !error && rows.length === 0 && <p className="rounded-2xl bg-foam p-4 text-center text-sm text-ink/70">{following ? "Henüz kimseyi takip etmiyor." : "Henüz takipçi yok."}</p>}
      <ul className="grid gap-1">
        {rows.map((r) => (
          <li key={r.user_id} className="flex items-center gap-3 rounded-2xl px-1 py-2">
            <Link href={`/profil/${r.user_id}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar name={r.name} avatar={avatars[r.user_id]} size={44} />
              <span className="truncate font-extrabold">{r.name || "Öğrenci"}</span>
            </Link>
            <FollowButton
              compact
              userId={r.user_id}
              name={r.name}
              relation={r.relation}
              onChange={(rel) => {
                setRows((cur) => cur.map((x) => (x.user_id === r.user_id ? { ...x, relation: rel } : x)));
                onChanged();
              }}
            />
          </li>
        ))}
      </ul>
      {loading && <div className="shimmer mt-2 h-14 rounded-2xl" aria-busy="true" aria-label="Yükleniyor" />}
      {more && !loading && (
        <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={() => load(rows[rows.length - 1]?.created_at ?? null)} className="mx-auto mt-3 block rounded-full bg-foam px-5 py-2.5 text-sm font-bold">
          Daha fazla göster
        </motion.button>
      )}
    </Sheet>
  );
}

/** Profil sayfasındaki Gönderi · Takipçi · Takip sayaçları ve takip düğmesi. */
export default function FollowBar({ userId, blocked = false }: { userId: string; blocked?: boolean }) {
  const { stats, error, reload, setStats } = useFollowStats(userId);
  const [list, setList] = useState<null | "followers" | "following">(null);

  // Takip SQL'i henüz kurulmadıysa profil sayfası eskisi gibi çalışsın: hiçbir şey gösterme.
  if (!stats && error === SETUP_MESSAGE) return null;
  if (!stats)
    return error ? (
      <p role="alert" className="mx-auto mt-4 max-w-sm text-center text-sm font-bold text-coral">
        {error}
      </p>
    ) : (
      <div className="shimmer mx-auto mt-4 h-16 max-w-sm rounded-2xl" aria-busy="true" aria-label="Yükleniyor" />
    );

  const openable = !stats.locked || stats.relation === "self";
  const cell = "rounded-2xl bg-card p-3 text-center";
  return (
    <div className="mx-auto mt-4 max-w-sm">
      <ul className="grid grid-cols-3 gap-2">
        <li className={cell}>
          <b className="block font-display text-xl">{formatCount(stats.posts) || 0}</b>
          <span className="text-xs text-ink/60">Gönderi</span>
        </li>
        {(["followers", "following"] as const).map((k) => (
          <li key={k}>
            <button type="button" disabled={!openable} onClick={() => setList(k)} className={`${cell} w-full transition-shadow enabled:hover:shadow-md`}>
              <b className="block font-display text-xl">{formatCount(stats[k]) || 0}</b>
              <span className="text-xs text-ink/60">{k === "followers" ? "Takipçi" : "Takip"}</span>
            </button>
          </li>
        ))}
      </ul>
      {!blocked && stats.relation !== "self" && (
        <div className="mt-3 flex justify-center">
          <FollowButton
            userId={userId}
            relation={stats.relation}
            followsMe={stats.follows_me}
            onChange={(rel) => {
              setStats((s) => (s ? { ...s, relation: rel, followers: Math.max(0, s.followers + (rel === "following" ? 1 : stats.relation === "following" ? -1 : 0)) } : s));
              void reload();
            }}
          />
        </div>
      )}
      <AnimatePresence>{list && <FollowListSheet userId={userId} following={list === "following"} onClose={() => setList(null)} onChanged={reload} />}</AnimatePresence>
    </div>
  );
}
