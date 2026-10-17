"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { errText, formatCount, rpc, timeAgo, type PostComment } from "@/lib/community";
import { faHeart, faPaperPlane, faReply, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RichText from "./RichText";
import Sheet from "./Sheet";
import { SPRING } from "./ui";

/**
 * Akıştan ayrılmadan açılan yorum paneli (alttan açılır). Yorum yazma, yanıtlama, beğenme ve silme burada yapılır.
 * Yanıtlar kökün altında tek seviye girintiyle, zaman sırasıyla gösterilir.
 */
export default function CommentsSheet({
  postId,
  title = "Yorumlar",
  onClose,
  onCount,
}: {
  postId: string;
  title?: string;
  onClose: () => void;
  /** Yorum eklenince/silinince güncel yorum sayısını bildirir. */
  onCount?: (n: number) => void;
}) {
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const rows = (await rpc<PostComment[]>("community_comments", { p_post: postId })) ?? [];
      setComments(rows);
      return rows.length;
    } catch (e) {
      setErr(errText(e));
      setComments((c) => c ?? []);
      return null;
    }
  }, [postId]);
  useEffect(() => {
    void load();
  }, [load]);

  const avatars = useAvatars(useMemo(() => (comments ?? []).map((c) => c.author_id), [comments]));

  const { roots, replies } = useMemo(() => {
    const list = comments ?? [];
    const byId = new Map(list.map((c) => [c.id, c]));
    const rootOf = (c: PostComment): string => {
      let cur = c;
      for (let n = 0; n < 50 && cur.parent_id && byId.has(cur.parent_id); n++) cur = byId.get(cur.parent_id)!;
      return cur.id;
    };
    const top: PostComment[] = [];
    const kids = new Map<string, PostComment[]>();
    for (const c of list) {
      const root = rootOf(c);
      if (root === c.id) top.push(c);
      else kids.set(root, [...(kids.get(root) ?? []), c]);
    }
    return { roots: top, replies: kids };
  }, [comments]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setErr("");
    try {
      await rpc("community_add_comment", { p_post: postId, p_body: body, p_parent: replyTo?.id ?? null });
      setText("");
      setReplyTo(null);
      const n = await load();
      if (n !== null) onCount?.(n);
    } catch (e2) {
      setErr(errText(e2));
    } finally {
      setSending(false);
    }
  };
  const like = async (c: PostComment) => {
    const prev = comments;
    setComments((cur) => (cur ?? []).map((x) => (x.id === c.id ? { ...x, liked: !x.liked, like_count: Math.max(0, x.like_count + (x.liked ? -1 : 1)) } : x)));
    try {
      const r = await rpc<{ liked: boolean; count: number }>("community_toggle_like", { p_type: "comment", p_id: c.id });
      setComments((cur) => (cur ?? []).map((x) => (x.id === c.id ? { ...x, liked: r.liked, like_count: r.count } : x)));
    } catch (e) {
      setComments(prev);
      setErr(errText(e));
    }
  };
  const del = async (c: PostComment) => {
    if (!window.confirm(c.mine ? "Bu yorum silinsin mi?" : "Bu yorum moderatör olarak kaldırılsın mı?")) return;
    try {
      await rpc("community_delete", { p_type: "comment", p_id: c.id });
      if (replyTo?.id === c.id) setReplyTo(null);
      const n = await load();
      if (n !== null) onCount?.(n);
    } catch (e) {
      setErr(errText(e));
    }
  };

  const item = (c: PostComment, nested: boolean) => (
    <motion.li key={c.id} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING} className={`flex gap-3 py-2 ${nested ? "ml-11" : ""}`}>
      <Link href={`/profil/${c.author_id}`} onClick={onClose} className="h-fit shrink-0">
        <UserAvatar name={c.author_name} avatar={avatars[c.author_id]} size={nested ? 30 : 36} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-snug">
          <Link href={`/profil/${c.author_id}`} onClick={onClose} className="font-extrabold hover:underline">
            {c.author_name || "Öğrenci"}
          </Link>{" "}
          {nested && c.reply_to_name && <span className="font-bold text-sea">@{c.reply_to_name} </span>}
          <RichText text={c.body} className="inline" />
        </div>
        {c.hidden && <p className="mt-1 rounded-lg bg-sun/25 px-2 py-1 text-[11px] font-bold">{c.mine ? "Şikâyetler nedeniyle inceleniyor." : "Şikâyetler nedeniyle gizlendi."}</p>}
        <p className="mt-1 flex items-center gap-3 text-xs font-bold text-ink/55">
          <span className="font-normal">{timeAgo(c.created_at)}</span>
          {c.like_count > 0 && <span>{formatCount(c.like_count)} beğeni</span>}
          <button type="button" onClick={() => { setReplyTo(c); box.current?.focus(); }} className="hover:text-ink">
            Yanıtla
          </button>
          {(c.mine || c.can_moderate) && (
            <button type="button" aria-label="Yorumu sil" onClick={() => del(c)} className="hover:text-coral">
              <FontAwesomeIcon icon={faTrash} />
            </button>
          )}
        </p>
      </div>
      <motion.button whileTap={{ scale: 0.8 }} type="button" aria-label={c.liked ? "Beğenmekten vazgeç" : "Beğen"} aria-pressed={c.liked} onClick={() => like(c)} className={`h-fit shrink-0 p-1.5 text-sm ${c.liked ? "text-coral" : "text-ink/40 hover:text-coral"}`}>
        <FontAwesomeIcon icon={faHeart} />
      </motion.button>
    </motion.li>
  );

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="min-h-[30dvh]">
        {comments === null ? (
          <div className="grid gap-3" aria-busy="true" aria-label="Yükleniyor">
            {[0, 1, 2].map((i) => <div key={i} className="shimmer h-14 rounded-2xl" />)}
          </div>
        ) : roots.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink/60">Henüz yorum yok. İlk yorumu sen yaz.</p>
        ) : (
          <ul>
            <AnimatePresence initial={false}>{roots.flatMap((c) => [item(c, false), ...(replies.get(c.id) ?? []).map((k) => item(k, true))])}</AnimatePresence>
          </ul>
        )}
      </div>
      <form onSubmit={send} className="sticky bottom-0 -mx-5 mt-2 border-t border-ink/[0.07] bg-card px-5 pb-1 pt-3">
        {err && <p role="alert" className="mb-1 text-xs font-bold text-coral">{err}</p>}
        {replyTo && (
          <p className="mb-1.5 flex items-center gap-2 text-xs text-ink/65">
            <FontAwesomeIcon icon={faReply} className="-scale-x-100 text-sea" />
            <span className="min-w-0 flex-1 truncate"><b>{replyTo.author_name || "Öğrenci"}</b> kişisine yanıt veriyorsun</span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Yanıt vermeyi bırak" className="grid h-5 w-5 place-items-center rounded-full bg-ink/10 text-[9px]"><FontAwesomeIcon icon={faXmark} /></button>
          </p>
        )}
        <div className="flex items-end gap-2 rounded-[26px] bg-foam p-1.5 focus-within:ring-2 focus-within:ring-sun">
          <textarea ref={box} value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={1} placeholder={replyTo ? "Yanıtını yaz…" : "Yorum ekle…"} aria-label="Yorum yaz" className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-3.5 py-2.5 text-base leading-snug outline-none placeholder:text-ink/45" />
          <motion.button whileTap={{ scale: 0.88 }} disabled={!text.trim() || sending} aria-label="Gönder" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors ${text.trim() && !sending ? "bg-sea text-white" : "bg-ink/10 text-ink/35"}`}>
            <FontAwesomeIcon icon={faPaperPlane} />
          </motion.button>
        </div>
      </form>
    </Sheet>
  );
}
