"use client";
import { sideTabs } from "@/components/tabs";
import { useUser } from "@/lib/useUser";
import {
  DEFAULT_SHORTCUTS,
  MAX_SHORTCUTS,
  WIDGETS,
  normalizePrefs,
  useStudentData,
  type Prefs,
  type WidgetId,
} from "@/lib/studentHome";
import {
  faChevronDown,
  faChevronUp,
  faEye,
  faEyeSlash,
  faRotateLeft,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import { NewsWidget, PomodoroWidget, ShortcutsWidget, TasksWidget, TodayWidget } from "./StudentWidgets";

const labelOf = Object.fromEntries(WIDGETS.map((w) => [w.id, w.label])) as Record<WidgetId, string>;
const shortcutChoices = sideTabs.filter((t) => t.href !== "/");

/** Giriş yapmış öğrencinin günlük ana ekranı. Misafirlere hiçbir şey çizmez. */
export default function StudentHome() {
  const { user, name } = useUser();
  const data = useStudentData();
  const [editing, setEditing] = useState(false);
  const courseNames = useMemo(() => [...new Set(data.courses.map((c) => c.name))], [data.courses]);

  if (!user || data.status === "guest") return null;

  const dateLabel = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  const { prefs } = data;
  const set = (next: Prefs) => void data.savePrefs(next);

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= prefs.widgets.length) return;
    const widgets = [...prefs.widgets];
    [widgets[idx], widgets[j]] = [widgets[j], widgets[idx]];
    set({ ...prefs, widgets });
  };
  const toggleHidden = (id: WidgetId) =>
    set({ ...prefs, widgets: prefs.widgets.map((w) => (w.id === id ? { ...w, hidden: !w.hidden } : w)) });
  const toggleShortcut = (href: string) => {
    const has = prefs.shortcuts.includes(href);
    if (!has && prefs.shortcuts.length >= MAX_SHORTCUTS) return;
    set({ ...prefs, shortcuts: has ? prefs.shortcuts.filter((s) => s !== href) : [...prefs.shortcuts, href] });
  };

  const render: Record<WidgetId, ReactNode> = {
    today: (
      <TodayWidget
        courses={data.courses}
        exams={data.exams}
        addCourse={data.addCourse}
        removeCourse={data.removeCourse}
        addExam={data.addExam}
        removeExam={data.removeExam}
      />
    ),
    tasks: (
      <TasksWidget tasks={data.tasks} courseNames={courseNames} addTask={data.addTask} toggleTask={data.toggleTask} removeTask={data.removeTask} />
    ),
    pomodoro: <PomodoroWidget />,
    news: <NewsWidget />,
    shortcuts: <ShortcutsWidget hrefs={prefs.shortcuts} />,
  };
  const visible = prefs.widgets.filter((w) => !w.hidden);

  return (
    <section aria-labelledby="student-home-heading" className="mx-5 mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="student-home-heading" className="font-display text-xl font-extrabold">
            {name ? `${name}, bugünün özeti` : "Bugünün özeti"}
          </h2>
          <p className="text-xs capitalize text-ink/60">{dateLabel}</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          aria-expanded={editing}
          aria-controls="student-home-customize"
          onClick={() => setEditing((v) => !v)}
          className={`group shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm transition-[background-color,color,box-shadow] hover:shadow-md ${editing ? "bg-sun text-deep" : "bg-card"}`}
        >
          <FontAwesomeIcon icon={faSliders} className="ico mr-1.5" />
          {editing ? "Bitti" : "Kişiselleştir"}
        </motion.button>
      </div>

      {data.status === "local" && (
        <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-3 rounded-2xl bg-sun/25 px-4 py-2.5 text-xs font-bold text-ink">
          Bilgilerin şimdilik yalnızca bu cihazda saklanıyor. Hesabınla eşitlenmesi için yönetici veritabanı güncellemesini yapmalı.
        </motion.p>
      )}
      {data.error && (
        <p role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-2xl bg-coral/25 px-4 py-2.5 text-xs font-bold text-ink">
          <span>{data.error}</span>
          <button type="button" onClick={data.clearError} className="shrink-0 underline">
            Kapat
          </button>
        </p>
      )}

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            id="student-home-customize"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="mb-3 overflow-hidden"
          >
            <div className="rounded-[22px] bg-card p-4 shadow-sm">
              <h3 className="font-display text-base font-extrabold">Kutuların sırası ve görünürlüğü</h3>
              <ul className="mt-2 grid gap-1.5">
                {prefs.widgets.map((w, i) => (
                  <motion.li
                    key={w.id}
                    layout
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    whileHover={{ x: 2 }}
                    className="flex items-center gap-2 rounded-xl bg-foam px-3 py-2"
                  >
                    <span className={`min-w-0 flex-1 truncate text-sm font-bold transition-opacity ${w.hidden ? "opacity-50" : ""}`}>{labelOf[w.id]}</span>
                    <motion.button whileTap={{ scale: 0.8 }} type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${labelOf[w.id]} kutusunu yukarı taşı`} className="grid h-8 w-8 place-items-center rounded-full bg-card shadow-sm transition-shadow hover:shadow-md disabled:opacity-35">
                      <FontAwesomeIcon icon={faChevronUp} className="text-xs" />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.8 }} type="button" onClick={() => move(i, 1)} disabled={i === prefs.widgets.length - 1} aria-label={`${labelOf[w.id]} kutusunu aşağı taşı`} className="grid h-8 w-8 place-items-center rounded-full bg-card shadow-sm transition-shadow hover:shadow-md disabled:opacity-35">
                      <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.8 }} type="button" onClick={() => toggleHidden(w.id)} aria-pressed={!w.hidden} aria-label={`${labelOf[w.id]} kutusunu ${w.hidden ? "göster" : "gizle"}`} className={`grid h-8 w-8 place-items-center rounded-full shadow-sm transition-[background-color,box-shadow] hover:shadow-md ${w.hidden ? "bg-card" : "bg-sun text-deep"}`}>
                      <FontAwesomeIcon icon={w.hidden ? faEyeSlash : faEye} className="text-xs" />
                    </motion.button>
                  </motion.li>
                ))}
              </ul>

              <h3 className="mt-4 font-display text-base font-extrabold">
                Kısayollar{" "}
                <span className="text-xs font-bold text-ink/55">
                  ({prefs.shortcuts.length}/{MAX_SHORTCUTS})
                </span>
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {shortcutChoices.map((t) => {
                  const on = prefs.shortcuts.includes(t.href);
                  const full = !on && prefs.shortcuts.length >= MAX_SHORTCUTS;
                  return (
                    <li key={t.href}>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        aria-pressed={on}
                        disabled={full}
                        onClick={() => toggleShortcut(t.href)}
                        className={`group rounded-full px-3.5 py-1.5 text-xs font-bold transition-[background-color,color,box-shadow] disabled:opacity-40 ${on ? "bg-sea text-white shadow-sm" : "bg-foam hover:bg-tide/15"}`}
                      >
                        <FontAwesomeIcon icon={t.i} className="ico mr-1.5" />
                        {t.l}
                      </motion.button>
                    </li>
                  );
                })}
              </ul>

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => set({ ...normalizePrefs(null), shortcuts: DEFAULT_SHORTCUTS })}
                className="group mt-4 rounded-full bg-foam px-3.5 py-1.5 text-xs font-bold transition-colors hover:bg-tide/15"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="ico mr-1.5" />
                Varsayılana döndür
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {data.status === "loading" ? (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label="Yükleniyor">
          {[0, 1].map((i) => (
            <div key={i} className="shimmer h-40 rounded-[22px]" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-[22px] bg-card p-5 text-center text-sm text-ink/70 shadow-sm">Tüm kutuları gizledin. “Kişiselleştir”den istediklerini geri açabilirsin.</p>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2">
          {visible.map((w, i) => (
            <motion.div
              key={w.id}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, type: "spring", stiffness: 260, damping: 24 }}
              className={w.id === "shortcuts" ? "md:col-span-2" : ""}
            >
              {render[w.id]}
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
