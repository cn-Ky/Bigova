"use client";
import type { CSSProperties } from "react";
import type { Kind } from "@/lib/weather";

// Hava panelinin arkasındaki canlı gökyüzü: güneş, ay + yıldızlar, katmanlı bulutlar, yağmur, kar, şimşek, sis.
// Tüm hareketler saf CSS (weather-fx.css); konumlar sabit sahte-rastgele olduğu için sunucu/istemci aynı çıkar.
const arr = (n: number) => Array.from({ length: n }, (_, i) => i);
const rnd = (i: number, s = 0) => {
  const x = Math.sin(i * 127.1 + s * 311.7 + 1.7) * 43758.5453;
  return x - Math.floor(x);
};
const css = (v: Record<string, string | number>) => v as CSSProperties;

export const TINT: Record<Kind, string> = {
  clear: "bg-gradient-to-b from-[#FFB84D]/30 to-transparent", partly: "bg-gradient-to-b from-[#FFB84D]/15 to-transparent", cloudy: "bg-slate-500/30",
  fog: "bg-slate-300/35", rain: "bg-[#0B1E2D]/45", snow: "bg-white/20", storm: "bg-[#0A0F1F]/60",
};

/* ------------------------------------------------------------------ Yıldızlar */
const STAR_COLORS = ["#ffffff", "#ffffff", "#ffffff", "#DCE8FF", "#FFF1CC", "#CFE0FF"];

