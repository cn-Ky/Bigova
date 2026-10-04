"use client";
import Avatar from "@/components/bigocuk/Avatar";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { DEFAULT_AVATAR, ITEM_MAP, SLOTS, speciesOf, type AvatarConfig } from "@/lib/bigocuk/items";
import { rememberAvatar, useAvatars } from "@/lib/bigocuk/useAvatars";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
  faArrowLeft,
  faCheck,
  faFire,
  faLock,
  faMessage,
  faPaw,
  faUserCheck,
  faUserMinus,
  faUserPlus,
  faUsers,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Relation = "self" | "friend" | "outgoing" | "incoming" | "none";
type Card = {
  id: string;
  name: string;
  avatar: AvatarConfig;
  friend_count: number;
  relation: Relation;
  joined: string | null;
  locked?: boolean;
};

const UUID = /^[0-9a-f-]{36}$/i;

export default function Profil() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [card, setCard] = useState<Card | null | undefined>(undefined);
  const [mutual, setMutual] = useState(0);
  const [streak, setStreak] = useState(0);
  const [friends, setFriends] = useState<{ id: string; name: string; mutual: boolean }[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ t: string; ok: boolean } | null>(null);

  const targetId = id === "ben" && user ? user.id : id;
  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);
  const friendAvatars = useAvatars(friendIds);

  const load = useCallback(async () => {
    if (!user || !UUID.test(targetId)) return setCard(null);
    const { data, error } = await sb.rpc("profile_card", { p_id: targetId });
    const row = (data as Card[] | null)?.[0];
    if (error || !row) {
      // SQL kurulmadıysa en azından ismi göster
      if (error) {
        const { data: p } = await sb.from("profiles").select("id,name,created_at").eq("id", targetId).maybeSingle();
        if (p)
          return setCard({
            id: p.id,
            name: p.name,
            avatar: DEFAULT_AVATAR,
            friend_count: 0,
            relation: p.id === user.id ? "self" : "none",
            joined: p.created_at ?? null,
            locked: false,
          });
      }
      return setCard(null);
    }
    const avatar = { ...DEFAULT_AVATAR, ...row.avatar };
    if (!row.locked) rememberAvatar(row.id, avatar);
    setCard({ ...row, avatar });
    if (row.locked) return setFriends([]);
    if (row.relation !== "self") {
      const { data: m } = await sb.rpc("mutual_friend_count", { p_id: targetId });
      setMutual(typeof m === "number" ? m : 0);
    }
    const { data: fl } = await sb.rpc("profile_friends", { p_id: targetId });
    setFriends((fl as { id: string; name: string; mutual: boolean }[]) ?? []);
    if (row.relation === "friend") {
      const [a, b] = [user.id, targetId].sort();
      const { data: st } = await sb
        .from("friendship_streaks")
        .select("current_streak,last_mutual_date")
        .eq("user_a", a)
        .eq("user_b", b)
        .maybeSingle();
      const today = new Date().toISOString().slice(0, 10);
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      setStreak(st && (st.last_mutual_date === today || st.last_mutual_date === yest) ? st.current_streak : 0);
    }
  }, [sb, user, targetId]);

  useEffect(() => {
    if (user) void load();
    else if (user === null) setCard(null);
  }, [user, load]);

  async function act(kind: "add" | "accept" | "remove") {
    if (!user || !card) return;
    setBusy(true);
    setNotice(null);
    let error: { code?: string; message: string } | null = null;
    if (kind === "add")
      ({ error } = await sb.from("friendships").insert({ requester: user.id, addressee: card.id, status: "pending" }));
    else if (kind === "accept")
      ({ error } = await sb.from("friendships").update({ status: "accepted" }).eq("requester", card.id).eq("addressee", user.id));
    else
      ({ error } = await sb
        .from("friendships")
        .delete()
        .or(
          `and(requester.eq.${user.id},addressee.eq.${card.id}),and(requester.eq.${card.id},addressee.eq.${user.id})`,
        ));
    setBusy(false);
    if (error)
      setNotice({
        t: error.code === "23505" ? "Bu kişiyle zaten bir istek veya arkadaşlık var." : `İşlem yapılamadı: ${error.message}`,
        ok: false,
      });
    else if (kind === "add") setNotice({ t: "Arkadaşlık isteği gönderildi.", ok: true });
    await load();
  }

  const back = (
    <Link href="/arkadaslar" className="font-bold text-sea">
      <FontAwesomeIcon icon={faArrowLeft} /> Arkadaşlara dön
    </Link>
  );

  if (user === undefined || card === undefined)
    return (
      <main className="p-5">
        <div className="shimmer h-64 rounded-3xl" />
      </main>
    );
  if (!user)
    return (
      <main className="px-5 py-8">
        {back}
        <p className="mt-6 text-sm text-ink/70">Profilleri görmek için giriş yapmalısın.</p>
        <Link href="/giris" className="mt-4 inline-block rounded-full bg-sea px-5 py-3 font-bold text-white">
          Giriş yap
        </Link>
      </main>
    );
  if (!card)
    return (
      <main className="px-5 py-8">
        {back}
        <p className="mt-6 text-sm text-ink/70">Bu profil bulunamadı.</p>
      </main>
    );

  const first = card.name.split(" ")[0] || "Öğrenci";
  const joined = card.joined
    ? new Date(card.joined).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })
    : null;

  return (
    <main>
      <header className="relative rounded-b-[32px] bg-gradient-to-b from-sea to-sea2 px-5 pb-24 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
        <Link
          href="/arkadaslar"
          aria-label="Arkadaşlara dön"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </Link>
      </header>

      <section className="relative z-10 -mt-20 px-5 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0">
        <div className="mx-auto grid w-52 place-items-center overflow-hidden rounded-[32px] bg-card shadow-lg ring-4 ring-foam">
          {card.locked ? (
            <span className="grid aspect-[200/270] w-full place-items-center bg-ink/5 text-5xl text-ink/30">
              <FontAwesomeIcon icon={faLock} />
            </span>
          ) : (
            <Avatar config={card.avatar} view="full" size="fluid" label={`${card.name || "Öğrenci"} avatarı`} />
          )}
        </div>
        <h1 className="mt-4 text-center font-display text-2xl font-extrabold">{card.name || "Öğrenci"}</h1>
        {joined && <p className="text-center text-sm text-ink/60">{joined} tarihinden beri Bigova'da</p>}

        {card.locked && (
          <p className="mt-3 text-center text-sm text-ink/60">
            Bu profil gizli. Avatarı ve arkadaş sayısı sadece arkadaşlara görünür.
          </p>
        )}
        <ul className={`mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2 text-center ${card.locked ? "hidden" : ""}`}>
          <li className="rounded-2xl bg-card p-3">
            <b className="block font-display text-xl">{card.friend_count}</b>
            <span className="text-xs text-ink/60">Arkadaş</span>
          </li>
          <li className="rounded-2xl bg-card p-3">
            <b className="block font-display text-xl">{card.relation === "self" ? "—" : mutual}</b>
            <span className="text-xs text-ink/60">Ortak arkadaş</span>
          </li>
        </ul>

        {notice && (
          <p role="status" className={`mt-4 text-center text-sm font-bold ${notice.ok ? "text-tide" : "text-coral"}`}>
            {notice.t}
          </p>
        )}

        <div className="mx-auto mt-5 flex max-w-sm flex-wrap justify-center gap-2">
          {card.relation === "self" && (
            <Link
              href="/bigocuk/avatar"
              className="flex items-center gap-2 rounded-full bg-sea px-5 py-3 font-bold text-white"
            >
              <FontAwesomeIcon icon={faPaw} /> Avatarımı düzenle
            </Link>
          )}
          {card.relation === "none" && (
            <button
              onClick={() => act("add")}
              disabled={busy}
              className="flex items-center gap-2 rounded-full bg-sea px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faUserPlus} /> {busy ? "…" : "Arkadaş ekle"}
            </button>
          )}
          {card.relation === "outgoing" && (
            <>
              <span className="flex items-center gap-2 rounded-full bg-card px-5 py-3 font-bold text-ink/60">
                <FontAwesomeIcon icon={faUserCheck} /> İstek gönderildi
              </span>
              <button
                onClick={() => act("remove")}
                disabled={busy}
                className="rounded-full bg-foam px-4 py-3 text-sm font-bold ring-1 ring-ink/10 disabled:opacity-50"
              >
                İptal et
              </button>
            </>
          )}
          {card.relation === "incoming" && (
            <>
              <button
                onClick={() => act("accept")}
                disabled={busy}
                className="flex items-center gap-2 rounded-full bg-tide px-5 py-3 font-bold text-deep disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faCheck} /> İsteği kabul et
              </button>
              <button
                onClick={() => act("remove")}
                disabled={busy}
                aria-label="İsteği reddet"
                className="grid h-12 w-12 place-items-center rounded-full bg-card disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </>
          )}
          {card.relation === "friend" && (
            <>
              <Link
                href={`/arkadaslar/${card.id}`}
                className="flex items-center gap-2 rounded-full bg-sea px-5 py-3 font-bold text-white"
              >
                <FontAwesomeIcon icon={faMessage} /> Mesaj gönder
              </Link>
              <button
                onClick={() => {
                  if (confirm(`${first} arkadaşlıktan çıkarılsın mı?`)) void act("remove");
                }}
                disabled={busy}
                className="flex items-center gap-2 rounded-full bg-card px-4 py-3 text-sm font-bold text-ink/70 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faUserMinus} /> Çıkar
              </button>
            </>
          )}
        </div>

        {card.relation === "friend" && (
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-ink/55">
            <FontAwesomeIcon icon={faUsers} /> {first} ile arkadaşsınız.
          </p>
        )}
        </div>

        {!card.locked && (
          <div className="mt-8 grid content-start gap-5 lg:mt-24">
            {streak > 0 && (
              <p className="flex items-center gap-2 rounded-2xl bg-coral/15 p-3 font-bold text-coral">
                <FontAwesomeIcon icon={faFire} /> Seninle {streak} günlük mesaj serisi
              </p>
            )}
            <section className="rounded-[22px] bg-card p-4 shadow-sm">
              <h2 className="font-display text-lg font-extrabold">Avatarı</h2>
              <p className="mt-1 text-sm text-ink/65">
                <b>{speciesOf(card.avatar.species).name}</b> · {speciesOf(card.avatar.species).tier}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {SLOTS.filter((sl) => sl.id !== "species" && !/-none$/.test(card.avatar[sl.id] ?? "") && ITEM_MAP[card.avatar[sl.id]]).map((sl) => (
                  <li key={sl.id} className="rounded-full bg-foam px-3 py-1.5 text-xs font-bold">
                    <span className="text-ink/55">{sl.label}:</span> {ITEM_MAP[card.avatar[sl.id]].name}
                  </li>
                ))}
              </ul>
            </section>
            {friends.length > 0 && (
              <section className="rounded-[22px] bg-card p-4 shadow-sm">
                <h2 className="font-display text-lg font-extrabold">
                  Arkadaşları <span className="text-sm text-ink/55">{friends.length}</span>
                </h2>
                <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                  {friends.map((f) => (
                    <li key={f.id} className="text-center">
                      <Link href={f.id === user.id ? "/profil/ben" : `/profil/${f.id}`} className="block">
                        <UserAvatar name={f.name} avatar={friendAvatars[f.id]} size={64} className={`mx-auto ${f.mutual ? "ring-2 ring-tide" : ""}`} />
                        <span className="mt-1 block truncate text-xs font-bold">{f.id === user.id ? "Sen" : f.name.split(" ")[0]}</span>
                        {f.mutual && <span className="block text-[10px] text-tide">ortak</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
