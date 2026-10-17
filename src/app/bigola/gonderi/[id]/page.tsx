"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { BigolaSubPage } from "@/components/community/BigolaLayout";
import { BackHeader, NeedLogin, Notice, Skeleton } from "@/components/community/CommunityHeader";
import PostCard, { ItemMenu, RichText } from "@/components/community/PostCard";
import ReportSheet from "@/components/community/ReportSheet";
import { ActionButton, EmptyState, SPRING, TIMELINE_CLASS } from "@/components/community/ui";
import Mascot from "@/components/Mascot";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { errText, formatCount, rpc, timeAgo, type FeedPost, type PostComment } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faCircleCheck, faComment, faHeart, faPaperPlane, faReply, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Bu derinlikten sonraki yanıtlar iç içe değil, aynı sütunda "↪ ad" etiketiyle düz gösterilir. */
const MAX_NEST = 2;

type Actions = {
  isQuestion: boolean;
  postMine: boolean;
  avatars: ReturnType<typeof useAvatars>;
  children: Map<string, PostComment[]>;
  like: (c: PostComment) => void;
  del: (c: PostComment) => void;
  accept: (c: PostComment) => void;
  report: (id: string) => void;
  reply: (c: PostComment) => void;
};

/** Bir yorumun tüm alt yanıtları (derinlik sırasıyla, zamana göre). */
function descendants(id: string, map: Map<string, PostComment[]>): PostComment[] {
  const out: PostComment[] = [];
  const walk = (pid: string) => {
    for (const k of map.get(pid) ?? []) {
      out.push(k);
      walk(k.id);
    }
  };
  walk(id);
  return out.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Yanıt zincirindeki tek yorum (Threads gibi: solda avatar + bağlantı çizgisi, altında yanıtları). */
function CommentNode({ c, depth, a }: { c: PostComment; depth: number; a: Actions }) {
  const kids = depth > MAX_NEST ? [] : depth === MAX_NEST ? descendants(c.id, a.children) : (a.children.get(c.id) ?? []);
  return (
    <motion.li layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={SPRING} className={depth === 0 ? `px-4 pt-3 ${c.is_accepted ? "bg-tide/15" : ""}` : "pt-3"}>
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <Link href={`/profil/${c.author_id}`} className="transition-transform hover:scale-105">
            <UserAvatar name={c.author_name} avatar={a.avatars[c.author_id]} size={depth === 0 ? 40 : 34} />
          </Link>
          {kids.length > 0 && <span aria-hidden className="mt-1.5 w-0.5 flex-1 rounded-full bg-ink/10" />}
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <div className="flex items-start gap-1">
            <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-xs text-ink/55">
              <Link href={`/profil/${c.author_id}`} className="truncate text-[15px] font-extrabold text-ink hover:underline">
                {c.author_name || "Öğrenci"}
              </Link>
              {timeAgo(c.created_at)}
              {c.is_accepted && (
                <span className="rounded-full bg-tide px-2 py-0.5 text-[10px] font-extrabold text-deep">
                  <FontAwesomeIcon icon={faCircleCheck} className="mr-1" />
                  Doğru yanıt
                </span>
              )}
            </p>
            <ItemMenu authorId={c.author_id} canDelete={c.mine || c.can_moderate} canReport={!c.mine} onDelete={() => a.del(c)} onReport={() => a.report(c.id)} label="Yorum" />
          </div>
          {depth > MAX_NEST && c.reply_to_name && (
            <p className="text-xs font-bold text-sea">
              <FontAwesomeIcon icon={faReply} className="mr-1 -scale-x-100" />
              {c.reply_to_name}
            </p>
          )}
          {c.hidden && <p className="mt-1 rounded-lg bg-sun/25 px-2 py-1 text-[11px] font-bold">{c.mine ? "Şikâyetler nedeniyle inceleniyor." : "Şikâyetler nedeniyle gizlendi."}</p>}
          <RichText text={c.body} className="mt-0.5 text-[15px] leading-relaxed" />
          <div className="-ml-2 mt-1 flex items-center gap-1">
            <ActionButton tone="coral" active={c.liked} pressed={c.liked} label={c.liked ? "Beğenmekten vazgeç" : "Beğen"} count={formatCount(c.like_count)} onClick={() => a.like(c)}>
              <motion.span key={String(c.liked)} initial={c.liked ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }} className="inline-flex">
                <FontAwesomeIcon icon={faHeart} className={c.liked ? "" : "opacity-60"} />
              </motion.span>
            </ActionButton>
            <ActionButton tone="sea" label={`${c.author_name || "Öğrenci"} kişisine yanıt ver`} onClick={() => a.reply(c)}>
              <FontAwesomeIcon icon={faComment} />
              <span className="text-xs">Yanıtla</span>
            </ActionButton>
            {a.isQuestion && a.postMine && (
              <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => a.accept(c)} className="ml-1 rounded-full bg-foam px-3 py-1.5 text-xs font-bold transition-colors hover:bg-tide/20">
                {c.is_accepted ? "İşareti kaldır" : "Doğru yanıt"}
              </motion.button>
            )}
          </div>
          {kids.length > 0 && (
            <ul>
              <AnimatePresence initial={false}>
                {kids.map((k) => (
                  <CommentNode key={k.id} c={k} depth={depth + 1} a={a} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export default function GonderiDetay() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const [post, setPost] = useState<FeedPost | null | undefined>(undefined);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [reporting, setReporting] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const loadComments = useCallback(async () => {
    try { setComments((await rpc<PostComment[]>("community_comments", { p_post: id })) ?? []); } catch (e) { setErr(errText(e)); setComments([]); }
  }, [id]);
  const loadPost = useCallback(async () => {
    try {
      const rows = await rpc<FeedPost[]>("community_feed", { p_scope: "all", p_post: id, p_limit: 1 });
      setPost(rows?.[0] ?? null);
    } catch (e) { setErr(errText(e)); setPost(null); }
  }, [id]);
  useEffect(() => { if (user) { void loadPost(); void loadComments(); } }, [user, loadPost, loadComments]);

  const ids = useMemo(
    () => [...(post ? [post.author_id, ...(post.quoted_author_id ? [post.quoted_author_id] : [])] : []), ...(comments ?? []).map((c) => c.author_id)],
    [post, comments],
  );
  const avatars = useAvatars(ids);

  // Yanıt ağacı: kökler (üst düzey yorumlar) ve her yorumun doğrudan yanıtları. Üst yorumu silinmiş yanıtlar kök olur.
  const { roots, children } = useMemo(() => {
    const list = comments ?? [];
    const present = new Set(list.map((c) => c.id));
    const kids = new Map<string, PostComment[]>();
    const top: PostComment[] = [];
    for (const c of list) {
      if (c.parent_id && present.has(c.parent_id)) kids.set(c.parent_id, [...(kids.get(c.parent_id) ?? []), c]);
      else top.push(c);
    }
    // Sorularda doğru yanıt en üstte, ardından en çok beğenilen
    if (post?.kind === "question") top.sort((a, b) => Number(b.is_accepted) - Number(a.is_accepted) || b.like_count - a.like_count || a.created_at.localeCompare(b.created_at));
    return { roots: top, children: kids };
  }, [comments, post?.kind]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setErr("");
    try {
      await rpc("community_add_comment", { p_post: id, p_body: body, p_parent: replyTo?.id ?? null });
      setText("");
      setReplyTo(null);
      await Promise.all([loadComments(), loadPost()]);
    } catch (e2) { setErr(errText(e2)); } finally { setSending(false); }
  };
  const like = async (c: PostComment) => {
    const prev = comments;
    setComments((cur) => (cur ?? []).map((x) => (x.id === c.id ? { ...x, liked: !x.liked, like_count: Math.max(0, x.like_count + (x.liked ? -1 : 1)) } : x)));
    try {
      const r = await rpc<{ liked: boolean; count: number }>("community_toggle_like", { p_type: "comment", p_id: c.id });
      setComments((cur) => (cur ?? []).map((x) => (x.id === c.id ? { ...x, liked: r.liked, like_count: r.count } : x)));
    } catch (e) { setComments(prev); setErr(errText(e)); }
  };
  const del = async (c: PostComment) => {
    if (!window.confirm(c.mine ? "Bu yorum silinsin mi?" : "Bu yorum moderatör olarak kaldırılsın mı?")) return;
    try {
      await rpc("community_delete", { p_type: "comment", p_id: c.id });
      if (replyTo?.id === c.id) setReplyTo(null);
      await Promise.all([loadComments(), loadPost()]);
    } catch (e) { setErr(errText(e)); }
  };
  const accept = async (c: PostComment) => {
    try { await rpc("community_accept_answer", { p_post: id, p_comment: c.id }); await Promise.all([loadComments(), loadPost()]); } catch (e) { setErr(errText(e)); }
  };
  const reply = (c: PostComment) => {
    setReplyTo(c);
    box.current?.focus();
  };

  if (user === undefined || (user && post === undefined)) return <BigolaSubPage header={<BackHeader title="Gönderi" />}><Skeleton n={2} /></BigolaSubPage>;
  if (!user) return <NeedLogin />;
  if (!post)
    return (
      <BigolaSubPage header={<BackHeader title="Gönderi bulunamadı" />}>
        <Notice text={err || "Bu gönderi silinmiş olabilir ya da erişimin yok."} />
      </BigolaSubPage>
    );
  const isQuestion = post.kind === "question";
  const actions: Actions = { isQuestion, postMine: post.mine, avatars, children, like, del, accept, report: setReporting, reply };
  return (
    <BigolaSubPage header={<BackHeader title={isQuestion ? "Soru" : "Gönderi"} subtitle={post.author_name || undefined} />}>
      <PostCard
        post={post}
        avatar={avatars[post.author_id]}
        quotedAvatar={post.quoted_author_id ? avatars[post.quoted_author_id] : undefined}
        detail
        onPatch={(p) => setPost((cur) => (cur ? { ...cur, ...p } : cur))}
        onRemove={() => router.replace("/bigola")}
        onChanged={() => router.push("/bigola")}
      />
      <form onSubmit={send} className="min-w-0">
        {err && <p role="alert" className="mb-1 px-2 text-xs font-bold text-coral">{err}</p>}
        <AnimatePresence initial={false}>
          {replyTo && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 overflow-hidden px-2 pb-1.5 text-xs text-ink/65">
              <FontAwesomeIcon icon={faReply} className="-scale-x-100 text-sea" />
              <span className="min-w-0 flex-1 truncate"><b>{replyTo.author_name || "Öğrenci"}</b> kişisine yanıt veriyorsun</span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Yanıt vermeyi bırak" className="grid h-5 w-5 place-items-center rounded-full bg-ink/10 text-[9px]"><FontAwesomeIcon icon={faXmark} /></button>
            </motion.p>
          )}
        </AnimatePresence>
        <div className="flex items-end gap-2 rounded-[26px] bg-card p-1.5 shadow-sm ring-1 ring-ink/5 transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-sun">
          <textarea id="yanit-kutusu" ref={box} value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={1} placeholder={replyTo ? "Yanıtını yaz…" : isQuestion ? "Yanıtını yaz…" : "Yorum yaz…"} aria-label={isQuestion ? "Yanıt yaz" : "Yorum yaz"} className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3.5 py-2.5 text-base leading-snug outline-none placeholder:text-ink/45" />
          <motion.button whileTap={{ scale: 0.88 }} disabled={!text.trim() || sending} aria-label="Gönder" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors ${text.trim() && !sending ? "bg-sea text-white" : "bg-ink/10 text-ink/35"}`}><FontAwesomeIcon icon={faPaperPlane} /></motion.button>
        </div>
      </form>
      <section aria-label={isQuestion ? "Yanıtlar" : "Yorumlar"} className="min-w-0">
        <h2 className="mb-2 font-display text-lg font-extrabold">{isQuestion ? "Yanıtlar" : "Yorumlar"} ({post.comment_count})</h2>
        {comments === null ? <Skeleton n={2} h="h-20" /> : roots.length === 0 ? (
          <EmptyState><Mascot size={80} className="mx-auto" /><p className="mt-1 text-sm text-ink/70">{isQuestion ? "Henüz yanıt yok. Bildiğin bir şey varsa ilk yanıtı sen yaz." : "Henüz yorum yok. İlk yorumu sen yaz."}</p></EmptyState>
        ) : (
          <ul className={`${TIMELINE_CLASS} pb-1`}>
            <AnimatePresence initial={false}>
              {roots.map((c) => (
                <CommentNode key={c.id} c={c} depth={0} a={actions} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
      <AnimatePresence>{reporting && <ReportSheet type="comment" id={reporting} onClose={() => setReporting(null)} />}</AnimatePresence>
    </BigolaSubPage>
  );
}
