"use client";
import CommunityHeader, { NeedLogin, Notice, Skeleton } from "@/components/community/CommunityHeader";
import Sheet, { fieldClass } from "@/components/community/Sheet";
import { KIND_LABEL, errText, rpc, useMyCommunities, type Community, type CommunityKind } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faKey, faLock, faPlus, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const FILTERS: { id: CommunityKind | "all"; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "department", label: "Bölümler" },
  { id: "class", label: "Sınıflar" },
  { id: "study", label: "Çalışma grupları" },
];

function CommunityRow({ c, onJoined }: { c: Community; onJoined: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const full = c.max_members !== null && c.member_count >= c.max_members;
  const join = async () => {
    setBusy(true);
    setErr("");
    try {
      await rpc("community_join", { p_community: c.id });
      onJoined();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="rounded-[22px] bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Link href={`/topluluk/t/${c.slug}`} className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <b className="font-display text-base font-extrabold leading-tight">{c.name}</b>
            <span className="rounded-full bg-sky px-2 py-0.5 text-[10px] font-extrabold text-deep">{KIND_LABEL[c.kind]}</span>
            {c.visibility === "private" && (
              <span className="rounded-full bg-foam px-2 py-0.5 text-[10px] font-extrabold">
                <FontAwesomeIcon icon={faLock} className="mr-1" />Özel
              </span>
            )}
          </span>
          {c.description && <span className="mt-1 line-clamp-2 block text-sm text-ink/70">{c.description}</span>}
          <span className="mt-1 block text-xs text-ink/60">
            <FontAwesomeIcon icon={faUsers} className="mr-1" />
            {c.member_count}
            {c.max_members ? ` / ${c.max_members}` : ""} üye
            {c.course ? ` · ${c.course}` : ""}
            {c.meeting_info ? ` · ${c.meeting_info}` : ""}
          </span>
        </Link>
        {c.is_member ? (
          <Link href={`/topluluk/t/${c.slug}`} className="shrink-0 rounded-full bg-foam px-3 py-2 text-xs font-extrabold">Üyesin</Link>
        ) : (
          <button type="button" onClick={join} disabled={busy || full} className="shrink-0 rounded-full bg-sea px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">
            {full ? "Dolu" : busy ? "…" : "Katıl"}
          </button>
        )}
      </div>
      {err && <p role="alert" className="mt-2 text-xs font-bold text-coral">{err}</p>}
    </li>
  );
}

function CreateGroupSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [meeting, setMeeting] = useState("");
  const [max, setMax] = useState(20);
  const [priv, setPriv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) return setErr("Grup adı en az 3 karakter olmalı.");
    setBusy(true);
    setErr("");
    try {
      const rows = await rpc<{ slug: string }[]>("community_create_study", {
        p_name: name.trim(),
        p_course: course.trim() || null,
        p_description: description.trim() || null,
        p_meeting: meeting.trim() || null,
        p_max: max,
        p_private: priv,
      });
      router.push(`/topluluk/t/${rows[0].slug}`);
    } catch (e2) {
      setErr(errText(e2));
      setBusy(false);
    }
  };
  return (
    <Sheet title="Çalışma grubu kur" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-2.5">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Grup adı (ör. Mikro Final Hazırlık)" aria-label="Grup adı" className={fieldClass} />
        <input value={course} onChange={(e) => setCourse(e.target.value)} maxLength={80} placeholder="Ders (isteğe bağlı)" aria-label="Ders" className={fieldClass} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="Grup ne yapacak? (isteğe bağlı)" aria-label="Açıklama" className={fieldClass} />
        <input value={meeting} onChange={(e) => setMeeting(e.target.value)} maxLength={120} placeholder="Buluşma zamanı/yeri (ör. Salı 18:00, kütüphane)" aria-label="Buluşma bilgisi" className={fieldClass} />
        <label className="text-xs font-bold">
          En fazla üye sayısı: {max}
          <input type="range" min={2} max={100} value={max} onChange={(e) => setMax(Number(e.target.value))} className="mt-1 w-full accent-[#1b8a9a]" />
        </label>
        <label className="flex items-center gap-3 rounded-xl bg-foam px-3 py-2.5 text-sm font-bold">
          <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} className="h-4 w-4 accent-[#1b8a9a]" />
          <span>Özel grup <span className="block text-xs font-normal text-ink/65">Listede görünmez; yalnızca davet koduyla katılınır.</span></span>
        </label>
        {err && <p role="alert" className="text-sm font-bold text-coral">{err}</p>}
        <button disabled={busy} className="rounded-full bg-sea px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60">{busy ? "Kuruluyor…" : "Grubu kur"}</button>
      </form>
    </Sheet>
  );
}

function CodeSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const slug = await rpc<string>("community_join_with_code", { p_code: code });
      router.push(`/topluluk/t/${slug}`);
    } catch (e2) {
      setErr(errText(e2));
      setBusy(false);
    }
  };
  return (
    <Sheet title="Davet koduyla katıl" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} placeholder="8 haneli kod" aria-label="Davet kodu" autoCapitalize="characters" autoComplete="off" className={`${fieldClass} text-center font-display text-lg font-extrabold tracking-[.3em]`} />
        {err && <p role="alert" className="text-sm font-bold text-coral">{err}</p>}
        <button disabled={busy || code.length < 8} className="rounded-full bg-sea px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60">{busy ? "Katılınıyor…" : "Katıl"}</button>
      </form>
    </Sheet>
  );
}

export default function Topluluklar() {
  const { user } = useUser();
  const [filter, setFilter] = useState<CommunityKind | "all">("all");
  const [q, setQ] = useState("");
  const [list, setList] = useState<Community[] | null>(null);
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState<"create" | "code" | null>(null);
  const mine = useMyCommunities(!!user);

  const load = async () => {
    try {
      setList(await rpc<Community[]>("community_list", { p_kind: filter === "all" ? null : filter, p_q: q.trim() || null }));
      setError("");
    } catch (e) {
      setError(errText(e));
      setList([]);
    }
  };
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(load, q ? 200 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter, q]);

  if (user === undefined) return <main className="p-5"><Skeleton n={2} /></main>;
  if (!user) return <NeedLogin />;
  const mineList = (list ?? []).filter((c) => c.is_member);
  const others = (list ?? []).filter((c) => !c.is_member);
  const refresh = () => { void load(); void mine.refresh(); };
  return (
    <main className="pb-28">
      <CommunityHeader active="topluluklar" subtitle="Bölümünün, sınıfının ve ders çalışma gruplarının topluluklarına katıl.">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Topluluk veya ders ara…"
          aria-label="Topluluk ara"
          className="mt-3 w-full rounded-full bg-white/15 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/60 focus:bg-white/25"
        />
      </CommunityHeader>
      <div className="grid gap-4 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSheet("create")} className="rounded-full bg-sea px-4 py-2 text-sm font-extrabold text-white"><FontAwesomeIcon icon={faPlus} className="mr-1.5" />Çalışma grubu kur</button>
          <button type="button" onClick={() => setSheet("code")} className="rounded-full bg-card px-4 py-2 text-sm font-extrabold shadow-sm"><FontAwesomeIcon icon={faKey} className="mr-1.5" />Davet kodum var</button>
        </div>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Topluluk türü">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold ${filter === f.id ? "bg-sea text-white" : "bg-card shadow-sm"}`}>{f.label}</button>
          ))}
        </div>
        {error && <Notice text={error} />}
        {list === null ? <Skeleton h="h-28" /> : (
          <>
            {mineList.length > 0 && (
              <section aria-label="Üye olduğun topluluklar">
                <h2 className="mb-2 font-display text-lg font-extrabold">Üye olduklarım</h2>
                <ul className="grid gap-3 md:grid-cols-2">{mineList.map((c) => <CommunityRow key={c.id} c={c} onJoined={refresh} />)}</ul>
              </section>
            )}
            <section aria-label="Keşfet">
              <h2 className="mb-2 font-display text-lg font-extrabold">Keşfet</h2>
              {others.length === 0 ? <p className="rounded-[22px] bg-card p-5 text-center text-sm text-ink/70 shadow-sm">{q ? "Aramana uyan topluluk yok." : "Katılabileceğin başka topluluk kalmadı. Bir çalışma grubu kurabilirsin!"}</p> : (
                <ul className="grid gap-3 md:grid-cols-2">{others.map((c) => <CommunityRow key={c.id} c={c} onJoined={refresh} />)}</ul>
              )}
            </section>
          </>
        )}
      </div>
      <AnimatePresence>
        {sheet === "create" && <CreateGroupSheet onClose={() => setSheet(null)} />}
        {sheet === "code" && <CodeSheet onClose={() => setSheet(null)} />}
      </AnimatePresence>
    </main>
  );
}
