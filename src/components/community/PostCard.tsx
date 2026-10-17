"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import type { AvatarConfig } from "@/lib/bigocuk/items";
import {
  errText,
  formatCount,
  fullDate,
  removeImages,
  rpc,
  sharePostLink,
  timeAgo,
  toggleBookmark,
  toggleRepost,
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
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Carousel from "./Carousel";
import ComposeSheet from "./ComposeSheet";
import ShareSheet from "./ShareSheet";
import QuotedPost from "./QuotedPost";
import ReportSheet from "./ReportSheet";
import { ActionButton, SPRING, cardMotion, useDismiss } from "./ui";
import RichText from "./RichText";

/** Eski içe aktarmalar (gönderi sayfası vb.) bozulmasın. */
export { RichText };

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
      <ActionButton tone="tide" size={size} active={post.reposted} label={post.reposted ? "Yeniden paylaşım menüsü (paylaştın)" : "Yeniden paylaş"} count={formatCount(post.repost_count)} onClick={() => setOpen((v) => !v)}>
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

export default function PostCard({
  post,
  avatar,
  quotedAvatar,
  onPatch,
  onRemove,
  onUnrepost,
  onChanged,
  detail = false,
  showCommunity = false,
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
  /** Gönderinin hangi gruptan geldiğini (ör. "Bigova Kampüs") küçük etiketle göster. */
  showCommunity?: boolean;
}) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [reporting, setReporting] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const busy = useRef(false);
  const solved = post.kind === "question" && !!post.accepted_comment_id;
  const href = `/bigola/gonderi/${post.id}`;
  const text = post.body;
  const long = !detail && (text.length > 280 || text.split("\n").length > 6);

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
  /** Fotoğrafa çift dokununca yalnızca beğenir (zaten beğenilmişse geri almaz). */
  const doubleTapLike = () => {
    if (!post.liked) void toggleLike();
  };
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
  const shareLink = async () => {
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

  /** Kartın boş yerine basınca gönderiyi aç (bağlantı, düğme ve pencerelerde değil). */
  const open = (e: React.MouseEvent) => {
    if (detail) return;
    if ((e.target as HTMLElement).closest("a,button,input,textarea,select,[role=dialog],[role=menu]")) return;
    if (window.getSelection()?.toString()) return; // metin seçiliyorsa açma
    router.push(href);
  };

  const openComments = () => (detail ? document.getElementById("yanit-kutusu")?.focus() : router.push(href));
  const commentWord = post.kind === "question" ? "yanıt" : "yorum";

  const actions = (
    <div className="mt-3 flex items-center gap-0.5 border-t border-ink/[0.07] pt-2 sm:gap-1">
      <ActionButton tone="coral" size="lg" active={post.liked} pressed={post.liked} label={post.liked ? "Beğenmekten vazgeç" : "Beğen"} count={formatCount(post.like_count)} onClick={toggleLike}>
        <motion.span key={String(post.liked)} initial={post.liked ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }} className="inline-flex">
          <FontAwesomeIcon icon={faHeart} className={post.liked ? "" : "opacity-60"} />
        </motion.span>
      </ActionButton>
      <ActionButton tone="sea" size="lg" label={`${post.comment_count} ${commentWord}${detail ? "" : ", gönderiyi aç"}`} count={formatCount(post.comment_count)} onClick={openComments}>
        <FontAwesomeIcon icon={faComment} className="opacity-60" />
      </ActionButton>
      <RepostMenu post={post} size="lg" onRepost={doRepost} onQuote={() => setQuoting(true)} />
      <ActionButton tone="sea" size="lg" label="Gönderiyi paylaş" onClick={() => setSharing(true)}>
        <FontAwesomeIcon icon={faArrowUpFromBracket} className="opacity-60" />
      </ActionButton>
      <span className="ml-auto" />
      <ActionButton tone="sun" size="lg" active={post.bookmarked} pressed={post.bookmarked} label={post.bookmarked ? "Kaydedilenlerden çıkar" : "Kaydet"} onClick={doBookmark}>
        <FontAwesomeIcon icon={faBookmark} className={post.bookmarked ? "" : "opacity-60"} />
      </ActionButton>
    </div>
  );

  const hasQuote = !!(post.quoted_id || post.quoted_unavailable);

  return (
    <>
      <motion.article
        layout={detail ? false : "position"}
        initial={detail ? false : cardMotion.initial}
        animate={cardMotion.animate}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={SPRING}
        onClick={open}
        className={`min-w-0 rounded-[26px] bg-card p-4 shadow-sm ring-1 ring-ink/[0.04] transition-shadow hover:shadow-md sm:p-5 ${detail ? "" : "cursor-pointer"}`}
      >
        {post.reposted_by_name && (
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-ink/55">
            <FontAwesomeIcon icon={faRetweet} className="text-tide" />
            <Link href={`/profil/${post.reposted_by_id}`} onClick={(e) => e.stopPropagation()} className="truncate hover:underline">
              {post.reposted_by_name}
            </Link>
            <span className="shrink-0">yeniden paylaştı</span>
          </p>
        )}

        <header className="flex items-center gap-3">
          <Link href={`/profil/${post.author_id}`} aria-label={`${post.author_name} profili`} onClick={(e) => e.stopPropagation()} className="shrink-0 rounded-full ring-2 ring-sea/10 transition-transform hover:scale-105">
            <UserAvatar name={post.author_name} avatar={avatar} size={detail ? 52 : 46} />
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <Link href={`/profil/${post.author_id}`} onClick={(e) => e.stopPropagation()} className="block truncate text-base font-extrabold hover:underline">
              {post.author_name || "Öğrenci"}
            </Link>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink/55">
              <Link href={href} onClick={(e) => e.stopPropagation()} className="shrink-0 hover:underline" title={fullDate(post.created_at)}>
                {timeAgo(post.created_at)}
              </Link>
              {showCommunity && post.community_name && (
                <>
                  <span aria-hidden>·</span>
                  <span className="min-w-0 truncate font-bold text-sea">{post.community_name}</span>
                </>
              )}
            </p>
          </div>
          {post.kind === "question" && (
            <span className="shrink-0 rounded-full bg-sky px-2.5 py-1 text-[11px] font-extrabold text-deep">
              <FontAwesomeIcon icon={faCircleQuestion} className="mr-1" />
              Soru
            </span>
          )}
          {solved && (
            <span className="shrink-0 rounded-full bg-tide px-2.5 py-1 text-[11px] font-extrabold text-deep">
              <FontAwesomeIcon icon={faCircleCheck} className="mr-1" />
              Çözüldü
            </span>
          )}
          <ItemMenu authorId={post.author_id} canDelete={post.mine || post.can_moderate} canReport={!post.mine} onDelete={del} onReport={() => setReporting(true)} label="Gönderi" />
        </header>

        {post.hidden && (
          <p className="mt-3 rounded-xl bg-sun/25 px-3 py-2 text-xs font-bold">
            {post.mine ? "Bu gönderi şikâyetler nedeniyle inceleniyor; şimdilik diğer öğrenciler görmüyor." : "Şikâyetler nedeniyle gizlendi; yalnızca moderatörler görüyor."}
          </p>
        )}

        {(post.title || text) && (
          <div className="mt-3 min-w-0">
            {post.course && <span className="mb-1.5 inline-block rounded-full bg-foam px-2.5 py-1 text-[11px] font-extrabold">{post.course}</span>}
            {post.title &&
              (detail ? (
                <h2 className="font-display text-xl font-extrabold leading-snug [overflow-wrap:anywhere]">{post.title}</h2>
              ) : (
                <p className="font-display text-lg font-extrabold leading-snug [overflow-wrap:anywhere]">{post.title}</p>
              ))}
            {text && <RichText text={text} className={`${post.title ? "mt-1" : ""} leading-relaxed [overflow-wrap:anywhere] ${detail ? "text-[17px]" : `text-[15.5px] ${long ? "line-clamp-6" : ""}`}`} />}
            {long && <span className="mt-1 inline-block text-sm font-bold text-sea">Devamını oku</span>}
          </div>
        )}

        {post.images.length > 0 && <Carousel paths={post.images} onDoubleTap={doubleTapLike} className="mt-3 rounded-[20px] ring-1 ring-ink/10" />}
        {hasQuote && (
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
          <p className="mt-3 text-sm text-ink/55">
            {fullDate(post.created_at)}
            {(post.repost_count > 0 || post.like_count > 0 || post.comment_count > 0) && (
              <span className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-ink/[0.07] pt-2.5">
                {post.repost_count > 0 && <span><b className="text-ink">{post.repost_count}</b> yeniden paylaşım</span>}
                {post.like_count > 0 && <span><b className="text-ink">{post.like_count}</b> beğeni</span>}
                {post.comment_count > 0 && <span><b className="text-ink">{post.comment_count}</b> {commentWord}</span>}
              </span>
            )}
          </p>
        )}

        {actions}

        <div aria-live="polite">
          {err && (
            <p role="alert" className="mt-1.5 text-xs font-bold text-coral">
              {err}
            </p>
          )}
          {note && !err && <p className="mt-1.5 text-xs font-bold text-tide">{note}</p>}
        </div>
      </motion.article>
      <AnimatePresence>
        {reporting && <ReportSheet type="post" id={post.id} onClose={() => setReporting(false)} />}
        {sharing && <ShareSheet postId={post.id} onClose={() => setSharing(false)} onLink={shareLink} />}
        {quoting && <ComposeSheet communities={[]} quote={post} onClose={() => setQuoting(false)} onPosted={() => onChanged?.()} />}
      </AnimatePresence>
    </>
  );
}
