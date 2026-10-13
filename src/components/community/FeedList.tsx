"use client";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import type { useFeed } from "@/lib/community";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, type ReactNode } from "react";
import { Notice, Skeleton } from "./CommunityHeader";
import PostCard from "./PostCard";
import { EmptyState } from "./ui";

/** useFeed sonucunu gönderi kartları, boş durum ve "daha fazla" düğmesiyle listeler. */
export default function FeedList({
  feed,
  empty,
  showCommunity = true,
}: {
  feed: ReturnType<typeof useFeed>;
  empty: ReactNode;
  showCommunity?: boolean;
}) {
  const ids = useMemo(() => feed.posts.map((p) => p.author_id), [feed.posts]);
  const avatars = useAvatars(ids);
  if (feed.loading && !feed.posts.length) return <Skeleton />;
  if (feed.error && !feed.posts.length) return <Notice text={feed.error} />;
  if (!feed.posts.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="grid gap-3">
      {feed.error && <Notice text={feed.error} />}
      <AnimatePresence initial={false}>
        {feed.posts.map((p) => (
          <PostCard key={p.id} post={p} avatar={avatars[p.author_id]} showCommunity={showCommunity} onPatch={(x) => feed.patch(p.id, x)} onRemove={() => feed.remove(p.id)} />
        ))}
      </AnimatePresence>
      {feed.loadingMore && <div className="shimmer h-36 rounded-[24px]" aria-busy="true" aria-label="Yükleniyor" />}
      {feed.hasMore && !feed.loadingMore && (
        <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={feed.loadMore} className="mx-auto rounded-full bg-card px-5 py-2.5 text-sm font-bold shadow-sm transition-shadow hover:shadow-md">
          Daha fazla göster
        </motion.button>
      )}
    </div>
  );
}
