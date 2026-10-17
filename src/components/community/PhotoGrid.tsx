"use client";
import { formatCount, useFeed, useThumbUrls } from "@/lib/community";
import { faClone, faComment, faHeart } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Notice } from "./CommunityHeader";
import { EmptyState } from "./ui";

/** 3 sütunlu kare ızgara kabı (profil ve keşfet ortak kullanır). */
export const GRID_CLASS = "grid grid-cols-3 gap-0.5 overflow-hidden rounded-[20px] bg-card sm:gap-1";

/** Yüklenirken 3 sütunlu iskelet kareler. */
export function GridSkeleton({ n = 9 }: { n?: number }) {
  return (
    <div className={GRID_CLASS} aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="shimmer aspect-square" />
      ))}
    </div>
  );
}

/**
 * Izgaradaki tek kare: küçük görsel, çoklu fotoğrafta galeri simgesi; üzerine gelince (veya klavyeyle odaklanınca)
 * beğeni ve yorum sayısı. Tıklanınca gönderi açılır.
 */
export function PhotoTile({ id, thumb, imageCount, likes, comments, label }: { id: string; thumb?: string; imageCount: number; likes: number; comments: number; label: string }) {
  return (
    <li className="group relative aspect-square bg-foam">
      <Link href={`/bigola/gonderi/${id}`} aria-label={`Gönderiyi aç: ${label || "fotoğraflı gönderi"}, ${likes} beğeni, ${comments} yorum`} className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sun">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <span className="shimmer block h-full w-full" />
        )}
        {imageCount > 1 && (
          <span aria-hidden className="absolute right-1.5 top-1.5 text-sm text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.6)]">
            <FontAwesomeIcon icon={faClone} />
          </span>
        )}
        <span aria-hidden className="absolute inset-0 flex items-center justify-center gap-4 bg-deep/45 text-sm font-extrabold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <span>
            <FontAwesomeIcon icon={faHeart} className="mr-1" />
            {formatCount(likes) || 0}
          </span>
          <span>
            <FontAwesomeIcon icon={faComment} className="mr-1" />
            {formatCount(comments) || 0}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** Sona yaklaşınca sonraki sayfayı yükler (hata varsa otomatik denemeyi durdurur; "Tekrar dene" düğmesi kalır). */
export function useInfiniteSentinel(hasMore: boolean, loadingMore: boolean, error: unknown, loadMore: () => void, count: number): RefObject<HTMLDivElement> {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loadingMore || error || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), { rootMargin: "500px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, error, loadMore, count]);
  return sentinel;
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={onClick} className="mx-auto rounded-full bg-card px-5 py-2.5 text-sm font-bold shadow-sm">
      Tekrar dene
    </motion.button>
  );
}

/**
 * Profil ızgarası: yalnızca profil sahibinin kendi fotoğraflı gönderileri (başkasından yeniden paylaşılanlar hariç).
 */
export default function PhotoGrid({ feed, ownerId, empty }: { feed: ReturnType<typeof useFeed>; ownerId: string; empty: ReactNode }) {
  const tiles = useMemo(() => feed.posts.filter((p) => p.feed_id === p.id && p.author_id === ownerId && p.images.length > 0), [feed.posts, ownerId]);
  const thumbs = useThumbUrls(useMemo(() => tiles.map((p) => p.images[0]), [tiles]));
  const { hasMore, loadingMore, loadMore, error } = feed;
  const sentinel = useInfiniteSentinel(hasMore, loadingMore, error, loadMore, tiles.length);

  if (feed.loading && !feed.posts.length) return <GridSkeleton />;
  if (feed.error && !tiles.length) return <Notice text={feed.error} />;
  // Bu sayfada fotoğraf çıkmadıysa ama sonrası varsa boş durum gösterme; sayfa yüklenmeye devam eder.
  if (!tiles.length && !feed.hasMore) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="grid gap-3">
      {feed.error && <Notice text={feed.error} />}
      <ul className={GRID_CLASS}>
        {tiles.map((p) => (
          <PhotoTile key={p.feed_id} id={p.id} thumb={thumbs[p.images[0]]} imageCount={p.images.length} likes={p.like_count} comments={p.comment_count} label={p.body.slice(0, 60)} />
        ))}
        {loadingMore && Array.from({ length: 3 }, (_, i) => <li key={`s${i}`} className="shimmer aspect-square" />)}
      </ul>
      <div ref={sentinel} aria-hidden className="h-px" />
      {hasMore && !loadingMore && error && <RetryButton onClick={loadMore} />}
    </div>
  );
}
