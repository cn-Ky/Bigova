"use client";
import Mascot from "@/components/Mascot";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBell,
  faBellSlash,
  faBrain,
  faCheck,
  faChevronDown,
  faFire,
  faForwardStep,
  faMinus,
  faMobileScreenButton,
  faMugHot,
  faPause,
  faPen,
  faPlay,
  faPlus,
  faRepeat,
  faRotateLeft,
  faSliders,
  faStopwatch,
  faUmbrellaBeach,
  faVolumeHigh,
  faVolumeXmark,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/* ───────── Tipler ve sabitler ───────── */
type Mode = "focus" | "short" | "long";
type Settings = {
  focus: number;
  short: number;
  long: number;
  every: number;
  goal: number;
  auto: boolean;
  sound: boolean;
  notify: boolean;
  awake: boolean;
};
type Timer = {
  mode: Mode;
  running: boolean;
  endAt: number;
  leftMs: number;
  totalMs: number;
  cycle: number;
};
type Day = { n: number; min: number };

const KEY = "bigova-pomodoro";
const DEFAULTS: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  every: 4,
  goal: 8,
  auto: false,
  sound: true,
  notify: false,
  awake: false,
};
const PRESETS = [
  { name: "Klasik", focus: 25, short: 5, long: 15 },
  { name: "Derin odak", focus: 50, short: 10, long: 20 },
  { name: "Hafif", focus: 15, short: 3, long: 10 },
];
const MODES: Record<
  Mode,
  { label: string; tab: string; icon: IconDefinition; accent: string; btn: string; line: string }
> = {
  focus: {
    label: "Odaklan",
    tab: "Odak",
    icon: faBrain,
    accent: "var(--sea)",
    btn: "bg-sea text-white",
    line: "Dalga yükseliyor. Dikkatini tek işe ver.",
  },
  short: {
    label: "Kısa mola",
    tab: "Kısa mola",
    icon: faMugHot,
    accent: "var(--tide)",
    btn: "bg-tide text-deep",
    line: "Su iç, gözlerini dinlendir, uzaklara bak.",
  },
  long: {
    label: "Uzun mola",
    tab: "Uzun mola",
    icon: faUmbrellaBeach,
    accent: "var(--sun)",
    btn: "bg-sun text-deep",
    line: "Kısa bir yürüyüş ya da bir çay. Hak ettin.",
  },
};
const RING = 2 * Math.PI * 140;
const WAVE = "M0 30 Q150 0 300 30 T600 30 T900 30 T1200 30 V60 H0Z";

/* ───────── Yardımcılar ───────── */
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const dur = (s: Settings, m: Mode) => s[m] * 60_000;
const fresh = (s: Settings, mode: Mode = "focus", cycle = 0): Timer => ({
  mode,
  running: false,
  endAt: 0,
  leftMs: dur(s, mode),
  totalMs: dur(s, mode),
  cycle,
});
const dayKey = (d = new Date()) => d.toLocaleDateString("sv-SE");
const mmss = (ms: number) => {
  const t = Math.ceil(ms / 1000);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk`);
const prune = (d: Record<string, Day>) =>
  Object.fromEntries(Object.entries(d).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 30));

async function notifyNow(body: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification("Bigova Pomodoro", { body, icon: "/icon-192.png", tag: "bigova-pomodoro" });
    else new Notification("Bigova Pomodoro", { body, icon: "/icon-192.png" });
  } catch {}
}

/* ───────── Küçük arayüz parçaları ───────── */
function Stepper({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  const btn =
    "grid h-8 w-8 place-items-center rounded-full bg-card text-sm shadow-sm transition active:scale-90 disabled:opacity-35";
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-foam px-3 py-2.5">
      <span className="text-sm font-bold">{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${label} azalt`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step, min, max))}
          className={btn}
        >
          <FontAwesomeIcon icon={faMinus} />
        </button>
        <output className="w-16 text-center font-display text-lg font-extrabold tabular-nums">
          {value}
          <small className="ml-1 text-[11px] font-bold text-ink/55">{unit}</small>
        </output>
        <button
          type="button"
          aria-label={`${label} artır`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step, min, max))}
          className={btn}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </span>
    </div>
  );
}

