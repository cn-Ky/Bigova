"use client";
import { fetchNews } from "@/lib/newsClient";
import type { NewsArticle } from "@/lib/newsData";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ───────── Tipler ───────── */
export type Course = { id: string; name: string; day_of_week: number; start_time: string; end_time: string; room: string | null };
export type ExamKind = "Vize" | "Final" | "Bütünleme" | "Quiz" | "Ödev teslimi" | "Diğer";
export const EXAM_KINDS: ExamKind[] = ["Vize", "Final", "Bütünleme", "Quiz", "Ödev teslimi", "Diğer"];
export type Exam = { id: string; course: string; kind: ExamKind; exam_date: string; exam_time: string | null; room: string | null };
export type Task = { id: string; title: string; kind: "task" | "homework"; course: string | null; due_date: string | null; done: boolean };

export type WidgetId = "today" | "tasks" | "pomodoro" | "news" | "shortcuts";
export type WidgetPref = { id: WidgetId; hidden: boolean };
export type Prefs = { widgets: WidgetPref[]; shortcuts: string[] };

export const WIDGETS: { id: WidgetId; label: string }[] = [
  { id: "today", label: "Bugünkü dersler ve sınavlar" },
  { id: "tasks", label: "Yapılacaklar ve ödevler" },
  { id: "pomodoro", label: "Günlük Pomodoro hedefi" },
  { id: "news", label: "Biga duyuruları" },
  { id: "shortcuts", label: "Kısayollar" },
];
export const DEFAULT_SHORTCUTS = ["/ders-programi", "/pomodoro", "/notlar", "/ulasim", "/arkadaslar", "/bigola", "https://ubys.comu.edu.tr/"];
export const MAX_SHORTCUTS = 8;

/** Kayıtlı tercihi bilinen widget'larla birleştirir: bilinmeyenler atılır, eksikler sona eklenir. */
export function normalizePrefs(raw: Partial<Prefs> | null | undefined): Prefs {
  const known = new Set<string>(WIDGETS.map((w) => w.id));
  const seen = new Set<string>();
  const widgets: WidgetPref[] = [];
  for (const w of Array.isArray(raw?.widgets) ? raw!.widgets : []) {
    if (w && known.has(w.id) && !seen.has(w.id)) {
      seen.add(w.id);
      widgets.push({ id: w.id, hidden: !!w.hidden });
    }
  }
  for (const w of WIDGETS) if (!seen.has(w.id)) widgets.push({ id: w.id, hidden: false });
  const shortcuts =
    Array.isArray(raw?.shortcuts) && raw!.shortcuts.length
      ? raw!.shortcuts
          .filter((s): s is string => typeof s === "string")
          // Topluluk bölümü Bigola oldu: kayıtlı eski kısayol yeni adrese taşınır.
          .map((s) => (s === "/topluluk" ? "/bigola" : s))
          .filter((s, i, a) => a.indexOf(s) === i)
          .slice(0, MAX_SHORTCUTS)
      : DEFAULT_SHORTCUTS;
  return { widgets, shortcuts };
}

