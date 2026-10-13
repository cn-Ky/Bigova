"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import type { AvatarConfig } from "@/lib/bigocuk/items";
import { splitLinks } from "@/lib/chatUtils";
import { errText, removeImages, rpc, timeAgo, useImageUrls, type FeedPost } from "@/lib/community";
import {
  faCheck,
  faCircleCheck,
  faCircleQuestion,
  faComment,
  faEllipsis,
  faFlag,
  faHeart,
  faTrash,
  faUser,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReportSheet from "./ReportSheet";

/** Düz metni, yalnızca http/https bağlantıları tıklanabilir olacak şekilde gösterir. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {splitLinks(text).map((p, i) =>
        p.href ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-bold text-sea underline">
            {p.text}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}

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
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const item = "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold hover:bg-foam";
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={`${label} için seçenekler`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="grid h-8 w-8 place-items-center rounded-full text-ink/60 hover:bg-foam">
        <FontAwesomeIcon icon={faEllipsis} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-2xl bg-card py-1 shadow-xl ring-1 ring-ink/10">
          <Link role="menuitem" href={`/profil/${authorId}`} className={item}>
            <FontAwesomeIcon icon={faUser} className="w-4 text-ink/55" /> Profili aç
          </Link>
          {canReport && (
            <button role="menuitem" type="button" onClick={() => { setOpen(false); onReport(); }} className={item}>
              <FontAwesomeIcon icon={faFlag} className="w-4 text-ink/55" /> Şikâyet et
            </button>
          )}
          {canDelete && (
            <button role="menuitem" type="button" onClick={() => { setOpen(false); onDelete(); }} className={`${item} text-coral`}>
              <FontAwesomeIcon icon={faTrash} className="w-4" /> Sil
            </button>
          )}
        </div>
      )}
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
      <ul className={`mt-3 grid gap-1 overflow-hidden rounded-2xl ${grid}`}>
        {paths.map((p, i) => (
          <li key={p} className={paths.length === 3 && i === 0 ? "row-span-2" : ""}>
            <button type="button" onClick={() => setOpen(i)} aria-label={`Fotoğraf ${i + 1} / ${paths.length} büyüt`} className="block h-full w-full bg-foam">
              {urls[p] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[p]} alt="Gönderi fotoğrafı" loading="lazy" className={`w-full object-cover ${paths.length === 1 ? "max-h-[420px]" : "aspect-square h-full"}`} />
              ) : (
                <span className={`block animate-pulse bg-foam ${paths.length === 1 ? "h-56" : "aspect-square"}`} />
              )}
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label="Fotoğraf" className="fixed inset-0 z-[90] grid place-items-center bg-black/85 p-4" onClick={() => setOpen(null)}>
          <button type="button" aria-label="Kapat" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white" onClick={() => setOpen(null)}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
          {urls[paths[open]] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[paths[open]]} alt="Gönderi fotoğrafı" className="max-h-full max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          )}
          {paths.length > 1 && (
            <div className="absolute bottom-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
              {paths.map((p, i) => (
                <button key={p} type="button" aria-label={`Fotoğraf ${i + 1}`} onClick={() => setOpen(i)} className={`h-2.5 w-2.5 rounded-full ${i === open ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function PostCard({
  post,
  avatar,
  onPatch,
  onRemove,
  detail = false,
  showCommunity = true,
}: {
  post: FeedPost;
  avatar?: AvatarConfig;
  onPatch: (p: Partial<FeedPost>) => void;
  onRemove: () => void;
  detail?: boolean;
  showCommunity?: boolean;
}) {
  const [err, setErr] = useState("");
  const [reporting, setReporting] = useState(false);
  const busy = useRef(false);
  const solved = post.kind === "question" && !!post.accepted_comment_id;
  const href = `/topluluk/gonderi/${post.id}`;

  const toggleLike = async () => {
    if (busy.current) return;
    busy.current = true;
    const prev = { liked: post.liked, like_count: post.like_count };
    onPatch({ liked: !post.liked, like_count: Math.max(0, post.like_count + (post.liked ? -1 : 1)) });
    try {
      const r = await rpc<{ liked: boolean; count: number }>("community_toggle_like", { p_type: "post", p_id: post.id });
      onPatch({ liked: r.liked, like_count: r.count });
    } catch (e) {
      onPatch(prev);
      setErr(errText(e));
    } finally {
      busy.current = false;
    }
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

  const textClass = detail ? "" : "line-clamp-6";
  return (
    <article className="rounded-[22px] bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Link href={`/profil/${post.author_id}`} aria-label={`${post.author_name} profili`}>
          <UserAvatar name={post.author_name} avatar={avatar} size={42} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={`/profil/${post.author_id}`} className="block truncate text-sm font-extrabold">
            {post.author_name || "Öğrenci"}
          </Link>
          <span className="block truncate text-xs text-ink/60">
            {showCommunity && (
              <>
                <Link href={`/topluluk/t/${post.community_slug}`} className="font-bold text-sea">
                  {post.community_name}
                </Link>
                {" · "}
              </>
            )}
            {timeAgo(post.created_at)}
          </span>
        </div>
        <ItemMenu authorId={post.author_id} canDelete={post.mine || post.can_moderate} canReport={!post.mine} onDelete={del} onReport={() => setReporting(true)} label="Gönderi" />
      </div>

      {post.hidden && (
        <p className="mt-3 rounded-xl bg-sun/25 px-3 py-2 text-xs font-bold">
          {post.mine ? "Bu gönderi şikâyetler nedeniyle inceleniyor; şimdilik diğer öğrenciler görmüyor." : "Şikâyetler nedeniyle gizlendi; yalnızca moderatörler görüyor."}
        </p>
      )}

      {post.kind === "question" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
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

      {post.title &&
        (detail ? (
          <h2 className="mt-2 font-display text-xl font-extrabold leading-snug">{post.title}</h2>
        ) : (
          <Link href={href} className="mt-2 block font-display text-lg font-extrabold leading-snug">
            {post.title}
          </Link>
        ))}
      {post.body && (detail ? <RichText text={post.body} className="mt-2 text-[15px] leading-relaxed" /> : (
        <Link href={href} className="block">
          <RichText text={post.body} className={`mt-2 text-[15px] leading-relaxed ${textClass}`} />
        </Link>
      ))}
      <Photos paths={post.images} />

      <div className="mt-3 flex items-center gap-1 border-t border-ink/5 pt-2">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={post.liked}
          aria-label={post.liked ? "Beğenmekten vazgeç" : "Beğen"}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-extrabold ${post.liked ? "text-coral" : "text-ink/70"}`}
        >
          <FontAwesomeIcon icon={faHeart} className={post.liked ? "" : "opacity-45"} />
          <span className="tabular-nums">{post.like_count}</span>
        </button>
        {detail ? (
          <span className="flex items-center gap-1.5 px-3 py-2 text-sm font-extrabold text-ink/70">
            <FontAwesomeIcon icon={faComment} />
            <span className="tabular-nums">{post.comment_count}</span>
            <span className="sr-only">yorum</span>
          </span>
        ) : (
          <Link href={href} aria-label={`${post.comment_count} yorum, gönderiyi aç`} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-extrabold text-ink/70">
            <FontAwesomeIcon icon={faComment} />
            <span className="tabular-nums">{post.comment_count}</span>
          </Link>
        )}
        {post.kind === "question" && !solved && post.comment_count === 0 && !detail && (
          <Link href={href} className="ml-auto rounded-full bg-sea px-3 py-1.5 text-xs font-extrabold text-white">
            <FontAwesomeIcon icon={faCheck} className="mr-1" />
            Yanıtla
          </Link>
        )}
      </div>
      {err && (
        <p role="alert" className="mt-1 text-xs font-bold text-coral">
          {err}
        </p>
      )}
      <AnimatePresence>{reporting && <ReportSheet type="post" id={post.id} onClose={() => setReporting(false)} />}</AnimatePresence>
    </article>
  );
}
