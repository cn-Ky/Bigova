"use client";
import Mascot from "@/components/Mascot";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { useUnread } from "@/components/NotificationProvider";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import {
  buildTimeline,
  clock,
  fullStamp,
  splitLinks,
  type ChatMessage as Message,
} from "@/lib/chatUtils";
import { demoFriends } from "@/lib/demoData";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
  faArrowDown,
  faArrowLeft,
  faCheck,
  faCircleExclamation,
  faClock,
  faFire,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Profile = { id: string; name: string };
const UUID_RE = /^[0-9a-f-]{36}$/i;
const MAX_LEN = 2000;
const STARTERS = ["Selam! 👋", "Bugün okula geliyor musun?", "Ders notlarını paylaşır mısın?"];

/** Mesaj metni: http(s) bağlantıları tıklanabilir, satır sonları korunur. */
function Linkified({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((part, i) =>
        part.href ? (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="break-all font-bold underline underline-offset-2"
          >
            {part.text}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export default function DirectMessage() {
  const params = useParams<{ id: string }>();
  const friendId = params.id;
  const { user } = useUser();
  const { markRead } = useUnread();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [friend, setFriend] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFriend, setIsFriend] = useState(false);
  const [relation, setRelation] = useState<"none" | "outgoing" | "incoming">("none");
  const [outbox, setOutbox] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  const [typing, setTyping] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const coarse = useRef(false);
  const atBottomRef = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const scrolledOnce = useRef(false);
  const prevCount = useRef(0);
  const avatarIds = useMemo(() => (UUID_RE.test(friendId) ? [friendId] : []), [friendId]);
  const avatars = useAvatars(avatarIds);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const validId =
    /^[0-9a-f-]{36}$/i.test(friendId) ||
    demoFriends.some((person) => person.id === friendId);

  const load = useCallback(async () => {
    if (!user || !validId) return;
    const { data: links } = await sb
      .from("friendships")
      .select("requester,addressee,status")
      .or(
        `and(requester.eq.${user.id},addressee.eq.${friendId}),and(requester.eq.${friendId},addressee.eq.${user.id})`,
      )
      .limit(1);
    const link = links?.[0] as
      | { requester: string; addressee: string; status: "pending" | "accepted" }
      | undefined;
    if (!link || link.status !== "accepted") {
      const { data: profile } = await sb
        .from("profiles")
        .select("id,name")
        .eq("id", friendId)
        .maybeSingle();
      setFriend(profile as Profile | null);
      setIsFriend(false);
      setRelation(!link ? "none" : link.requester === user.id ? "outgoing" : "incoming");
      setMessages([]);
      return;
    }
    const [{ data: profile }, { data: history }, { data: streakRow }] =
      await Promise.all([
        sb
          .from("profiles")
          .select("id,name")
          .eq("id", friendId)
          .maybeSingle(),
        sb
          .from("messages")
          .select("id,from_id,to_id,body,created_at")
          .or(
            `and(from_id.eq.${user.id},to_id.eq.${friendId}),and(from_id.eq.${friendId},to_id.eq.${user.id})`,
          )
          .order("created_at", { ascending: true })
          .limit(300),
        sb
          .from("friendship_streaks")
          .select("current_streak,last_mutual_date")
          .eq("user_a", [user.id, friendId].sort()[0])
          .eq("user_b", [user.id, friendId].sort()[1])
          .maybeSingle(),
      ]);
    setFriend(profile as Profile | null);
    setIsFriend(true);
    setMessages((history as Message[]) ?? []);
    setLoaded(true);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);
    setStreak(
      streakRow &&
        (streakRow.last_mutual_date === today ||
          streakRow.last_mutual_date === yesterday)
        ? streakRow.current_streak
        : 0,
    );
  }, [friendId, sb, user, validId]);

  useEffect(() => {
    if (user) load();
    else if (user === null && validId) {
      const person = demoFriends.find((entry) => entry.id === friendId);
      if (!person) return;
      setFriend({ ...person });
      setIsFriend(true);
      setLoaded(true);
      setStreak(2);
      try {
        const saved = localStorage.getItem(`bigova-demo-chat-${friendId}`);
        if (saved) setMessages(JSON.parse(saved));
        else {
          const initial: Message[] = [
            {
              id: `${friendId}-welcome-1`,
              from_id: friendId,
              to_id: "demo-self",
              body: "Merhaba! Bu örnek bir bire bir sohbet. Yazdığın mesajlar sadece bu tarayıcıda saklanır.",
              created_at: new Date(Date.now() - 60000).toISOString(),
            },
          ];
          setMessages(initial);
          localStorage.setItem(
            `bigova-demo-chat-${friendId}`,
            JSON.stringify(initial),
          );
        }
      } catch {
        setMessages([]);
      }
    }
  }, [load, user]);
  useEffect(() => {
    if (!user) return;
    const channel = sb
      .channel(`direct-${user.id}-${friendId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as Message;
          if (
            (row.from_id === user.id && row.to_id === friendId) ||
            (row.from_id === friendId && row.to_id === user.id)
          )
            load();
        },
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [friendId, load, sb, user]);

  // Gerçek zamanlı bağlantı kurulamazsa mesajlar yine de birkaç saniyede bir yenilenir
  useEffect(() => {
    if (!user) return;
    const poll = setInterval(() => {
      if (!document.hidden) load();
    }, 5000);
    return () => clearInterval(poll);
  }, [load, user]);
  const chatMode = isFriend && !!friend;
  // Sohbet açıkken alt menü gizlenir, yazma alanı ekranın altına yapışır (globals.css: html[data-chat])
  useEffect(() => {
    if (!chatMode) return;
    document.documentElement.dataset.chat = "1";
    return () => {
      delete document.documentElement.dataset.chat;
    };
  }, [chatMode]);
  useEffect(() => {
    coarse.current = matchMedia("(pointer: coarse)").matches;
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (loaded) loadedRef.current = true;
  }, [loaded]);

  // Taslak: yazılan ama gönderilmeyen metin her arkadaş için saklanır
  useEffect(() => {
    try {
      setMessage(localStorage.getItem(`bigova-draft-${friendId}`) ?? "");
    } catch {}
  }, [friendId]);
  useEffect(() => {
    try {
      if (message) localStorage.setItem(`bigova-draft-${friendId}`, message);
      else localStorage.removeItem(`bigova-draft-${friendId}`);
    } catch {}
  }, [message, friendId]);
  // Yazı alanı içeriğe göre büyür (en çok ~6 satır)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [message, chatMode]);

  const all = useMemo(() => [...messages, ...outbox], [messages, outbox]);
  const selfId = user?.id ?? "demo-self";
  const timeline = useMemo(() => buildTimeline(all, selfId), [all, selfId]);

  const scrollToBottom = useCallback((smooth: boolean) => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: smooth && !reduce ? "smooth" : "auto",
    });
  }, []);
  // Kullanıcı geçmişi okurken sayfayı zorla en alta atma; "yeni mesaj" düğmesi göster
  useEffect(() => {
    const onScroll = () => {
      const d =
        document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      const near = d < 160;
      atBottomRef.current = near;
      setAtBottom(near);
      if (near) setUnseen(0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [chatMode]);
  useEffect(() => {
    if (!chatMode || !all.length) return;
    const last = all[all.length - 1];
    const added = all.length - prevCount.current;
    prevCount.current = all.length;
    if (!scrolledOnce.current) {
      scrolledOnce.current = true;
      requestAnimationFrame(() => scrollToBottom(false));
      return;
    }
    if (added <= 0) return;
    const own = last.from_id === selfId;
    if (own || atBottomRef.current) requestAnimationFrame(() => scrollToBottom(true));
    else setUnseen((n) => n + added);
  }, [all, chatMode, scrollToBottom, selfId]);

  // sohbet açıkken (ve yeni mesaj geldikçe) okundu işaretle
  const lastIncoming = [...messages].reverse().find((m) => m.from_id === friendId)?.created_at;
  useEffect(() => {
    if (user && isFriend && UUID_RE.test(friendId)) void markRead(friendId);
  }, [user, isFriend, friendId, lastIncoming, markRead]);

  const flushDemo = (updated: Message[]) => {
    try {
      localStorage.setItem(`bigova-demo-chat-${friendId}`, JSON.stringify(updated));
    } catch {}
  };

  async function deliver(temp: Message) {
    const { data: sent, error } = await sb
      .from("messages")
      .insert({ to_id: friendId, body: temp.body })
      .select("id,from_id,to_id,body,created_at")
      .single();
    if (error || !sent) {
      setOutbox((o) => o.map((m) => (m.id === temp.id ? { ...m, status: "failed" } : m)));
      setNotice(`Mesaj gönderilemedi: ${error?.message ?? "bağlantı hatası"}`);
      return;
    }
    setOutbox((o) => o.filter((m) => m.id !== temp.id));
    setMessages((cur) =>
      cur.some((m) => m.id === (sent as Message).id) ? cur : [...cur, sent as Message],
    );
    void load();
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = message.trim();
    if (!body || !friend) return;
    setNotice("");
    if (!user && friendId.startsWith("demo-friend-")) {
      const now = new Date();
      const own: Message = {
        id: crypto.randomUUID(),
        from_id: "demo-self",
        to_id: friendId,
        body,
        created_at: now.toISOString(),
      };
      const withOwn = [...messages, own];
      setMessages(withOwn);
      setMessage("");
      setStreak((current) => current + 1);
      flushDemo(withOwn);
      setTyping(true);
      timers.current.push(
        setTimeout(() => {
          const reply: Message = {
            id: crypto.randomUUID(),
            from_id: friendId,
            to_id: "demo-self",
            body: "Yanıt, deneme sohbetini göstermek için otomatik oluşturuldu; gerçek bir kullanıcıya iletilmedi.",
            created_at: new Date().toISOString(),
          };
          setTyping(false);
          setMessages((cur) => {
            const next = [...cur, reply];
            flushDemo(next);
            return next;
          });
        }, 1400),
      );
      return;
    }
    if (!user) return;
    // İyimser gönderim: mesaj hemen görünür, sunucu yanıtı gelince onaylanır
    const temp: Message = {
      id: `tmp-${crypto.randomUUID()}`,
      from_id: user.id,
      to_id: friendId,
      body,
      created_at: new Date().toISOString(),
      status: "pending",
    };
    setOutbox((o) => [...o, temp]);
    setMessage("");
    inputRef.current?.focus();
    await deliver(temp);
  }
  async function retry(id: string) {
    const temp = outbox.find((m) => m.id === id);
    if (!temp) return;
    setNotice("");
    const again: Message = { ...temp, status: "pending" };
    setOutbox((o) => o.map((m) => (m.id === id ? again : m)));
    await deliver(again);
  }
  function discard(id: string) {
    const temp = outbox.find((m) => m.id === id);
    setOutbox((o) => o.filter((m) => m.id !== id));
    // Silinen mesajın metni yazı alanına geri konur; kullanıcı düzenleyip yeniden gönderebilir
    if (temp && !message) setMessage(temp.body);
    inputRef.current?.focus();
  }
  async function addFriend() {
    if (!user || !friend) return;
    setBusy(true);
    setNotice("");
    const { error } = await sb
      .from("friendships")
      .insert({ requester: user.id, addressee: friend.id, status: "pending" });
    setBusy(false);
    if (error) setNotice(`İstek gönderilemedi: ${error.message}`);
    else {
      setNotice("");
      setRelation("outgoing");
    }
  }
  async function acceptFriend() {
    if (!user || !friend) return;
    setBusy(true);
    setNotice("");
    const { error } = await sb
      .from("friendships")
      .update({ status: "accepted" })
      .eq("requester", friend.id)
      .eq("addressee", user.id);
    setBusy(false);
    if (error) setNotice("İstek kabul edilemedi.");
    else await load();
  }

  if (user === undefined)
    return (
      <main className="p-5">
        <div className="shimmer h-20 rounded-2xl" />
      </main>
    );
  if (!validId || !friend)
    return (
      <main className="px-5 py-8">
        <Link href="/arkadaslar" className="font-bold text-sea">
          <FontAwesomeIcon icon={faArrowLeft} /> Arkadaşlara dön
        </Link>
        <p className="mt-6 text-sm text-ink/70">Öğrenci bulunamadı.</p>
      </main>
    );
  if (!isFriend)
    return (
      <main className="px-5 py-8">
        <Link href="/arkadaslar" className="font-bold text-sea">
          <FontAwesomeIcon icon={faArrowLeft} /> Arkadaşlara dön
        </Link>
        <section className="mt-6 rounded-[20px] bg-card p-5 text-center shadow-sm">
          <Link href={`/profil/${friend.id}`} aria-label="Profili aç" className="mx-auto block w-fit">
            <UserAvatar name={friend.name} avatar={avatars[friend.id]} size={72} />
          </Link>
          <h1 className="mt-3 font-display text-xl font-extrabold">
            {friend.name || "Öğrenci"}
          </h1>
          <p className="mt-3 text-sm text-ink/70">
            {relation === "outgoing"
              ? "İstek gönderildi. Kabul edildiğinde burada bire bir mesajlaşabilirsiniz."
              : relation === "incoming"
                ? "Bu kişi sana arkadaşlık isteği gönderdi. Kabul edince mesajlaşabilirsiniz."
                : "Bire bir sohbet başlatmak için önce arkadaşlık isteği gönder."}
          </p>
          {notice && (
            <p role="status" className="mt-3 text-sm font-bold text-coral">
              {notice}
            </p>
          )}
          {relation === "none" && (
            <button
              onClick={addFriend}
              disabled={busy}
              className="mt-4 rounded-full bg-sea px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {busy ? "Gönderiliyor…" : "Arkadaşlık isteği gönder"}
            </button>
          )}
          {relation === "outgoing" && (
            <span className="mt-4 inline-block rounded-full bg-foam px-5 py-3 text-sm font-bold text-ink/60">
              Yanıt bekleniyor
            </span>
          )}
          {relation === "incoming" && (
            <button
              onClick={acceptFriend}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-tide px-5 py-3 font-bold text-deep disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faCheck} /> {busy ? "Kabul ediliyor…" : "İsteği kabul et"}
            </button>
          )}
        </section>
      </main>
    );

  const friendName = friend.name || "Öğrenci";
  const canSend = !!message.trim();
  const animateIn = loadedRef.current;
  const failedCount = outbox.filter((m) => m.status === "failed").length;

  return (
    <main className="flex min-h-[calc(100dvh-1rem)] flex-col">
      <header className="chat-head sticky top-0 z-20 rounded-b-[20px] bg-sea px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/arkadaslar"
            aria-label="Arkadaşlara dön"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 transition active:scale-90"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          {user ? (
            <Link href={`/profil/${friend.id}`} aria-label={`${friendName} profilini aç`} className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar name={friend.name} avatar={avatars[friend.id]} size={42} className="ring-2 ring-white/30" />
              <span className="min-w-0 flex-1">
                <h1 className="truncate font-display text-lg font-extrabold leading-tight">{friendName}</h1>
                <p className="truncate text-xs text-white/70">
                  {typing ? "yazıyor…" : "Bire bir sohbet · profili gör"}
                </p>
              </span>
            </Link>
          ) : (
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-extrabold leading-tight">{friendName}</h1>
              <p className="truncate text-xs text-white/70">
                {typing ? "yazıyor…" : "Deneme sohbeti · bu tarayıcıda"}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowStreakInfo((v) => !v)}
            aria-expanded={showStreakInfo}
            aria-label={`Sohbet serisi ${streak} gün. Açıklamayı göster`}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm font-bold transition active:scale-95"
          >
            <FontAwesomeIcon icon={faFire} className={streak > 0 ? "text-sun" : "text-white/50"} />
            {streak}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {showStreakInfo && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden text-xs text-white/80"
            >
              <span className="mt-2 block rounded-xl bg-white/10 px-3 py-2">
                Seri, ikiniz de aynı gün mesaj gönderdiğinde bir artar. Bir gün atlarsanız sıfırlanır.
              </span>
            </motion.p>
          )}
        </AnimatePresence>
      </header>

      <ol
        role="log"
        aria-live="polite"
        aria-label="Mesajlar"
        className="flex flex-1 flex-col px-3 pb-4 pt-3"
      >
        {timeline.map((item) => {
          if (item.type === "day")
            return (
              <li key={item.key} className="my-3 flex justify-center first:mt-1">
                <span className="rounded-full bg-card/80 px-3 py-1 text-[11px] font-extrabold text-ink/60 shadow-sm">
                  {item.label}
                </span>
              </li>
            );
          const { message: m, mine, first, last } = item;
          const failed = m.status === "failed";
          const pending = m.status === "pending";
          const corner = mine
            ? `${first ? "" : "rounded-tr-md"} rounded-br-md`
            : `${first ? "" : "rounded-tl-md"} rounded-bl-md`;
          return (
            <motion.li
              key={item.key}
              initial={animateIn ? { opacity: 0, y: 10, scale: 0.97 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className={`flex items-end gap-2 ${first ? "mt-3" : "mt-0.5"} ${mine ? "justify-end" : "justify-start"}`}
            >
              {!mine &&
                (last ? (
                  <UserAvatar name={friend.name} avatar={avatars[friend.id]} size={30} />
                ) : (
                  <span className="w-[30px] shrink-0" aria-hidden />
                ))}
              <div className={`flex min-w-0 max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}>
                <div
                  title={fullStamp(m.created_at)}
                  className={`rounded-[20px] px-3.5 py-2 shadow-sm ${corner} ${
                    mine ? "bg-sea text-white" : "bg-card text-ink"
                  } ${pending ? "opacity-70" : ""} ${failed ? "ring-2 ring-coral" : ""}`}
                >
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">
                    <Linkified text={m.body} />
                  </p>
                  {last && (
                    <span
                      className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${mine ? "text-white/70" : "text-ink/50"}`}
                    >
                      <time dateTime={m.created_at}>{clock(m.created_at)}</time>
                      {mine && (
                        <FontAwesomeIcon
                          icon={failed ? faCircleExclamation : pending ? faClock : faCheck}
                          className={failed ? "text-coral" : ""}
                          aria-label={failed ? "Gönderilemedi" : pending ? "Gönderiliyor" : "Gönderildi"}
                        />
                      )}
                    </span>
                  )}
                </div>
                {failed && (
                  <span className="mt-1 flex items-center gap-3 text-xs font-bold">
                    <span className="text-coral">Gönderilemedi</span>
                    <button type="button" onClick={() => void retry(m.id)} className="text-sea underline underline-offset-2">
                      Tekrar dene
                    </button>
                    <button type="button" onClick={() => discard(m.id)} className="text-ink/60 underline underline-offset-2">
                      Sil
                    </button>
                  </span>
                )}
              </div>
            </motion.li>
          );
        })}
        {typing && (
          <li className="mt-3 flex items-end gap-2" aria-label={`${friendName} yazıyor`}>
            <UserAvatar name={friend.name} avatar={avatars[friend.id]} size={30} />
            <span className="flex gap-1 rounded-[20px] rounded-bl-md bg-card px-4 py-3 shadow-sm">
              {[0, 1, 2].map((i) => (
                <i key={i} className="chat-dot" style={{ animationDelay: `${i * 0.16}s` }} />
              ))}
            </span>
          </li>
        )}
        {timeline.length === 0 && (
          <li className="m-auto max-w-xs py-10 text-center">
            <Mascot size={88} className="mx-auto" />
            <p className="mt-2 font-display text-lg font-bold">Sohbeti sen başlat</p>
            <p className="text-sm text-ink/65">{friendName} ile ilk mesajı gönder ya da bir cümle seç.</p>
            <span className="mt-4 flex flex-wrap justify-center gap-2">
              {STARTERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setMessage(t);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full bg-card px-3.5 py-2 text-sm font-bold shadow-sm transition active:scale-95"
                >
                  {t}
                </button>
              ))}
            </span>
          </li>
        )}
      </ol>

      <div className="chat-composer sticky bottom-0 z-20 border-t border-ink/5 bg-foam/95 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <AnimatePresence>
          {!atBottom && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              onClick={() => {
                scrollToBottom(true);
                setUnseen(0);
              }}
              aria-label={unseen ? `${unseen} yeni mesaj, en alta git` : "En alta git"}
              className="absolute -top-12 right-3 flex h-10 items-center gap-2 rounded-full bg-card px-3.5 text-sm font-extrabold text-sea shadow-lg ring-1 ring-ink/10"
            >
              {unseen > 0 && <span>{unseen} yeni</span>}
              <FontAwesomeIcon icon={faArrowDown} />
            </motion.button>
          )}
        </AnimatePresence>
        {notice && (
          <p role="alert" className="mb-2 flex items-start justify-between gap-2 rounded-xl bg-coral/15 px-3 py-2 text-sm font-bold">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Uyarıyı kapat" className="text-ink/60">
              ✕
            </button>
          </p>
        )}
        {failedCount > 0 && !notice && (
          <p className="mb-2 text-xs font-bold text-coral">{failedCount} mesaj gönderilemedi. Üzerindeki “Tekrar dene” ile yeniden gönder.</p>
        )}
        <form onSubmit={send} className="flex items-end gap-2 rounded-[26px] bg-card p-1.5 shadow-sm ring-1 ring-ink/5 focus-within:ring-2 focus-within:ring-sun">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={(e) => {
              // Masaüstünde Enter gönderir (Shift+Enter yeni satır); dokunmatikte Enter yeni satırdır
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !coarse.current) {
                e.preventDefault();
                if (canSend) void send();
              }
            }}
            rows={1}
            enterKeyHint={coarse.current ? "enter" : "send"}
            autoComplete="off"
            placeholder="Mesaj yaz…"
            aria-label="Mesaj yaz"
            className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3.5 py-2.5 text-base leading-snug outline-none placeholder:text-ink/45"
          />
          <motion.button
            type="submit"
            disabled={!canSend}
            whileTap={{ scale: 0.88 }}
            aria-label="Mesajı gönder"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors ${canSend ? "bg-sea text-white" : "bg-ink/10 text-ink/35"}`}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </motion.button>
        </form>
        {message.length >= MAX_LEN - 200 && (
          <p className="mt-1 pr-3 text-right text-[11px] text-ink/55" aria-live="polite">
            {message.length}/{MAX_LEN}
          </p>
        )}
      </div>
    </main>
  );
}
