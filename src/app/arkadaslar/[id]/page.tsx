"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
    faArrowLeft,
    faFire,
    faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Message = {
  id: string;
  from_id: string;
  to_id: string;
  body: string;
  created_at: string;
};
type Profile = { id: string; name: string; student_no: string };

export default function DirectMessage() {
  const params = useParams<{ id: string }>();
  const friendId = params.id;
  const { user } = useUser();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [friend, setFriend] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFriend, setIsFriend] = useState(false);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const validId = /^[0-9a-f-]{36}$/i.test(friendId);

  const load = useCallback(async () => {
    if (!user || !validId) return;
    const { data: relation } = await sb
      .from("friendships")
      .select("status")
      .or(
        `and(requester.eq.${user.id},addressee.eq.${friendId}),and(requester.eq.${friendId},addressee.eq.${user.id})`,
      )
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();
    if (!relation) {
      const { data: profile } = await sb
        .from("profiles")
        .select("id,name,student_no")
        .eq("id", friendId)
        .maybeSingle();
      setFriend(profile as Profile | null);
      setIsFriend(false);
      setMessages([]);
      return;
    }
    const [{ data: profile }, { data: history }, { data: streakRow }] =
      await Promise.all([
        sb
          .from("profiles")
          .select("id,name,student_no")
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

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = message.trim();
    if (!body || !user || !friend) return;
    setBusy(true);
    setNotice("");
    const { error } = await sb
      .from("messages")
      .insert({ to_id: friendId, body });
    setBusy(false);
    if (error)
      setNotice("Mesaj gönderilemedi. Arkadaşlığın devam ettiğini kontrol et.");
    else {
      setMessage("");
      await load();
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
    setNotice(
      error
        ? "İstek gönderilemedi. Daha önce bir istek gönderilmiş olabilir."
        : "Arkadaşlık isteği gönderildi. Kabul edildiğinde burada bire bir konuşabilirsiniz.",
    );
  }

  if (user === undefined)
    return (
      <main className="p-5">
        <div className="shimmer h-20 rounded-2xl" />
      </main>
    );
  if (!user)
    return (
      <main className="p-5">
        <Link href="/giris" className="font-bold text-sea">
          Giriş yap
        </Link>
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
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sky font-display text-xl font-extrabold text-deep">
            {(friend.name || friend.student_no)[0]}
          </span>
          <h1 className="mt-3 font-display text-xl font-extrabold">
            {friend.name || "Öğrenci"}
          </h1>
          <p className="text-sm text-ink/60">{friend.student_no}</p>
          <p className="mt-3 text-sm text-ink/70">
            Bire bir sohbet başlatmak için önce arkadaşlık isteği gönder.
          </p>
          {notice && (
            <p role="status" className="mt-3 text-sm font-bold text-coral">
              {notice}
            </p>
          )}
          <button
            onClick={addFriend}
            disabled={busy}
            className="mt-4 rounded-full bg-sea px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {busy ? "Gönderiliyor…" : "Arkadaşlık isteği gönder"}
          </button>
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
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-extrabold">
              {friend.name || friend.student_no}
            </h1>
            <p className="text-xs text-white/70">Bire bir sohbet</p>
          </div>
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
        {messages.map((entry) => (
          <li
            key={entry.id}
            className={`max-w-[82%] rounded-2xl px-3 py-2 ${entry.from_id === user.id ? "self-end rounded-br-sm bg-sea text-white" : "self-start rounded-bl-sm bg-card text-ink"}`}
          >
            <p className="whitespace-pre-wrap break-words text-sm">
              {entry.body}
            </p>
            <time
              className={`mt-1 block text-right text-[10px] ${entry.from_id === user.id ? "text-white/65" : "text-ink/50"}`}
            >
              {new Date(entry.created_at).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </li>
        ))}
        {messages.length === 0 && (
          <li className="m-auto text-center text-sm text-ink/60">
            Henüz mesaj yok. Sohbeti başlat.
          </li>
        )}
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
          maxLength={2000}
          rows={1}
          placeholder="Mesaj yaz"
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
