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
import CommentsSheet from "./CommentsSheet";
import ComposeSheet from "./ComposeSheet";
import ShareSheet from "./ShareSheet";
import QuotedPost from "./QuotedPost";
import ReportSheet from "./ReportSheet";
import { ActionButton, CARD_CLASS, SPRING, cardMotion, useDismiss } from "./ui";
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
  const [commenting, setCommenting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [capOpen, setCapOpen] = useState(false);
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
  /** Paylaş düğmesi: bağlantı veya arkadaşa mesajla gönderme seçeneklerini açar. */
  const share = () => setSharing(true);
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
          {post.images.length > 0 && <Carousel paths={post.images} onDoubleTap={doubleTapLike} className="mt-3 rounded-[20px] ring-1 ring-ink/10" />}
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

  /* Instagram düzeni: fotoğraflı gönderiler (akışta) — üstte kişi, tam genişlik galeri, eylem çubuğu, beğeni sayısı, açıklama. */
  const isMedia = !detail && post.images.length > 0;
  const captionText = post.title ? `${post.title}\n${post.body}`.trim() : post.body;
  const captionLong = captionText.length > 140 || captionText.split("\n").length > 3;
  const mediaBody = (
    <>
      {post.reposted_by_name && (
        <p className="flex items-center gap-1.5 px-4 pb-1.5 text-xs font-bold text-ink/55">
          <FontAwesomeIcon icon={faRetweet} className="text-tide" />
          <Link href={`/profil/${post.reposted_by_id}`} onClick={(e) => e.stopPropagation()} className="truncate hover:underline">
            {post.reposted_by_name}
          </Link>{" "}
          yeniden paylaştı
        </p>
      )}
      <div className="flex items-center gap-3 px-4 pb-2.5">
        <Link href={`/profil/${post.author_id}`} aria-label={`${post.author_name} profili`} onClick={(e) => e.stopPropagation()} className="shrink-0 transition-transform hover:scale-105">
          <UserAvatar name={post.author_name} avatar={avatar} size={40} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={`/profil/${post.author_id}`} onClick={(e) => e.stopPropagation()} className="block truncate text-[15px] font-extrabold hover:underline">
            {post.author_name || "Öğrenci"}
          </Link>
          {showCommunity && (
            <Link href={`/topluluk/t/${post.community_slug}`} onClick={(e) => e.stopPropagation()} className="block truncate text-xs font-bold text-sea hover:underline">
              {post.community_name}
            </Link>
          )}
        </div>
        <Link href={href} onClick={(e) => e.stopPropagation()} className="shrink-0 text-xs text-ink/55 hover:underline">
          {timeAgo(post.created_at)}
        </Link>
        <ItemMenu authorId={post.author_id} canDelete={post.mine || post.can_moderate} canReport={!post.mine} onDelete={del} onReport={() => setReporting(true)} label="Gönderi" />
      </div>
      {post.hidden && (
        <p className="mx-4 mb-2 rounded-xl bg-sun/25 px-3 py-2 text-xs font-bold">
          {post.mine ? "Bu gönderi şikâyetler nedeniyle inceleniyor; şimdilik diğer öğrenciler görmüyor." : "Şikâyetler nedeniyle gizlendi; yalnızca moderatörler görüyor."}
        </p>
      )}
      <Carousel paths={post.images} onDoubleTap={doubleTapLike} />
      <div className="flex items-center px-2 pt-1">
        <ActionButton tone="coral" size="lg" active={post.liked} pressed={post.liked} label={post.liked ? "Beğenmekten vazgeç" : "Beğen"} onClick={toggleLike}>
          <motion.span key={String(post.liked)} initial={post.liked ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }} className="inline-flex">
            <FontAwesomeIcon icon={faHeart} className={post.liked ? "" : "opacity-60"} />
          </motion.span>
        </ActionButton>
        <ActionButton tone="sea" size="lg" label={`${post.comment_count} yorum, yorumları aç`} onClick={() => setCommenting(true)}>
          <FontAwesomeIcon icon={faComment} />
        </ActionButton>
        <RepostMenu post={post} size="lg" onRepost={doRepost} onQuote={() => setQuoting(true)} />
        <ActionButton tone="sea" size="lg" label="Bağlantıyı paylaş" onClick={share}>
          <FontAwesomeIcon icon={faArrowUpFromBracket} />
        </ActionButton>
        <span className="ml-auto" />
        <ActionButton tone="sun" size="lg" active={post.bookmarked} pressed={post.bookmarked} label={post.bookmarked ? "Kaydedilenlerden çıkar" : "Kaydet"} onClick={doBookmark}>
          <FontAwesomeIcon icon={faBookmark} className={post.bookmarked ? "" : "opacity-60"} />
        </ActionButton>
      </div>
      <div className="px-4 pb-1">
        {post.like_count > 0 && <p className="text-sm font-extrabold">{formatCount(post.like_count)} beğeni</p>}
        {post.kind === "question" && (
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky px-2.5 py-1 text-[11px] font-extrabold text-deep">
              <FontAwesomeIcon icon={faCircleQuestion} className="mr-1" />
              Soru
            </span>
            {solved && (
              <span className="rounded-full bg-tide px-2.5 py-1 text-[11px] font-extrabold text-deep">
                <FontAwesomeIcon icon={faCircleCheck} className="mr-1" />
                Çözüldü
              </span>
            )}
          </p>
        )}
        {captionText && (
          <div className={`mt-0.5 text-[15px] leading-snug ${captionLong && !capOpen ? "line-clamp-3" : ""}`}>
            <Link href={`/profil/${post.author_id}`} onClick={(e) => e.stopPropagation()} className="font-extrabold hover:underline">
              {post.author_name || "Öğrenci"}
            </Link>{" "}
            <RichText text={captionText} className="inline" />
          </div>
        )}
        {captionLong && !capOpen && (
          <button type="button" onClick={() => setCapOpen(true)} className="text-sm font-bold text-ink/55 hover:text-ink">
            devamı
          </button>
        )}
        {(post.quoted_id || post.quoted_unavailable) && (
          <QuotedPost id={post.quoted_id} authorName={post.quoted_author_name} body={post.quoted_body} images={post.quoted_images} community={post.quoted_community_name} at={post.quoted_created_at} avatar={quotedAvatar} unavailable={post.quoted_unavailable} />
        )}
        <button type="button" onClick={() => setCommenting(true)} className="mt-1 block text-sm text-ink/55 hover:text-ink">
          {post.comment_count > 0 ? `${post.comment_count} yorumun tümünü gör` : "Yorum yap…"}
        </button>
        <div aria-live="polite">
          {err && <p role="alert" className="mt-1 text-xs font-bold text-coral">{err}</p>}
          {note && !err && <p className="mt-1 text-xs font-bold text-tide">{note}</p>}
        </div>
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
        <motion.article layout="position" initial={cardMotion.initial} animate={cardMotion.animate} exit={{ opacity: 0 }} transition={SPRING} onClick={open} className={`cursor-pointer transition-colors hover:bg-foam/60 ${isMedia ? "pb-3 pt-3" : "px-4 pb-2 pt-3"}`}>
          {isMedia ? mediaBody : body}
        </motion.article>
      )}
      <AnimatePresence>
        {reporting && <ReportSheet type="post" id={post.id} onClose={() => setReporting(false)} />}
        {sharing && <ShareSheet postId={post.id} onClose={() => setSharing(false)} onLink={shareLink} />}
        {commenting && <CommentsSheet postId={post.id} title={post.kind === "question" ? "Yanıtlar" : "Yorumlar"} onClose={() => setCommenting(false)} onCount={(n) => onPatch({ comment_count: n })} />}
        {quoting && <ComposeSheet communities={[]} quote={post} onClose={() => setQuoting(false)} onPosted={() => onChanged?.()} />}
      </AnimatePresence>
    </>
  );
}