/* ───────── Tarih/saat yardımcıları (cihazın yerel saati) ───────── */
export const dayKey = (d = new Date()) => d.toLocaleDateString("sv-SE"); // YYYY-MM-DD
/** 1 = Pazartesi … 7 = Pazar (veritabanındaki day_of_week ile aynı) */
export const isoDow = (d = new Date()) => d.getDay() || 7;
export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");
export const minutesOf = (t: string) => {
  const [h, m] = hhmm(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const DAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

/** Bugünden kaç gün sonra? (bugün = 0, dün = -1). Saat dilimi kaymasına karşı öğlen 12'ye sabitlenir. */
export function daysFromToday(iso: string) {
  const a = new Date(`${dayKey()}T12:00:00`).getTime();
  const b = new Date(`${iso}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}
export function relativeDay(iso: string) {
  const n = daysFromToday(iso);
  if (n === 0) return "Bugün";
  if (n === 1) return "Yarın";
  if (n === -1) return "Dün";
  if (n < 0) return `${-n} gün gecikti`;
  if (n < 7) return new Date(`${iso}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long" });
  return new Date(`${iso}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

/* ───────── Kişisel veri: Supabase + (tablo yoksa) yerel yedek ───────── */
type Status = "loading" | "ready" | "local" | "guest";
type Local = { courses: Course[]; exams: Exam[]; tasks: Task[]; prefs: Partial<Prefs> };
const localKey = (uid: string) => `bigova-student-home:${uid}`;

const isMissingTable = (e: unknown) => {
  const x = e as { code?: string; message?: string };
  return x?.code === "42P01" || x?.code === "PGRST205" || /Could not find the table|does not exist|schema cache/i.test(x?.message ?? "");
};
const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const byCourse = (a: Course, b: Course) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time);
const byExam = (a: Exam, b: Exam) => a.exam_date.localeCompare(b.exam_date) || (a.exam_time ?? "").localeCompare(b.exam_time ?? "");
/** Bitmeyenler önce; sonra teslim tarihi en yakın olan, tarihsizler en sonda. */
const byTask = (a: Task, b: Task) =>
  Number(a.done) - Number(b.done) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.title.localeCompare(b.title, "tr");

export function useStudentData() {
  const { user } = useUser();
  const uid = user?.id;
  const [status, setStatus] = useState<Status>("loading");
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prefs, setPrefsState] = useState<Prefs>(() => normalizePrefs(null));
  const [error, setError] = useState<string | null>(null);
  const modeRef = useRef<Status>("loading");
  const snapshot = useRef<Local>({ courses: [], exams: [], tasks: [], prefs: {} });

  const persistLocal = useCallback(() => {
    if (!uid || modeRef.current !== "local") return;
    try {
      localStorage.setItem(localKey(uid), JSON.stringify(snapshot.current));
    } catch {}
  }, [uid]);

  useEffect(() => {
    if (user === undefined) return;
    if (!uid) {
      modeRef.current = "guest";
      setStatus("guest");
      return;
    }
    let off = false;
    (async () => {
      let sb: ReturnType<typeof supabaseBrowser> | null = null;
      try {
        sb = supabaseBrowser();
      } catch {}
      const useLocal = () => {
        let l: Local = { courses: [], exams: [], tasks: [], prefs: {} };
        try {
          l = { ...l, ...JSON.parse(localStorage.getItem(localKey(uid)) || "{}") };
        } catch {}
        snapshot.current = l;
        modeRef.current = "local";
        setCourses([...l.courses].sort(byCourse));
        setExams([...l.exams].sort(byExam));
        setTasks([...l.tasks].sort(byTask));
        setPrefsState(normalizePrefs(l.prefs));
        setStatus("local");
      };
      if (!sb) return !off && useLocal();
      const [c, e, t, p] = await Promise.all([
        sb.from("student_courses").select("id,name,day_of_week,start_time,end_time,room").order("day_of_week").order("start_time"),
        sb.from("student_exams").select("id,course,kind,exam_date,exam_time,room").order("exam_date"),
        sb.from("student_tasks").select("id,title,kind,course,due_date,done").order("created_at", { ascending: false }).limit(300),
        sb.from("student_home_prefs").select("widgets,shortcuts").maybeSingle(),
      ]);
      if (off) return;
      const firstErr = c.error || e.error || t.error || p.error;
      if (firstErr) {
        if (isMissingTable(firstErr)) return useLocal(); // SQL henüz çalıştırılmamış: cihazda çalış
        setError("Bilgilerin yüklenemedi. Bağlantını kontrol edip sayfayı yenile.");
        return useLocal();
      }
      modeRef.current = "ready";
      const norm = <T extends { start_time?: string; end_time?: string; exam_time?: string | null }>(r: T): T => ({
        ...r,
        ...(r.start_time ? { start_time: hhmm(r.start_time) } : {}),
        ...(r.end_time ? { end_time: hhmm(r.end_time) } : {}),
        ...(r.exam_time ? { exam_time: hhmm(r.exam_time) } : {}),
      });
      setCourses(((c.data ?? []) as Course[]).map(norm).sort(byCourse));
      setExams(((e.data ?? []) as Exam[]).map(norm).sort(byExam));
      setTasks(((t.data ?? []) as Task[]).sort(byTask));
      setPrefsState(normalizePrefs(p.data as Partial<Prefs> | null));
      setStatus("ready");
    })().catch(() => {
      if (!off) setError("Bilgilerin yüklenemedi.");
    });
    return () => {
      off = true;
    };
  }, [uid, user === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (msg: string) => setError(msg);
  const sb = useCallback(() => supabaseBrowser(), []);

  /* — Dersler — */
  const addCourse = async (c: Omit<Course, "id">) => {
    setError(null);
    if (modeRef.current === "local") {
      const row = { ...c, id: uuid() };
      snapshot.current.courses = [...snapshot.current.courses, row];
      setCourses([...snapshot.current.courses].sort(byCourse));
      return persistLocal();
    }
    const { data, error: er } = await sb().from("student_courses").insert(c).select("id,name,day_of_week,start_time,end_time,room").single();
    if (er) return fail(er.message);
    setCourses((cur) => [...cur, { ...(data as Course), start_time: hhmm(data.start_time), end_time: hhmm(data.end_time) }].sort(byCourse));
  };
  const removeCourse = async (id: string) => {
    setError(null);
    const prev = courses;
    setCourses((cur) => cur.filter((x) => x.id !== id));
    if (modeRef.current === "local") {
      snapshot.current.courses = snapshot.current.courses.filter((x) => x.id !== id);
      return persistLocal();
    }
    const { error: er } = await sb().from("student_courses").delete().eq("id", id);
    if (er) {
      setCourses(prev);
      fail(er.message);
    }
  };

  /* — Sınavlar — */
  const addExam = async (x: Omit<Exam, "id">) => {
    setError(null);
    if (modeRef.current === "local") {
      const row = { ...x, id: uuid() };
      snapshot.current.exams = [...snapshot.current.exams, row];
      setExams([...snapshot.current.exams].sort(byExam));
      return persistLocal();
    }
    const { data, error: er } = await sb().from("student_exams").insert(x).select("id,course,kind,exam_date,exam_time,room").single();
    if (er) return fail(er.message);
    setExams((cur) => [...cur, { ...(data as Exam), exam_time: data.exam_time ? hhmm(data.exam_time) : null }].sort(byExam));
  };
  const removeExam = async (id: string) => {
    setError(null);
    const prev = exams;
    setExams((cur) => cur.filter((x) => x.id !== id));
    if (modeRef.current === "local") {
      snapshot.current.exams = snapshot.current.exams.filter((x) => x.id !== id);
      return persistLocal();
    }
    const { error: er } = await sb().from("student_exams").delete().eq("id", id);
    if (er) {
      setExams(prev);
      fail(er.message);
    }
  };

  /* — Yapılacaklar / ödevler — */
  const addTask = async (t: Omit<Task, "id" | "done">) => {
    setError(null);
    if (modeRef.current === "local") {
      const row: Task = { ...t, id: uuid(), done: false };
      snapshot.current.tasks = [row, ...snapshot.current.tasks];
      setTasks([...snapshot.current.tasks].sort(byTask));
      return persistLocal();
    }
    const { data, error: er } = await sb().from("student_tasks").insert(t).select("id,title,kind,course,due_date,done").single();
    if (er) return fail(er.message);
    setTasks((cur) => [data as Task, ...cur].sort(byTask));
  };
  const toggleTask = async (id: string) => {
    setError(null);
    const target = tasks.find((x) => x.id === id);
    if (!target) return;
    const done = !target.done;
    const prev = tasks;
    setTasks((cur) => cur.map((x) => (x.id === id ? { ...x, done } : x)).sort(byTask));
    if (modeRef.current === "local") {
      snapshot.current.tasks = snapshot.current.tasks.map((x) => (x.id === id ? { ...x, done } : x));
      return persistLocal();
    }
    const { error: er } = await sb()
      .from("student_tasks")
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq("id", id);
    if (er) {
      setTasks(prev);
      fail(er.message);
    }
  };
  const removeTask = async (id: string) => {
    setError(null);
    const prev = tasks;
    setTasks((cur) => cur.filter((x) => x.id !== id));
    if (modeRef.current === "local") {
      snapshot.current.tasks = snapshot.current.tasks.filter((x) => x.id !== id);
      return persistLocal();
    }
    const { error: er } = await sb().from("student_tasks").delete().eq("id", id);
    if (er) {
      setTasks(prev);
      fail(er.message);
    }
  };

  /* — Tercihler — */
  const savePrefs = async (next: Prefs) => {
    setPrefsState(next);
    if (modeRef.current === "local") {
      snapshot.current.prefs = next;
      return persistLocal();
    }
    if (!uid) return;
    const { error: er } = await sb()
      .from("student_home_prefs")
      .upsert({ user_id: uid, widgets: next.widgets, shortcuts: next.shortcuts, updated_at: new Date().toISOString() });
    if (er) fail("Tercihlerin kaydedilemedi: " + er.message);
  };

  return {
    status,
    error,
    clearError: () => setError(null),
    courses,
    exams,
    tasks,
    prefs,
    addCourse,
    removeCourse,
    addExam,
    removeExam,
    addTask,
    toggleTask,
    removeTask,
    savePrefs,
  };
}

/* ───────── Pomodoro: bugünkü tur ve günlük hedef ───────── */
const POMODORO_KEY = "bigova-pomodoro"; // pomodoro sayfasıyla aynı kayıt
const DEFAULT_GOAL = 8;

type PomodoroLocal = { settings?: { goal?: number }; days?: Record<string, { n: number; min: number }> };
const readPomodoroLocal = (): PomodoroLocal => {
  try {
    return JSON.parse(localStorage.getItem(POMODORO_KEY) || "{}") as PomodoroLocal;
  } catch {
    return {};
  }
};

/**
 * Pomodoro sayfasıyla aynı kaynakları kullanır: giriş yapmış kullanıcıda sunucu istatistiği
 * (pomodoro_state), SQL kurulu değilse cihazdaki kayıt. Hedef, pomodoro ayarlarındaki `goal` değeridir;
 * buradan değiştirilince aynı kayda yazılır ve Pomodoro sayfası da bunu görür.
 */
export function usePomodoroToday() {
  const { user } = useUser();
  const uid = user?.id;
  const [goal, setGoalState] = useState(DEFAULT_GOAL);
  const [today, setToday] = useState<{ n: number; min: number } | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const local = readPomodoroLocal();
    const g = Number(local.settings?.goal);
    if (g >= 1 && g <= 16) setGoalState(g);
    if (user === undefined) return;
    const fromLocal = () => {
      const d = local.days?.[dayKey()];
      setToday({ n: d?.n ?? 0, min: d?.min ?? 0 });
      let s = 0;
      for (let i = 0; i < 30; i++) {
        const k = new Date();
        k.setDate(k.getDate() - i);
        if ((local.days?.[dayKey(k)]?.n ?? 0) > 0) s++;
        else if (i > 0) break;
      }
      setStreak(s);
    };
    if (!uid) return fromLocal();
    let off = false;
    (async () => {
      try {
        const { data, error } = await supabaseBrowser().rpc("pomodoro_state");
        if (error) throw error;
        if (off) return;
        setToday({ n: Number(data?.today?.n) || 0, min: Number(data?.today?.min) || 0 });
        setStreak(Number(data?.streak) || 0);
      } catch {
        if (!off) fromLocal();
      }
    })();
    return () => {
      off = true;
    };
  }, [uid, user === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  const setGoal = (n: number) => {
    const g = Math.min(16, Math.max(1, n));
    setGoalState(g);
    try {
      const cur = readPomodoroLocal() as Record<string, unknown>;
      localStorage.setItem(POMODORO_KEY, JSON.stringify({ ...cur, settings: { ...((cur.settings as object) ?? {}), goal: g } }));
    } catch {}
  };
  return { goal, setGoal, today, streak };
}

/* ───────── Biga duyuruları ───────── */
/** Önce "Duyuru" kategorisi, ardından diğer güncel haberler; en yeni üstte. */
export function useAnnouncements(limit = 3) {
  const [items, setItems] = useState<NewsArticle[] | null>(null);
  useEffect(() => {
    let off = false;
    fetchNews()
      .then((all) => {
        if (off) return;
        const first = all.filter((a) => a.category === "Duyuru");
        const rest = all.filter((a) => a.category !== "Duyuru");
        setItems([...first, ...rest].slice(0, limit));
      })
      .catch(() => !off && setItems([]));
    return () => {
      off = true;
    };
  }, [limit]);
  return items;
}

/* ───────── Bugün: dersler ve yaklaşan sınavlar ───────── */
export function useTodayView(courses: Course[], exams: Exam[]) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    if (!now) return { ready: false as const, todays: [], next: null, upcoming: [] };
    const dow = isoDow(now);
    const cur = now.getHours() * 60 + now.getMinutes();
    const todays = courses
      .filter((c) => c.day_of_week === dow)
      .map((c) => ({ ...c, state: cur >= minutesOf(c.end_time) ? ("done" as const) : cur >= minutesOf(c.start_time) ? ("now" as const) : ("later" as const) }));
    const next = todays.find((c) => c.state !== "done") ?? null;
    const today = dayKey(now);
    const upcoming = exams.filter((x) => x.exam_date >= today).slice(0, 4);
    return { ready: true as const, todays, next, upcoming };
  }, [now, courses, exams]);
}
