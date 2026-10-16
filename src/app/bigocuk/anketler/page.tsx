"use client";
import Coin from "@/components/bigocuk/Coin";
import { errMsg, useBigocuk } from "@/lib/bigocuk/api";
import { COIN_NAME, POLL_COINS } from "@/lib/bigocuk/config";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { faArrowLeft, faCheck, faCircleCheck, faLock, faPlus, faVoteYea } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Poll = { id: string; week_start: string; week_end: string; question: string; options: string[]; category: string | null };
/** Otomatik üretilen anketlerin kategori etiketleri (supabase/polls_v3_auto_upgrade.sql ile aynı anahtarlar). */
const CATEGORY: Record<string, string> = {
  organizasyon: "Organizasyon önerisi",
  calisma: "Çalışma önerisi",
  uygulama: "Bigova'yı geliştir",
};
type Load = "loading" | "ready" | "setup" | "error";

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const range = (p: { week_start: string; week_end: string }) => `${day(p.week_start)} – ${day(p.week_end)}`;
const isMissingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "42P01" || e.code === "42703" || e.code === "PGRST205" || e.code === "PGRST202" || /schema cache|does not exist/i.test(e.message ?? ""));

export default function Anketler() {
  const { user } = useUser();
  const { state, commit, pollVote } = useBigocuk();
  const sb = useMemo(() => supabaseBrowser(), []);
  const uid = user?.id;
  const isAdmin = user?.app_metadata?.role === "admin";

  const [load, setLoad] = useState<Load>("loading");
  const [today, setToday] = useState(localDate());
  const [polls, setPolls] = useState<Poll[]>([]);
  const [results, setResults] = useState<Record<string, number[]>>({}); // yalnızca bitmiş haftalar, YÜZDE
  const [mine, setMine] = useState<Record<string, number>>({}); // yalnızca kendi oylarım
  const [choice, setChoice] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, { text: string; ok: boolean }>>({});

  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [pubMsg, setPubMsg] = useState("");
  const [publishing, setPublishing] = useState(false);

  const refresh = useCallback(async () => {
    if (user === undefined) return;
    // Hafta sınırları sunucu (İstanbul) saatine göre; cihaz saati yanlış olsa da sonuç tutarlı kalır.
    let serverToday = localDate();
    try {
      const { data } = await sb.rpc("bigocuk_today");
      if (typeof data === "string") serverToday = data.slice(0, 10);
    } catch {}
    setToday(serverToday);
    // Bu haftanın otomatik anketleri henüz oluşmadıysa sunucu üretir (hata olursa mevcut anketler yine gösterilir).
    try {
      await sb.rpc("poll_ensure_week");
    } catch {}

    const { data, error } = await sb
      .from("weekly_polls")
      .select("id,week_start,week_end,question,options,category")
      .order("week_start", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) return setLoad(isMissingTable(error) ? "setup" : "error");
    const list = (data ?? []).map((p) => ({ ...p, options: p.options as string[] })) as Poll[];
    setPolls(list);

    const closedIds = list.filter((p) => p.week_end < serverToday).map((p) => p.id);
    const next: Record<string, number[]> = {};
    if (closedIds.length) {
      const { data: rows, error: rErr } = await sb.rpc("get_poll_results", { p_poll_ids: closedIds });
      if (rErr) return setLoad(isMissingTable(rErr) ? "setup" : "error");
      for (const p of list) if (closedIds.includes(p.id)) next[p.id] = p.options.map(() => 0);
      for (const r of (rows ?? []) as { poll_id: string; option_index: number; percent: number }[]) {
        if (next[r.poll_id]) next[r.poll_id][r.option_index] = Number(r.percent) || 0;
      }
    }
    setResults(next);

    const votes: Record<string, number> = {};
    if (uid && list.length) {
      const { data: own } = await sb.from("poll_votes").select("poll_id,option_index").in("poll_id", list.map((p) => p.id));
      for (const v of own ?? []) votes[v.poll_id] = v.option_index;
    }
    setMine(votes);
    setLoad("ready");
  }, [sb, user, uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function vote(poll: Poll) {
    const pick = choice[poll.id];
    if (pick === undefined || mine[poll.id] !== undefined || busy) return;
    setBusy(poll.id);
    setNotes((n) => ({ ...n, [poll.id]: { text: "", ok: true } }));
    try {
      const r = await pollVote(poll.id, pick);
      commit(r.next);
      setMine((m) => ({ ...m, [poll.id]: pick }));
      setNotes((n) => ({
        ...n,
        [poll.id]: {
          ok: true,
          text:
            r.status === "already"
              ? "Bu ankete zaten oy vermiştin."
              : r.earned > 0
                ? `Oyun alındı! +${r.earned} ${COIN_NAME} kazandın.`
                : `Oyun alındı. Günlük ${COIN_NAME} sınırına ulaştığın için bu oy coin kazandırmadı.`,
        },
      }));
    } catch (e) {
      setNotes((n) => ({ ...n, [poll.id]: { ok: false, text: errMsg(e) } }));
    } finally {
      setBusy(null);
    }
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    const options = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 5 || options.length < 2 || options.length > 8) return setPubMsg("Soru (en az 5 karakter) ve 2–8 seçenek gerekli.");
    setPublishing(true);
    setPubMsg("");
    const { error } = await sb.rpc("poll_publish", { p_question: question.trim(), p_options: options });
    setPublishing(false);
    if (error) return setPubMsg(isMissingTable(error) ? "Anket şu anda yayınlanamıyor. Biraz sonra tekrar dene." : errMsg(error));
    setQuestion("");
    setOptionsText("");
    setPubMsg("Anket bu haftaya eklendi.");
    await refresh();
  }

  const open = polls.filter((p) => p.week_end >= today);
  const closed = polls.filter((p) => p.week_end < today);
  const closedWeeks = closed.reduce<Record<string, Poll[]>>((acc, p) => ((acc[p.week_start] ||= []).push(p), acc), {});

  return (
    <main className="pb-10">
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <Link href="/bigocuk" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-white/75">
          <FontAwesomeIcon icon={faArrowLeft} /> Bigocuk
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <FontAwesomeIcon icon={faVoteYea} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">Anketler</h1>
            <p className="text-sm text-white/75">
              Her hafta yeni sorular · her anket = {POLL_COINS} {COIN_NAME}
            </p>
          </div>
        </div>
      </header>

      <section className="px-5 pt-5">
        <p className="rounded-2xl bg-sun/25 p-3 text-xs leading-relaxed text-ink/80">
          <FontAwesomeIcon icon={faLock} className="mr-1.5" />
          Yalnızca doğrulanmış hesaplar oy verebilir. Oylar isimsizdir: kimse kimin ne seçtiğini göremez, geçen haftanın sonuçları herkese
          yalnızca yüzde olarak gösterilir.
          {state && (
            <span className="ml-2 inline-flex items-center gap-1 font-extrabold">
              <Coin size={14} /> {state.coins.toLocaleString("tr-TR")}
            </span>
          )}
        </p>

        {load === "loading" && <p className="mt-6 text-sm text-ink/60">Yükleniyor…</p>}
        {load === "setup" && (
          <p className="mt-6 text-sm font-bold text-coral">
            Anketler şu anda kullanılamıyor. Biraz sonra tekrar dene.
          </p>
        )}
        {load === "error" && <p className="mt-6 text-sm font-bold text-coral">Anketler yüklenemedi. Sayfayı yenile.</p>}

        {load === "ready" && (
          <>
            <h2 className="mt-6 font-display text-xl font-extrabold">Bu haftanın anketleri</h2>
            {open.length === 0 && (
              <p className="mt-3 rounded-[20px] border-2 border-dashed border-ink/15 p-5 text-center text-sm text-ink/55">
                Bu haftanın anketleri hazırlanıyor. Birazdan sayfayı yenile.
              </p>
            )}
            <ul className="mt-3 grid gap-4">
              {open.map((poll) => {
                const voted = mine[poll.id];
                const done = voted !== undefined;
                const note = notes[poll.id];
                return (
                  <li key={poll.id} className="rounded-[20px] bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sun/25 px-2.5 py-0.5 text-xs font-extrabold">
                        <Coin size={14} /> +{POLL_COINS} {COIN_NAME}
                      </span>
                      <span className="text-xs text-ink/55">{range(poll)}</span>
                    </div>
                    {poll.category && CATEGORY[poll.category] && (
                      <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-sea">{CATEGORY[poll.category]}</p>
                    )}
                    <h3 className={`${poll.category ? "mt-1" : "mt-3"} font-display text-lg font-extrabold`}>{poll.question}</h3>
                    <div className="mt-3 grid gap-2" role="radiogroup" aria-label={poll.question}>
                      {poll.options.map((option, i) => {
                        const on = done ? voted === i : choice[poll.id] === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            disabled={done || !user}
                            onClick={() => setChoice((c) => ({ ...c, [poll.id]: i }))}
                            className={`flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold ${on ? "border-sea bg-sea/5 text-ink" : "border-ink/10 bg-foam text-ink"}`}
                          >
                            <span>{option}</span>
                            {on && <FontAwesomeIcon icon={faCheck} className="text-sea" />}
                          </button>
                        );
                      })}
                    </div>
                    {!user ? (
                      <Link href="/giris" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sea px-4 py-3 font-bold text-white">
                        Oy vermek için giriş yap
                      </Link>
                    ) : done ? (
                      <p className="mt-4 text-sm font-bold text-sea">
                        <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
                        {note?.ok && note.text ? note.text : "Oyunu verdin."} Sonuçlar hafta bitince ({day(poll.week_end)}) yüzde olarak yayımlanır.
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => vote(poll)}
                        disabled={choice[poll.id] === undefined || busy !== null}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sea px-4 py-3 font-bold text-white disabled:opacity-45"
                      >
                        <FontAwesomeIcon icon={faCircleCheck} /> {busy === poll.id ? "Kaydediliyor…" : `Oyumu gönder (+${POLL_COINS} ${COIN_NAME})`}
                      </button>
                    )}
                    {note && !note.ok && (
                      <p role="status" className="mt-3 text-sm font-bold text-coral">
                        {note.text}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            <h2 className="mt-8 font-display text-xl font-extrabold">Geçen haftaların sonuçları</h2>
            {closed.length === 0 && (
              <p className="mt-3 rounded-[20px] border-2 border-dashed border-ink/15 p-5 text-center text-sm text-ink/55">
                İlk haftanın sonuçları, hafta bittiğinde burada yayımlanacak.
              </p>
            )}
            {Object.entries(closedWeeks).map(([week, items]) => (
              <div key={week} className="mt-4">
                <p className="text-xs font-extrabold uppercase tracking-wide text-ink/55">{range(items[0])}</p>
                <ul className="mt-2 grid gap-4">
                  {items.map((poll) => (
                    <li key={poll.id} className="rounded-[20px] bg-card p-5 shadow-sm">
                      {poll.category && CATEGORY[poll.category] && (
                        <p className="text-xs font-extrabold uppercase tracking-wide text-sea">{CATEGORY[poll.category]}</p>
                      )}
                      <h3 className="mt-1 font-display text-lg font-extrabold">{poll.question}</h3>
                      <div className="mt-3 grid gap-2">
                        {poll.options.map((option, i) => {
                          const pct = results[poll.id]?.[i] ?? 0;
                          const own = mine[poll.id] === i;
                          return (
                            <div key={i} className={`relative flex min-h-12 items-center justify-between overflow-hidden rounded-xl border px-4 py-3 text-sm font-bold ${own ? "border-sea" : "border-ink/10"} bg-foam`}>
                              <span className="absolute inset-y-0 left-0 bg-tide/20" style={{ width: `${pct}%` }} aria-hidden="true" />
                              <span className="relative z-10">
                                {option}
                                {own && <span className="ml-2 text-xs font-extrabold text-sea">· senin oyun</span>}
                              </span>
                              <span className="relative z-10 text-xs text-ink/70">%{pct}</span>
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {isAdmin && (
              <form onSubmit={publish} className="mt-8 grid gap-3 border-t border-ink/10 pt-5">
                <h2 className="font-display text-lg font-extrabold">
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Bu haftaya yeni anket ekle
                </h2>
                <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={240} placeholder="Anket sorusu" className="rounded-xl bg-card p-3 outline-none focus:ring-2 focus:ring-tide" />
                <textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} rows={4} placeholder={"Her seçeneği yeni satıra yaz\n2–8 seçenek"} className="rounded-xl bg-card p-3 outline-none focus:ring-2 focus:ring-tide" />
                <button disabled={publishing} className="rounded-xl bg-sea px-4 py-3 font-bold text-white disabled:opacity-50">
                  {publishing ? "Yayımlanıyor…" : "Yayımla"}
                </button>
                {pubMsg && (
                  <p role="status" className="text-sm font-bold text-sea">
                    {pubMsg}
                  </p>
                )}
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
