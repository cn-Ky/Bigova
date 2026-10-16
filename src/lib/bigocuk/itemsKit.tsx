import type { ReactNode } from "react";
import type { DrawCtx } from "./items";

/* items.tsx ile aynı çizim yardımcıları (ek kataloglar için; döngüsel import olmasın diye ayrı dosya) */
const armX = (y: number) => 64 - ((y - 150) * 11) / 48;
export const sleeve = (c: string, toY: number) => (
  <g fill={c} stroke={c}>
    <circle cx="64" cy="150" r="8.5" stroke="none" />
    <circle cx="136" cy="150" r="8.5" stroke="none" />
    <path d={`M64 150 L${armX(toY)} ${toY}`} strokeWidth="17" fill="none" />
    <path d={`M136 150 L${200 - armX(toY)} ${toY}`} strokeWidth="17" fill="none" />
  </g>
);
export const torso = (c: string) => <rect x="68" y="140" width="64" height="62" rx="14" fill={c} />;
export const neckV = (c: string) => <path d="M91 140 Q100 157 109 140 Z" fill={c} />;
export const fist = (c: DrawCtx, x = 148) => <circle cx={x} cy="203" r="9" fill={c.limb} />;

/** Boyun çevresinde (y≈140-156) yay üzerinde n nokta üretir. */
export const arcPoints = (n: number, x0 = 76, x1 = 124, y0 = 141, dip = 15): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return [x0 + (x1 - x0) * t, y0 + dip * Math.sin(Math.PI * t)] as [number, number];
  });

/** Basit çiçek: 5 yaprak + orta. */
export const flower = (cx: number, cy: number, r: number, petal: string, mid = "#FFD84D", key?: string | number): ReactNode => (
  <g key={key}>
    {[0, 72, 144, 216, 288].map((a) => (
      <circle key={a} cx={cx + r * 0.85 * Math.cos((a * Math.PI) / 180)} cy={cy + r * 0.85 * Math.sin((a * Math.PI) / 180)} r={r * 0.62} fill={petal} />
    ))}
    <circle cx={cx} cy={cy} r={r * 0.5} fill={mid} />
  </g>
);

/** Daire çizen path (delik açmak için evenodd ile kullanılır). */
export const circlePath = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
