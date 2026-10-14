"use client";

import { useEffect, useSyncExternalStore } from "react";
import { STEP, makeNoise, scheduleStep } from "./marsEngine";

const PREF_KEY = "bigova-atat-mars";
const MARS_FILE = "/audio/mars.mp3"; // isteğe bağlı: varsa sentez yerine bu dosya çalınır
const VOLUME = 0.5;

/* ───────── Küçük paylaşılan durum (hero düğmesi + yüzen düğme aynı marşı yönetir) ───────── */
type Engine = { stop(): void; pause(): void; resume(): void };

let playing = false;
let engine: Engine | null = null;
let token = 0;
let fileOk = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getPlaying = () => playing;
const getServer = () => false;

function fileEngine(): Engine | null {
  const audio = new Audio(MARS_FILE);
  audio.loop = true;
  audio.volume = 0;
  let fade = 0;
  const to = (v: number, done?: () => void) => {
    window.clearInterval(fade);
    fade = window.setInterval(() => {
      const d = v - audio.volume;
      if (Math.abs(d) < 0.03) {
        audio.volume = v;
        window.clearInterval(fade);
        done?.();
      } else audio.volume = Math.min(1, Math.max(0, audio.volume + Math.sign(d) * 0.03));
    }, 60);
  };
  void audio.play().then(() => to(VOLUME * 0.7)).catch(() => {});
  return {
    stop: () => to(0, () => audio.pause()),
    pause: () => audio.pause(),
    resume: () => void audio.play().catch(() => {}),
  };
}

function synthEngine(): Engine | null {
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  void ctx.resume();
  const master = ctx.createGain();
  master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.5);
  const noise = makeNoise(ctx);
  let n = 0;
  let next = ctx.currentTime + 0.1;
  let timer = 0;
  const pump = () => {
    while (next < ctx.currentTime + 0.25) {
      scheduleStep(ctx, master, noise, n++, next);
      next += STEP;
    }
  };
  const run = () => {
    window.clearInterval(timer);
    timer = window.setInterval(pump, 40);
  };
  run();
  return {
    stop() {
      window.clearInterval(timer);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      window.setTimeout(() => void ctx.close().catch(() => {}), 900);
    },
    pause() {
      window.clearInterval(timer);
      void ctx.suspend();
    },
    resume() {
      void ctx.resume();
      next = ctx.currentTime + 0.1;
      run();
    },
  };
}

function startMars() {
  if (playing) return;
  playing = true;
  const id = ++token;
  emit();
  let e: Engine | null = null;
  try {
    // Kullanıcı hareketinin içinde, eşzamanlı başlatılır (Safari/iOS gerektirir)
    e = fileOk ? fileEngine() : synthEngine();
  } catch {
    e = null;
  }
  if (!e) {
    playing = false;
    emit();
    return;
  }
  if (id !== token) {
    e.stop();
    return;
  }
  engine = e;
}

function stopMars() {
  token++;
  playing = false;
  engine?.stop();
  engine = null;
  emit();
}

function toggleMars() {
  const on = !playing;
  if (on) startMars();
  else stopMars();
  try {
    localStorage.setItem(PREF_KEY, on ? "1" : "0");
  } catch {}
}

export function useMars() {
  return useSyncExternalStore(subscribe, getPlaying, getServer);
}

/* ───────── Eşitleyici çubukları ───────── */
function Bars({ on }: { on: boolean }) {
  return (
    <span className={`atat-eq${on ? " is-on" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

/** Hero içindeki büyük düğme */
export function MarsHeroButton() {
  const on = useMars();
  return (
    <button
      type="button"
      className={`atat-btn atat-btn--ghost${on ? " is-on" : ""}`}
      data-mars-toggle
      aria-pressed={on}
      onClick={toggleMars}
    >
      <Bars on={on} />
      {on ? "Marşı durdur" : "Marşı çal"}
    </button>
  );
}

/** Sayfa boyunca ekranda duran küçük kumanda + yaşam döngüsü (sayfadan çıkınca marş susar) */
export default function MarsFloat() {
  const on = useMars();

  useEffect(() => {
    let cancelled = false;
    // Özel bir ses dosyası konmuşsa onu kullan
    fetch(MARS_FILE, { method: "HEAD" })
      .then((r) => {
        if (!cancelled)
          fileOk = r.ok && (r.headers.get("content-type") || "").startsWith("audio");
      })
      .catch(() => {});

    // Daha önce marşı açmışsa, tarayıcı izin verdiği ilk dokunuşta kaldığı yerden başlasın
    let pref = false;
    try {
      pref = localStorage.getItem(PREF_KEY) === "1";
    } catch {}
    const first = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("[data-mars-toggle]")) return;
      startMars();
    };
    if (pref) {
      document.addEventListener("pointerdown", first, { once: true });
      document.addEventListener("keydown", first, { once: true });
    }

    const onVis = () => {
      if (!engine) return;
      if (document.hidden) engine.pause();
      else engine.resume();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", first);
      document.removeEventListener("keydown", first);
      document.removeEventListener("visibilitychange", onVis);
      stopMars();
    };
  }, []);

  return (
    <button
      type="button"
      className={`atat-mars${on ? " is-on" : ""}`}
      data-mars-toggle
      aria-pressed={on}
      aria-label={on ? "Arka plan marşını durdur" : "Arka plan marşını çal"}
      onClick={toggleMars}
    >
      <Bars on={on} />
      <span>{on ? "Marş açık" : "Marş kapalı"}</span>
    </button>
  );
}