function Stars({ n }: { n: number }) {
  return (
    <>
      <span className="fx-milky" />
      {arr(n).map((i) => {
        const s = 1 + Math.pow(rnd(i, 3), 2.6) * 2.6; // çoğu küçük, birkaçı parlak
        return (
          <i
            key={i}
            className={`fx-star ${s > 2.5 ? "is-glint" : ""}`}
            style={css({
              left: `${(rnd(i, 1) * 100).toFixed(1)}%`,
              top: `${(Math.pow(rnd(i, 2), 1.25) * 90).toFixed(1)}%`,
              "--s": `${s.toFixed(1)}px`,
              "--c": STAR_COLORS[Math.floor(rnd(i, 4) * STAR_COLORS.length)],
              "--t": `${(2.2 + rnd(i, 5) * 3.6).toFixed(1)}s`,
              "--d": `${(-rnd(i, 6) * 7).toFixed(1)}s`,
            })}
          />
        );
      })}
      {[0, 1, 2].map((i) => (
        <span key={i} className="fx-shoot" style={css({ top: `${[5, 17, 28][i]}%`, left: `${[58, 78, 38][i]}%`, "--t": `${[11, 17, 23][i]}s`, "--d": `${[2, 7, 13][i]}s` })} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ Bulutlar */
type Tone = { top: string; mid: string; bottom: string; shade: string; hl: number; o: number };
const TONES = {
  day: { top: "#FFFFFF", mid: "#F2F8FC", bottom: "#C9DCEA", shade: "#7FA3BF", hl: 0.9, o: 0.96 },
  grey: { top: "#EEF2F6", mid: "#CDD7E0", bottom: "#9BAABA", shade: "#52667C", hl: 0.7, o: 0.95 },
  dark: { top: "#B9C5D2", mid: "#8A9AAD", bottom: "#56677C", shade: "#25334A", hl: 0.4, o: 0.96 },
  night: { top: "#A5B1DA", mid: "#7684B2", bottom: "#424F7B", shade: "#18204A", hl: 0.32, o: 0.78 },
} satisfies Record<string, Tone>;

// Her bulut 5 yuvarlaktan oluşur: [cx, cy, r]
const SHAPES: [number, number, number][][] = [
  [[70, 56, 26], [112, 42, 36], [158, 50, 30], [194, 62, 22], [42, 66, 18]],
  [[60, 58, 24], [98, 46, 32], [140, 36, 38], [184, 54, 28], [216, 66, 18]],
  [[56, 60, 20], [92, 48, 30], [132, 54, 26], [170, 42, 32], [206, 60, 22]],
];
// [genişlik, üstten px, süre sn, opaklık] – küçük/yavaş = uzak, büyük/hızlı = yakın (paralaks)
const LAYERS = [[300, 10, 95, 1], [210, 78, 130, 0.62], [380, 36, 78, 0.92], [190, 128, 150, 0.5], [290, 64, 105, 0.8], [240, 168, 120, 0.58]];

function CloudArt({ id, v, tone }: { id: string; v: number; tone: Tone }) {
  const set = SHAPES[v % SHAPES.length];
  return (
    <svg viewBox="0 0 240 100" aria-hidden>
      <defs>
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="0" y2="92">
          <stop offset="0" stopColor={tone.top} />
          <stop offset=".5" stopColor={tone.mid} />
          <stop offset="1" stopColor={tone.bottom} />
        </linearGradient>
        <filter id={`${id}b`} x="-10%" y="-20%" width="120%" height="150%"><feGaussianBlur stdDeviation="1.3" /></filter>
        <filter id={`${id}h`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <ellipse cx="120" cy="88" rx="100" ry="8" fill={tone.shade} opacity=".35" filter={`url(#${id}h)`} />
      <g fill={`url(#${id}g)`} filter={`url(#${id}b)`} opacity={tone.o}>
        <rect x="14" y="60" width="212" height="30" rx="15" />
        {set.map(([cx, cy, r], k) => <circle key={k} cx={cx} cy={cy} r={r} />)}
      </g>
      <g fill="#fff" opacity={tone.hl * 0.75} filter={`url(#${id}h)`}>
        {set.map(([cx, cy, r], k) => <circle key={k} cx={cx - r * 0.25} cy={cy - r * 0.32} r={r * 0.5} />)}
      </g>
    </svg>
  );
}

function Clouds({ n, tone }: { n: number; tone: Tone }) {
  return (
    <>
      {arr(n).map((i) => {
        const [w, y, dur, o] = LAYERS[i % LAYERS.length];
        return (
          <div key={i} className="fx-cloud" style={css({ "--w": `${w}px`, "--dur": `${dur}s`, "--del": `${(-dur * ((i * 0.37) % 1)).toFixed(1)}s`, "--o": o, top: y })}>
            <CloudArt id={`fxc${i}`} v={i} tone={tone} />
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ Yağmur / şimşek / kar / sis */
function Rain({ n, storm }: { n: number; storm: boolean }) {
  return (
    <>
      {arr(n).map((i) => {
        const layer = i % 3; // 0 uzak, 1 orta, 2 yakın
        const h = [10, 16, 26][layer] + rnd(i, 2) * 6;
        return (
          <i
            key={i}
            className="fx-drop"
            style={css({
              "--x": `${(rnd(i, 1) * 125 - 10).toFixed(1)}%`,
              "--h": `${h.toFixed(0)}px`,
              "--w": `${[1, 1.4, 2][layer]}px`,
              "--o": [0.28, 0.5, 0.78][layer],
              "--t": `${([1.05, 0.75, 0.5][layer] + rnd(i, 3) * 0.2).toFixed(2)}s`,
              "--d": `${(-rnd(i, 4) * 2).toFixed(2)}s`,
            })}
          />
        );
      })}
      {arr(10).map((i) => (
        <span key={i} className="fx-ripple" style={css({ "--x": `${(rnd(i, 7) * 92 + 2).toFixed(1)}%`, "--b": `${6 + Math.floor(rnd(i, 8) * 26)}px`, "--d": `${(-rnd(i, 9) * 1.6).toFixed(2)}s` })} />
      ))}
      <span className="fx-mist" />
      {storm && (
        <>
          {[{ x: 62, t: 7, d: 1 }, { x: 24, t: 11, d: 5 }].map((b, k) => (
            <div key={k}>
              <span className="fx-flash" style={css({ "--fx": `${b.x}%`, "--t": `${b.t}s`, "--d": `${b.d}s` })} />
              <svg viewBox="0 0 60 160" className="fx-bolt" style={css({ left: `${b.x}%`, "--t": `${b.t}s`, "--d": `${b.d}s` })} aria-hidden>
                <path d="M34 0 22 50l14 4-22 58 14 4L8 160" />
                <path d="M30 72 46 100h-8l14 28" />
              </svg>
            </div>
          ))}
        </>
      )}
    </>
  );
}

function Crystal() {
  return (
    <svg viewBox="-12 -12 24 24" aria-hidden>
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a})`} stroke="#fff" strokeWidth="1.4" strokeLinecap="round" fill="none">
          <path d="M0 -10V10" />
          <path d="M-3 -7 0 -4 3 -7M-3 7 0 4 3 7" />
        </g>
      ))}
    </svg>
  );
}

function Snow({ n }: { n: number }) {
  return (
    <>
      {arr(n).map((i) => {
        const layer = i % 3; // uzak: küçük/net, yakın: büyük/bulanık
        return (
          <span
            key={i}
            className="fx-flake"
            style={css({
              "--x": `${(rnd(i, 1) * 100).toFixed(1)}%`,
              "--s": `${[4, 7, 12][layer] + rnd(i, 2) * [2, 3, 5][layer]}px`,
              "--o": [0.55, 0.8, 0.95][layer],
              "--b": `${[0, 0.4, 1.6][layer]}px`,
              "--t": `${([13, 9, 6][layer] + rnd(i, 3) * 4).toFixed(1)}s`,
              "--d": `${(-rnd(i, 4) * 14).toFixed(1)}s`,
              "--sw": `${(2.4 + rnd(i, 5) * 2.4).toFixed(1)}s`,
            })}
          >
            <i />
          </span>
        );
      })}
      {arr(9).map((i) => (
        <span key={`c${i}`} className="fx-crystal" style={css({ "--x": `${(rnd(i, 11) * 96).toFixed(1)}%`, "--s": `${14 + Math.floor(rnd(i, 12) * 12)}px`, "--t": `${(11 + rnd(i, 13) * 8).toFixed(1)}s`, "--d": `${(-rnd(i, 14) * 18).toFixed(1)}s` })}>
          <Crystal />
        </span>
      ))}
      <span className="fx-snowglow" />
    </>
  );
}

/* ------------------------------------------------------------------ Güneş & ay */
function Sun() {
  return (
    <div className="fx-sun">
      <span className="fx-sun-corona" />
      <span className="fx-sun-rays" />
      <span className="fx-sun-rays fx-sun-rays--b" />
      <span className="fx-sun-core" />
      <span className="fx-flare" style={css({ left: 170, top: 120, "--s": "34px" })} />
      <span className="fx-flare" style={css({ left: 235, top: 165, "--s": "58px" })} />
      <span className="fx-flare" style={css({ left: 300, top: 210, "--s": "22px" })} />
    </div>
  );
}

function Moon() {
  return (
    <div className="fx-moonbox">
      <span className="fx-moon-glow" />
      <span className="fx-moon" />
    </div>
  );
}

/* ------------------------------------------------------------------ Ana bileşen */
export default function FX({ kind, day }: { kind: Kind; day: boolean }) {
  const dark = kind === "rain" || kind === "storm";
  const tone = !day ? TONES.night : dark ? TONES.dark : kind === "cloudy" || kind === "fog" ? TONES.grey : TONES.day;
  const cloudN = { clear: 0, partly: 3, cloudy: 6, fog: 2, rain: 5, snow: 4, storm: 6 }[kind];
  const starN = !day ? { clear: 130, partly: 90, cloudy: 34, fog: 18, rain: 0, snow: 0, storm: 0 }[kind] : 0;
  return (
    <div className="fx">
      {day && (kind === "clear" || kind === "partly") && <div className="fx-sunpos"><Sun /></div>}
      {!day && (kind === "clear" || kind === "partly") && <div className="fx-moonpos"><Moon /></div>}
      {starN > 0 && <Stars n={starN} />}
      <Clouds n={cloudN} tone={tone} />
      {(kind === "rain" || kind === "storm") && <Rain n={kind === "storm" ? 120 : 84} storm={kind === "storm"} />}
      {kind === "snow" && <Snow n={64} />}
      {kind === "fog" && arr(4).map((i) => <span key={i} className="fx-fog" style={css({ top: `${10 + i * 22}%`, "--h": `${80 + i * 16}px`, "--t": `${20 + i * 6}s`, "--d": `${-i * 5}s` })} />)}
    </div>
  );
}
