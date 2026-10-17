"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { BigolaPage } from "@/components/community/BigolaLayout";
import { NeedLogin, Notice } from "@/components/community/CommunityHeader";
import FeedList, { TimelineSkeleton } from "@/components/community/FeedList";
import { FollowButton } from "@/components/community/FollowBar";
import { GRID_CLASS, GridSkeleton, PhotoTile, RetryButton, useInfiniteSentinel } from "@/components/community/PhotoGrid";
import SuggestedPeople from "@/components/community/SuggestedPeople";
import { tagHref } from "@/components/community/Trending";
import { EmptyState, TabChips } from "@/components/community/ui";
import Mascot from "@/components/Mascot";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { HASHTAG_RE, useExplore, useFeed, useSearchPeople, useThumbUrls, useTrendingTags, type FollowRelation, type TrendingTag } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faFire, faHashtag, faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type Tab = "posts" | "people";
const TABS = [
  { id: "posts", label: "Gönderiler" },
  { id: "people", label: "Kişiler" },
] as const;

/** Arama kutusu: yazdıkça (kısa gecikmeyle) adres çubuğundaki ?q= güncellenir; sonuç paylaşılabilir. */
function SearchBox({ q }: { q: string }) {
  const router = useRouter();
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const v = text.trim();
      if (v !== q) router.replace(v ? `/bigola/kesfet?q=${encodeURIComponent(v)}` : "/bigola/kesfet", { scroll: false });
    }, 350);
    return () => window.clearTimeout(t);
  }, [text, q, router]);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = text.trim();
        router.replace(v ? `/bigola/kesfet?q=${encodeURIComponent(v)}` : "/bigola/kesfet", { scroll: false });
      }}
      className="relative"
    >
      <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 80))}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Kişi veya #etiket ara"
        aria-label="Kişi veya #etiket ara"
        className="h-12 w-full rounded-full bg-card pl-11 pr-12 text-base shadow-sm outline-none ring-1 ring-ink/5 placeholder:text-ink/45 focus:ring-2 focus:ring-sun [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button type="button" aria-label="Aramayı temizle" onClick={() => setText("")} className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-ink/10 text-xs">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
    </form>
  );
}

