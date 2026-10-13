"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { BackHeader, NeedLogin, Notice, Skeleton } from "@/components/community/CommunityHeader";
import ComposeSheet from "@/components/community/ComposeSheet";
import FeedList from "@/components/community/FeedList";
import Sheet, { fieldClass } from "@/components/community/Sheet";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { GRADE_LABELS, KIND_LABEL, errText, rpc, timeAgo, useFeed, type Channel, type CommunityDetail, type Member } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faCopy, faHashtag, faLock, faPlus, faRightFromBracket, faTrash, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Tab = "gonderiler" | "sorular" | "sohbet" | "uyeler";
const TABS: { id: Tab; l: string }[] = [
  { id: "gonderiler", l: "Gönderiler" },
  { id: "sorular", l: "Sorular" },
  { id: "sohbet", l: "Sohbet" },
  { id: "uyeler", l: "Üyeler" },
];

function Chat({ c }: { c: CommunityDetail }) {
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const load = useCallback(() => {
    rpc<Channel[]>("community_channels", { p_community: c.id }).then((r) => setChannels(r ?? [])).catch((e) => { setErr(errText(e)); setChannels([]); });
  }, [c.id]);
  useEffect(() => { if (c.is_member) load(); }, [c.is_member, load]);
  if (!c.is_member) return <p className="rounded-[22px] bg-card p-5 text-center text-sm text-ink/70 shadow-sm">Sohbete katılmak için önce topluluğa katıl.</p>;
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rpc("community_create_channel", { p_community: c.id, p_name: name });
      setName("");
      setAdding(false);
      setErr("");
      load();
    } catch (e2) { setErr(errText(e2)); }
  };
  return (
    <div className="grid gap-3">
      {err && <Notice text={err} />}
      {channels === null ? <Skeleton n={2} h="h-16" /> : (
        <ul className="grid gap-2">
          {channels.map((k) => (
            <li key={k.id}>
              <Link href={`/topluluk/forum/${k.id}`} className="flex items-center gap-3 rounded-[18px] bg-card px-4 py-3 shadow-sm">
                <FontAwesomeIcon icon={faHashtag} className="text-sea" />
                <span className="min-w-0 flex-1 leading-tight"><b className="block truncate">{k.name}</b>{k.description && <span className="block truncate text-xs text-ink/60">{k.description}</span>}</span>
                <span className="text-[11px] font-bold text-ink/50">{k.last_at ? timeAgo(k.last_at) : "yeni"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {c.can_moderate && c.kind !== "general" && (
        adding ? (
          <form onSubmit={add} className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Kanal adı (ör. Soru Çözümü)" aria-label="Kanal adı" className={fieldClass} />
            <button className="shrink-0 rounded-full bg-sea px-4 text-sm font-extrabold text-white">Ekle</button>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="justify-self-start rounded-full bg-card px-4 py-2 text-sm font-extrabold shadow-sm"><FontAwesomeIcon icon={faPlus} className="mr-1.5" />Kanal ekle</button>
        )
      )}
    </div>
  );
}

function Members({ c }: { c: CommunityDetail }) {
  const [list, setList] = useState<Member[] | null>(null);
  const [err, setErr] = useState("");
  const { user } = useUser();
  const load = useCallback(() => {
    rpc<Member[]>("community_members", { p_community: c.id }).then((r) => setList(r ?? [])).catch((e) => { setErr(errText(e)); setList([]); });
  }, [c.id]);
  useEffect(() => { load(); }, [load]);
  const avatars = useAvatars(useMemo(() => (list ?? []).map((m) => m.user_id), [list]));
  const kick = async (m: Member) => {
    if (!window.confirm(`${m.name} gruptan çıkarılsın mı?`)) return;
    try { await rpc("community_remove_member", { p_community: c.id, p_user: m.user_id }); load(); } catch (e) { setErr(errText(e)); }
  };
  if (list === null) return <Skeleton n={3} h="h-14" />;
  return (
    <div className="grid gap-2">
      {err && <Notice text={err} />}
      <ul className="grid gap-2 md:grid-cols-2">
        {list.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3 rounded-[18px] bg-card px-3 py-2.5 shadow-sm">
            <Link href={`/profil/${m.user_id}`}><UserAvatar name={m.name} avatar={avatars[m.user_id]} size={40} /></Link>
            <Link href={`/profil/${m.user_id}`} className="min-w-0 flex-1 truncate text-sm font-extrabold">{m.name || "Öğrenci"}</Link>
            {m.role !== "member" && <span className="rounded-full bg-sun px-2 py-0.5 text-[10px] font-extrabold text-deep">{m.role === "owner" ? "Sahip" : "Moderatör"}</span>}
            {c.can_moderate && m.role !== "owner" && m.user_id !== user?.id && (
              <button type="button" onClick={() => kick(m)} aria-label={`${m.name} üyesini çıkar`} className="grid h-8 w-8 place-items-center rounded-full text-ink/55 hover:bg-foam"><FontAwesomeIcon icon={faTrash} /></button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ToplulukSayfasi() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useUser();
  const [c, setC] = useState<CommunityDetail | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("gonderiler");
  const [composing, setComposing] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await rpc<CommunityDetail[]>("community_get", { p_slug: slug });
      setC(rows?.[0] ?? null);
    } catch (e) { setErr(errText(e)); setC(null); }
  }, [slug]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  const cid = c?.id;
  const posts = useFeed({ scope: "community", community: cid, kind: "post" }, !!cid && tab === "gonderiler");
  const questions = useFeed({ scope: "community", community: cid, kind: "question" }, !!cid && tab === "sorular");

  if (user === undefined || (user && c === undefined)) return <main><BackHeader title="Yükleniyor…" /><div className="p-5"><Skeleton n={2} /></div></main>;
  if (!user) return <NeedLogin />;
  if (!c)
    return (
      <main>
        <BackHeader title="Topluluk bulunamadı" />
        <div className="grid gap-3 p-5"><Notice text={err || "Bu topluluk yok ya da özel bir grup. Özel gruplara yalnızca davet koduyla katılabilirsin."} /></div>
      </main>
    );

  const act = async (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setErr("");
    try { await fn(); after ? after() : await load(); } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const join = () => act(() => rpc("community_join", { p_community: c.id }));
  const leave = () => window.confirm("Topluluktan ayrılmak istediğine emin misin?") && act(() => rpc("community_leave", { p_community: c.id }));
  const del = () =>
    window.confirm("Bu çalışma grubu, tüm gönderileri ve sohbetleriyle birlikte kalıcı olarak silinecek. Emin misin?") &&
    act(() => rpc("community_delete_group", { p_community: c.id }), () => router.push("/topluluk/topluluklar"));
  const copy = async () => {
    if (!c.join_code) return;
    try { await navigator.clipboard.writeText(c.join_code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  const full = c.max_members !== null && c.member_count >= c.max_members;
  const meta = [c.department && c.kind === "class" ? `${c.department} · ${GRADE_LABELS[c.grade ?? 0] ?? ""}` : null, c.course, c.meeting_info].filter(Boolean);

  return (
    <main className="pb-28">
      <BackHeader title={c.name} subtitle={`${KIND_LABEL[c.kind]} · ${c.member_count} üye`} fallback="/topluluk/topluluklar" />
      <div className="grid gap-4 px-5 py-4">
        <section className="rounded-[22px] bg-card p-4 shadow-sm" aria-label="Topluluk bilgisi">
          {c.description && <p className="text-sm leading-relaxed text-ink/80">{c.description}</p>}
          {meta.length > 0 && <p className="mt-2 text-xs font-bold text-ink/60">{meta.join(" · ")}</p>}
          <p className="mt-2 text-xs text-ink/60">
            <FontAwesomeIcon icon={faUsers} className="mr-1" />{c.member_count}{c.max_members ? ` / ${c.max_members}` : ""} üye
            {c.visibility === "private" && <span className="ml-2"><FontAwesomeIcon icon={faLock} className="mr-1" />Özel grup</span>}
            {c.owner_name && c.kind === "study" && <span> · Kuran: {c.owner_name}</span>}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {c.is_member ? (
              c.my_role !== "owner" && <button type="button" onClick={leave} disabled={busy} className="rounded-full bg-foam px-4 py-2 text-sm font-extrabold"><FontAwesomeIcon icon={faRightFromBracket} className="mr-1.5" />Ayrıl</button>
            ) : (
              <button type="button" onClick={join} disabled={busy || full} className="rounded-full bg-sea px-5 py-2 text-sm font-extrabold text-white disabled:opacity-50">{full ? "Grup dolu" : "Katıl"}</button>
            )}
            {c.my_role === "owner" && c.kind === "study" && (
              <button type="button" onClick={del} disabled={busy} className="rounded-full bg-coral/25 px-4 py-2 text-sm font-extrabold"><FontAwesomeIcon icon={faTrash} className="mr-1.5" />Grubu sil</button>
            )}
          </div>
          {c.join_code && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-foam px-4 py-2.5">
              <span className="text-xs font-bold text-ink/65">Davet kodu</span>
              <b className="font-display text-lg tracking-[.25em]">{c.join_code}</b>
              <button type="button" onClick={copy} className="ml-auto rounded-full bg-card px-3 py-1.5 text-xs font-extrabold"><FontAwesomeIcon icon={faCopy} className="mr-1" />{copied ? "Kopyalandı" : "Kopyala"}</button>
            </div>
          )}
          {err && <p role="alert" className="mt-2 text-sm font-bold text-coral">{err}</p>}
        </section>

        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Topluluk bölümleri">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold ${tab === t.id ? "bg-sea text-white" : "bg-card shadow-sm"}`}>{t.l}</button>
          ))}
        </div>

        {tab === "gonderiler" && <FeedList feed={posts} showCommunity={false} empty={<><p className="font-display text-lg font-extrabold">Henüz gönderi yok</p><p className="mt-1 text-sm text-ink/70">{c.is_member ? "İlk gönderiyi sen paylaş." : "Paylaşım yapmak için topluluğa katıl."}</p></>} />}
        {tab === "sorular" && <FeedList feed={questions} showCommunity={false} empty={<><p className="font-display text-lg font-extrabold">Henüz soru yok</p><p className="mt-1 text-sm text-ink/70">{c.is_member ? "Aklına takılanı sor." : "Soru sormak için topluluğa katıl."}</p></>} />}
        {tab === "sohbet" && <Chat c={c} />}
        {tab === "uyeler" && <Members c={c} />}
      </div>

      {c.is_member && (tab === "gonderiler" || tab === "sorular") && (
        <button type="button" onClick={() => setComposing(true)} aria-label={tab === "sorular" ? "Soru sor" : "Yeni gönderi"} className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-sea text-xl text-white shadow-xl lg:bottom-8">
          <FontAwesomeIcon icon={faPlus} />
        </button>
      )}
      <AnimatePresence>
        {composing && (
          <ComposeSheet communities={[c]} defaultCommunity={c.id} defaultKind={tab === "sorular" ? "question" : "post"} onClose={() => setComposing(false)} onPosted={() => (tab === "sorular" ? questions : posts).refresh()} />
        )}
      </AnimatePresence>
    </main>
  );
}
