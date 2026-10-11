"use client";
import { categoryMeta, isDemoNews } from "@/lib/newsData";
import { tabByHref } from "@/lib/menuData";
import {
  DAY_NAMES,
  EXAM_KINDS,
  daysFromToday,
  dayKey,
  relativeDay,
  useAnnouncements,
  usePomodoroToday,
  useTodayView,
  type Course,
  type Exam,
  type ExamKind,
  type Task,
} from "@/lib/studentHome";
import {
  faArrowRight,
  faBullhorn,
  faCalendarDay,
  faCheck,
  faFire,
  faListCheck,
  faMinus,
  faPencil,
  faPlus,
  faStopwatch,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

const field =
  "w-full rounded-xl bg-foam px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink/45 focus:ring-2 focus:ring-tide";
const chip = "rounded-full px-3 py-1.5 text-xs font-extrabold";

/* ───────── Ortak kart iskeleti ───────── */
export function Card({
  title,
  icon,
  tone,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: Parameters<typeof FontAwesomeIcon>[0]["icon"];
  tone: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={`rounded-[22px] bg-card p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone}`}>
          <FontAwesomeIcon icon={icon} />
        </span>
        <h2 className="min-w-0 flex-1 truncate font-display text-lg font-extrabold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ───────── Alt sayfa (ders/sınav düzenleme) ───────── */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-deep/50 md:items-center md:p-6"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-2xl md:rounded-[28px]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid h-9 w-9 place-items-center rounded-full bg-foam">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ───────── Bugün: dersler + sınavlar ───────── */
type Editor = "program" | "exams" | null;

export function TodayWidget({
  courses,
  exams,
  addCourse,
  removeCourse,
  addExam,
  removeExam,
}: {
  courses: Course[];
  exams: Exam[];
  addCourse: (c: Omit<Course, "id">) => Promise<void>;
  removeCourse: (id: string) => Promise<void>;
  addExam: (e: Omit<Exam, "id">) => Promise<void>;
  removeExam: (id: string) => Promise<void>;
}) {
  const view = useTodayView(courses, exams);
  const [editor, setEditor] = useState<Editor>(null);
  const noCourses = courses.length === 0;
  const nowTag = { now: "Şu an", later: "Sonra", done: "Bitti" } as const;
  return (
    <Card
      title="Bugün"
      icon={faCalendarDay}
      tone="bg-sky text-deep"
      action={
        <button type="button" onClick={() => setEditor("program")} className={`${chip} bg-foam`}>
          <FontAwesomeIcon icon={faPencil} className="mr-1.5" />
          Düzenle
        </button>
      }
    >
      {view.ready && (
        <>
          {noCourses ? (
            <div className="rounded-2xl bg-foam p-4 text-sm">
              <p className="text-ink/75">
                Haftalık dersini bir kez gir; burada her gün o günün dersleri ve sıradaki ders görünsün.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setEditor("program")} className={`${chip} bg-sea text-white`}>
                  <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
                  Ders ekle
                </button>
                <Link href="/ders-programi" className={`${chip} bg-card`}>
                  Resmî çizelgeyi aç
                </Link>
              </div>
            </div>
          ) : view.todays.length === 0 ? (
            <p className="rounded-2xl bg-foam p-4 text-sm text-ink/75">Bugün dersin yok. İyi dinlenmeler!</p>
          ) : (
            <ul className="grid gap-2">
              {view.todays.map((c) => (
                <li
                  key={c.id}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${c.state === "now" ? "bg-tide/25" : "bg-foam"} ${c.state === "done" ? "opacity-55" : ""}`}
                >
                  <span className="w-[74px] shrink-0 text-xs font-extrabold tabular-nums leading-tight">
                    {c.start_time}
                    <br />
                    <span className="font-bold text-ink/55">{c.end_time}</span>
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block truncate text-sm">{c.name}</b>
                    {c.room && <span className="block truncate text-xs text-ink/60">{c.room}</span>}
                  </span>
                  <span className={`${chip} shrink-0 ${c.state === "now" ? "bg-sea text-white" : "bg-card text-ink/70"}`}>{nowTag[c.state]}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between">
            <h3 className="font-display text-base font-extrabold">Yaklaşan sınavlar</h3>
            <button type="button" onClick={() => setEditor("exams")} className="text-xs font-extrabold text-sea">
              <FontAwesomeIcon icon={faPlus} className="mr-1" />
              Sınav ekle
            </button>
          </div>
          {view.upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-ink/60">Yaklaşan sınav yok.</p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {view.upcoming.map((x) => {
                const n = daysFromToday(x.exam_date);
                const hot = n <= 2;
                return (
                  <li key={x.id} className="flex items-center gap-3 rounded-2xl bg-foam px-3 py-2.5">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-center text-[11px] font-extrabold leading-none ${hot ? "bg-coral text-deep" : "bg-sun text-deep"}`}>
                      {n === 0 ? "Bugün" : `${n} gün`}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <b className="block truncate text-sm">
                        {x.course} · {x.kind}
                      </b>
                      <span className="block truncate text-xs text-ink/60">
                        {relativeDay(x.exam_date)}
                        {x.exam_time ? ` · ${x.exam_time}` : ""}
                        {x.room ? ` · ${x.room}` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <AnimatePresence>
        {editor && (
          <Sheet title={editor === "program" ? "Haftalık ders programım" : "Sınavlarım"} onClose={() => setEditor(null)}>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-foam p-1" role="tablist">
              {(["program", "exams"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={editor === k}
                  onClick={() => setEditor(k)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold ${editor === k ? "bg-card shadow-sm" : "text-ink/65"}`}
                >
                  {k === "program" ? "Dersler" : "Sınavlar"}
                </button>
              ))}
            </div>
            {editor === "program" ? (
              <CourseEditor courses={courses} add={addCourse} remove={removeCourse} />
            ) : (
              <ExamEditor exams={exams} courseNames={[...new Set(courses.map((c) => c.name))]} add={addExam} remove={removeExam} />
            )}
          </Sheet>
        )}
      </AnimatePresence>
    </Card>
  );
}

function CourseEditor({ courses, add, remove }: { courses: Course[]; add: (c: Omit<Course, "id">) => Promise<void>; remove: (id: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [dow, setDow] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:50");
  const [room, setRoom] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setMsg("Ders adını yaz.");
    if (end <= start) return setMsg("Bitiş saati başlangıçtan sonra olmalı.");
    setMsg("");
    setBusy(true);
    await add({ name: name.trim().slice(0, 80), day_of_week: dow, start_time: start, end_time: end, room: room.trim().slice(0, 40) || null });
    setBusy(false);
    setName("");
    setRoom("");
  };
  return (
    <>
      <form onSubmit={submit} className="grid gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ders adı (ör. Mikroiktisat)" aria-label="Ders adı" className={field} />
        <select value={dow} onChange={(e) => setDow(Number(e.target.value))} aria-label="Gün" className={field}>
          {DAY_NAMES.map((d, i) => (
            <option key={d} value={i + 1}>
              {d}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold">
            Başlangıç
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={`${field} mt-1`} />
          </label>
          <label className="text-xs font-bold">
            Bitiş
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={`${field} mt-1`} />
          </label>
        </div>
        <input value={room} onChange={(e) => setRoom(e.target.value)} maxLength={40} placeholder="Sınıf / derslik (isteğe bağlı)" aria-label="Derslik" className={field} />
        {msg && (
          <p role="alert" className="text-sm font-bold text-coral">
            {msg}
          </p>
        )}
        <button disabled={busy} className="rounded-full bg-sea px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60">
          Derse ekle
        </button>
      </form>
      <ul className="mt-5 grid gap-4">
        {DAY_NAMES.map((d, i) => {
          const list = courses.filter((c) => c.day_of_week === i + 1);
          if (!list.length) return null;
          return (
            <li key={d}>
              <b className="text-xs uppercase tracking-wide text-ink/55">{d}</b>
              <ul className="mt-1 grid gap-1.5">
                {list.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 rounded-xl bg-foam px-3 py-2 text-sm">
                    <span className="w-[88px] shrink-0 text-xs font-bold tabular-nums">
                      {c.start_time}–{c.end_time}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <b>{c.name}</b>
                      {c.room ? <span className="text-ink/60"> · {c.room}</span> : null}
                    </span>
                    <button type="button" onClick={() => remove(c.id)} aria-label={`${c.name} dersini sil`} className="grid h-8 w-8 place-items-center rounded-full text-ink/60 hover:bg-card">
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ExamEditor({
  exams,
  courseNames,
  add,
  remove,
}: {
  exams: Exam[];
  courseNames: string[];
  add: (e: Omit<Exam, "id">) => Promise<void>;
  remove: (id: string) => Promise<void>;
}) {
  const [course, setCourse] = useState("");
  const [kind, setKind] = useState<ExamKind>("Vize");
  const [date, setDate] = useState(dayKey());
  const [time, setTime] = useState("");
  const [room, setRoom] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course.trim()) return setMsg("Ders adını yaz.");
    if (!date) return setMsg("Sınav tarihini seç.");
    setMsg("");
    setBusy(true);
    await add({ course: course.trim().slice(0, 80), kind, exam_date: date, exam_time: time || null, room: room.trim().slice(0, 40) || null });
    setBusy(false);
    setCourse("");
    setRoom("");
    setTime("");
  };
  const today = dayKey();
  return (
    <>
      <form onSubmit={submit} className="grid gap-2">
        <input list="student-course-names" value={course} onChange={(e) => setCourse(e.target.value)} maxLength={80} placeholder="Ders adı" aria-label="Ders adı" className={field} />
        <datalist id="student-course-names">
          {courseNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <select value={kind} onChange={(e) => setKind(e.target.value as ExamKind)} aria-label="Sınav türü" className={field}>
          {EXAM_KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold">
            Tarih
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1`} />
          </label>
          <label className="text-xs font-bold">
            Saat (isteğe bağlı)
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${field} mt-1`} />
          </label>
        </div>
        <input value={room} onChange={(e) => setRoom(e.target.value)} maxLength={40} placeholder="Salon (isteğe bağlı)" aria-label="Salon" className={field} />
        {msg && (
          <p role="alert" className="text-sm font-bold text-coral">
            {msg}
          </p>
        )}
        <button disabled={busy} className="rounded-full bg-sea px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60">
          Sınavı ekle
        </button>
      </form>
      <ul className="mt-5 grid gap-1.5">
        {exams.length === 0 && <li className="text-sm text-ink/60">Henüz sınav eklemedin.</li>}
        {exams.map((x) => (
          <li key={x.id} className={`flex items-center gap-2 rounded-xl bg-foam px-3 py-2 text-sm ${x.exam_date < today ? "opacity-50" : ""}`}>
            <span className="min-w-0 flex-1 truncate">
              <b>
                {x.course} · {x.kind}
              </b>
              <span className="text-ink/60">
                {" "}
                · {new Date(`${x.exam_date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                {x.exam_time ? ` ${x.exam_time}` : ""}
              </span>
            </span>
            <button type="button" onClick={() => remove(x.id)} aria-label={`${x.course} ${x.kind} sınavını sil`} className="grid h-8 w-8 place-items-center rounded-full text-ink/60 hover:bg-card">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ───────── Yapılacaklar ve ödevler ───────── */
export function TasksWidget({
  tasks,
  courseNames,
  addTask,
  toggleTask,
  removeTask,
}: {
  tasks: Task[];
  courseNames: string[];
  addTask: (t: Omit<Task, "id" | "done">) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Task["kind"]>("task");
  const [due, setDue] = useState("");
  const [course, setCourse] = useState("");
  const [more, setMore] = useState(false);
  const [all, setAll] = useState(false);
  const open = tasks.filter((t) => !t.done);
  const done = tasks.length - open.length;
  const shown = all ? tasks : [...open.slice(0, 5)];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setTitle("");
    setDue("");
    await addTask({ title: t.slice(0, 120), kind, course: course.trim().slice(0, 80) || null, due_date: due || null });
  };
  return (
    <Card
      title="Yapılacaklar"
      icon={faListCheck}
      tone="bg-tide text-deep"
      action={tasks.length > 0 ? <span className={`${chip} bg-foam`}>{done}/{tasks.length}</span> : undefined}
    >
      <form onSubmit={submit} className="grid gap-2">
        <div className="flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Yeni görev veya ödev…" aria-label="Yeni görev" className={field} />
          <button aria-label="Görevi ekle" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sea text-white">
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["task", "homework"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`${chip} ${kind === k ? "bg-sea text-white" : "bg-foam"}`}>
              {k === "task" ? "Yapılacak" : "Ödev"}
            </button>
          ))}
          <button type="button" aria-expanded={more} onClick={() => setMore((v) => !v)} className="text-xs font-extrabold text-sea">
            {more ? "Daha az" : "Tarih / ders"}
          </button>
        </div>
        {more && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold">
              Teslim tarihi
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${field} mt-1`} />
            </label>
            <label className="text-xs font-bold">
              Ders
              <input list="student-task-courses" value={course} onChange={(e) => setCourse(e.target.value)} maxLength={80} className={`${field} mt-1`} />
              <datalist id="student-task-courses">
                {courseNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
          </div>
        )}
      </form>

      {tasks.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-foam p-4 text-sm text-ink/70">Henüz görevin yok. Bir ödev ya da yapılacak ekle, tamamladıkça işaretle.</p>
      ) : (
        <ul className="mt-3 grid gap-1.5">
          {shown.length === 0 && <li className="rounded-2xl bg-foam p-4 text-sm text-ink/70">Hepsi tamam. Harikasın!</li>}
          {shown.map((t) => {
            const n = t.due_date ? daysFromToday(t.due_date) : null;
            const late = !t.done && n !== null && n < 0;
            return (
              <li key={t.id} className="flex items-center gap-2 rounded-2xl bg-foam px-2 py-1.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={t.done}
                  aria-label={t.done ? `${t.title} görevini geri al` : `${t.title} görevini tamamla`}
                  onClick={() => toggleTask(t.id)}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 ${t.done ? "border-tide bg-tide text-deep" : "border-ink/30"}`}
                >
                  {t.done && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
                </button>
                <span className={`min-w-0 flex-1 leading-tight ${t.done ? "line-through opacity-55" : ""}`}>
                  <b className="block truncate text-sm">{t.title}</b>
                  <span className="block truncate text-xs text-ink/60">
                    {t.kind === "homework" && <span className="font-extrabold text-sea">Ödev</span>}
                    {t.kind === "homework" && (t.course || t.due_date) ? " · " : ""}
                    {t.course}
                    {t.course && t.due_date ? " · " : ""}
                    {t.due_date && <span className={late ? "font-extrabold text-coral" : ""}>{relativeDay(t.due_date)}</span>}
                  </span>
                </span>
                <button type="button" onClick={() => removeTask(t.id)} aria-label={`${t.title} görevini sil`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink/50 hover:bg-card">
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {(open.length > 5 || done > 0) && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-xs font-extrabold text-sea">
          {all ? "Yalnızca bekleyenler" : `Tümünü göster (${tasks.length})`}
        </button>
      )}
    </Card>
  );
}

/* ───────── Günlük Pomodoro hedefi ───────── */
export function PomodoroWidget() {
  const { goal, setGoal, today, streak } = usePomodoroToday();
  const n = today?.n ?? 0;
  const pct = Math.min(1, n / goal);
  const reached = n >= goal;
  return (
    <Card title="Pomodoro hedefi" icon={faStopwatch} tone="bg-sun text-deep">
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="font-display text-4xl font-extrabold tabular-nums">{today ? n : "–"}</span>
          <span className="text-base text-ink/55"> / {goal} tur</span>
          <p className="mt-0.5 text-xs text-ink/60">
            {today ? `Bugün ${today.min} dk odaklandın` : "Yükleniyor…"}
            {streak > 1 && (
              <span className="ml-2 font-extrabold text-coral">
                <FontAwesomeIcon icon={faFire} /> {streak} gün seri
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-foam p-1" role="group" aria-label="Günlük hedef">
          <button type="button" onClick={() => setGoal(goal - 1)} disabled={goal <= 1} aria-label="Hedefi azalt" className="grid h-8 w-8 place-items-center rounded-full bg-card disabled:opacity-40">
            <FontAwesomeIcon icon={faMinus} className="text-xs" />
          </button>
          <button type="button" onClick={() => setGoal(goal + 1)} disabled={goal >= 16} aria-label="Hedefi artır" className="grid h-8 w-8 place-items-center rounded-full bg-card disabled:opacity-40">
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        </div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-foam" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(n, goal)} aria-label="Günlük Pomodoro hedefi">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 22 }} className={`h-full rounded-full ${reached ? "bg-tide" : "bg-sun"}`} />
      </div>
      <p className="mt-2 text-sm font-bold">{!today ? "" : reached ? "Günlük hedefi tamamladın!" : `Hedefe ${goal - n} tur kaldı`}</p>
      <Link href="/pomodoro" className="mt-3 inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2.5 text-sm font-extrabold text-white">
        {n > 0 ? "Devam et" : "Odaklanmaya başla"} <FontAwesomeIcon icon={faArrowRight} />
      </Link>
    </Card>
  );
}

/* ───────── Biga duyuruları ───────── */
export function NewsWidget() {
  const items = useAnnouncements(3);
  return (
    <Card
      title="Biga'dan son duyurular"
      icon={faBullhorn}
      tone="bg-coral text-deep"
      action={
        <Link href="/haberler" className="text-sm font-extrabold text-sea">
          Tümü
        </Link>
      }
    >
      {items === null ? (
        <ul className="grid gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-14 animate-pulse rounded-2xl bg-foam" />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-foam p-4 text-sm text-ink/70">Şimdilik yeni duyuru yok.</p>
      ) : (
        <ul className="grid gap-1.5">
          {items.map((a) => {
            const meta = categoryMeta(a.category);
            return (
              <li key={a.id}>
                <Link href={`/haberler/${a.id}`} className="flex items-center gap-3 rounded-2xl bg-foam px-3 py-2.5 hover:bg-foam/70">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card text-sea">
                    <FontAwesomeIcon icon={meta.icon} />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="line-clamp-2 text-sm">{a.title}</b>
                    <span className="block text-xs text-ink/60">
                      {a.category} ·{" "}
                      {new Date(a.published_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      {isDemoNews(a) && " · Örnek"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ───────── Kısayollar ───────── */
export function ShortcutsWidget({ hrefs }: { hrefs: string[] }) {
  const items = hrefs.map(tabByHref).filter(Boolean) as NonNullable<ReturnType<typeof tabByHref>>[];
  return (
    <Card title="Kısayollar" icon={faArrowRight} tone="bg-sea text-white">
      {items.length === 0 ? (
        <p className="text-sm text-ink/70">Kısayol seçmek için “Kişiselleştir”e dokun.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((t) => {
            const ext = "external" in t && t.external;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  target={ext ? "_blank" : undefined}
                  rel={ext ? "noopener noreferrer" : undefined}
                  className="flex h-full flex-col items-center gap-1.5 rounded-2xl bg-foam px-2 py-3 text-center hover:bg-tide/20"
                >
                  <FontAwesomeIcon icon={t.i} className="text-lg text-sea" />
                  <span className="text-xs font-extrabold leading-tight">{t.l}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

