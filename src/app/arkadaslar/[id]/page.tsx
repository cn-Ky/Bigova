"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { demoFriends } from "@/lib/demoData";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
    faArrowLeft,
    faCheck,
    faFire,
    faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  from_id: string;
  to_id: string;
  body: string;
  created_at: string;
};
type Profile = { id: string; name: string };
const UUID_RE = /^[0-9a-f-]{36}$/i;

export default function DirectMessage() {
  const params = useParams<{ id: string }>();
  const friendId = params.id;
  const { user } = useUser();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [friend, setFriend] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFriend, setIsFriend] = useState(false);
  const [relation, setRelation] = useState<"none" | "outgoing" | "incoming">("none");
  const endRef = useRef<HTMLLIElement>(null);
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
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = message.trim();
    if (!body || !friend) return;
    if (!user && friendId.startsWith("demo-friend-")) {
      const now = new Date();
      const own: Message = {
        id: crypto.randomUUID(),
        from_id: "demo-self",
        to_id: friendId,
        body,
        created_at: now.toISOString(),
      };
      const reply: Message = {
        id: crypto.randomUUID(),
        from_id: friendId,
        to_id: "demo-self",
        body: "Yanıt, deneme sohbetini göstermek için otomatik oluşturuldu; gerçek bir kullanıcıya iletilmedi.",
        created_at: new Date(now.getTime() + 1000).toISOString(),
      };
      const updated = [...messages, own, reply];
      setMessages(updated);
      setMessage("");
      setStreak((current) => current + 1);
      try {
        localStorage.setItem(
          `bigova-demo-chat-${friendId}`,
          JSON.stringify(updated),
        );
      } catch {}
      return;
    }
    if (!user) return;
    setBusy(true);
    setNotice("");
    const { data: sent, error } = await sb
      .from("messages")
      .insert({ to_id: friendId, body })
      .select("id,from_id,to_id,body,created_at")
      .single();
    setBusy(false);
    if (error)
      setNotice(`Mesaj gönderilemedi: ${error.message}`);
    else {
      setMessage("");
      if (sent)
        setMessages((cur) =>
          cur.some((m) => m.id === (sent as Message).id) ? cur : [...cur, sent as Message],
        );
      void load();
    }
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

  return (
    <main className="flex min-h-[calc(100dvh-7rem)] flex-col">
      <header className="sticky top-0 z-10 rounded-b-[20px] bg-sea px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/arkadaslar"
            aria-label="Arkadaşlara dön"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          {user ? (
            <Link href={`/profil/${friend.id}`} aria-label={`${friend.name || "Öğrenci"} profilini aç`} className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar name={friend.name} avatar={avatars[friend.id]} size={40} className="ring-2 ring-white/30" />
              <span className="min-w-0 flex-1">
                <h1 className="truncate font-display text-lg font-extrabold">{friend.name || "Öğrenci"}</h1>
                <p className="text-xs text-white/70">Bire bir sohbet · profili gör</p>
              </span>
            </Link>
          ) : (
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-extrabold">{friend.name || "Öğrenci"}</h1>
              <p className="text-xs text-white/70">Deneme sohbeti · bu tarayıcıda</p>
            </div>
          )}
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-2 text-sm font-bold">
            <FontAwesomeIcon icon={faFire} className="text-sun" />
            {streak}
          </span>
        </div>
      </header>
      <p className="px-4 pt-3 text-center text-xs text-ink/55">
        Seri, iki taraf da aynı gün mesaj gönderdiğinde ilerler.
      </p>
      <ol className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {messages.map((entry) => {
          const mine = entry.from_id === (user?.id ?? "demo-self");
          const bubble = (
            <div
              className={`rounded-2xl px-3 py-2 ${mine ? "rounded-br-sm bg-sea text-white" : "rounded-bl-sm bg-card text-ink"}`}
            >
              <p className="whitespace-pre-wrap break-words text-sm">{entry.body}</p>
              <time className={`mt-1 block text-right text-[10px] ${mine ? "text-white/65" : "text-ink/50"}`}>
                {new Date(entry.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </time>
            </div>
          );
          return mine ? (
            <li key={entry.id} className="max-w-[82%] self-end">
              {bubble}
            </li>
          ) : (
            <li key={entry.id} className="flex max-w-[88%] items-end gap-2 self-start">
              <UserAvatar name={friend.name} avatar={avatars[friend.id]} size={30} />
              <div className="min-w-0">{bubble}</div>
            </li>
          );
        })}
        {messages.length === 0 && (
          <li className="m-auto text-center text-sm text-ink/60">
            Henüz mesaj yok. Sohbeti başlat.
          </li>
        )}
        <li ref={endRef} aria-hidden className="h-0" />
      </ol>
      {notice && (
        <p role="alert" className="px-4 pb-2 text-sm font-bold text-coral">
          {notice}
        </p>
      )}
      <form
        onSubmit={send}
        className="sticky bottom-0 flex gap-2 bg-foam px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2"
      >
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (message.trim() && !busy) void send();
            }
          }}
          maxLength={2000}
          rows={1}
          placeholder="Mesaj yaz (Enter ile gönder)"
          aria-label="Mesaj yaz"
          className="max-h-28 min-h-12 flex-1 resize-y rounded-2xl bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-tide"
        />
        <button
          type="submit"
          disabled={busy || !message.trim()}
          aria-label="Mesajı gönder"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sea text-white disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPaperPlane} />
        </button>
      </form>
    </main>
  );
}
