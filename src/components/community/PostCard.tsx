"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import type { AvatarConfig } from "@/lib/bigocuk/items";
import { splitLinks } from "@/lib/chatUtils";
import {
  HASHTAG_RE,
  errText,
  formatCount,
  fullDate,
  removeImages,
  rpc,
  sharePostLink,
  timeAgo,
  toggleBookmark,
  toggleRepost,
  useImageUrls,
  type FeedPost,
} from "@/lib/community";
import {
  faArrowUpFromBracket,
  faBookmark,
  faCheck,
  faCircleCheck,
  faCircleQuestion,
  faComment,
  faEllipsis,
  faFlag,
  faHeart,
  faPen,
  faRetweet,
  faTrash,
  faUser,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ComposeSheet from "./ComposeSheet";
import QuotedPost from "./QuotedPost";
import ReportSheet from "./ReportSheet";
import { ActionButton, CARD_CLASS, SPRING, cardMotion, useDismiss } from "./ui";

/** Düz metni gösterir: yalnızca http/https bağlantıları ve #etiketler tıklanabilir. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {splitLinks(text).map((p, i) =>
        p.href ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-bold text-sea underline decoration-tide decoration-2 underline-offset-2">
            {p.text}
          </a>
        ) : (
          <Tags key={i} text={p.text} />
        ),
      )}
    </p>
  );
}

/** Metindeki #etiketleri, akışta o etiketi arayan bağlantıya çevirir. */
function Tags({ text }: { text: string }) {
  return (
    <>
      {text.split(HASHTAG_RE).map((part, i) =>
        i % 2 === 1 ? (
          <Link key={i} href={`/topluluk?q=${encodeURIComponent(part)}`} className="font-bold text-sea hover:underline">
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const MENU_ITEM = "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold transition-colors hover:bg-foam";
const MENU_BOX = "absolute z-20 w-52 overflow-hidden rounded-2xl bg-card py-1 shadow-xl ring-1 ring-ink/10";

/** ⋯ menüsü: sil / şikâyet et / profili aç. */
export function ItemMenu({
  authorId,
  canDelete,
  canReport,
  onDelete,
  onReport,
  label,
}: {
  authorId: string;
  canDelete: boolean;
  canReport: boolean;
  onDelete: () => void;
  onReport: () => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <motion.button whileTap={{ scale: 0.85 }} type="button" aria-label={`${label} için seçenekler`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="grid h-8 w-8 place-items-center rounded-full text-ink/55 transition-colors hover:bg-sea/10 hover:text-sea">
        <FontAwesomeIcon icon={faEllipsis} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.92, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.14 }} style={{ transformOrigin: "top right" }} role="menu" className={`${MENU_BOX} right-0 top-9`}>
            <Link role="menuitem" href={`/profil/${authorId}`} className={MENU_ITEM}>
              <FontAwesomeIcon icon={faUser} className="w-4 text-ink/55" /> Profili aç
            </Link>
            {canReport && (
              <button role="menuitem" type="button" onClick={() => { setOpen(false); onReport(); }} className={MENU_ITEM}>
                <FontAwesomeIcon icon={faFlag} className="w-4 text-ink/55" /> Şikâyet et
              </button>
            )}
            {canDelete && (
              <button role="menuitem" type="button" onClick={() => { setOpen(false); onDelete(); }} className={`${MENU_ITEM} text-coral`}>
                <FontAwesomeIcon icon={faTrash} className="w-4" /> Sil
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Yeniden paylaş düğmesi: düz yeniden paylaşım (aç/kapat) veya alıntı. */
function RepostMenu({ post, onRepost, onQuote, size }: { post: FeedPost; onRepost: () => void; onQuote: () => void; size: "md" | "lg" }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <ActionButton tone="tide" size={size} active={post.reposted} label={post.reposted ? "Yeniden paylaşım menüsü (paylaştın)" : "Yeniden paylaş"} count={size === "md" ? formatCount(post.repost_count) : undefined} onClick={() => setOpen((v) => !v)}>
        <FontAwesomeIcon icon={faRetweet} />
      </ActionButton>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.14 }} style={{ transformOrigin: "bottom left" }} role="menu" className={`${MENU_BOX} bottom-10 left-0`}>
            <button role="menuitem" type="button" onClick={() => { setOpen(false); onRepost(); }} className={MENU_ITEM}>
              <FontAwesomeIcon icon={faRetweet} className={`w-4 ${post.reposted ? "text-tide" : "text-ink/55"}`} />
              {post.reposted ? "Yeniden paylaşımı geri al" : "Yeniden paylaş"}
            </button>
            <button role="menuitem" type="button" onClick={() => { setOpen(false); onQuote(); }} className={MENU_ITEM}>
              <FontAwesomeIcon icon={faPen} className="w-4 text-ink/55" /> Alıntıla
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Photos({ paths }: { paths: string[] }) {
  const urls = useImageUrls(paths);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % paths.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + paths.length) % paths.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, paths.length]);
  if (!paths.length) return null;
  const grid = paths.length === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <>
      <ul className={`mt-3 grid gap-0.5 overflow-hidden rounded-[20px] ring-1 ring-ink/10 ${grid}`}>
        {paths.map((p, i) => (
          <li key={p} className={paths.length === 3 && i === 0 ? "row-span-2" : ""}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(i); }} aria-label={`Fotoğraf ${i + 1} / ${paths.length} büyüt`} className="group/ph block h-full w-full overflow-hidden bg-foam">
              {urls[p] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[p]} alt="Gönderi fotoğrafı" loading="lazy" className={`w-full object-cover transition-transform duration-500 group-hover/ph:scale-105 ${paths.length === 1 ? "max-h-[420px]" : "aspect-square h-full"}`} />
              ) : (
                <span className={`shimmer block ${paths.length === 1 ? "h-56" : "aspect-square"}`} />
              )}
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="dialog" aria-modal="true" aria-label="Fotoğraf" className="fixed inset-0 z-[90] grid place-items-center bg-deep/90 p-4 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setOpen(null); }}>
          <motion.button whileTap={{ scale: 0.88 }} type="button" aria-label="Kapat" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white" onClick={() => setOpen(null)}>
            <FontAwesomeIcon icon={faXmark} />
          </motion.button>
          {urls[paths[open]] && (
            // eslint-disable-next-line @next/next/no-img-element
            <motion.img key={open} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING} src={urls[paths[open]]} alt="Gönderi fotoğrafı" className="max-h-full max-w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          )}
          {paths.length > 1 && (
            <div className="absolute bottom-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
              {paths.map((p, i) => (
                <button key={p} type="button" aria-label={`Fotoğraf ${i + 1}`} onClick={() => setOpen(i)} className={`h-2.5 w-2.5 rounded-full ${i === open ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}

export default function PostCard({
  post,
  avatar,
  quotedAvatar,
  onPatch,
  onRemove,
  onUnrepost,
  onChanged,
  detail = false,
  showCommunity = true,
}: {
  post: FeedPost;
  avatar?: AvatarConfig;
  quotedAvatar?: AvatarConfig;
  onPatch: (p: Partial<FeedPost>) => void;
  onRemove: () => void;
  /** Kullanıcı yeniden paylaşımını geri alınca: akıştaki yeniden paylaşım satırını kaldır. */
  onUnrepost?: () => void;
  /** Alıntı paylaşıldı: akışı yenile. */
  onChanged?: () => void;
  detail?: boolean;
  showCommunity?: boolean;
}) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [reporting, setReporting] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const busy = useRef(false);
  const solved = post.kind === "question" && !!post.accepted_comment_id;
  const href = `/topluluk/gonderi/${post.id}`;
  const long = !detail && (post.body.length > 320 || post.body.split("\n").length > 7);

  const run = async (fn: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setErr("");
    try {
      await fn();
    } finally {
      busy.current = false;
    }
  };
  const toggleLike = () =>
    run(async () => {
      const prev = { liked: post.liked, like_count: post.like_count };
      onPatch({ liked: !post.liked, like_count: Math.max(0, post.like_count + (post.liked ? -1 : 1)) });
      try {
        const r = await rpc<{ liked: boolean; count: number }>("community_toggle_like", { p_type: "post", p_id: post.id });
        onPatch({ liked: r.liked, like_count: r.count });
      } catch (e) {
        onPatch(prev);
        setErr(errText(e));
      }
    });
  const doRepost = () =>
    run(async () => {
      const prev = { reposted: post.reposted, repost_count: post.repost_count };
      onPatch({ reposted: !post.reposted, repost_count: Math.max(0, post.repost_count + (post.reposted ? -1 : 1)) });
      try {
        const r = await toggleRepost(post.id);
        onPatch({ reposted: r.reposted, repost_count: r.count });
        if (!r.reposted) onUnrepost?.();
      } catch (e) {
        onPatch(prev);
        setErr(errText(e));
      }
    });
  const doBookmark = () =>
    run(async () => {
      const prev = post.bookmarked;
      onPatch({ bookmarked: !prev });
      try {
        const r = await toggleBookmark(post.id);
        onPatch({ bookmarked: r.bookmarked });
        setNote(r.bookmarked ? "Kaydedilenlere eklendi." : "Kaydedilenlerden çıkarıldı.");
        window.setTimeout(() => setNote(""), 2200);
      } catch (e) {
        onPatch({ bookmarked: prev });
        setErr(errText(e));
      }
    });
  const share = async () => {
    const r = await sharePostLink(post.id, post.title || post.body);
    if (r === "copied") {
      setNote("Bağlantı kopyalandı.");
      window.setTimeout(() => setNote(""), 2200);
    } else if (r === "failed") setErr("Bağlantı paylaşılamadı.");
  };
  const del = async () => {
    if (!window.confirm(post.mine ? "Bu gönderiyi silmek istediğine emin misin?" : "Bu gönderi moderatör olarak kaldırılsın mı?")) return;
    try {
      const paths = await rpc<string[]>("community_delete", { p_type: "post", p_id: post.id });
      await removeImages(paths ?? []);
      onRemove();
    } catch (e) {
      setErr(errText(e));
    }
  };

  /** Satırın boş yerine basınca gönderiyi aç (bağlantı, düğme ve pencerelerde değil). */
  const open = (e: React.MouseEvent) => {
    if (detail) return;
    if ((e.target as HTMLElement).closest("a,button,input,textarea,select,[role=dialog],[role=menu]")) return;
    if (window.getSelection()?.toString()) return; // metin seçiliyorsa açma
    router.push(href);
  };

  const iconSize = detail ? "lg" : "md";
  const actions = (
    <div className={`${detail ? "mt-1 justify-around border-t border-ink/[0.07] pt-1" : "-ml-2 mt-1 max-w-md justify-between"} flex items-center`}>
      {detail ? (
        <ActionButton tone="sea" size="lg" label={`${post.comment_count} yorum`} onClick={() => document.getElementById("yanit-kutusu")?.focus()}>
          <FontAwesomeIcon icon={faComment} />
        </ActionButton>
      ) : (
        <ActionButton tone="sea" label={`${post.comment_count} yorum, gönderiyi aç`} count={formatCount(post.comment_count)} onClick={() => router.push(href)}>
          <FontAwesomeIcon icon={faComment} />
        </ActionButton>
      )}
      <RepostMenu post={post} size={iconSize} onRepost={doRepost} onQuote={() => setQuoting(true)} />
      <ActionButton tone="coral" size={iconSize} active={post.liked} pressed={post.liked} label={post.liked ? "Beğenmekten vazgeç" : "Beğen"} count={detail ? undefined : formatCount(post.like_count)} onClick={toggleLike}>
        <motion.span key={String(post.liked)} initial={post.liked ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }} className="inline-flex">
          <FontAwesomeIcon icon={faHeart} className={post.liked ? "" : "opacity-60"} />
        </motion.span>
      </ActionButton>
      <ActionButton tone="sun" size={iconSize} active={post.bookmarked} pressed={post.bookmarked} label={post.bookmarked ? "Kaydedilenlerden çıkar" : "Kaydet"} onClick={doBookmark}>
        <FontAwesomeIcon icon={faBookmark} className={post.bookmarked ? "" : "opacity-60"} />
      </ActionButton>
      <ActionButton tone="sea" size={iconSize} label="Bağlantıyı paylaş" onClick={share}>
        <FontAwesomeIcon icon={faArrowUpFromBracket} />
      </ActionButton>
    </div>
  );

  const body = (
    <>
      {post.reposted_by_name && (
        <p className={`flex items-center gap-1.5 text-xs font-bold text-ink/55 ${detail ? "" : "-mt-0.5 mb-1 pl-[3.5rem]"}`}>
          <FontAwesomeIcon icon={faRetweet} className="text-tide" />
          <Link href={`/profil/${post.reposted_by_id}`} onClick={(e) => e.stopPropagation()} className="truncate hover:underline">
            {post.reposted_by_name}
          </Link>{" "}
          yeniden paylaştı
        </p>
      )}
      <div className="flex gap-3">
        <Link href={`/profil/${post.author_id}`} aria-label={`${post.author_name} profili`} onClick={(e) => e.stopPropagation()} className="h-fit shrink-0 transition-transform hover:scale-105">
          <UserAvatar name={post.author_name} avatar={avatar} size={detail ? 48 : 44} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex min-w-0 items-baseline gap-1.5">
                <Link href={`/profil/${post.author_id}`} onClick={(e) => e.stopPropagation()} className="truncate text-[15px] font-extrabold hover:underline">
                  {post.author_name || "Öğrenci"}
                </Link>
                {!detail && (
                  <Link href={href} onClick={(e) => e.stopPropagation()} className="shrink-0 text-xs text-ink/55 hover:underline">
                    · {timeAgo(post.created_at)}
                  </Link>
                )}
              </div>
              {showCommunity && (
                <Link href={`/topluluk/t/${post.community_slug}`} onClick={(e) => e.stopPropagation()} className="block truncate text-xs font-bold text-sea hover:underline">
                  {post.community_name}
                </Link>
              )}
            </div>
            <ItemMenu authorId={post.author_id} canDelete={post.mine || post.can_moderate} canReport={!post.mine} onDelete={del} onReport={() => setReporting(true)} label="Gönderi" />
          </div>

          {post.hidden && (
            <p className="mt-2 rounded-xl bg-sun/25 px-3 py-2 text-xs font-bold">
              {post.mine ? "Bu gönderi şikâyetler nedeniyle inceleniyor; şimdilik diğer öğrenciler görmüyor." : "Şikâyetler nedeniyle gizlendi; yalnızca moderatörler görüyor."}
            </p>
          )}

          {post.kind === "question" && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky px-2.5 py-1 text-[11px] font-extrabold text-deep">
                <FontAwesomeIcon icon={faCircleQuestion} className="mr-1" />
                Soru
              </span>
              {post.course && <span className="rounded-full bg-foam px-2.5 py-1 text-[11px] font-extrabold">{post.course}</span>}
              {solved && (
                <span className="rounded-full bg-tide px-2.5 py-1 text-[11px] font-extrabold text-deep">
                  <FontAwesomeIcon icon={faCircleCheck} className="mr-1" />
                  Çözüldü
                </span>
              )}
            </div>
          )}

          {post.title && (detail ? (
            <h2 className="mt-2 font-display text-xl font-extrabold leading-snug">{post.title}</h2>
          ) : (
            <p className="mt-1.5 font-display text-lg font-extrabold leading-snug">{post.title}</p>
          ))}
          {post.body && <RichText text={post.body} className={`mt-1 leading-relaxed ${detail ? "text-[17px]" : `text-[15px] ${long ? "line-clamp-6" : ""}`}`} />}
          {long && <span className="text-sm font-bold text-sea">Devamını oku</span>}
          <Photos paths={post.images} />
          {(post.quoted_id || post.quoted_unavailable) && (
            <QuotedPost
              id={post.quoted_id}
              authorName={post.quoted_author_name}
              body={post.quoted_body}
              images={post.quoted_images}
              community={post.quoted_community_name}
              at={post.quoted_created_at}
              avatar={quotedAvatar}
              unavailable={post.quoted_unavailable}
            />
          )}

          {detail && (
            <>
              <p className="mt-3 text-sm text-ink/55">{fullDate(post.created_at)}</p>
              {(post.repost_count > 0 || post.like_count > 0 || post.comment_count > 0) && (
                <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-ink/[0.07] pt-3 text-sm text-ink/60">
                  {post.repost_count > 0 && <span><b className="text-ink">{post.repost_count}</b> yeniden paylaşım</span>}
                  {post.like_count > 0 && <span><b className="text-ink">{post.like_count}</b> beğeni</span>}
                  {post.comment_count > 0 && <span><b className="text-ink">{post.comment_count}</b> {post.kind === "question" ? "yanıt" : "yorum"}</span>}
                </p>
              )}
            </>
          )}
          {!detail && actions}
        </div>
      </div>
      {detail && <div className="mt-3">{actions}</div>}
      <div aria-live="polite" className={detail ? "" : "pl-[3.5rem]"}>
        {err && (
          <p role="alert" className="mt-1 text-xs font-bold text-coral">
            {err}
          </p>
        )}
        {note && !err && <p className="mt-1 text-xs font-bold text-tide">{note}</p>}
      </div>
    </>
  );

  return (
    <>
      {detail ? (
        <motion.article initial={false} transition={SPRING} className={`${CARD_CLASS} p-4`}>
          {body}
        </motion.article>
      ) : (
        <motion.article layout="position" initial={cardMotion.initial} animate={cardMotion.animate} exit={{ opacity: 0 }} transition={SPRING} onClick={open} className="cursor-pointer px-4 pb-2 pt-3 transition-colors hover:bg-foam/60">
          {body}
        </motion.article>
      )}
      <AnimatePresence>
        {reporting && <ReportSheet type="post" id={post.id} onClose={() => setReporting(false)} />}
        {quoting && <ComposeSheet communities={[]} quote={post} onClose={() => setQuoting(false)} onPosted={() => onChanged?.()} />}
      </AnimatePresence>
    </>
  );
}
