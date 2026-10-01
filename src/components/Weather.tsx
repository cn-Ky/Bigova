"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWind, faTemperatureHalf } from "@fortawesome/free-solid-svg-icons";
import { KINDS, iconOf, kindOf, label, type Kind } from "@/lib/weather";

type W = { temp: number; feels: number; wind: number; code: number; isDay: boolean };
const arr = (n: number) => Array.from({ length: n }, (_, i) => i);
const r = (i: number, m: number) => ((i * 37 + 11) % m) / m; // sabit sahte-rastgele (hydration güvenli)

const TINT: Record<Kind, string> = {
  clear: "bg-gradient-to-b from-[#FFB84D]/30 to-transparent", partly: "bg-gradient-to-b from-[#FFB84D]/15 to-transparent", cloudy: "bg-slate-500/30",
  fog: "bg-slate-300/35", rain: "bg-[#0B1E2D]/45", snow: "bg-white/20", storm: "bg-[#0A0F1F]/60",
};

function Cloud({ i, tone }: { i: number; tone: string }) {
  return <span className="wcloud" style={{ top: 10 + i * 46, ["--tone" as string]: tone, animationDuration: `${50 + i * 17}s`, animationDelay: `${-i * 21}s`, transform: `scale(${1 + (i % 2) * 0.5})` }} />;
}

function FX({ kind, day }: { kind: Kind; day: boolean }) {
  const dark = kind === "rain" || kind === "storm";
  const tone = dark ? "rgba(130,150,170,.45)" : "rgba(255,255,255,.28)";
  const cloudN = { clear: 0, partly: 2, cloudy: 4, fog: 1, rain: 4, snow: 3, storm: 4 }[kind];
  return (
    <>
      {kind === "clear" || kind === "partly" ? (day ? (
        <div className="absolute right-[24%] top-2 h-24 w-24">
          <span className="sun-rays absolute -inset-16" />
          <span className="sun-core absolute inset-3 rounded-full bg-[#FFD86B]" />
        </div>
      ) : (
        <>
          <span className="moon absolute right-[26%] top-5" />
          {arr(16).map((i) => <i key={i} className="star" style={{ left: `${r(i, 89) * 100}%`, top: `${r(i, 41) * 70}%`, animationDelay: `${-r(i, 13) * 3}s` }} />)}
        </>
      )) : null}
      {arr(cloudN).map((i) => <Cloud key={i} i={i} tone={tone} />)}
      {(kind === "rain" || kind === "storm") && arr(kind === "storm" ? 44 : 32).map((i) => (
        <i key={i} className="drop" style={{ left: `${r(i, 97) * 105}%`, animationDelay: `${-r(i, 53) * 1.2}s`, animationDuration: `${0.5 + r(i, 31) * 0.45}s`, opacity: 0.35 + r(i, 19) * 0.45 }} />
      ))}
      {kind === "snow" && arr(34).map((i) => (
        <i key={i} className="flake" style={{ left: `${r(i, 97) * 100}%`, width: 3 + r(i, 7) * 5, height: 3 + r(i, 7) * 5, animationDelay: `${-r(i, 53) * 9}s`, animationDuration: `${5 + r(i, 29) * 5}s`, opacity: 0.5 + r(i, 11) * 0.5 }} />
      ))}
      {kind === "storm" && (<><span className="absolute inset-0 bg-white lightning" />
        <svg viewBox="0 0 24 40" className="lightning absolute right-[34%] top-0 h-28 text-[#FFE98A]"><path fill="currentColor" d="M14 0 2 22h8l-3 18L22 14h-9z" /></svg></>)}
      {kind === "fog" && arr(3).map((i) => <span key={i} className="fogband" style={{ top: 30 + i * 60, animationDelay: `${-i * 4}s`, animationDuration: `${12 + i * 3}s` }} />)}
    </>
  );
}

export default function Weather() {
  const [w, setW] = useState<W | null>(null); const [fail, setFail] = useState(false);
  const [force, setForce] = useState<{ k: Kind; night: boolean } | null>(null);
  const [shown, setShown] = useState(0); const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = () => fetch("/api/weather").then((r) => r.json()).then((d) => (d.error ? setFail(true) : setW(d))).catch(() => setFail(true));
    load(); const t = setInterval(load, 10 * 60 * 1000); return () => clearInterval(t);
  }, []);
  // Önizleme: /?hava=snow  (clear, partly, cloudy, fog, rain, snow, storm, night)
  useEffect(() => {
    const v = new URLSearchParams(location.search).get("hava");
    if (v === "night") setForce({ k: "clear", night: true }); else if (v && (KINDS as string[]).includes(v)) setForce({ k: v as Kind, night: false });
  }, []);

  const day = force ? !force.night : w?.isDay ?? true;
  const kind: Kind | null = force ? force.k : w ? kindOf(w.code) : null;
  const temp = w?.temp;
  useEffect(() => { if (temp == null) return; const c = animate(0, temp, { duration: 1.1, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) }); return () => c.stop(); }, [temp]);

  return (
    <>
      <AnimatePresence>
        {kind && (
          <motion.div key={`${kind}-${day}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            <div className={`absolute inset-0 ${day ? TINT[kind] : "bg-[#050E1F]/55"}`} />
            <FX kind={kind} day={day} />
          </motion.div>
        )}
      </AnimatePresence>

      {!fail && (
        <div className="absolute right-3 top-3 z-20 text-right lg:right-5 lg:top-5">
          {!w || !kind ? <div className="shimmer h-9 w-20 rounded-full" /> : (
            <motion.button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Biga hava durumu" initial={{ opacity: 0, y: -10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 py-1.5 pl-3 pr-4 text-white ring-1 ring-white/25 backdrop-blur-md">
              <motion.span key={`${kind}-${day}`} animate={kind === "clear" && day ? { rotate: 360 } : { y: [0, -3, 0] }} transition={kind === "clear" && day ? { duration: 24, repeat: Infinity, ease: "linear" } : { duration: 3, repeat: Infinity }} className="text-lg text-[#FFD86B]">
                <FontAwesomeIcon icon={iconOf(kind, day)} />
              </motion.span>
              <b className="font-display text-xl font-extrabold leading-none">{shown}°</b>
              <span className="hidden text-xs font-bold text-white/80 sm:inline">{label(kind, day)}</span>
            </motion.button>
          )}
          <AnimatePresence>
            {open && w && kind && (
              <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }} className="mt-2 w-52 rounded-2xl bg-card p-3 text-left text-sm text-ink shadow-xl">
                <b className="font-display text-base">Biga · {label(kind, day)}</b>
                <p className="mt-1"><FontAwesomeIcon icon={faTemperatureHalf} className="w-4 text-coral" /> Hissedilen {w.feels}°</p>
                <p><FontAwesomeIcon icon={faWind} className="w-4 text-tide" /> Rüzgâr {w.wind} km/sa</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
