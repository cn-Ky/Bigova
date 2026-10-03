"use client";
import type { Kind } from "@/lib/weather";

// Başlığın arkasındaki hava efektleri (güneş, yıldız, bulut, yağmur, kar, şimşek, sis).
const arr = (n: number) => Array.from({ length: n }, (_, i) => i);
const r = (i: number, m: number) => ((i * 37 + 11) % m) / m; // sabit sahte-rastgele (hydration güvenli)

export const TINT: Record<Kind, string> = {
  clear: "bg-gradient-to-b from-[#FFB84D]/30 to-transparent", partly: "bg-gradient-to-b from-[#FFB84D]/15 to-transparent", cloudy: "bg-slate-500/30",
  fog: "bg-slate-300/35", rain: "bg-[#0B1E2D]/45", snow: "bg-white/20", storm: "bg-[#0A0F1F]/60",
};

function Cloud({ i, tone }: { i: number; tone: string }) {
  return <span className="wcloud" style={{ top: 10 + i * 46, ["--tone" as string]: tone, animationDuration: `${50 + i * 17}s`, animationDelay: `${-i * 21}s`, transform: `scale(${1 + (i % 2) * 0.5})` }} />;
}

export default function FX({ kind, day }: { kind: Kind; day: boolean }) {
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
