import type { ReactNode } from "react";

/* ───────── Renk yardımcıları ───────── */
const parse = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

/** k < 0 koyulaştırır, k > 0 açar (çarpan). */
export function shade(hex: string, k: number) {
  const [r, g, b] = parse(hex);
  return toHex(r * (1 + k), g * (1 + k), b * (1 + k));
}
/** İki rengi karıştırır (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
export const tint = (hex: string, t: number) => mix(hex, "#FFFFFF", t);
export const lum = (hex: string) => {
  const [r, g, b] = parse(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
/** Koyu renklerde açıklaştırır, açık renklerde koyulaştırır: her zaman görünür bir vurgu tonu verir. */
export const accent = (hex: string, k = 0.3) => (lum(hex) > 0.32 ? shade(hex, -k) : tint(hex, k + 0.1));

/* ───────── Şekil yardımcıları ───────── */
export const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.1} ${cx - s * 0.9} ${cy - s * 1.2} ${cx} ${cy - s * 0.3} C${cx + s * 0.9} ${cy - s * 1.2} ${cx + s * 1.6} ${cy - s * 0.1} ${cx} ${cy + s * 0.9}Z`;
/** 8 uçlu parıltı. */
export const sparkle = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r} L${cx + r * 0.28} ${cy - r * 0.28} L${cx + r} ${cy} L${cx + r * 0.28} ${cy + r * 0.28} L${cx} ${cy + r} L${cx - r * 0.28} ${cy + r * 0.28} L${cx - r} ${cy} L${cx - r * 0.28} ${cy - r * 0.28}Z`;
/** Düzgün 5 köşeli yıldız. */
export const star5 = (cx: number, cy: number, R: number, r = R * 0.42) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(" L")}Z`;
};
/** Sol tarafa çizilen şekli sağ tarafa da yansıtır (x = 100 ekseni). */
export const mir = (n: ReactNode) => (
  <>
    <g>{n}</g>
    <g transform="matrix(-1 0 0 1 200 0)">{n}</g>
  </>
);
export const Grad = ({ id, a, b }: { id: string; a: string; b: string }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  </defs>
);
export const bgRect = (id: string) => <rect width="200" height="270" rx="28" fill={`url(#${id})`} />;