function Toggle({
  label,
  hint,
  icon,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  icon: IconDefinition;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className="flex w-full items-center gap-3 rounded-2xl bg-foam px-3 py-2.5 text-left"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-ink/70 shadow-sm">
        <FontAwesomeIcon icon={icon} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <b className="block text-sm">{label}</b>
        <span className="block text-xs text-ink/60">{hint}</span>
      </span>
      <span className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${on ? "bg-tide" : "bg-ink/20"}`}>
        <motion.span
          animate={{ x: on ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow"
        />
      </span>
    </button>
  );
}

/* ───────── Sayfa ───────── */
export default function Pomodoro() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [timer, setTimer] = useState<Timer>(() => fresh(DEFAULTS));
  const [task, setTask] = useState("");
  const [days, setDays] = useState<Record<string, Day>>({});
  const [now, setNow] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const audio = useRef<AudioContext | null>(null);

  /* Kayıtlı durumu yükle */
  useEffect(() => {
    let s = DEFAULTS;
    let t = fresh(DEFAULTS);
    let tk = "";
    let d: Record<string, Day> = {};
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const v = JSON.parse(raw) as { settings?: Partial<Settings>; timer?: Partial<Timer>; task?: string; days?: Record<string, Day> };
        s = { ...DEFAULTS, ...v.settings };
        t = { ...fresh(s), ...v.timer };
        tk = typeof v.task === "string" ? v.task : "";
        d = v.days ?? {};
      }
    } catch {}
    setSettings(s);
    setTimer(t);
    setTask(tk);
    setDays(d);
    setNow(Date.now());
    setReady(true);
  }, []);

  /* Her değişiklikte kaydet */
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ settings, timer, task, days }));
    } catch {}
  }, [ready, settings, timer, task, days]);

  /* Ses */
  const unlockAudio = () => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!audio.current) audio.current = new AC();
      if (audio.current.state === "suspended") void audio.current.resume();
    } catch {}
  };
  const chime = (kind: "done" | "back") => {
    const ctx = audio.current;
    if (!ctx) return;
    const notes = kind === "done" ? [659.25, 783.99, 1046.5] : [783.99, 587.33];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = ctx.currentTime + i * 0.22;
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.75);
    });
  };

  /* Oturum bitişi / atlama */
  const finish = useCallback(
    (skipped: boolean) => {
      const t = timer;
      let nextMode: Mode;
      let cycle = t.cycle;
      if (t.mode === "focus") {
        if (!skipped) cycle = t.cycle + 1;
        nextMode = !skipped && cycle >= settings.every ? "long" : "short";
      } else {
        nextMode = "focus";
        if (t.mode === "long") cycle = 0;
      }
      const total = dur(settings, nextMode);
      const auto = !skipped && settings.auto;
      const start = Date.now();
      setTimer({ mode: nextMode, running: auto, endAt: auto ? start + total : 0, leftMs: total, totalMs: total, cycle });
      setNow(start);
      if (skipped) return;
      const mins = Math.round(t.totalMs / 60000);
      if (t.mode === "focus") {
        const key = dayKey();
        setDays((prev) => {
          const cur = prev[key] ?? { n: 0, min: 0 };
          return prune({ ...prev, [key]: { n: cur.n + 1, min: cur.min + mins } });
        });
      }
      const message =
        t.mode === "focus"
          ? `${mins} dk odak tamam. ${nextMode === "long" ? "Uzun molayı hak ettin." : "Kısa bir mola ver."}`
          : "Mola bitti. Yeni tura hazır mısın?";
      setNotice(message);
      if (settings.sound) chime(t.mode === "focus" ? "done" : "back");
      try {
        navigator.vibrate?.([180, 80, 180]);
      } catch {}
      if (settings.notify) void notifyNow(message);
    },
    [timer, settings],
  );

  /* Geri sayım: bitiş zamanına göre hesaplanır, sekme arka planda kalsa da kaymaz */
  useEffect(() => {
    if (!timer.running) return;
    const check = () => {
      const t = Date.now();
      if (t >= timer.endAt) finish(false);
      else setNow(t);
    };
    const id = setInterval(check, 250);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [timer.running, timer.endAt, finish]);

  /* Bildirim mesajı 9 sn sonra kapanır */
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 9000);
    return () => clearTimeout(id);
  }, [notice]);

  /* Ekranı açık tut (isteğe bağlı) */
  useEffect(() => {
    if (!timer.running || !settings.awake || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let dead = false;
    const get = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {}
    };
    const vis = () => {
      if (document.visibilityState === "visible" && !dead) void get();
    };
    void get();
    document.addEventListener("visibilitychange", vis);
    return () => {
      dead = true;
      document.removeEventListener("visibilitychange", vis);
      lock?.release().catch(() => {});
    };
  }, [timer.running, settings.awake]);

  /* Türetilmiş değerler */
  const m = MODES[timer.mode];
  const remaining = timer.running ? Math.max(0, timer.endAt - now) : timer.leftMs;
  const clock = mmss(remaining);
  const progress = timer.totalMs > 0 ? clamp(1 - remaining / timer.totalMs, 0, 1) : 0;
  // Odakta gelgit yükselir, molada çekilir
  const level = timer.mode === "focus" ? progress : 1 - progress;
  const waterY = level <= 0.002 ? "calc(100% + 28px)" : `${(1 - level) * 100}%`;
  const idle = !timer.running && remaining === timer.totalMs;

  /* Sekme başlığında kalan süre */
  useEffect(() => {
    if (!timer.running) return;
    const prev = document.title;
    document.title = `${clock} · ${m.tab} | Bigova`;
    return () => {
      document.title = prev;
    };
  }, [timer.running, clock, m.tab]);

  /* Eylemler */
  const start = () => {
    unlockAudio();
    const t = Date.now();
    setNow(t);
    setTimer((p) => ({ ...p, running: true, endAt: t + p.leftMs }));
  };
  const pause = () => setTimer((p) => ({ ...p, running: false, leftMs: Math.max(0, p.endAt - Date.now()) }));
  const reset = () => {
    const total = dur(settings, timer.mode);
    setTimer((p) => ({ ...p, running: false, endAt: 0, leftMs: total, totalMs: total }));
  };
  const switchMode = (mode: Mode) => {
    if (mode === timer.mode) return;
    const total = dur(settings, mode);
    setTimer((p) => ({ mode, running: false, endAt: 0, leftMs: total, totalMs: total, cycle: p.cycle }));
  };
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    const timing = "focus" in patch || "short" in patch || "long" in patch;
    if (timing && !timer.running && timer.leftMs === timer.totalMs) {
      const total = dur(next, timer.mode);
      setTimer((p) => ({ ...p, leftMs: total, totalMs: total }));
    }
  };
  const toggleNotify = async () => {
    if (settings.notify) return update({ notify: false });
    try {
      if (typeof Notification === "undefined") return setNotice("Bu tarayıcı bildirimleri desteklemiyor.");
      const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (perm === "granted") update({ notify: true });
      else setNotice("Bildirim izni verilmedi. Tarayıcı ayarlarından açabilirsin.");
    } catch {}
  };

  /* İstatistikler (tarih kullandığı için yalnızca istemcide hesaplanır) */
  const today = ready ? (days[dayKey()] ?? { n: 0, min: 0 }) : { n: 0, min: 0 };
  const goalPct = clamp(today.n / settings.goal, 0, 1);
  const week = ready
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { n: days[dayKey(d)]?.n ?? 0, label: d.toLocaleDateString("tr-TR", { weekday: "short" }), today: i === 6 };
      })
    : [];
  const maxN = Math.max(4, ...week.map((w) => w.n));
  let streak = 0;
  if (ready) {
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if ((days[dayKey(d)]?.n ?? 0) > 0) streak++;
      else if (i > 0) break;
    }
  }

  const accentStyle = { ["--accent" as string]: m.accent } as CSSProperties;
  const dotColor = timer.mode === "long" ? "--coral" : "--sun";

  return (
    <main className="pb-10">
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <FontAwesomeIcon icon={faStopwatch} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">Pomodoro</h1>
            <p className="text-sm text-white/75">Dalgayla birlikte odaklan, mola ver</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-black/10 p-1" role="tablist" aria-label="Oturum türü">
          {(Object.keys(MODES) as Mode[]).map((k) => {
            const on = timer.mode === k;
            return (
              <button
                key={k}
                role="tab"
                aria-selected={on}
                onClick={() => switchMode(k)}
                className={`relative rounded-lg px-1.5 py-2 text-[13px] font-bold transition-colors ${on ? "text-ink" : "text-white/75"}`}
              >
                {on && (
                  <motion.span
                    layoutId="pomo-seg"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-lg bg-card shadow-sm"
                  />
                )}
                <span className="relative flex items-center justify-center gap-1.5">
                  <FontAwesomeIcon icon={MODES[k].icon} className="hidden text-[12px] min-[380px]:block" />
                  {MODES[k].tab}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid gap-4 px-5 pt-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:items-start">
        {/* ── Sayaç ── */}
        <section aria-label="Sayaç" style={accentStyle} className="relative overflow-hidden rounded-[28px] bg-card px-5 pb-6 pt-12 shadow-sm">
          <div className="relative mx-auto aspect-square w-[min(78vw,310px)]">
            {/* Deniz camı: su seviyesi süreyle birlikte değişir */}
            <div className="absolute inset-[7%] overflow-hidden rounded-full bg-foam ring-1 ring-ink/5">
              <div className="absolute inset-0" style={{ transform: `translateY(${waterY})`, transition: "transform .5s linear" }}>
                <svg viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden className="pomo-wave-b absolute bottom-[calc(100%-3px)] left-0 h-7 w-[200%]">
                  <path d={WAVE} style={{ fill: "rgb(var(--accent) / .16)" }} />
                </svg>
                <svg viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden className="pomo-wave-a absolute bottom-full left-0 h-6 w-[200%]">
                  <path d={WAVE} style={{ fill: "rgb(var(--accent) / .26)" }} />
                </svg>
                <div className="absolute inset-0" style={{ background: "rgb(var(--accent) / .26)" }} />
              </div>
              <div className="absolute inset-0 grid place-content-center text-center">
                <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-ink/55">{m.label}</p>
                <p
                  role="timer"
                  aria-label={`Kalan süre ${clock}`}
                  className="font-display text-[clamp(3.2rem,17vw,4.6rem)] font-extrabold leading-none tabular-nums"
                >
                  {clock}
                </p>
                <p className="mt-1 text-xs font-bold text-ink/60">{timer.running ? "Sürüyor" : idle ? "Hazır" : "Duraklatıldı"}</p>
              </div>
            </div>

            {/* İlerleme halkası ve güneş işaretçisi */}
            <svg viewBox="0 0 300 300" aria-hidden className="absolute inset-0 h-full w-full">
              <circle cx="150" cy="150" r="140" fill="none" stroke="rgb(var(--ink) / .08)" strokeWidth="10" />
              <circle
                cx="150"
                cy="150"
                r="140"
                fill="none"
                stroke="rgb(var(--accent))"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={RING * (1 - progress)}
                transform="rotate(-90 150 150)"
                opacity={progress < 0.002 ? 0 : 1}
                style={{ transition: "stroke-dashoffset .3s linear" }}
              />
              <g style={{ transformOrigin: "150px 150px", transform: `rotate(${progress * 360}deg)`, transition: "transform .3s linear" }}>
                <circle cx="150" cy="10" r="9" fill={`rgb(var(${dotColor}))`} stroke="rgb(var(--card))" strokeWidth="3" />
              </g>
            </svg>

            {/* Halkanın üstünde oturan martı */}
            <motion.div
              aria-hidden
              animate={timer.running ? { y: [0, -5, 0], rotate: [0, -3, 0] } : { y: 0, rotate: 0 }}
              transition={timer.running ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
              className="pointer-events-none absolute z-10"
              style={{ left: "79%", top: "13%", translateX: "-50%", translateY: "-92%" }}
            >
              <Mascot size={58} />
            </motion.div>
          </div>

          <div className="mt-5 flex flex-col items-center gap-2.5">
            <div className="flex items-center gap-2" role="img" aria-label={`${timer.cycle} / ${settings.every} tur tamamlandı`}>
              {Array.from({ length: settings.every }, (_, i) => {
                const done = i < timer.cycle;
                const cur = i === timer.cycle && timer.mode === "focus";
                return (
                  <span
                    key={i}
                    className={`h-3 w-3 rounded-full transition-colors ${done ? "bg-sun" : cur ? "pomo-dot-now" : "bg-ink/15"}`}
                    style={cur ? { background: "rgb(var(--accent))" } : undefined}
                  />
                );
              })}
              <span className="ml-1 text-xs font-extrabold text-ink/60">
                {timer.mode === "focus"
                  ? `Tur ${Math.min(timer.cycle + 1, settings.every)} / ${settings.every}`
                  : `${Math.min(timer.cycle, settings.every)} / ${settings.every} tur tamam`}
              </span>
            </div>
            <p className="text-center text-sm font-semibold text-ink/65">{m.line}</p>
          </div>

          <div className="mt-5 flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={reset}
              aria-label="Sıfırla"
              className="grid h-12 w-12 place-items-center rounded-full bg-foam text-ink/70 transition active:scale-90"
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </button>
            <div className="relative">
              {timer.running && <span aria-hidden className="pomo-halo absolute inset-0 rounded-full" style={{ background: "rgb(var(--accent) / .45)" }} />}
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={timer.running ? pause : start}
                aria-label={timer.running ? "Duraklat" : "Başlat"}
                className={`relative grid h-20 w-20 place-items-center rounded-full text-2xl ${m.btn}`}
                style={{ boxShadow: "0 12px 28px rgb(var(--accent) / .42)" }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={timer.running ? "pause" : "play"}
                    initial={{ scale: 0.4, rotate: -40, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ duration: 0.16 }}
                  >
                    <FontAwesomeIcon icon={timer.running ? faPause : faPlay} className={timer.running ? "" : "ml-1"} />
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
            <button
              type="button"
              onClick={() => finish(true)}
              aria-label="Sıradaki oturuma atla"
              className="grid h-12 w-12 place-items-center rounded-full bg-foam text-ink/70 transition active:scale-90"
            >
              <FontAwesomeIcon icon={faForwardStep} />
            </button>
          </div>

          <label className="mt-6 flex items-center gap-3 rounded-2xl bg-foam px-4 py-3 focus-within:ring-2 focus-within:ring-tide">
            <FontAwesomeIcon icon={faPen} className="text-ink/45" />
            <input
              value={task}
              onChange={(e) => setTask(e.target.value.slice(0, 80))}
              maxLength={80}
              placeholder="Şimdi ne üzerinde çalışıyorsun?"
              aria-label="Çalışma konusu"
              className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-ink/45"
            />
          </label>
        </section>

        {/* ── Yan paneller ── */}
        <div className="grid gap-4">
          <section aria-label="Bugünün özeti" className="rounded-[24px] bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-extrabold">Bugün</h2>
              {streak > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-coral/20 px-3 py-1 text-xs font-extrabold">
                  <FontAwesomeIcon icon={faFire} className="text-coral" /> {streak} günlük seri
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-foam p-3">
                <p className="text-xs font-bold text-ink/60">Tamamlanan tur</p>
                <p className="font-display text-3xl font-extrabold leading-tight">
                  {today.n}
                  <span className="text-base text-ink/50"> / {settings.goal}</span>
                </p>
              </div>
              <div className="rounded-2xl bg-foam p-3">
                <p className="text-xs font-bold text-ink/60">Odak süresi</p>
                <p className="font-display text-3xl font-extrabold leading-tight">{fmtMin(today.min)}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-3 overflow-hidden rounded-full bg-foam" role="progressbar" aria-valuemin={0} aria-valuemax={settings.goal} aria-valuenow={Math.min(today.n, settings.goal)} aria-label="Günlük hedef">
                <motion.div
                  className="relative h-full overflow-hidden rounded-full bg-tide"
                  initial={false}
                  animate={{ width: `${goalPct * 100}%` }}
                  transition={{ type: "spring", stiffness: 160, damping: 22 }}
                >
                  <svg viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden className="pomo-wave-a absolute bottom-0 left-0 h-full w-[200%]">
                    <path d={WAVE} fill="rgba(255,255,255,.28)" />
                  </svg>
                </motion.div>
              </div>
              <p className="mt-1.5 text-xs font-semibold text-ink/60">
                {goalPct >= 1 ? "Günlük hedefi tamamladın!" : `Hedefe ${settings.goal - today.n} tur kaldı`}
              </p>
            </div>
            {ready && (
              <div className="mt-4 flex items-end gap-2" aria-label="Son 7 gün">
                {week.map((w, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5" title={`${w.label}: ${w.n} tur`}>
                    <div className="flex h-16 w-full items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: w.n ? `${Math.max(14, (w.n / maxN) * 100)}%` : 5 }}
                        transition={{ type: "spring", stiffness: 180, damping: 20, delay: i * 0.04 }}
                        className={`w-full rounded-t-lg ${w.today ? "bg-sea" : "bg-sea/30"}`}
                      />
                    </div>
                    <span className={`text-[11px] font-bold ${w.today ? "text-ink" : "text-ink/50"}`}>{w.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-[24px] bg-card shadow-sm">
            <button
              type="button"
              aria-expanded={showSettings}
              aria-controls="pomo-settings"
              onClick={() => setShowSettings((v) => !v)}
              className="cat-head flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-deep">
                <FontAwesomeIcon icon={faSliders} />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <b className="block font-display text-lg">Süreleri ayarla</b>
                <span className="block truncate text-[13px] text-ink/65">
                  {settings.focus} / {settings.short} / {settings.long} dk · {settings.every} turda bir uzun mola
                </span>
              </span>
              <FontAwesomeIcon icon={faChevronDown} className="cat-chevron text-sm opacity-60" />
            </button>
            <div id="pomo-settings" className="cat-body" data-open={showSettings}>
              <div className="cat-inner">
                <div className="grid gap-2.5 px-4 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => {
                      const on = settings.focus === p.focus && settings.short === p.short && settings.long === p.long;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          aria-pressed={on}
                          onClick={() => update({ focus: p.focus, short: p.short, long: p.long })}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${on ? "bg-sea text-white" : "bg-foam text-ink/75"}`}
                        >
                          {p.name} · {p.focus}/{p.short}
                        </button>
                      );
                    })}
                  </div>
                  <Stepper label="Odak" value={settings.focus} unit="dk" min={5} max={90} step={5} onChange={(n) => update({ focus: n })} />
                  <Stepper label="Kısa mola" value={settings.short} unit="dk" min={1} max={30} step={1} onChange={(n) => update({ short: n })} />
                  <Stepper label="Uzun mola" value={settings.long} unit="dk" min={5} max={60} step={5} onChange={(n) => update({ long: n })} />
                  <Stepper label="Uzun mola aralığı" value={settings.every} unit="tur" min={2} max={8} step={1} onChange={(n) => update({ every: n })} />
                  <Stepper label="Günlük hedef" value={settings.goal} unit="tur" min={1} max={16} step={1} onChange={(n) => update({ goal: n })} />
                  <Toggle label="Otomatik başlat" hint="Oturum bitince sıradaki kendiliğinden başlar" icon={faRepeat} on={settings.auto} onChange={() => update({ auto: !settings.auto })} />
                  <Toggle label="Bitiş sesi" hint="Süre dolunca kısa bir melodi çalar" icon={settings.sound ? faVolumeHigh : faVolumeXmark} on={settings.sound} onChange={() => update({ sound: !settings.sound })} />
                  <Toggle label="Bildirim" hint="Başka sekmedeyken haber ver" icon={settings.notify ? faBell : faBellSlash} on={settings.notify} onChange={toggleNotify} />
                  <Toggle label="Ekranı açık tut" hint="Sayaç çalışırken ekran kararmaz" icon={faMobileScreenButton} on={settings.awake} onChange={() => update({ awake: !settings.awake })} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] bg-card p-4 shadow-sm">
            <h2 className="font-display text-lg font-extrabold">Nasıl çalışır?</h2>
            <ol className="mt-3 grid gap-2.5 text-sm font-semibold text-ink/75">
              {[
                `Bir iş seç, ${settings.focus} dakikalık sayacı başlat ve sadece ona odaklan.`,
                `Süre dolunca ${settings.short} dakika mola ver: kalk, su iç, uzaklara bak.`,
                `${settings.every} turu bitirince ${settings.long} dakikalık uzun molayı hak edersin.`,
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sun text-xs font-extrabold text-deep">{i + 1}</span>
                  <span className="leading-snug">{t}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {/* Oturum bitince beliren bildirim kartı */}
      <AnimatePresence>
        {notice && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="fixed inset-x-0 bottom-28 z-50 mx-auto w-full max-w-[420px] px-4 lg:bottom-8 lg:left-[264px]"
          >
            <div className="flex items-center gap-3 rounded-[22px] bg-card p-3 pr-2 shadow-[0_14px_40px_rgba(14,58,91,.3)] ring-1 ring-ink/10">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sun text-deep">
                <FontAwesomeIcon icon={faCheck} />
              </span>
              <p className="min-w-0 flex-1 text-sm font-bold leading-snug">{notice}</p>
              <button type="button" onClick={() => setNotice(null)} aria-label="Kapat" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/55">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
