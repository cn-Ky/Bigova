"use client";
import type { CSSProperties } from "react";

// Panel açılınca boşta kalan gökyüzünü dolduran sevimli martılar.
// Her martı: kanat çırpan bir SVG (GullSprite) + kendi uçuş güzergâhı (globals değil, weather-fx.css).
const css = (v: Record<string, string | number>) => v as CSSProperties;

type Path = "lr" | "rl" | "swoop" | "climb" | "ellipse";
type Fly = "flap" | "burst" | "glide";
type G = { path: Path; y: number; sz: number; dur: number; del: number; flap: number; fly: Fly; o?: number; x?: number; rx?: number; ry?: number; rev?: boolean; dy?: number };

const GULLS: G[] = [
  // Büyük, yakın martılar
  { path: "lr", y: 12, sz: 74, dur: 26, del: -4, flap: 0.62, fly: "burst" },
  { path: "swoop", y: 38, sz: 78, dur: 23, del: -10, flap: 0.7, fly: "burst" },
  { path: "rl", y: 70, sz: 66, dur: 29, del: -3, flap: 0.66, fly: "flap" },
  { path: "ellipse", y: 56, x: 22, rx: 9, ry: 7, sz: 68, dur: 15, del: 0, flap: 0.74, fly: "burst" },
  { path: "climb", y: 62, sz: 54, dur: 31, del: -18, flap: 0.58, fly: "flap" },
  // Orta boy
  { path: "rl", y: 28, sz: 50, dur: 34, del: -17, flap: 0.7, fly: "glide", o: 0.92 },
  { path: "ellipse", y: 34, x: 58, rx: 7, ry: 9, sz: 48, dur: 19, del: -6, flap: 0.8, fly: "burst", rev: true, o: 0.92 },
  { path: "lr", y: 82, sz: 46, dur: 36, del: -22, flap: 0.64, fly: "flap", o: 0.9 },
  // Uzaktakiler: küçük, soluk, yavaş
  { path: "rl", y: 8, sz: 30, dur: 52, del: -26, flap: 0.9, fly: "glide", o: 0.6 },
  { path: "lr", y: 46, sz: 28, dur: 58, del: -40, flap: 0.88, fly: "burst", o: 0.55 },
  // V formasyonunda 5'li sürü
  ...[0, 1, 2, 3, 4].map((k): G => ({ path: "lr", y: 22 + (k ? (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 2.2 : 0), sz: 34, dur: 46, del: -31 + Math.ceil(k / 2) * 0.9, flap: 0.78, fly: "burst", o: 0.8 })),
];

export function GullSprite() {
  return (
    <svg viewBox="0 0 76 52" className="gull-svg" aria-hidden>
      {/* uzak kanat (arkada, biraz koyu) */}
      <g transform="translate(5 -2)">
        <g className="gull-wing gull-wing--far">
          <path d="M32 24C27 11 15 3 1 4c8 6 12 12 21 22z" fill="#C3D7E3" />
          <path d="M10 5.5C7 4.4 4 4.1 1 4c3 2.2 5 4.4 7.200 6.600z" fill="#6C8294" />
        </g>
      </g>
      {/* kuyruk + bacaklar */}
      <path d="M21 29 5 25l3 8z" fill="#D5E6EF" />
      <path d="M31 38l-3 6M38 38l-2 6" stroke="#FF9A3C" strokeWidth="2.2" strokeLinecap="round" />
      {/* gövde */}
      <ellipse cx="36" cy="30" rx="18" ry="10" fill="#fff" />
      <ellipse cx="38" cy="35" rx="13" ry="5" fill="#E3EEF5" />
      {/* baş */}
      <circle cx="54" cy="22" r="10" fill="#fff" />
      <path d="M62 21.500 73 24.500 62 27.500z" fill="#FFB84D" />
      <path d="M62 25 72 24.700 62 27.200z" fill="#F08A24" />
      <circle cx="56.500" cy="19.500" r="2.700" fill="#072638" />
      <circle cx="57.400" cy="18.600" r="0.9" fill="#fff" />
      <circle cx="58" cy="25.500" r="2.800" fill="#FF8F7A" opacity=".42" />
      <path d="M49 13c3-3 8-3.500 11-1.500" stroke="#B8CDD9" strokeWidth="2.200" strokeLinecap="round" fill="none" />
      {/* yakın kanat */}
      <g className="gull-wing">
        <path d="M33 25C28 11 15 2 0 3c9 6 13 13 23 24z" fill="#fff" stroke="#C3D7E3" strokeWidth=".9" strokeLinejoin="round" />
        <path d="M10 4.400C7 3.300 3.500 3 0 3c3.200 2.400 5.600 4.800 8 7.500z" fill="#5E7384" />
      </g>
    </svg>
  );
}

export default function Gulls({ night }: { night: boolean }) {
  return (
    <div className={`gulls ${night ? "is-night" : ""}`} aria-hidden>
      {GULLS.map((g, i) => {
        const loop = g.path === "ellipse";
        return (
          <div
            key={i}
            className={`gull gp-${g.path} ${g.rev ? "is-rev" : ""}`}
            data-fly={g.fly}
            style={css({ "--y": `${g.y}%`, "--sz": `${g.sz}px`, "--dur": `${g.dur}s`, "--del": `${g.del}s`, "--flap": `${g.flap}s`, "--o": g.o ?? 1, ...(loop ? { "--x": `${g.x}%`, "--rx": g.rx!, "--ry": g.ry! } : {}) })}
          >
            <div className={loop ? "gull-y" : ""}>
              <div className={`gull-flip ${g.path === "rl" ? "is-left" : ""} ${loop ? "is-face" : ""}`}>
                <GullSprite />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
