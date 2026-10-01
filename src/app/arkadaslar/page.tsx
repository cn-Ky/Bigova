"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
    faCheck,
    faFire,
    faMagnifyingGlass,
    faMessage,
    faPaperPlane,
    faUserCheck,
    faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Profile = { id: string; name: string; student_no: string };
type Person = Profile & {
  direction: "friend" | "incoming" | "outgoing";
  streak: number;
};
type Friendship = {
  requester: string;
  addressee: string;
  status: "pending" | "accepted";
};

export default function Arkadaslar() {
  const { user } = useUser();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const { data: links, error } = await sb
      .from("friendships")
      .select("requester,addressee,status")
      .or(`requester.eq.${user.id},addressee.eq.${user.id}`);
    if (error || !links?.length) {
      setPeople([]);
      return;
    }
    const friendships = links as Friendship[];
    const ids = Array.from(
      new Set(
        friendships.map((link) =>
          link.requester === user.id ? link.addressee : link.requester,
        ),
      ),
    );
    const [{ data: profiles }, { data: streaks }] = await Promise.all([
      sb.from("profiles").select("id,name,student_no").in("id", ids),
      sb
        .from("friendship_streaks")
        .select("user_a,user_b,current_streak,last_mutual_date"),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);
    setPeople(
      ((profiles as Profile[]) ?? []).flatMap((profile) => {
        const link = friendships.find(
          (entry) =>
            entry.requester === profile.id || entry.addressee === profile.id,
        );
        if (!link) return [];
        const direction =
          link.status === "accepted"
            ? "friend"
            : link.addressee === user.id
              ? "incoming"
              : "outgoing";
        const streak = streaks?.find(
          (row) =>
            row.user_a === [user.id, profile.id].sort()[0] &&
            row.user_b === [user.id, profile.id].sort()[1],
        );
        const active =
          streak &&
          (streak.last_mutual_date === today ||
            streak.last_mutual_date === yesterday)
            ? streak.current_streak
            : 0;
        return [{ ...profile, direction, streak: active }];
      }),
    );
  }, [sb, user]);
  useEffect(() => {
    if (user) load();
  }, [user, load]);

  useEffect(() => {
    if (!user) {
      setResults([]);
      return;
    }
    const term = query.trim().replace(/[%,()]/g, "");
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await sb
        .from("profiles")
        .select("id,name,student_no")
        .neq("id", user.id)
        .or(`student_no.ilike.%${term}%,name.ilike.%${term}%`)
        .limit(10);
      setResults(
        ((data as Profile[]) ?? []).filter(
          (profile) => !people.some((person) => person.id === profile.id),
        ),
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [people, query, sb, user]);

  async function sendRequest(profile: Profile) {
    if (!user) return;
    setBusyId(profile.id);
    setNotice("");
    const { error } = await sb
      .from("friendships")
      .insert({ requester: user.id, addressee: profile.id, status: "pending" });
    setBusyId("");
    if (error)
      setNotice(
        error.code === "23505"
          ? "Bu kişiye zaten istek gönderilmiş."
          : "Arkadaşlık isteği gönderilemedi.",
      );
    else {
      setNotice(`${profile.name || profile.student_no} için istek gönderildi.`);
      setResults((list) => list.filter((person) => person.id !== profile.id));
      await load();
    }
  }
  async function acceptRequest(person: Person) {
    if (!user) return;
    setBusyId(person.id);
    const { error } = await sb
      .from("friendships")
      .update({ status: "accepted" })
      .eq("requester", person.id)
      .eq("addressee", user.id);
    setBusyId("");
    if (error) setNotice("İstek kabul edilemedi.");
    else {
      setNotice(`${person.name || person.student_no} artık arkadaşlarında.`);
      await load();
    }
  }

  if (user === undefined)
    return (
      <main className="p-5">
        <div className="shimmer h-24 rounded-2xl" />
      </main>
    );
  if (!user)
    return (
      <main className="px-5 py-14 text-center">
        <h1 className="font-display text-2xl font-extrabold">Arkadaşlar</h1>
        <p className="mt-2 text-sm text-ink/70">
          Öğrenci ara ve bire bir sohbet et.
        </p>
        <Link
          href="/giris"
          className="mt-5 inline-block rounded-full bg-sea px-6 py-3 font-bold text-white"
        >
          Giriş yap
        </Link>
      </main>
    );

  const incoming = people.filter((person) => person.direction === "incoming");
  const friends = people.filter((person) => person.direction === "friend");
  const outgoing = people.filter((person) => person.direction === "outgoing");
  return (
    <main>
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <h1 className="font-display text-2xl font-extrabold">Arkadaşlar</h1>
        <p className="text-sm text-white/75">
          Öğrenci ara, arkadaş ekle ve bire bir konuş.
        </p>
        <label className="mt-4 flex items-center gap-2 rounded-full bg-card px-4 py-3 text-ink">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="opacity-50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ad veya okul numarası yaz"
            aria-label="Ad veya okul numarasıyla arkadaş ara"
            className="w-full bg-transparent outline-none"
          />
        </label>
      </header>
      <div className="grid gap-6 px-5 py-5">
        {notice && (
          <p role="status" className="text-sm font-bold text-coral">
            {notice}
          </p>
        )}
        {query.trim().length >= 2 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold">
              Arama sonuçları
            </h2>
            {results.length ? (
              <ul className="grid gap-2">
                {results.map((profile) => (
                  <li
                    key={profile.id}
                    className="flex items-center gap-3 rounded-2xl bg-card p-3"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-tide/25 font-bold">
                      {(profile.name || profile.student_no)[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">
                        {profile.name || "Öğrenci"}
                      </b>
                      <small className="text-ink/60">
                        {profile.student_no}
                      </small>
                    </span>
                    <button
                      onClick={() => sendRequest(profile)}
                      disabled={busyId === profile.id}
                      aria-label={`${profile.name || "Öğrenci"} kişisine arkadaşlık isteği gönder`}
                      className="grid h-10 w-10 place-items-center rounded-full bg-sea text-white disabled:opacity-50"
                    >
                      <FontAwesomeIcon icon={faUserPlus} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/60">Eşleşen öğrenci bulunamadı.</p>
            )}
          </section>
        )}
        {incoming.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold">
              Gelen istekler{" "}
              <span className="text-sm text-coral">{incoming.length}</span>
            </h2>
            <ul className="grid gap-2">
              {incoming.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3"
                >
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{person.name || "Öğrenci"}</b>
                    <small className="text-ink/60">{person.student_no}</small>
                  </span>
                  <button
                    onClick={() => acceptRequest(person)}
                    disabled={busyId === person.id}
                    className="flex items-center gap-2 rounded-full bg-tide px-4 py-2 text-sm font-bold text-deep"
                  >
                    <FontAwesomeIcon icon={faCheck} /> Kabul et
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {friends.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold">
              Bire bir sohbetler
            </h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {friends.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky font-display font-extrabold text-deep">
                    {(person.name || person.student_no)[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{person.name || "Öğrenci"}</b>
                    <small className="text-ink/60">{person.student_no}</small>
                    <span className="mt-1 flex items-center gap-1 text-xs font-bold text-coral">
                      <FontAwesomeIcon icon={faFire} />{" "}
                      {person.streak > 0
                        ? `${person.streak} günlük seri`
                        : "Mesajlaşarak seri başlatın"}
                    </span>
                  </span>
                  <Link
                    href={`/arkadaslar/${person.id}`}
                    aria-label={`${person.name || "Arkadaş"} ile sohbeti aç`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sea text-white"
                  >
                    <FontAwesomeIcon icon={faMessage} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {outgoing.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold">
              Gönderilen istekler
            </h2>
            <ul className="grid gap-2">
              {outgoing.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center justify-between rounded-2xl bg-card p-3"
                >
                  <b>{person.name || person.student_no}</b>
                  <span className="text-xs text-ink/60">Yanıt bekleniyor</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {!people.length && query.trim().length < 2 && (
          <p className="py-8 text-center text-sm text-ink/60">
            <FontAwesomeIcon icon={faUserCheck} className="mr-2" />
            İsim veya okul numarasıyla arkadaşını bul.
          </p>
        )}
        {friends.length > 0 && (
          <p className="text-xs text-ink/55">
            <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
            Seri, iki tarafın aynı gün en az bir mesaj göndermesiyle ilerler.
          </p>
        )}
      </div>
    </main>
  );
}
