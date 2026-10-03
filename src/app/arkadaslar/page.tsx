"use client";
import { demoFriends } from "@/lib/demoData";
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
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Profile = { id: string; name: string; student_no?: string | null };
type Person = Profile & {
  direction: "friend" | "incoming" | "outgoing";
  streak: number;
  last?: { body: string; at: string; mine: boolean };
};
type Friendship = {
  requester: string;
  addressee: string;
  status: "pending" | "accepted";
};
type Msg = { from_id: string; to_id: string; body: string; created_at: string };

// Türkçe karakterlere duyarsız karşılaştırma (1:1 harf eşlemesi, uzunluk korunur)
const TR: Record<string, string> = { İ: "i", I: "i", ı: "i", Ğ: "g", ğ: "g", Ü: "u", ü: "u", Ş: "s", ş: "s", Ö: "o", ö: "o", Ç: "c", ç: "c" };
const norm = (s: string) => s.replace(/[İIıĞğÜüŞşÖöÇç]/g, (c) => TR[c]).toLowerCase();

/** Eşleşen kısmı kalın gösterir. */
function Highlight({ name, term }: { name: string; term: string }) {
  const n = norm(name);
  const t = norm(term.trim());
  let i = t ? (n.startsWith(t) ? 0 : n.indexOf(" " + t) + 1) : -1;
  if (i < 0 || (i === 0 && !n.startsWith(t))) i = -1;
  if (i < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, i)}
      <span className="text-sea underline decoration-tide decoration-2 underline-offset-2">{name.slice(i, i + t.length)}</span>
      {name.slice(i + t.length)}
    </>
  );
}

const initial = (name: string) => (name || "?").trim()[0]?.toLocaleUpperCase("tr-TR") ?? "?";

