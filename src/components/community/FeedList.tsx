"use client";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import type { useFeed } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Notice } from "./CommunityHeader";
import PostCard from "./PostCard";
import { EmptyState, TIMELINE_CLASS } from "./ui";

/** İskelet satırı: avatar + üç çizgi. */
function SkeletonRow() {
  return (
    <div className="flex gap-3 px-4 py-4">
      <span className="shimmer h-11 w-11 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2.5 pt-1">
        <span className="shimmer block h-3 w-1/3 rounded-full" />
        <span className="shimmer block h-3 w-full rounded-full" />
        <span className="shimmer block h-3 w-4/5 rounded-full" />
      </div>
    </div>
  );
}

/** Yüklenirken zaman çizelgesi biçiminde iskelet satırları. */
export function TimelineSkeleton({ n = 3 }: { n?: number }) {
  return (
    <div className={TIMELINE_CLASS} aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: n }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

/**
 * useFeed sonucunu X/Threads tarzı tek bir zaman çizelgesi olarak listeler: ince ayraçlı satırlar,
 * sona yaklaşınca otomatik daha fazla yükleme, boş durum.
 */
export default function FeedList({
  feed,
  empty,
  showCommunity = true,
}: {
  feed: ReturnType<typeof useFeed>;
  empty: ReactNode;
  showCommunity?: boolean;
}) {
  const { user } = useUser();
  const ids = useMemo(
    () => feed.posts.flatMap((p) => [p.author_id, p.quoted_author_id, p.reposted_by_id]).filter((x): x is string => !!x),
    [feed.posts],
  );
  const avatars = useAvatars(ids);

  // Sona yaklaşınca sonraki sayfayı yükle (hata varsa otomatik denemeyi durdur; düğme kalır).
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasMore, loadingMore, loadMore, error } = feed;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loadingMore || error || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), { rootMargin: "500px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, loadMore, error, feed.posts.length]);

  if (feed.loading && !feed.posts.length) return <TimelineSkeleton />;
  if (feed.error && !feed.posts.length) return <Notice text={feed.error} />;
  if (!feed.posts.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="grid gap-3">
      {feed.error && <Notice text={feed.error} />}
      <div className={TIMELINE_CLASS}>
        <AnimatePresence initial={false}>
          {feed.posts.map((p) => (
            <PostCard
              key={p.feed_id}
              post={p}
              avatar={avatars[p.author_id]}
              quotedAvatar={p.quoted_author_id ? avatars[p.quoted_author_id] : undefined}
              showCommunity={showCommunity}
              onPatch={(x) => feed.patch(p.id, x)}
              onRemove={() => feed.remove(p.id)}
              onUnrepost={() => user && feed.removeRepostRows(p.id, user.id)}
              onChanged={feed.refresh}
            />
          ))}
        </AnimatePresence>
        {feed.loadingMore && <SkeletonRow />}
      </div>
      <div ref={sentinel} aria-hidden className="h-px" />
      {feed.hasMore && !feed.loadingMore && feed.error && (
        <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={feed.loadMore} className="mx-auto rounded-full bg-card px-5 py-2.5 text-sm font-bold shadow-sm transition-shadow hover:shadow-md">
          Tekrar dene
        </motion.button>
      )}
      {!feed.hasMore && feed.posts.length > 5 && <p className="pb-2 text-center text-xs font-bold text-ink/45">Hepsi bu kadar 🎉</p>}
    </div>
  );
}
