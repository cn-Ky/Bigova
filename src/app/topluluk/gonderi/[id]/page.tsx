"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { BackHeader, NeedLogin, Notice, Skeleton } from "@/components/community/CommunityHeader";
import PostCard, { ItemMenu, RichText } from "@/components/community/PostCard";
import ReportSheet from "@/components/community/ReportSheet";
import { EmptyState, SPRING } from "@/components/community/ui";
import Mascot from "@/components/Mascot";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { errText, rpc, timeAgo, type FeedPost, type PostComment } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faCircleCheck, faHeart, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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

  const ids = useMemo(() => [...(post ? [post.author_id] : []), ...(comments ?? []).map((c) => c.author_id)], [post, comments]);
  const avatars = useAvatars(ids);

  // Sorularda doğru yanıt en üstte, ardından en çok beğenilen
  const sorted = useMemo(() => {
    const list = [...(comments ?? [])];
    if (post?.kind === "question") list.sort((a, b) => Number(b.is_accepted) - Number(a.is_accepted) || b.like_count - a.like_count || a.created_at.localeCompare(b.created_at));
    return list;
  }, [comments, post?.kind]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setErr("");
    try {
      await rpc("community_add_comment", { p_post: id, p_body: body });
      setText("");
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
    try { await rpc("community_delete", { p_type: "comment", p_id: c.id }); await Promise.all([loadComments(), loadPost()]); } catch (e) { setErr(errText(e)); }
  };
  const accept = async (c: PostComment) => {
    try { await rpc("community_accept_answer", { p_post: id, p_comment: c.id }); await Promise.all([loadComments(), loadPost()]); } catch (e) { setErr(errText(e)); }
  };

  if (user === undefined || (user && post === undefined)) return <main><BackHeader title="Gönderi" /><div className="p-5"><Skeleton n={2} /></div></main>;
  if (!user) return <NeedLogin />;
  if (!post)
    return (
      <main>
        <BackHeader title="Gönderi bulunamadı" />
        <div className="grid gap-3 p-5"><Notice text={err || "Bu gönderi silinmiş olabilir ya da erişimin yok."} /></div>
      </main>
    );
  const isQuestion = post.kind === "question";
  return (
    <main className="pb-32">
      <BackHeader title={isQuestion ? "Soru" : "Gönderi"} subtitle={post.community_name} />
      <div className="grid gap-4 px-5 pt-5">
        <PostCard post={post} avatar={avatars[post.author_id]} detail onPatch={(p) => setPost((cur) => (cur ? { ...cur, ...p } : cur))} onRemove={() => router.replace("/topluluk")} />
        <section aria-label={isQuestion ? "Yanıtlar" : "Yorumlar"}>
          <h2 className="mb-2 font-display text-lg font-extrabold">{isQuestion ? "Yanıtlar" : "Yorumlar"} ({post.comment_count})</h2>
          {comments === null ? <Skeleton n={2} h="h-20" /> : sorted.length === 0 ? (
            <EmptyState><Mascot size={80} className="mx-auto" /><p className="mt-1 text-sm text-ink/70">{isQuestion ? "Henüz yanıt yok. Bildiğin bir şey varsa ilk yanıtı sen yaz." : "Henüz yorum yok. İlk yorumu sen yaz."}</p></EmptyState>
          ) : (
            <ul className="grid gap-2">
              <AnimatePresence initial={false}>
              {sorted.map((c) => (
                <motion.li key={c.id} layout="position" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={SPRING} className={`rounded-[20px] p-3.5 shadow-sm ${c.is_accepted ? "bg-tide/20 ring-2 ring-tide" : "bg-card"}`}>
                  <div className="flex items-start gap-3">
                    <Link href={`/profil/${c.author_id}`} className="transition-transform hover:scale-105"><UserAvatar name={c.author_name} avatar={avatars[c.author_id]} size={36} /></Link>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink/60">
                        <Link href={`/profil/${c.author_id}`} className="text-sm font-extrabold text-ink">{c.author_name || "Öğrenci"}</Link>
                        {timeAgo(c.created_at)}
                        {c.is_accepted && <span className="rounded-full bg-tide px-2 py-0.5 text-[10px] font-extrabold text-deep"><FontAwesomeIcon icon={faCircleCheck} className="mr-1" />Doğru yanıt</span>}
                      </p>
                      {c.hidden && <p className="mt-1 rounded-lg bg-sun/25 px-2 py-1 text-[11px] font-bold">{c.mine ? "Şikâyetler nedeniyle inceleniyor." : "Şikâyetler nedeniyle gizlendi."}</p>}
                      <RichText text={c.body} className="mt-1 text-[15px] leading-relaxed" />
                      <div className="mt-2 flex items-center gap-1">
                        <motion.button whileTap={{ scale: 0.85 }} type="button" onClick={() => like(c)} aria-pressed={c.liked} aria-label={c.liked ? "Beğenmekten vazgeç" : "Beğen"} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors hover:bg-coral/10 ${c.liked ? "text-coral" : "text-ink/65"}`}>
                          <motion.span key={String(c.liked)} initial={c.liked ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }} className="inline-flex">
                            <FontAwesomeIcon icon={faHeart} className={c.liked ? "" : "opacity-45"} />
                          </motion.span>
                          {c.like_count}
                        </motion.button>
                        {isQuestion && post.mine && (
                          <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => accept(c)} className="rounded-full bg-foam px-3 py-1.5 text-xs font-bold transition-colors hover:bg-tide/20">{c.is_accepted ? "İşareti kaldır" : "Doğru yanıt"}</motion.button>
                        )}
                      </div>
                    </div>
                    <ItemMenu authorId={c.author_id} canDelete={c.mine || c.can_moderate} canReport={!c.mine} onDelete={() => del(c)} onReport={() => setReporting(c.id)} label="Yorum" />
                  </div>
                </motion.li>
              ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      </div>
      <form onSubmit={send} className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[720px] border-t border-ink/5 bg-foam/95 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:bottom-0">
        {err && <p role="alert" className="mb-1 px-2 text-xs font-bold text-coral">{err}</p>}
        <div className="flex items-end gap-2 rounded-[26px] bg-card p-1.5 shadow-sm ring-1 ring-ink/5 focus-within:ring-2 focus-within:ring-sun">
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={1} placeholder={isQuestion ? "Yanıtını yaz…" : "Yorum yaz…"} aria-label={isQuestion ? "Yanıt yaz" : "Yorum yaz"} className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3.5 py-2.5 text-base leading-snug outline-none placeholder:text-ink/45" />
          <motion.button whileTap={{ scale: 0.88 }} disabled={!text.trim() || sending} aria-label="Gönder" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors ${text.trim() && !sending ? "bg-sea text-white" : "bg-ink/10 text-ink/35"}`}><FontAwesomeIcon icon={faPaperPlane} /></motion.button>
        </div>
      </form>
      <AnimatePresence>{reporting && <ReportSheet type="comment" id={reporting} onClose={() => setReporting(null)} />}</AnimatePresence>
    </main>
  );
}
