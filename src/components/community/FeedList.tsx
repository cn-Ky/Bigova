"use client";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import type { useFeed } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Notice } from "./CommunityHeader";
import PostCard from "./PostCard";
import { EmptyState } from "./ui";

/** İskelet kart: avatar + isim çizgileri + metin + görsel alanı. */
function SkeletonCard({ media = false }: { media?: boolean }) {
  return (
    <div className="rounded-[26px] bg-card p-4 shadow-sm ring-1 ring-ink/[0.04] sm:p-5">
      <div className="flex items-center gap-3">
        <span className="shimmer h-[46px] w-[46px] shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <span className="shimmer block h-3 w-2/5 rounded-full" />
          <span className="shimmer block h-2.5 w-1/5 rounded-full" />
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        <span className="shimmer block h-3 w-full rounded-full" />
        <span className="shimmer block h-3 w-4/5 rounded-full" />
      </div>
      {media && <span className="shimmer mt-4 block aspect-[4/3] w-full rounded-[20px]" />}
      <div className="mt-4 flex gap-3 border-t border-ink/[0.07] pt-3">
        <span className="shimmer h-5 w-12 rounded-full" />
        <span className="shimmer h-5 w-12 rounded-full" />
        <span className="shimmer h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

/** Yüklenirken kart biçiminde iskeletler. */
export function TimelineSkeleton({ n = 3 }: { n?: number }) {
  return (
    <div className="grid gap-3 sm:gap-4" aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: n }, (_, i) => (
        <SkeletonCard key={i} media={i === 1} />
      ))}
    </div>
  );
}

/**
 * useFeed sonucunu kart yığını olarak listeler: her gönderi ayrı bir kart,
 * sona yaklaşınca otomatik daha fazla yükleme, boş durum.
 */
export default function FeedList({
  feed,
  empty,
  showCommunity = false,
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
    <div className="grid min-w-0 gap-3">
      {feed.error && <Notice text={feed.error} />}
      <div className="grid min-w-0 gap-3 sm:gap-4">
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
        {feed.loadingMore && <SkeletonCard />}
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