export default function Arkadaslar() {
  const { user } = useUser();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [resultsFor, setResultsFor] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState<{ t: string; ok: boolean } | null>(null);
  const seq = useRef(0);

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
    const otherOf = (l: Friendship) => (l.requester === user.id ? l.addressee : l.requester);
    const ids = Array.from(new Set(friendships.map(otherOf)));
    const [{ data: profiles }, { data: streaks }, { data: msgs }] = await Promise.all([
      sb.from("profiles").select("id,name").in("id", ids),
      sb.from("friendship_streaks").select("user_a,user_b,current_streak,last_mutual_date"),
      sb
        .from("messages")
        .select("from_id,to_id,body,created_at")
        .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const lastBy = new Map<string, Person["last"]>();
    for (const m of (msgs as Msg[]) ?? []) {
      const other = m.from_id === user.id ? m.to_id : m.from_id;
      if (!lastBy.has(other)) lastBy.set(other, { body: m.body, at: m.created_at, mine: m.from_id === user.id });
    }
    const list = ((profiles as Profile[]) ?? []).flatMap((profile) => {
      const link = friendships.find((l) => otherOf(l) === profile.id);
      if (!link) return [];
      const direction: Person["direction"] =
        link.status === "accepted" ? "friend" : link.addressee === user.id ? "incoming" : "outgoing";
      const [a, b] = [user.id, profile.id].sort();
      const streak = streaks?.find((r) => r.user_a === a && r.user_b === b);
      const active =
        streak && (streak.last_mutual_date === today || streak.last_mutual_date === yesterday)
          ? streak.current_streak
          : 0;
      return [{ ...profile, direction, streak: active, last: lastBy.get(profile.id) } as Person];
    });
    list.sort((x, y) => (y.last?.at ?? "").localeCompare(x.last?.at ?? ""));
    setPeople(list);
  }, [sb, user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // Canlı güncelleme + yedek yenileme (istek/mesaj gelince liste kendiliğinden güncellenir)
  useEffect(() => {
    if (!user) return;
    const channel = sb
      .channel(`friends-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .subscribe();
    const poll = setInterval(() => {
      if (!document.hidden) load();
    }, 12000);
    return () => {
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [sb, user, load]);

  // Her harfte arama ("C", "Ca", "Can"…); boşken önerilen kişiler
  useEffect(() => {
    if (!user) return;
    const term = query.trim();
    const id = ++seq.current;
    const timer = setTimeout(
      async () => {
        if (!term) {
          const { data, error } = await sb.rpc("suggest_people", { max_results: 6 });
          if (id !== seq.current) return;
          if (!error) {
            setSuggestions((data as Profile[]) ?? []);
            return;
          }
          // SQL güncellemesi yapılmadıysa yedek sorgu
          const { data: fb } = await sb
            .from("profiles")
            .select("id,name")
            .neq("id", user.id)
            .neq("name", "")
            .order("created_at", { ascending: false })
            .limit(12);
          if (id !== seq.current) return;
          setSuggestions((fb as Profile[]) ?? []);
          return;
        }
        let list: Profile[] | null = null;
        const { data, error } = await sb.rpc("search_people", { term, max_results: 8 });
        if (!error) list = (data as Profile[]) ?? [];
        else {
          const safe = term.replace(/[%_,()\\]/g, "");
          const { data: fb } = await sb
            .from("profiles")
            .select("id,name")
            .neq("id", user.id)
            .or(`name.ilike.${safe}%,name.ilike.% ${safe}%`)
            .limit(8);
          list = (fb as Profile[]) ?? [];
        }
        if (id !== seq.current) return;
        setResults(list);
        setResultsFor(term);
      },
      term ? 120 : 0,
    );
    return () => clearTimeout(timer);
  }, [query, sb, user]);

  async function sendRequest(profile: Profile) {
    if (!user) return;
    setBusyId(profile.id);
    setNotice(null);
    const { error } = await sb
      .from("friendships")
      .insert({ requester: user.id, addressee: profile.id, status: "pending" });
    setBusyId("");
    if (error)
      setNotice({
        t:
          error.code === "23505"
            ? "Bu kişiyle zaten bir istek veya arkadaşlık var."
            : `Arkadaşlık isteği gönderilemedi: ${error.message}`,
        ok: false,
      });
    else setNotice({ t: `${profile.name || "Öğrenci"} kişisine istek gönderildi.`, ok: true });
    await load();
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
    if (error) setNotice({ t: "İstek kabul edilemedi.", ok: false });
    else setNotice({ t: `${person.name || "Öğrenci"} artık arkadaşın. Mesajlaşabilirsiniz!`, ok: true });
    await load();
  }
  async function removeLink(person: Person) {
    if (!user) return;
    setBusyId(person.id);
    await sb
      .from("friendships")
      .delete()
      .or(
        `and(requester.eq.${user.id},addressee.eq.${person.id}),and(requester.eq.${person.id},addressee.eq.${user.id})`,
      );
    setBusyId("");
    await load();
  }

  if (user === undefined)
    return (
      <main className="p-5">
        <div className="shimmer h-24 rounded-2xl" />
      </main>
    );
  if (!user) return <DemoFriends />;

  const incoming = people.filter((p) => p.direction === "incoming");
  const friends = people.filter((p) => p.direction === "friend");
  const outgoing = people.filter((p) => p.direction === "outgoing");
  const term = query.trim();
  const searching = term.length > 0;
  const freshSuggestions = suggestions.filter((s) => !people.some((p) => p.id === s.id));

  const action = (profile: Profile) => {
    const rel = people.find((p) => p.id === profile.id);
    if (rel?.direction === "friend")
      return (
        <Link
          href={`/arkadaslar/${profile.id}`}
          className="flex shrink-0 items-center gap-2 rounded-full bg-sea px-4 py-2 text-sm font-bold text-white"
        >
          <FontAwesomeIcon icon={faMessage} /> Mesaj
        </Link>
      );
    if (rel?.direction === "outgoing")
      return <span className="shrink-0 rounded-full bg-foam px-3 py-2 text-xs font-bold text-ink/60">İstek gönderildi</span>;
    if (rel?.direction === "incoming")
      return (
        <button
          onClick={() => acceptRequest(rel)}
          disabled={busyId === profile.id}
          className="flex shrink-0 items-center gap-2 rounded-full bg-tide px-4 py-2 text-sm font-bold text-deep disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faCheck} /> Kabul et
        </button>
      );
    return (
      <button
        onClick={() => sendRequest(profile)}
        disabled={busyId === profile.id}
        aria-label={`${profile.name || "Öğrenci"} kişisine arkadaşlık isteği gönder`}
        className="flex shrink-0 items-center gap-2 rounded-full bg-sea px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        <FontAwesomeIcon icon={faUserPlus} /> {busyId === profile.id ? "…" : "Arkadaş ekle"}
      </button>
    );
  };
  const row = (profile: Profile, hl = false) => (
    <li key={profile.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tide/25 font-display font-extrabold">
        {initial(profile.name)}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate">{hl ? <Highlight name={profile.name} term={term} /> : profile.name || "Öğrenci"}</b>
      </span>
      {action(profile)}
    </li>
  );

  return (
    <main>
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <h1 className="font-display text-2xl font-extrabold">Arkadaşlar</h1>
        <p className="text-sm text-white/75">Öğrenci ara, arkadaş ekle ve bire bir konuş.</p>
        <label className="mt-4 flex items-center gap-2 rounded-full bg-card px-4 py-3 text-ink focus-within:ring-2 focus-within:ring-tide focus-within:ring-offset-2 focus-within:ring-offset-sea">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="opacity-50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İsim yaz: C, Ca, Can…"
            aria-label="Adıyla arkadaş ara"
            autoComplete="off"
            className="w-full bg-transparent outline-none"
          />
          {searching && (
            <button onClick={() => setQuery("")} aria-label="Aramayı temizle" className="grid h-6 w-6 place-items-center rounded-full bg-foam text-xs">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </label>
      </header>
      <div className="grid gap-6 px-5 py-5">
        {notice && (
          <p role="status" className={`text-sm font-bold ${notice.ok ? "text-tide" : "text-coral"}`}>
            {notice.t}
          </p>
        )}

        {searching && (
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold">Bu kişiyi mi arıyorsunuz?</h2>
            {resultsFor !== term ? (
              <div className="shimmer h-16 rounded-2xl" />
            ) : results.length ? (
              <ul className="grid gap-2">{results.map((p) => row(p, true))}</ul>
            ) : (
              <p className="text-sm text-ink/60">“{term}” ile başlayan bir kullanıcı bulunamadı.</p>
            )}
          </section>
        )}

        {!searching && incoming.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold">
              Gelen istekler <span className="text-sm text-coral">{incoming.length}</span>
            </h2>
            <ul className="grid gap-2">
              {incoming.map((person) => (
                <li key={person.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sun/40 font-display font-extrabold text-deep">
                    {initial(person.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{person.name || "Öğrenci"}</b>
                    <small className="text-ink/60">Sana arkadaşlık isteği gönderdi</small>
                  </span>
                  <button
                    onClick={() => acceptRequest(person)}
                    disabled={busyId === person.id}
                    className="flex items-center gap-2 rounded-full bg-tide px-4 py-2 text-sm font-bold text-deep disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faCheck} /> Kabul
                  </button>
                  <button
                    onClick={() => removeLink(person)}
                    disabled={busyId === person.id}
                    aria-label="İsteği reddet"
                    className="grid h-9 w-9 place-items-center rounded-full bg-foam disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!searching && friends.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold">Bire bir sohbetler</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {friends.map((person) => (
                <li key={person.id}>
                  <Link
                    href={`/arkadaslar/${person.id}`}
                    aria-label={`${person.name || "Arkadaş"} ile sohbeti aç`}
                    className="flex items-center gap-3 rounded-2xl bg-card p-3 transition active:scale-[.98]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky font-display font-extrabold text-deep">
                      {initial(person.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{person.name || "Öğrenci"}</b>
                      <span className="block truncate text-sm text-ink/65">
                        {person.last ? `${person.last.mine ? "Sen: " : ""}${person.last.body}` : "Henüz mesaj yok · ilk mesajı sen yaz"}
                      </span>
                      {person.streak > 0 && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-coral">
                          <FontAwesomeIcon icon={faFire} /> {person.streak} günlük seri
                        </span>
                      )}
                    </span>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sea text-white">
                      <FontAwesomeIcon icon={faMessage} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!searching && outgoing.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold">Gönderilen istekler</h2>
            <ul className="grid gap-2">
              {outgoing.map((person) => (
                <li key={person.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
                  <b className="min-w-0 flex-1 truncate">{person.name || "Öğrenci"}</b>
                  <span className="text-xs text-ink/60">Yanıt bekleniyor</span>
                  <button
                    onClick={() => removeLink(person)}
                    disabled={busyId === person.id}
                    className="rounded-full bg-foam px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                  >
                    İptal
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!searching && freshSuggestions.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold">Önerilen kişiler</h2>
            <ul className="grid gap-2">{freshSuggestions.slice(0, 6).map((p) => row(p))}</ul>
          </section>
        )}

        {!searching && !people.length && freshSuggestions.length === 0 && (
          <p className="py-8 text-center text-sm text-ink/60">
            <FontAwesomeIcon icon={faUserCheck} className="mr-2" />
            Henüz başka üye yok. İsmini yazarak arkadaşını bul ya da arkadaşlarını Bigova'ya davet et.
          </p>
        )}
        {friends.length > 0 && !searching && (
          <p className="text-xs text-ink/55">
            <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
            Seri, iki tarafın aynı gün en az bir mesaj göndermesiyle ilerler.
          </p>
        )}
      </div>
    </main>
  );
}

function DemoFriends() {
  const [query, setQuery] = useState("");
  const [friendIds, setFriendIds] = useState<string[]>([demoFriends[0].id]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bigova-demo-friends");
      if (saved) setFriendIds(JSON.parse(saved));
      else
        localStorage.setItem(
          "bigova-demo-friends",
          JSON.stringify([demoFriends[0].id]),
        );
    } catch {}
  }, []);
  const friends = demoFriends.filter((person) => friendIds.includes(person.id));
  const results = demoFriends.filter(
    (person) =>
      !friendIds.includes(person.id) &&
      `${person.name}`
        .toLocaleLowerCase("tr-TR")
        .includes(query.trim().toLocaleLowerCase("tr-TR")),
  );
  function addFriend(id: string) {
    const updated = [...friendIds, id];
    setFriendIds(updated);
    try {
      localStorage.setItem("bigova-demo-friends", JSON.stringify(updated));
    } catch {}
  }
  return (
    <main>
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <h1 className="font-display text-2xl font-extrabold">Arkadaşlar</h1>
        <p className="text-sm text-white/75">
          Deneme modu · örnek profiller bu tarayıcıda çalışır.
        </p>
        <label className="mt-4 flex items-center gap-2 rounded-full bg-card px-4 py-3 text-ink">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="opacity-50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Örnek ad ara"
            aria-label="Demo arkadaş ara"
            className="w-full bg-transparent outline-none"
          />
        </label>
      </header>
      <div className="grid gap-6 px-5 py-5">
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
                    {person.name[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{person.name}</b>
                    <small className="text-ink/60">Örnek öğrenci</small>
                    <span className="mt-1 flex items-center gap-1 text-xs font-bold text-coral">
                      <FontAwesomeIcon icon={faFire} /> Demo seri: 2 gün
                    </span>
                  </span>
                  <Link
                    href={`/arkadaslar/${person.id}`}
                    aria-label={`${person.name} demo sohbetini aç`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sea text-white"
                  >
                    <FontAwesomeIcon icon={faMessage} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {query.trim() && (
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold">
              Örnek profiller
            </h2>
            {results.length ? (
              <ul className="grid gap-2">
                {results.map((person) => (
                  <li
                    key={person.id}
                    className="flex items-center gap-3 rounded-2xl bg-card p-3"
                  >
                    <span className="min-w-0 flex-1">
                      <b className="block">{person.name}</b>
                      <small className="text-ink/60">
                        Örnek profil
                      </small>
                    </span>
                    <button
                      onClick={() => addFriend(person.id)}
                      aria-label={`${person.name} demo arkadaş olarak ekle`}
                      className="grid h-10 w-10 place-items-center rounded-full bg-sea text-white"
                    >
                      <FontAwesomeIcon icon={faUserPlus} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/60">Eşleşen örnek profil yok.</p>
            )}
          </section>
        )}
        <p className="text-xs text-ink/55">
          Demo arkadaşlar, istekler ve sohbetler gerçek öğrencilere gönderilmez;
          bu tarayıcıda saklanır.
        </p>
      </div>
    </main>
  );
}
