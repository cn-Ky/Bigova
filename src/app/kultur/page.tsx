"use client";
import AgendaEditor from "@/components/agenda/AgendaEditor";
import Mascot from "@/components/Mascot";
import {
  AKADEMIK_DONEM,
  AKADEMIK_TAKVIM_URL,
  KIND_META,
  KIND_PRIORITY,
  MONTHS,
  WEEKDAYS_SHORT,
  addDays,
  buildAgenda,
  dateOf,
  daysBetween,
  eventsOn,
  fmtDay,
  fmtRange,
  inLabel,
  monthCells,
  monthEnd,
  monthStart,
  nextOf,
  sortByPriority,
  todayKey,
  type AgendaEvent,
  type AgendaKind,
  type Cell,
} from "@/lib/agendaData";
import { useAgendaNotes, type AgendaNote } from "@/lib/agendaNotes";
import { KULTUR_NOTES, noteOfTheDay } from "@/lib/kulturData";
import { pdfReaderHref } from "@/lib/pdfReader";
import { useStudentData } from "@/lib/studentHome";
import {
  faArrowRight,
  faCalendarDay,
  faChevronLeft,
  faChevronRight,
  faClock,
  faFlag,
  faGraduationCap,
  faLandmark,
  faLocationDot,
  faMapLocationDot,
  faPen,
  faPenToSquare,
  faPlus,
  faStar,
  faUserGraduate,
  faXmark,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const AgendaScene = dynamic(() => import("@/components/agenda/AgendaScene"), {
  ssr: false,
  loading: () => <div className="shimmer absolute inset-0 opacity-30" />,
});

const ALL_KINDS: AgendaKind[] = ["tatil", "ozel", "sinav", "akademik", "kisisel"];

/** Kategori → renk sınıfları (sitenin tema renkleri; 3B sahnedeki renklerle aynı eşleşme) */
const KIND_UI: Record<AgendaKind, { icon: IconDefinition; bg: string; dot: string }> = {
  tatil: { icon: faFlag, bg: "bg-coral text-deep", dot: "bg-coral" },
  ozel: { icon: faStar, bg: "bg-sun text-deep", dot: "bg-sun" },
  sinav: { icon: faPenToSquare, bg: "bg-tide text-deep", dot: "bg-tide" },
  akademik: { icon: faGraduationCap, bg: "bg-sky text-deep", dot: "bg-sky" },
  kisisel: { icon: faUserGraduate, bg: "bg-ink text-card", dot: "bg-ink" },
};

const TAG_CHIP: Record<string, string> = { Tarih: "bg-sun/30", Gezi: "bg-sky/30", Doğa: "bg-tide/25", Lezzet: "bg-coral/25" };

const chipOf = (e: AgendaEvent) => (e.own === "note" ? "Notum" : e.own === "exam" ? "Sınavım" : KIND_META[e.kind].chip);
const topKindOf = (evs: AgendaEvent[]) => KIND_PRIORITY.find((k) => evs.some((e) => e.kind === k)) ?? null;

/* ───────── WebGL yoksa: düz ay ızgarası ───────── */
function FlatMonth({
  cells,
  events,
  selected,
  today,
  onSelect,
}: {
  cells: Cell[];
  events: AgendaEvent[];
  selected: string | null;
  today: string;
  onSelect: (k: string) => void;
}) {
  return (
    <div className="absolute inset-0 overflow-auto p-3">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS_SHORT.map((d, i) => (
          <b key={d} className={`pb-1 text-center text-[11px] font-extrabold uppercase ${i >= 5 ? "text-sun" : "text-white/75"}`}>
            {d}
          </b>
        ))}
        {cells.map((c) => {
          const evs = eventsOn(events, c.key);
          const k = topKindOf(evs);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelect(c.key)}
              aria-pressed={selected === c.key}
              aria-label={`${fmtDay(c.key)}${evs.length ? `, ${evs.length} kayıt` : ""}`}
              className={`relative grid aspect-square place-items-center rounded-xl font-display text-base font-extrabold transition ${
                k ? KIND_UI[k].bg : "bg-card text-ink"
              } ${c.inMonth ? "" : "opacity-40"} ${selected === c.key ? "ring-4 ring-ink ring-offset-2 ring-offset-card" : ""} ${
                today === c.key ? "outline outline-[3px] outline-sun" : ""
              }`}
            >
              {c.day}
              {evs.length > 1 && <span className="absolute bottom-1 text-[9px] font-bold opacity-70">+{evs.length - 1}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── Seçili günün kayıt kartı ───────── */
function EventRow({ e, onEdit, onDelete }: { e: AgendaEvent; onEdit?: () => void; onDelete?: () => void }) {
  const u = KIND_UI[e.kind];
  return (
    <li className="flex gap-3 rounded-[20px] bg-foam p-3">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${u.bg}`}>
        <FontAwesomeIcon icon={u.icon} />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${u.bg}`}>{chipOf(e)}</span>
          {e.half && <span className="rounded-full bg-sun/30 px-2.5 py-0.5 text-[11px] font-extrabold">Yarım gün</span>}
          {e.start !== e.end && <span className="text-[11px] font-bold text-ink/60">{fmtRange(e.start, e.end)}</span>}
        </div>
        <b className="mt-1 block font-display text-[15px] leading-tight">{e.title}</b>
        {e.text && <p className="mt-1 text-sm leading-relaxed text-ink/75">{e.text}</p>}
        {(e.time || e.place) && (
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-ink/70">
            {e.time && (
              <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faClock} /> {e.time}
              </span>
            )}
            {e.place && (
              <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faLocationDot} /> {e.place}
              </span>
            )}
          </p>
        )}
      </div>
      {(onEdit || onDelete) && (
        <div className="ml-auto flex shrink-0 items-start gap-1">
          {onEdit && (
            <button type="button" onClick={onEdit} aria-label={`${e.title} notunu düzenle`} className="grid h-8 w-8 place-items-center rounded-full text-ink/60 hover:bg-card">
              <FontAwesomeIcon icon={faPen} />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} aria-label={`${e.title} kaydını sil`} className="grid h-8 w-8 place-items-center rounded-full text-ink/60 hover:bg-card">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function Kultur() {
  // Tarih/saat tarayıcıda hesaplanır (hidrasyon uyuşmazlığı olmasın)
  const [today, setToday] = useState<string | null>(null);
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState<Set<AgendaKind>>(() => new Set(ALL_KINDS));
  const [noGL, setNoGL] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const { exams, addExam, removeExam } = useStudentData();
  const nd = useAgendaNotes();
  const [editor, setEditor] = useState<{ note: AgendaNote | null; tab: "note" | "exam" } | null>(null);
  const logged = nd.status === "ready" || nd.status === "local";

  useEffect(() => {
    const t = todayKey();
    const d = new Date();
    setToday(t);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(t);
  }, []);

  const events = useMemo(() => buildAgenda(logged ? exams : [], nd.notes), [logged, exams, nd.notes]);
  const shown = useMemo(() => events.filter((e) => active.has(e.kind)), [events, active]);
  const cells = useMemo(() => (view ? monthCells(view.y, view.m) : []), [view]);
  const monthKey = view ? `${view.y}-${view.m}` : "";

  /* — Gezinme — */
  const defaultSelection = useCallback(
    (y: number, m: number) => {
      const a = monthStart(y, m);
      const b = monthEnd(y, m);
      if (today && today >= a && today <= b) return today;
      const first = shown.filter((e) => e.end >= a && e.start <= b).sort((x, z) => x.start.localeCompare(z.start))[0];
      return first ? (first.start < a ? a : first.start) : a;
    },
    [shown, today],
  );
  const goMonth = useCallback(
    (dir: -1 | 1) => {
      if (!view) return;
      const d = new Date(view.y, view.m + dir, 1);
      const next = { y: d.getFullYear(), m: d.getMonth() };
      setView(next);
      setSelected(defaultSelection(next.y, next.m));
    },
    [view, defaultSelection],
  );
  const selectKey = useCallback(
    (key: string) => {
      setSelected(key);
      const d = dateOf(key);
      setView((v) => (v && v.y === d.getFullYear() && v.m === d.getMonth() ? v : { y: d.getFullYear(), m: d.getMonth() }));
    },
    [],
  );
  const move = useCallback((delta: number) => selectKey(addDays(selected ?? today ?? todayKey(), delta)), [selected, today, selectKey]);
  const goToday = () => {
    if (!today) return;
    selectKey(today);
  };
  const toggleKind = (k: AgendaKind) =>
    setActive((cur) => {
      const n = new Set(cur);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n.size ? n : new Set(ALL_KINDS);
    });

  /* — Türetilen veriler — */
  const dayEvents = useMemo(() => (selected ? sortByPriority(eventsOn(shown, selected)) : []), [shown, selected]);
  const monthEvents = useMemo(() => {
    if (!view) return [];
    const a = monthStart(view.y, view.m);
    const b = monthEnd(view.y, view.m);
    return shown.filter((e) => e.end >= a && e.start <= b).sort((x, y) => x.start.localeCompare(y.start) || KIND_PRIORITY.indexOf(x.kind) - KIND_PRIORITY.indexOf(y.kind));
  }, [shown, view]);
  const nextHoliday = useMemo(() => (today ? nextOf(events, ["tatil"], today, { skipHalf: true }) : null), [events, today]);
  const nextExam = useMemo(() => (today ? nextOf(events.filter((e) => e.kind === "sinav" || e.own === "exam"), ["kisisel", "sinav"], today) : null), [events, today]);
  const myUpcoming = useMemo(
    () => (today ? events.filter((e) => e.kind === "kisisel" && e.end >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4) : []),
    [events, today],
  );
  const note = useMemo(() => (today ? noteOfTheDay(dateOf(today)) : null), [today]);

  const label = view ? `${MONTHS[view.m]} ${view.y} ajandası. Ok tuşlarıyla gün, Page Up ve Page Down ile ay değiştir.` : "Ajanda";
  const live = selected ? `${fmtDay(selected)}: ${dayEvents.length ? dayEvents.map((e) => e.title).join(", ") : "kayıt yok"}` : "";

  const deleteOwn = (e: AgendaEvent) => {
    if (!e.ownId || !window.confirm("Bu kaydı silmek istiyor musun?")) return;
    void (e.own === "note" ? nd.removeNote(e.ownId) : removeExam(e.ownId));
  };
  const jumpTo = (e: AgendaEvent) => {
    if (!view) return;
    const a = monthStart(view.y, view.m);
    selectKey(e.start < a ? a : e.start);
    stage.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <main>
      <header className="rounded-b-[28px] bg-sea px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sun">Bigova &amp; Kültür</p>
        <h1 className="font-display text-2xl font-extrabold leading-tight">Kültür Ajandası</h1>
        <p className="text-sm text-white/75">Özel günler, tatiller ve sınav takvimi. Bir güne dokun, detayını gör.</p>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" role="group" aria-label="Ajanda kategorileri">
          {ALL_KINDS.map((k) => {
            const on = active.has(k);
            return (
              <motion.button
                whileTap={{ scale: 0.92 }}
                key={k}
                type="button"
                onClick={() => toggleKind(k)}
                aria-pressed={on}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                  on ? "bg-white text-deep" : "bg-white/15 text-white/80"
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${KIND_UI[k].dot} ${on ? "" : "opacity-60"}`} />
                {KIND_META[k].label}
              </motion.button>
            );
          })}
        </div>
      </header>

      {/* Sıradaki tatil + sıradaki sınav */}
      <section className="grid gap-3 px-5 pt-4 md:grid-cols-2" aria-label="Yaklaşanlar">
        {[
          { key: "tatil", head: "Sıradaki tatil", n: nextHoliday, tone: "bg-coral text-deep" },
          { key: "sinav", head: nextExam?.ev.kind === "kisisel" ? "Sıradaki sınavın" : "Sıradaki sınav", n: nextExam, tone: "bg-tide text-deep" },
        ].map((c, i) =>
          c.n ? (
            <motion.button
              key={c.key}
              type="button"
              onClick={() => jumpTo(c.n!.ev)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24, delay: i * 0.06 }}
              className={`rounded-[26px] p-5 text-left shadow-sm ${c.tone}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-70">{c.head}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1 text-xs font-extrabold">
                  <FontAwesomeIcon icon={faCalendarDay} />
                  {c.n.ongoing ? "Şimdi" : inLabel(c.n.in)}
                </span>
              </div>
              <h2 className="mt-2 font-display text-xl font-extrabold leading-tight">{c.n.ev.title}</h2>
              <p className="text-xs font-bold opacity-70">{fmtRange(c.n.ev.start, c.n.ev.end)}</p>
            </motion.button>
          ) : (
            <div key={c.key} className="shimmer h-[104px] rounded-[26px]" />
          ),
        )}
      </section>

      {/* 3B ajanda */}
      <section className="px-5 pt-4" aria-label="Aylık ajanda" ref={stage}>
        <div className="overflow-hidden rounded-[28px] bg-sea text-white shadow-lg">
          <div className="flex items-center justify-between gap-2 px-3 pt-3">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              aria-label="Önceki ay"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/15 transition active:scale-90"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
              <AnimatePresence mode="wait" initial={false}>
                {view && (
                  <motion.h2
                    key={monthKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="truncate font-display text-xl font-extrabold"
                  >
                    {MONTHS[view.m]} <span className="text-sun">{view.y}</span>
                  </motion.h2>
                )}
              </AnimatePresence>
              <button type="button" onClick={goToday} className="shrink-0 rounded-full bg-sun px-3 py-1 text-xs font-extrabold text-deep transition active:scale-95">
                Bugün
              </button>
            </div>
            <button
              type="button"
              onClick={() => goMonth(1)}
              aria-label="Sonraki ay"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/15 transition active:scale-90"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          <div className="relative mt-1 aspect-[1/0.98] w-full md:aspect-[16/9] md:max-h-[620px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgb(var(--sea2)/0.65),transparent_72%)]" />
            {view && today && cells.length > 0 &&
              (noGL ? (
                <FlatMonth cells={cells} events={shown} selected={selected} today={today} onSelect={selectKey} />
              ) : (
                <AgendaScene
                  monthKey={monthKey}
                  cells={cells}
                  events={shown}
                  selected={selected}
                  today={today}
                  label={label}
                  onSelect={selectKey}
                  onSwipe={goMonth}
                  onMove={move}
                  onUnsupported={() => setNoGL(true)}
                />
              ))}
          </div>
          <p className="px-4 pb-3 pt-1 text-center text-[11px] font-bold text-white/60">
            {noGL ? "Güne dokun" : "Güne dokun · ayı değiştirmek için yana kaydır · fareyle gezdirince ajanda eğilir"}
          </p>
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 px-1 text-xs font-bold text-ink/75 sm:grid-cols-5" aria-label="Renk açıklamaları">
          {ALL_KINDS.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span className={`h-3 w-3 shrink-0 rounded-full ${KIND_UI[k].dot} ring-1 ring-ink/20`} />
              {KIND_META[k].desc}
            </li>
          ))}
        </ul>
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </section>

      {/* Seçili gün */}
      <section className="px-5 pt-4" aria-label="Seçili gün">
        <AnimatePresence mode="wait" initial={false}>
          {selected && today && (
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="rounded-[26px] bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55">Seçili gün</span>
                  <h2 className="font-display text-xl font-extrabold leading-tight">{fmtDay(selected)}</h2>
                </div>
                <span className="shrink-0 rounded-full bg-foam px-3 py-1 text-xs font-extrabold">{inLabel(daysBetween(today, selected))}</span>
              </div>
              {dayEvents.length > 0 ? (
                <ul className="mt-3 grid gap-2">
                  {dayEvents.map((e) => (
                    <EventRow
                      key={e.id}
                      e={e}
                      onEdit={e.own === "note" ? () => setEditor({ note: nd.notes.find((n) => n.id === e.ownId) ?? null, tab: "note" }) : undefined}
                      onDelete={e.own ? () => deleteOwn(e) : undefined}
                    />
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-3 pt-2">
                  <Mascot size={64} />
                  <p className="text-sm text-ink/70">
                    Bu gün için kayıt yok. Renkli günlere dokunarak tatilleri, özel günleri ve sınavları gör.
                  </p>
                </div>
              )}
              {logged && (
                <button
                  type="button"
                  onClick={() => setEditor({ note: null, tab: "note" })}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2 text-sm font-bold text-white transition active:scale-95"
                >
                  <FontAwesomeIcon icon={faPlus} /> Bu güne not ekle
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Benim günlerim: yalnızca kayıtlı kullanıcı */}
      <section className="px-5 pt-3" aria-label="Benim günlerim">
        <div className="rounded-[22px] bg-foam p-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${KIND_UI.kisisel.bg}`}>
              <FontAwesomeIcon icon={faUserGraduate} />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <b className="font-display">Benim günlerim</b>
              <p className="text-ink/70">
                {nd.status === "guest"
                  ? "Giriş yaparak kendi özel tarihlerini, sınavlarını ve notlarını ajandana ekleyebilirsin; hesabında saklanır."
                  : "Kendi özel tarihlerini ve sınavlarını not yazarak ajandana ekle. Yalnızca sen görürsün."}
              </p>
            </div>
            {nd.status === "guest" ? (
              <Link href="/giris" className="shrink-0 rounded-full bg-sun px-4 py-2 text-sm font-extrabold text-deep transition active:scale-95">
                Giriş yap
              </Link>
            ) : (
              <button
                type="button"
                disabled={!logged}
                onClick={() => setEditor({ note: null, tab: "note" })}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sun px-4 py-2 text-sm font-extrabold text-deep transition active:scale-95 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faPlus} /> Ekle
              </button>
            )}
          </div>
          {logged && (
            <ul className="mt-3 grid gap-2">
              {myUpcoming.length === 0 && <li className="text-sm text-ink/60">Yaklaşan kaydın yok. “Ekle” ile ilk kaydını oluştur.</li>}
              {myUpcoming.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(e)}
                    className="flex w-full items-center gap-3 rounded-[16px] bg-card px-3 py-2 text-left text-sm shadow-sm transition active:scale-[0.98]"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <b className="font-display">{e.title}</b>
                      <span className="text-ink/60">
                        {" "}
                        · {chipOf(e)} · {fmtRange(e.start, e.end)}
                        {e.time ? ` ${e.time}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-extrabold text-ink/60">{today ? inLabel(Math.max(0, daysBetween(today, e.start))) : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {nd.error && (
            <p role="alert" className="mt-2 text-sm font-bold text-coral">
              {nd.error}
            </p>
          )}
        </div>
      </section>

      {/* Bu ayın ajandası */}
      <section className="px-5 pt-5" aria-label="Bu ayın listesi">
        <h2 className="font-display text-xl font-extrabold">{view ? `${MONTHS[view.m]} ajandası` : "Ajanda"}</h2>
        {monthEvents.length > 0 ? (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {monthEvents.map((e) => {
              const u = KIND_UI[e.kind];
              const d = dateOf(e.start < (view ? monthStart(view.y, view.m) : e.start) ? monthStart(view!.y, view!.m) : e.start);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(e)}
                    className="flex w-full items-center gap-3 rounded-[20px] bg-card p-3 text-left shadow-sm transition active:scale-[0.98]"
                  >
                    <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-center leading-none ${u.bg}`}>
                      <span>
                        <b className="block font-display text-xl">{d.getDate()}</b>
                        <span className="text-[10px] font-extrabold uppercase">{d.toLocaleDateString("tr-TR", { month: "short" })}</span>
                      </span>
                    </span>
                    <span className="min-w-0">
                      <b className="block font-display text-[15px] leading-tight">{e.title}</b>
                      <span className="text-xs text-ink/60">
                        {chipOf(e)}
                        {e.start !== e.end ? ` · ${fmtRange(e.start, e.end)}` : e.half ? " · yarım gün" : ""}
                        {e.time ? ` · ${e.time}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink/65">Bu ay için seçili kategorilerde kayıt yok.</p>
        )}
        <p className="mt-3 text-xs text-ink/55">
          Sınav ve akademik tarihler ÇOMÜ {AKADEMIK_DONEM} genel akademik takvimindendir (Tıp, Diş Hekimliği, Turizm, Yabancı Diller YO, Gökçeada UBYO ve lisansüstü kendi takvimini
          kullanır). Bölümünün ders ve sınav programı farklı olabilir; kendi programını{" "}
          <Link href="/ders-programi" className="font-bold underline">
            ders programı
          </Link>{" "}
          sayfasından ya da{" "}
          <Link href={pdfReaderHref(AKADEMIK_TAKVIM_URL, `ÇOMÜ ${AKADEMIK_DONEM} Akademik Takvimi`)} className="font-bold underline">
            resmî takvimden
          </Link>{" "}
          kontrol et. Dinî bayram tarihleri Diyanet takvimine göredir; idari izinle uzatılan tatiller yansıtılmaz.
        </p>
      </section>

      {/* Biga'dan kültür notları */}
      {note && (
        <section className="px-5 pt-6" aria-label="Kültür notları">
          <h2 className="font-display text-xl font-extrabold">Biga&apos;dan notlar</h2>
          <article className="mt-3 rounded-[26px] bg-card p-5 shadow-sm">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55">Günün kültür notu</span>
            <span className={`ml-2 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${TAG_CHIP[note.tag] ?? "bg-sun/30"}`}>{note.tag}</span>
            <h3 className="mt-2 font-display text-lg font-extrabold leading-tight">{note.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{note.text}</p>
          </article>
          <ul className="-mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
            {KULTUR_NOTES.filter((n) => n.title !== note.title).map((n) => (
              <li key={n.title} className="w-[260px] shrink-0 snap-start rounded-[22px] bg-card p-4 shadow-sm">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${TAG_CHIP[n.tag] ?? "bg-sun/30"}`}>{n.tag}</span>
                <h3 className="mt-2 font-display text-[15px] font-extrabold leading-tight">{n.title}</h3>
                <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-ink/75">{n.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-3 px-5 pt-4 sm:grid-cols-2" aria-label="İlgili sayfalar">
        <Link href="/harita" className="group flex items-center justify-between rounded-[22px] bg-sky p-4 font-display font-bold text-deep shadow-sm">
          <span className="inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faMapLocationDot} /> Biga&apos;yı haritada keşfet
          </span>
          <FontAwesomeIcon icon={faArrowRight} className="transition group-hover:translate-x-1" />
        </Link>
        <Link href="/ataturk" className="group flex items-center justify-between rounded-[22px] bg-tide p-4 font-display font-bold text-deep shadow-sm">
          <span className="inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faLandmark} /> Atatürk Köşesi
          </span>
          <FontAwesomeIcon icon={faArrowRight} className="transition group-hover:translate-x-1" />
        </Link>
      </section>

      <p className="px-5 pb-2 pt-5 text-center text-xs text-ink/55">
        Tarihler bilgilendirme amaçlıdır. Sınav ve tatil değişikliklerini üniversitenin resmî duyurularından kontrol et.
      </p>

      <AnimatePresence>
        {editor && today && (
          <AgendaEditor
            key={editor.note?.id ?? `new-${editor.tab}`}
            onClose={() => setEditor(null)}
            initialDate={selected ?? today}
            today={today}
            editing={editor.note}
            startTab={editor.tab}
            notes={nd.notes}
            exams={exams}
            error={nd.error}
            local={nd.status === "local"}
            addNote={nd.addNote}
            updateNote={nd.updateNote}
            removeNote={nd.removeNote}
            addExam={addExam}
            removeExam={removeExam}
            onSaved={selectKey}
            onEdit={(n) => setEditor({ note: n, tab: "note" })}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