/** Aramayla eşleşen gündem etiketleri (ya da yazılan #etiketin kendisi) — dokununca o etiket açılır. */
function TagSuggestions({ term, tags }: { term: string; tags: TrendingTag[] }) {
  const bare = term.replace(/^#/, "").toLowerCase();
  if (bare.length < 2) return null;
  const typed = term.startsWith("#") ? `#${bare}` : null;
  const list = tags.filter((t) => t.tag.slice(1).toLowerCase().includes(bare) && t.tag.toLowerCase() !== term.toLowerCase()).slice(0, 6);
  const items: TrendingTag[] = [...(typed && typed !== term.toLowerCase() ? [{ tag: typed, uses: 0 }] : []), ...list];
  if (!items.length) return null;
  return (
    <ul aria-label="Etiket önerileri" className="flex flex-wrap gap-2">
      {items.map((t) => (
        <li key={t.tag}>
          <Link href={tagHref(t.tag)} className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-sm font-bold text-sea shadow-sm ring-1 ring-ink/[0.04] transition-shadow hover:shadow-md">
            <FontAwesomeIcon icon={faHashtag} className="text-xs" />
            {t.tag.slice(1)}
            {t.uses > 0 && <span className="text-xs font-normal text-ink/50">{t.uses} gönderi</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Aranan metin ya da #etiket geçen gönderiler (tüm okunabilir gönderiler taranır). */
function PostResults({ term, enabled }: { term: string; enabled: boolean }) {
  const feed = useFeed({ scope: "all", q: term }, enabled);
  return (
    <FeedList
      feed={feed}
      empty={
        <>
          <Mascot size={96} className="mx-auto" />
          <p className="font-display text-lg font-extrabold">Sonuç bulunamadı</p>
          <p className="mt-1 text-sm text-ink/70">“{term}” ile eşleşen gönderi yok. Başka bir kelime ya da etiket dene.</p>
        </>
      }
    />
  );
}

/** Kişi arama sonuçları (takip düğmesiyle). */
function PeopleResults({ term, enabled }: { term: string; enabled: boolean }) {
  const { results, error } = useSearchPeople(term, enabled);
  const [rel, setRel] = useState<Record<string, FollowRelation>>({});
  const avatars = useAvatars(useMemo(() => (results ?? []).map((r) => r.user_id), [results]));
  return (
    <div className="grid gap-3" aria-live="polite">
      {error && <Notice text={error} />}
      {results && results.length > 0 && (
        <ul className="grid gap-1 rounded-[24px] bg-card p-2 shadow-sm ring-1 ring-ink/[0.04]">
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
      )}
      {results && results.length === 0 && !error && (
        <EmptyState>
          <p className="text-sm text-ink/70">“{term}” adında bir kişi bulunamadı.</p>
        </EmptyState>
      )}
    </div>
  );
}

/** Arama sonuçları: etiket başlığı, öneriler ve Gönderiler/Kişiler sekmeleri. */
function Results({ q, tags, enabled }: { q: string; tags: TrendingTag[]; enabled: boolean }) {
  const [tab, setTab] = useState<Tab>("posts");
  useEffect(() => setTab("posts"), [q]);
  const bare = q.replace(/^#/, "");
  if (bare.length < 2) return <p className="rounded-2xl bg-card p-4 text-center text-sm text-ink/65 shadow-sm">Aramak için en az 2 harf yaz. Kişi adı ya da #etiket deneyebilirsin.</p>;
  const isTag = q.startsWith("#");
  const uses = isTag ? tags.find((t) => t.tag.toLowerCase() === q.toLowerCase())?.uses : undefined;
  return (
    <div className="grid min-w-0 gap-4">
      {isTag && (
        <section aria-label="Etiket" className="flex items-center gap-3 rounded-[24px] bg-card p-4 shadow-sm ring-1 ring-ink/[0.04]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sea/10 text-xl text-sea">
            <FontAwesomeIcon icon={faHashtag} />
          </span>
          <div className="min-w-0 leading-tight">
            <h2 className="truncate font-display text-xl font-extrabold">{q}</h2>
            <p className="text-sm text-ink/60">{uses ? `Son günlerde ${uses} gönderi` : "Bu etiketle paylaşılan gönderiler"}</p>
          </div>
        </section>
      )}
      <TagSuggestions term={q} tags={tags} />
      <TabChips label="Arama sonuçları" value={tab} onChange={setTab} items={TABS} fill />
      {tab === "posts" ? <PostResults term={q} enabled={enabled} /> : <PeopleResults term={bare} enabled={enabled} />}
    </div>
  );
}

/** Akımdaki etiketler: arama yapmadan, Keşfet açılır açılmaz görünür; dokununca o etiketin gönderileri açılır. */
function TrendingChips({ tags }: { tags: TrendingTag[] }) {
  if (!tags.length) return null;
  return (
    <section aria-label="Akımdaki etiketler" className="min-w-0">
      <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold">
        <FontAwesomeIcon icon={faFire} className="text-sm text-coral" />
        Akımdaki etiketler
      </h2>
      <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {tags.slice(0, 10).map((t) => (
          <li key={t.tag} className="shrink-0">
            <Link href={tagHref(t.tag)} className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-extrabold text-sea shadow-sm ring-1 ring-ink/[0.04] transition-colors hover:bg-foam">
              {t.tag}
              <span className="text-xs font-semibold text-ink/55">{t.uses}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** İçinde #etiket geçen en yeni gönderiler: arama yazmadan Keşfet'te akım olarak akar. */
function TaggedPosts({ enabled }: { enabled: boolean }) {
  const feed = useFeed({ scope: "all", q: "#" }, enabled);
  const posts = useMemo(() => feed.posts.filter((p) => HASHTAG_RE.test(`${p.title ?? ""} ${p.body}`)), [feed.posts]);
  const shown = useMemo(() => ({ ...feed, posts }), [feed, posts]);
  if (feed.loading && !feed.posts.length) return <TimelineSkeleton n={2} />;
  if (!posts.length) return null;
  return (
    <section aria-label="Etiketli gönderiler" className="grid min-w-0 gap-3">
      <h2 className="font-display text-lg font-extrabold">Akımdaki gönderiler</h2>
      <FeedList feed={shown} empty={null} />
    </section>
  );
}

/** Popüler ve yeni fotoğraflı gönderilerden oluşan sonsuz kaydırmalı ızgara. */
function ExploreGrid({ enabled, hideEmpty = false }: { enabled: boolean; hideEmpty?: boolean }) {
  const ex = useExplore(enabled);
  const thumbs = useThumbUrls(useMemo(() => ex.tiles.map((t) => t.image), [ex.tiles]));
  const sentinel = useInfiniteSentinel(ex.hasMore, ex.loadingMore, ex.error, ex.loadMore, ex.tiles.length);
  if (ex.loading && !ex.tiles.length) return <GridSkeleton />;
  if (ex.error && !ex.tiles.length) return <Notice text={ex.error} />;
  if (!ex.tiles.length && hideEmpty) return null;
  if (!ex.tiles.length)
    return (
      <EmptyState>
        <Mascot size={96} className="mx-auto" />
        <p className="font-display text-lg font-extrabold">Keşfedecek fotoğraf yok</p>
        <p className="mt-1 text-sm text-ink/70">Bigola&apos;daki fotoğraflı gönderiler burada görünür. İlk fotoğrafı sen paylaşabilirsin.</p>
      </EmptyState>
    );
  return (
    <section aria-label="Fotoğraflar" className="grid min-w-0 gap-3">
      <h2 className="font-display text-lg font-extrabold">Fotoğraflar</h2>
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

function KesfetIcerik() {
  const { user } = useUser();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const enabled = !!user;
  const tags = useTrendingTags(enabled);

  if (user === undefined) return <main className="p-5"><GridSkeleton n={6} /></main>;
  if (!user) return <NeedLogin what="Keşfet'i görmek" />;
  return (
    <BigolaPage active="kesfet" railSearch={false}>
      <SearchBox q={q} />
      {q ? (
        <Results q={q} tags={tags} enabled={enabled} />
      ) : (
        <>
          {/* Geniş ekranda aynı içerik sağ yan çubukta durur */}
          <TrendingChips tags={tags} />
          <TaggedPosts enabled={enabled} />
          <SuggestedPeople enabled={enabled} className="xl:hidden" />
          <ExploreGrid enabled={enabled} hideEmpty={tags.length > 0} />
        </>
      )}
    </BigolaPage>
  );
}

export default function Kesfet() {
  // useSearchParams (?q=) için Suspense sınırı gerekir
  return (
    <Suspense fallback={<main className="p-5"><GridSkeleton n={6} /></main>}>
      <KesfetIcerik />
    </Suspense>
  );
}
