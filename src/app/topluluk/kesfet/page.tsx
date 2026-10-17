"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import CommunityHeader, { NeedLogin, Notice } from "@/components/community/CommunityHeader";
import { FollowButton } from "@/components/community/FollowBar";
import { GRID_CLASS, GridSkeleton, PhotoTile, RetryButton, useInfiniteSentinel } from "@/components/community/PhotoGrid";
import SuggestedPeople from "@/components/community/SuggestedPeople";
import { EmptyState } from "@/components/community/ui";
import Mascot from "@/components/Mascot";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { useExplore, useSearchPeople, useThumbUrls, useTrendingTags, type FollowRelation, type TrendingTag } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faHashtag, faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";

/** Gündem etiketleri: tıklayınca akışta o etiketi arar. */
function Trending({ tags }: { tags: TrendingTag[] }) {
  if (!tags.length) return null;
  return (
    <section aria-label="Gündem etiketleri">
      <h2 className="mb-2 font-display text-lg font-extrabold">Gündemde</h2>
      <ul className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <li key={t.tag}>
            <motion.div whileTap={{ scale: 0.92 }}>
              <Link href={`/topluluk?q=${encodeURIComponent(t.tag)}`} className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-sm font-bold shadow-sm transition-shadow hover:shadow-md">
                <span className="text-sea">{t.tag}</span>
                <span className="text-xs font-normal text-ink/50">{t.uses} gönderi</span>
              </Link>
            </motion.div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Arama sonuçları: kişiler (takip düğmesiyle), etiketler ve gönderilerde arama bağlantısı. */
function Results({ q, tags, enabled }: { q: string; tags: TrendingTag[]; enabled: boolean }) {
  const term = q.trim();
  const { results, error } = useSearchPeople(term, enabled);
  const [rel, setRel] = useState<Record<string, FollowRelation>>({});
  const avatars = useAvatars(useMemo(() => (results ?? []).map((r) => r.user_id), [results]));
  const bare = term.replace(/^#/, "").toLowerCase();
  const matching = bare.length >= 2 ? tags.filter((t) => t.tag.slice(1).includes(bare)) : [];
  const tagTerm = term.startsWith("#") && bare.length >= 2 ? `#${bare}` : null;

  if (term.replace(/^#/, "").length < 2) return <p className="rounded-2xl bg-foam p-4 text-center text-sm text-ink/65">Aramak için en az 2 harf yaz. Kişi adı ya da #etiket deneyebilirsin.</p>;
  return (
    <div className="grid gap-5" aria-live="polite">
      {error && <Notice text={error} />}
      {results && results.length > 0 && (
        <section aria-label="Kişiler">
          <h2 className="mb-2 font-display text-lg font-extrabold">Kişiler</h2>
          <ul className="grid gap-1 rounded-[22px] bg-card p-2 shadow-sm">
            {results.map((p) => (
              <li key={p.user_id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                <Link href={`/profil/${p.user_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar name={p.name} avatar={avatars[p.user_id]} size={46} />
                  <span className="min-w-0 leading-tight">
                    <b className="block truncate font-extrabold">{p.name}</b>
                    {p.department && <span className="block truncate text-xs text-ink/55">{p.department}</span>}
                  </span>
                </Link>
                <FollowButton compact userId={p.user_id} name={p.name} relation={rel[p.user_id] ?? p.relation} onChange={(r) => setRel((cur) => ({ ...cur, [p.user_id]: r }))} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {(tagTerm || matching.length > 0) && (
        <section aria-label="Etiketler">
          <h2 className="mb-2 font-display text-lg font-extrabold">Etiketler</h2>
          <ul className="flex flex-wrap gap-2">
            {[...(tagTerm && !matching.some((m) => m.tag === tagTerm) ? [{ tag: tagTerm, uses: 0 }] : []), ...matching].map((t) => (
              <li key={t.tag}>
                <Link href={`/topluluk?q=${encodeURIComponent(t.tag)}`} className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-sm font-bold text-sea shadow-sm">
                  <FontAwesomeIcon icon={faHashtag} className="text-xs" />
                  {t.tag.slice(1)}
                  {t.uses > 0 && <span className="text-xs font-normal text-ink/50">{t.uses} gönderi</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link href={`/topluluk?q=${encodeURIComponent(term)}`} className="flex items-center gap-3 rounded-[22px] bg-card p-4 font-bold shadow-sm transition-shadow hover:shadow-md">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-sea/10 text-sea">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </span>
        <span className="min-w-0 truncate">“{term}” geçen gönderileri ara</span>
      </Link>
      {results && results.length === 0 && !tagTerm && matching.length === 0 && <p className="text-center text-sm text-ink/60">Bu adla bir kişi bulunamadı.</p>}
    </div>
  );
}

/** Popüler ve yeni fotoğraflı gönderilerden oluşan sonsuz kaydırmalı ızgara. */
function ExploreGrid({ enabled }: { enabled: boolean }) {
  const ex = useExplore(enabled);
  const thumbs = useThumbUrls(useMemo(() => ex.tiles.map((t) => t.image), [ex.tiles]));
  const sentinel = useInfiniteSentinel(ex.hasMore, ex.loadingMore, ex.error, ex.loadMore, ex.tiles.length);
  if (ex.loading && !ex.tiles.length) return <GridSkeleton />;
  if (ex.error && !ex.tiles.length) return <Notice text={ex.error} />;
  if (!ex.tiles.length)
    return (
      <EmptyState>
        <Mascot size={96} className="mx-auto" />
        <p className="font-display text-lg font-extrabold">Keşfedecek fotoğraf yok</p>
        <p className="mt-1 text-sm text-ink/70">Topluluktaki fotoğraflı gönderiler burada görünür. İlk fotoğrafı sen paylaşabilirsin.</p>
      </EmptyState>
    );
  return (
    <section aria-label="Keşfet" className="grid gap-3">
      <h2 className="font-display text-lg font-extrabold">Senin için</h2>
      {ex.error && <Notice text={ex.error} />}
      <ul className={GRID_CLASS}>
        {ex.tiles.map((t) => (
          <PhotoTile key={t.id} id={t.id} thumb={thumbs[t.image]} imageCount={t.image_count} likes={t.like_count} comments={t.comment_count} label="" />
        ))}
        {ex.loadingMore && Array.from({ length: 3 }, (_, i) => <li key={`s${i}`} className="shimmer aspect-square" />)}
      </ul>
      <div ref={sentinel} aria-hidden className="h-px" />
      {ex.hasMore && !ex.loadingMore && ex.error && <RetryButton onClick={ex.loadMore} />}
    </section>
  );
}

export default function Kesfet() {
  const { user } = useUser();
  const [q, setQ] = useState("");
  const enabled = !!user;
  const tags = useTrendingTags(enabled);
  const searching = q.trim().length > 0;

  if (user === undefined) return <main className="p-5"><GridSkeleton n={6} /></main>;
  if (!user) return <NeedLogin what="Keşfet'i görmek" />;
  return (
    <main className="pb-28">
      <CommunityHeader active="kesfet" />
      <div className="grid gap-5 px-5 pt-5">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
          <input value={q} onChange={(e) => setQ(e.target.value.slice(0, 80))} type="search" inputMode="search" enterKeyHint="search" autoComplete="off" placeholder="Kişi veya #etiket ara" aria-label="Kişi veya etiket ara" className="h-12 w-full rounded-full bg-card pl-11 pr-11 text-base shadow-sm outline-none ring-1 ring-ink/5 placeholder:text-ink/45 focus:ring-2 focus:ring-sun" />
          {q && (
            <button type="button" aria-label="Aramayı temizle" onClick={() => setQ("")} className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-ink/10 text-xs">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </form>
        {searching ? (
          <Results q={q} tags={tags} enabled={enabled} />
        ) : (
          <>
            <SuggestedPeople enabled={enabled} />
            <Trending tags={tags} />
            <ExploreGrid enabled={enabled} />
          </>
        )}
      </div>
    </main>
  );
}
