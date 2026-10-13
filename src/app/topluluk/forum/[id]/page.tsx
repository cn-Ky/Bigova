"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { BackHeader, NeedLogin, Notice } from "@/components/community/CommunityHeader";
import { ItemMenu } from "@/components/community/PostCard";
import ReportSheet from "@/components/community/ReportSheet";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { buildTimeline, clock, splitLinks, type ChatMessage } from "@/lib/chatUtils";
import { errText, rpc, type ChannelInfo, type ChannelMessage } from "@/lib/community";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAGE = 40;
const MAX_LEN = 1500;

export default function ForumKanal() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const [info, setInfo] = useState<ChannelInfo | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<ChannelMessage[]>([]); // yeniden eskiye
  const [hasOlder, setHasOlder] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [reporting, setReporting] = useState<string | null>(null);
  const listEnd = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // en alttaysa yeni mesajla birlikte kaydır
  const firstLoad = useRef(true);

  // Alt menüyü gizle, yazma alanını ekranın altına yapıştır (globals.css: html[data-chat])
  useEffect(() => {
    document.documentElement.dataset.chat = "1";
    return () => {
      delete document.documentElement.dataset.chat;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    rpc<ChannelInfo[]>("channel_get", { p_channel: id })
      .then((r) => setInfo(r?.[0] ?? null))
      .catch((e) => {
        setNotice(errText(e));
        setInfo(null);
      });
  }, [user, id]);

  const load = useCallback(async () => {
    try {
      const rows = (await rpc<ChannelMessage[]>("channel_messages_get", { p_channel: id, p_limit: PAGE })) ?? [];
      setMsgs((cur) => {
        // Daha önce yüklenmiş eski sayfaları koru, en yeni sayfayı güncelle
        const oldest = rows[rows.length - 1]?.created_at;
        const keep = oldest ? cur.filter((m) => m.created_at < oldest) : [];
        return [...rows, ...keep];
      });
      if (firstLoad.current) {
        setHasOlder(rows.length === PAGE);
        firstLoad.current = false;
      }
    } catch (e) {
      setNotice(errText(e));
    }
  }, [id]);

  useEffect(() => {
    if (!user || info === undefined || info === null) return;
    void load();
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`forum-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_messages", filter: `channel_id=eq.${id}` }, () => void load())
      .subscribe();
    const poll = setInterval(() => {
      if (!document.hidden) void load();
    }, 10000);
    return () => {
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [user, info, id, load]);

  const loadOlder = async () => {
    const oldest = msgs[msgs.length - 1];
    if (!oldest) return;
    const before = document.documentElement.scrollHeight;
    try {
      const rows = (await rpc<ChannelMessage[]>("channel_messages_get", { p_channel: id, p_before: oldest.created_at, p_limit: PAGE })) ?? [];
      stick.current = false;
      setMsgs((cur) => [...cur, ...rows.filter((r) => !cur.some((c) => c.id === r.id))]);
      setHasOlder(rows.length === PAGE);
      requestAnimationFrame(() => window.scrollBy(0, document.documentElement.scrollHeight - before));
    } catch (e) {
      setNotice(errText(e));
    }
  };

  const ordered = useMemo(() => [...msgs].reverse(), [msgs]);
  const byId = useMemo(() => new Map(msgs.map((m) => [m.id, m])), [msgs]);
  const timeline = useMemo(
    () =>
      buildTimeline(
        ordered.map<ChatMessage>((m) => ({ id: m.id, from_id: m.author_id, to_id: "", body: m.body, created_at: m.created_at, deleted_at: m.deleted ? m.created_at : null })),
        user?.id ?? "",
      ),
    [ordered, user],
  );
  const avatars = useAvatars(useMemo(() => Array.from(new Set(msgs.map((m) => m.author_id))), [msgs]));

  useEffect(() => {
    if (stick.current) listEnd.current?.scrollIntoView({ block: "end" });
  }, [ordered.length]);
  useEffect(() => {
    const onScroll = () => {
      stick.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 140;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setNotice("");
    try {
      await rpc("channel_send", { p_channel: id, p_body: body });
      setText("");
      stick.current = true;
      await load();
    } catch (err) {
      setNotice(errText(err));
    } finally {
      setSending(false);
    }
  };
  const del = async (m: ChannelMessage) => {
    if (!window.confirm(m.mine ? "Bu mesaj silinsin mi?" : "Bu mesaj moderatör olarak kaldırılsın mı?")) return;
    try {
      await rpc("community_delete", { p_type: "message", p_id: m.id });
      await load();
    } catch (err) {
      setNotice(errText(err));
    }
  };

  if (user === undefined) return <main className="p-5"><div className="shimmer h-24 rounded-2xl" /></main>;
  if (!user) return <NeedLogin what="Sohbete katılmak" />;
  if (info === null)
    return (
      <main>
        <BackHeader title="Sohbet bulunamadı" fallback="/topluluk/forum" />
        <div className="grid gap-3 p-5">
          <Notice text={notice || "Bu sohbet yok ya da erişimin yok. Bir topluluk sohbetiyse önce topluluğa katılmalısın."} />
        </div>
      </main>
    );
  const subtitle = info ? (info.community_name ? `${info.community_name}` : (info.category_name ?? "Forum")) : "";
  return (
    <main className="chat-page flex min-h-[calc(100dvh-1rem)] flex-col">
      <div className="chat-head sticky top-0 z-30">
        <BackHeader title={info ? `# ${info.name}` : "Yükleniyor…"} subtitle={subtitle} fallback={info?.community_slug ? `/topluluk/t/${info.community_slug}` : "/topluluk/forum"} />
      </div>
      <div className="flex-1 px-3 py-3">
        {info?.description && <p className="mb-3 rounded-2xl bg-card px-4 py-2.5 text-xs text-ink/70 shadow-sm">{info.description}</p>}
        {hasOlder && (
          <button type="button" onClick={loadOlder} className="mx-auto mb-3 block rounded-full bg-card px-4 py-2 text-xs font-extrabold shadow-sm">Önceki mesajlar</button>
        )}
        {msgs.length === 0 && info && <p className="py-10 text-center text-sm text-ink/60">Henüz mesaj yok. İlk mesajı sen yaz!</p>}
        <ul className="grid gap-0.5">
          {timeline.map((it) => {
            if (it.type === "day")
              return (
                <li key={it.key} className="my-3 text-center text-[11px] font-extrabold uppercase tracking-wide text-ink/50">{it.label}</li>
              );
            const m = byId.get(it.message.id);
            if (!m) return null;
            const urlParts = splitLinks(m.body);
            return (
              <li key={it.key} className={`flex items-end gap-2 ${m.mine ? "flex-row-reverse" : ""} ${it.first ? "mt-2" : ""}`}>
                <span className="w-8 shrink-0">
                  {!m.mine && it.last && <UserAvatar name={m.author_name} avatar={avatars[m.author_id]} size={32} />}
                </span>
                <div className={`flex max-w-[82%] flex-col ${m.mine ? "items-end" : "items-start"}`}>
                  {!m.mine && it.first && <span className="mb-0.5 px-1 text-[11px] font-extrabold text-ink/60">{m.author_name || "Öğrenci"}</span>}
                  <div className="flex items-center gap-1">
                    <div className={`rounded-[18px] px-3.5 py-2 text-[15px] leading-snug ${m.mine ? "bg-sea text-white" : "bg-card shadow-sm"} ${m.deleted ? "italic opacity-60" : ""}`}>
                      {m.deleted ? (
                        "Bu mesaj silindi"
                      ) : (
                        <p className="whitespace-pre-wrap break-words">
                          {urlParts.map((p, i) =>
                            p.href ? (
                              <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-bold underline">{p.text}</a>
                            ) : (
                              <span key={i}>{p.text}</span>
                            ),
                          )}
                        </p>
                      )}
                      {it.last && <span className={`mt-0.5 block text-[10px] ${m.mine ? "text-white/70" : "text-ink/45"}`}>{clock(m.created_at)}</span>}
                      {m.hidden && !m.deleted && <span className="mt-1 block text-[10px] font-bold">Şikâyetler nedeniyle inceleniyor</span>}
                    </div>
                    {!m.deleted && (
                      <div className={m.mine ? "order-first" : ""}>
                        <ItemMenu authorId={m.author_id} canDelete={m.mine || m.can_moderate} canReport={!m.mine} onDelete={() => del(m)} onReport={() => setReporting(m.id)} label="Mesaj" />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={listEnd} />
      </div>
      <div className="chat-composer sticky bottom-0 z-20 border-t border-ink/5 bg-foam/95 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        {notice && (
          <p role="alert" className="mb-2 flex items-start justify-between gap-2 rounded-xl bg-coral/15 px-3 py-2 text-sm font-bold">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Uyarıyı kapat" className="text-ink/60">✕</button>
          </p>
        )}
        <form onSubmit={send} className="flex items-end gap-2 rounded-[26px] bg-card p-1.5 shadow-sm ring-1 ring-ink/5 focus-within:ring-2 focus-within:ring-sun">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={info ? `# ${info.name} kanalına yaz…` : "Mesaj yaz…"}
            aria-label="Mesaj yaz"
            className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3.5 py-2.5 text-base leading-snug outline-none placeholder:text-ink/45"
          />
          <button type="submit" disabled={!text.trim() || sending} aria-label="Mesajı gönder" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors ${text.trim() && !sending ? "bg-sea text-white" : "bg-ink/10 text-ink/35"}`}>
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </form>
      </div>
      <AnimatePresence>{reporting && <ReportSheet type="message" id={reporting} onClose={() => setReporting(null)} />}</AnimatePresence>
    </main>
  );
}
