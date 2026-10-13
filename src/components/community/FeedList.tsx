"use client";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import type { useFeed } from "@/lib/community";
import { useMemo, type ReactNode } from "react";
import { Notice, Skeleton } from "./CommunityHeader";
import PostCard from "./PostCard";

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
  if (!feed.posts.length) return <div className="rounded-[22px] bg-card p-6 text-center shadow-sm">{empty}</div>;
  return (
    <div className="grid gap-3">
      {feed.error && <Notice text={feed.error} />}
      {feed.posts.map((p) => (
        <PostCard key={p.id} post={p} avatar={avatars[p.author_id]} showCommunity={showCommunity} onPatch={(x) => feed.patch(p.id, x)} onRemove={() => feed.remove(p.id)} />
      ))}
      {feed.hasMore && (
        <button type="button" onClick={feed.loadMore} disabled={feed.loadingMore} className="mx-auto rounded-full bg-card px-5 py-2.5 text-sm font-extrabold shadow-sm disabled:opacity-60">
          {feed.loadingMore ? "Yükleniyor…" : "Daha fazla göster"}
        </button>
      )}
    </div>
  );
}
