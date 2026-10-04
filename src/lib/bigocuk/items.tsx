import type { ReactNode } from "react";
import { Grad, bgRect, mir, shade, sparkle, star5 } from "./draw";
import { EYE_COLORS, PATTERNS, SPECIES, SPECIES_MAP } from "./species";

export { shade };

/* ───────── Tipler ───────── */
export type Slot = "species" | "hat" | "glasses" | "neck" | "top" | "hand" | "back" | "bg";
/** Görünüm seçenekleri (ücretsiz): renk (c1…), desen (p1…), göz rengi (e1…), türe özel özellik (f1…). */
export type Look = { color: string; pattern: string; eyes: string; feature: string };
export type AvatarConfig = Look & Record<Slot, string>;
export type Layers = { back?: ReactNode; mid?: ReactNode; over?: ReactNode };
/** Aksesuarların çizim bağlamı: seçili hayvanın rengi. */
export type DrawCtx = { uid: string; c: string; cs: string; limb: string };
/** Koleksiyon: aksesuar sekmesinde süzgeç olarak görünür. */
export type ItemSet = "bigova" | "comu" | "biga" | "ataturk";
export type Item = {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  set?: ItemSet;
  draw: (c: DrawCtx) => Layers;
};

export const SETS: { id: ItemSet; label: string }[] = [
  { id: "bigova", label: "Bigova" },
  { id: "comu", label: "ÇOMÜ" },
  { id: "biga", label: "Biga & Çanakkale" },
  { id: "ataturk", label: "Atatürk" },
];

export const SLOTS: { id: Slot; label: string }[] = [
  { id: "species", label: "Hayvan" },
  { id: "hat", label: "Şapka" },
  { id: "glasses", label: "Gözlük" },
  { id: "neck", label: "Boyun & Rozet" },
  { id: "top", label: "Kıyafet" },
  { id: "hand", label: "El" },
  { id: "back", label: "Sırt" },
  { id: "bg", label: "Arka plan" },
];

export const DEFAULT_AVATAR: AvatarConfig = {
  species: "sp-marti",
  color: "c1",
  pattern: "p1",
  eyes: "e1",
  feature: "f1",
  hat: "hat-none",
  glasses: "glasses-none",
  neck: "neck-none",
  top: "top-none",
  hand: "hand-none",
  back: "back-none",
  bg: "bg-sky",
};
export { EYE_COLORS, PATTERNS };

/* ───────── Kıyafet yardımcıları ───────── */
const armX = (y: number) => 64 - ((y - 150) * 11) / 48;
const sleeve = (c: string, toY: number) => (
  <g fill={c} stroke={c}>
    <circle cx="64" cy="150" r="8.5" stroke="none" />
    <circle cx="136" cy="150" r="8.5" stroke="none" />
    <path d={`M64 150 L${armX(toY)} ${toY}`} strokeWidth="17" fill="none" />
    <path d={`M136 150 L${200 - armX(toY)} ${toY}`} strokeWidth="17" fill="none" />
  </g>
);
const torso = (c: string) => <rect x="68" y="140" width="64" height="62" rx="14" fill={c} />;
const neckV = (c: string) => <path d="M91 140 Q100 157 109 140 Z" fill={c} />;
const fist = (c: DrawCtx, x = 148) => <circle cx={x} cy="203" r="9" fill={c.limb} />;
const pole = (x: number, y1: number, y2: number) => <rect x={x} y={y1} width="3.5" height={y2 - y1} rx="1.7" fill="#8A6A3E" />;
const pack = (fill: string, edge: string, strap: string, extra?: ReactNode): Layers => ({
  back: <rect x="57" y="138" width="86" height="62" rx="18" fill={fill} stroke={edge} strokeWidth="2" />,
  mid: (
    <g>
      <g fill={strap}><rect x="77" y="141" width="9" height="52" rx="3" /><rect x="114" y="141" width="9" height="52" rx="3" /></g>
      {extra}
    </g>
  ),
});

/* ───────── Aksesuar kataloğu ───────── */
const ACCESSORIES: Item[] = [
  /* — Şapka — */
  { id: "hat-none", slot: "hat", name: "Şapkasız", price: 0, draw: () => ({}) },
  {
    id: "hat-beanie", slot: "hat", name: "Bere", price: 60,
    draw: () => ({
      over: (
        <g>
          <path d="M51 78 C47 32 74 18 100 18 C126 18 153 32 149 78Z" fill="#E5533D" />
          <path d="M72 30 V68 M100 22 V68 M128 30 V68" stroke="#B83E2B" strokeWidth="2" opacity=".5" />
          <rect x="48" y="66" width="104" height="17" rx="8.5" fill="#B83E2B" />
          <circle cx="100" cy="17" r="9" fill="#F4F7FA" />
        </g>
      ),
    }),
  },
  {
    id: "hat-cap", slot: "hat", name: "Lacivert kep", price: 70,
    draw: () => ({
      over: (
        <g>
          <path d="M54 74 C52 36 76 26 100 26 C124 26 148 36 146 74Z" fill="#0E3A5B" />
          <path d="M96 72 Q148 62 166 79 Q132 86 96 80Z" fill="#072638" />
          <circle cx="100" cy="27" r="4" fill="#FFB84D" />
        </g>
      ),
    }),
  },
  {
    id: "hat-bucket", slot: "hat", name: "Bucket şapka", price: 80,
    draw: () => ({
      over: (
        <g>
          <ellipse cx="100" cy="69" rx="57" ry="11" fill="#B38A3F" />
          <path d="M60 67 C60 38 78 31 100 31 C122 31 140 38 140 67Z" fill="#C9A15A" />
          <rect x="60" y="57" width="80" height="9" fill="#8A6A2E" />
        </g>
      ),
    }),
  },
  {
    id: "hat-crown", slot: "hat", name: "Altın taç", price: 400,
    draw: () => ({
      over: (
        <g strokeLinejoin="round">
          <path d="M62 56 L68 22 L86 42 L100 16 L114 42 L132 22 L138 56Z" fill="#F6C343" stroke="#C9971F" strokeWidth="2" />
          <rect x="62" y="50" width="76" height="12" rx="3" fill="#E3AE2A" stroke="#C9971F" strokeWidth="2" />
          <circle cx="100" cy="56" r="4" fill="#E5533D" /><circle cx="80" cy="56" r="3" fill="#2CC4B5" /><circle cx="120" cy="56" r="3" fill="#2CC4B5" />
        </g>
      ),
    }),
  },
  {
    id: "hat-straw", slot: "hat", name: "Hasır şapka", price: 70,
    draw: () => ({
      over: (
        <g>
          <ellipse cx="100" cy="68" rx="62" ry="12" fill="#D9B766" />
          <path d="M64 66 C64 40 84 32 100 32 C116 32 136 40 136 66Z" fill="#F0D68E" />
          <rect x="64" y="55" width="72" height="9" fill="#D9486B" />
        </g>
      ),
    }),
  },
  {
    id: "hat-wizard", slot: "hat", name: "Sihirbaz şapkası", price: 120,
    draw: () => ({
      over: (
        <g>
          <ellipse cx="100" cy="70" rx="58" ry="10" fill="#5A3FA8" />
          <path d="M60 70 C72 50 92 22 118 2 C112 26 128 50 140 70Z" fill="#7C5CD6" />
          <path d="M60 70 Q100 80 140 70 V62 Q100 72 60 62Z" fill="#FFB84D" />
          <g fill="#fff"><path d={star5(106, 40, 6)} /><path d={star5(122, 58, 4)} /></g>
        </g>
      ),
    }),
  },
  {
    id: "hat-bigova", slot: "hat", name: "Bigova kasketi", price: 100, set: "bigova",
    draw: () => ({
      over: (
        <g>
          <path d="M52 74 C50 40 76 30 100 30 C124 30 150 40 148 74 C130 66 70 66 52 74Z" fill="#0E3A5B" />
          <path d="M62 72 Q100 60 138 72 Q150 82 130 84 Q100 76 70 84 Q50 82 62 72Z" fill="#072638" />
          <circle cx="100" cy="31" r="3.6" fill="#FFB84D" />
          <path d="M86 50 q7 -8 14 0 t14 0" stroke="#FFB84D" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "hat-grad", slot: "hat", name: "ÇOMÜ mezuniyet kepi", price: 220, set: "comu",
    draw: () => ({
      over: (
        <g strokeLinejoin="round">
          <path d="M68 52 V72 Q100 86 132 72 V52 L100 64Z" fill="#2B3140" />
          <path d="M42 46 L100 22 L158 46 L100 70Z" fill="#1B1F2A" />
          <circle cx="100" cy="46" r="3.4" fill="#FFB84D" />
          <path d="M100 46 L146 49 V82" stroke="#FFB84D" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="142.5" y="80" width="7" height="13" rx="2.4" fill="#FFB84D" />
        </g>
      ),
    }),
  },
  {
    id: "hat-sailor", slot: "hat", name: "Denizci şapkası", price: 90, set: "biga",
    draw: () => ({
      over: (
        <g>
          <path d="M54 72 C50 34 150 34 146 72Z" fill="#fff" stroke="#D5DEE5" strokeWidth="1.5" />
          <ellipse cx="100" cy="72" rx="52" ry="10" fill="#F4F7FA" stroke="#D5DEE5" strokeWidth="1.5" />
          <path d="M52 66 Q100 80 148 66 V72 Q100 86 52 72Z" fill="#0E3A5B" />
          <circle cx="100" cy="36" r="4" fill="#E5533D" />
        </g>
      ),
    }),
  },
  {
    id: "hat-troy", slot: "hat", name: "Truva miğferi", price: 180, set: "biga",
    draw: () => ({
      over: (
        <g strokeLinejoin="round">
          <path d="M88 30 C92 6 122 2 138 20 C122 16 112 22 110 32Z" fill="#C0392B" />
          <path d="M56 78 C52 38 76 26 100 26 C124 26 148 38 144 78Z" fill="#C58A3A" stroke="#8A5A1E" strokeWidth="2" />
          <path d="M56 78 L60 106 L73 98 L71 78Z M144 78 L140 106 L127 98 L129 78Z" fill="#B07A30" stroke="#8A5A1E" strokeWidth="2" />
          <path d="M96 58 H104 V90 H96Z" fill="#B07A30" stroke="#8A5A1E" strokeWidth="1.5" />
          <path d="M60 58 Q100 50 140 58" stroke="#E3B261" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "hat-olive", slot: "hat", name: "Zeytin dalı tacı", price: 130, set: "biga",
    draw: () => ({
      over: (
        <g>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (200 + i * 12.7) * (Math.PI / 180);
            const x = 100 + 51 * Math.cos(a);
            const y = 86 + 51 * Math.sin(a);
            return <ellipse key={i} cx={x} cy={y} rx="10" ry="4.6" transform={`rotate(${200 + i * 12.7 + 90} ${x} ${y})`} fill={i % 2 ? "#4F8A3C" : "#6BA84F"} />;
          })}
          <g fill="#2B2F36"><circle cx="64" cy="52" r="3" /><circle cx="136" cy="52" r="3" /></g>
        </g>
      ),
    }),
  },
  {
    id: "hat-kalpak", slot: "hat", name: "Kurtuluş kalpağı", price: 160, set: "ataturk",
    draw: () => ({
      over: (
        <g>
          <path d="M56 74 C52 36 70 24 100 24 C130 24 148 36 144 74 C126 66 74 66 56 74Z" fill="#3A3A40" />
          <g fill="#4D4D56">
            {[[70, 50, 7], [86, 38, 7], [104, 34, 7], [120, 40, 7], [134, 54, 7], [78, 62, 6], [98, 52, 6], [122, 62, 6]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} />)}
          </g>
          <path d="M56 74 C74 66 126 66 144 74 L142 82 C124 74 76 74 58 82Z" fill="#2A2A30" />
        </g>
      ),
    }),
  },

  /* — Gözlük — */
  { id: "glasses-none", slot: "glasses", name: "Gözlüksüz", price: 0, draw: () => ({}) },
  {
    id: "glasses-round", slot: "glasses", name: "Yuvarlak gözlük", price: 50,
    draw: () => ({
      over: (
        <g stroke="#1C2A3A" strokeWidth="2.6" fill="#fff" fillOpacity=".18">
          <circle cx="84" cy="89" r="12" /><circle cx="116" cy="89" r="12" />
          <path d="M96 88 H104 M72 87 L58 85 M128 87 L142 85" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "glasses-sun", slot: "glasses", name: "Güneş gözlüğü", price: 80,
    draw: () => ({
      over: (
        <g>
          <rect x="71" y="80" width="26" height="19" rx="8" fill="#151A22" />
          <rect x="103" y="80" width="26" height="19" rx="8" fill="#151A22" />
          <path d="M97 86 H103 M71 86 L58 84 M129 86 L142 84" stroke="#151A22" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M76 85 L82 85 M108 85 L114 85" stroke="#fff" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "glasses-heart", slot: "glasses", name: "Kalp gözlük", price: 100,
    draw: () => {
      const h = (cx: number, cy: number, s: number) =>
        `M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.1} ${cx - s * 0.9} ${cy - s * 1.2} ${cx} ${cy - s * 0.3} C${cx + s * 0.9} ${cy - s * 1.2} ${cx + s * 1.6} ${cy - s * 0.1} ${cx} ${cy + s * 0.9}Z`;
      return {
        over: (
          <g>
            <path d={h(84, 90, 11)} fill="#FF6B8A" fillOpacity=".82" stroke="#B02A4D" strokeWidth="2" strokeLinejoin="round" />
            <path d={h(116, 90, 11)} fill="#FF6B8A" fillOpacity=".82" stroke="#B02A4D" strokeWidth="2" strokeLinejoin="round" />
            <path d="M96 87 H104 M69 86 L58 84 M131 86 L142 84" stroke="#B02A4D" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        ),
      };
    },
  },
  {
    id: "glasses-star", slot: "glasses", name: "Yıldız gözlük", price: 90,
    draw: () => ({
      over: (
        <g strokeLinejoin="round">
          <path d={star5(84, 90, 15)} fill="#FFC94D" fillOpacity=".85" stroke="#C9971F" strokeWidth="2" />
          <path d={star5(116, 90, 15)} fill="#FFC94D" fillOpacity=".85" stroke="#C9971F" strokeWidth="2" />
          <path d="M97 88 H103 M69 86 L58 84 M131 86 L142 84" stroke="#C9971F" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "glasses-monocle", slot: "glasses", name: "Tek gözlük", price: 110,
    draw: () => ({
      over: (
        <g fill="none" stroke="#C9971F" strokeLinecap="round">
          <circle cx="116" cy="89" r="13" strokeWidth="3" fill="#fff" fillOpacity=".18" />
          <path d="M127 99 Q142 130 130 156" strokeWidth="1.8" />
        </g>
      ),
    }),
  },
  {
    id: "glasses-3d", slot: "glasses", name: "3D gözlük", price: 70,
    draw: () => ({
      over: (
        <g>
          <rect x="70" y="80" width="27" height="20" rx="4" fill="#E5533D" fillOpacity=".65" stroke="#1C2A3A" strokeWidth="2.4" />
          <rect x="103" y="80" width="27" height="20" rx="4" fill="#2CC4E0" fillOpacity=".65" stroke="#1C2A3A" strokeWidth="2.4" />
          <path d="M97 88 H103 M70 86 L58 84 M130 86 L142 84" stroke="#1C2A3A" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      ),
    }),
  },

  /* — Boyun & rozet — */
  { id: "neck-none", slot: "neck", name: "Boyunsuz", price: 0, draw: () => ({}) },
  {
    id: "neck-scarf", slot: "neck", name: "Atkı", price: 80,
    draw: () => ({
      mid: (
        <g>
          <path d="M108 150 H126 L128 190 Q117 195 108 190Z" fill="#D2462F" />
          <path d="M108 168 H127 M108 178 H127" stroke="#F4F7FA" strokeWidth="3" />
          <path d="M76 137 Q100 158 124 137 L128 152 Q100 172 72 152Z" fill="#E5533D" />
        </g>
      ),
    }),
  },
  {
    id: "neck-bow", slot: "neck", name: "Papyon", price: 60,
    draw: () => ({
      mid: (
        <g fill="#D9486B" stroke="#A8304E" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M100 150 L76 138 V162Z" /><path d="M100 150 L124 138 V162Z" />
          <rect x="94" y="144" width="12" height="12" rx="4" />
        </g>
      ),
    }),
  },
  {
    id: "neck-tie", slot: "neck", name: "Kravat", price: 70,
    draw: () => ({
      mid: (
        <g strokeLinejoin="round">
          <path d="M94 142 H106 L103 153 H97Z" fill="#0E3A5B" />
          <path d="M97 153 H103 L108 192 L100 200 L92 192Z" fill="#0E3A5B" />
          <path d="M95 170 L104 166 M94 180 L106 175" stroke="#FFB84D" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "neck-bell", slot: "neck", name: "Zilli tasma", price: 40,
    draw: () => ({
      mid: (
        <g>
          <path d="M72 140 Q100 160 128 140 L128 150 Q100 170 72 150Z" fill="#E5533D" />
          <circle cx="100" cy="164" r="7.5" fill="#FFC94D" stroke="#C9971F" strokeWidth="1.8" />
          <path d="M96 166 H104" stroke="#C9971F" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "neck-coin", slot: "neck", name: "Bigcoin kolyesi", price: 120, set: "bigova",
    draw: () => ({
      mid: (
        <g>
          <path d="M76 140 Q100 178 124 140" stroke="#E3AE2A" strokeWidth="2.4" fill="none" />
          <circle cx="100" cy="167" r="12" fill="#FFC94D" stroke="#E3AE2A" strokeWidth="2" />
          <text x="100" y="172.4" textAnchor="middle" fontSize="14" fontWeight="800" fill="#8A5A00" fontFamily="'Baloo 2', sans-serif">B</text>
        </g>
      ),
    }),
  },
  {
    id: "neck-bigova", slot: "neck", name: "Bigova rozeti", price: 70, set: "bigova",
    draw: () => ({
      mid: (
        <g>
          <circle cx="116" cy="160" r="12" fill="#0E3A5B" stroke="#FFB84D" strokeWidth="2" />
          <path d="M108 160 q4 -6 8 0 t8 0" stroke="#FFB84D" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M109 166 q3.5 -4 7 0 t7 0" stroke="#fff" strokeOpacity=".7" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "neck-marti", slot: "neck", name: "Martı rozeti", price: 60, set: "bigova",
    draw: () => ({
      mid: (
        <g>
          <circle cx="118" cy="160" r="9" fill="#fff" stroke="#0E3A5B" strokeWidth="2" />
          <path d="M112.5 160 q3 -5 5.5 0 q2.5 -5 5.5 0" stroke="#0E3A5B" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "neck-comu", slot: "neck", name: "ÇOMÜ yaka kartı", price: 90, set: "comu",
    draw: () => ({
      mid: (
        <g>
          <path d="M80 138 L100 170 L120 138" stroke="#1F3C88" strokeWidth="4" fill="none" strokeLinejoin="round" />
          <rect x="87" y="168" width="26" height="32" rx="4" fill="#fff" stroke="#1F3C88" strokeWidth="2" />
          <rect x="87" y="168" width="26" height="9" rx="4" fill="#1F3C88" />
          <text x="100" y="175" textAnchor="middle" fontSize="6.4" fontWeight="800" fill="#fff" fontFamily="'Baloo 2', sans-serif">ÇOMÜ</text>
          <circle cx="100" cy="185" r="4.5" fill="#CFE0F2" /><path d="M92 196 H108" stroke="#9DB7C4" strokeWidth="2" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "neck-18mart", slot: "neck", name: "18 Mart rozeti", price: 110, set: "comu",
    draw: () => ({
      mid: (
        <g>
          <circle cx="100" cy="166" r="14" fill="#C0392B" stroke="#FFC94D" strokeWidth="2.4" />
          <text x="100" y="168" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" fontFamily="'Baloo 2', sans-serif">18</text>
          <text x="100" y="175" textAnchor="middle" fontSize="5.4" fontWeight="800" fill="#FFE9A8" fontFamily="'Baloo 2', sans-serif">MART</text>
        </g>
      ),
    }),
  },
  {
    id: "neck-ataturk", slot: "neck", name: "Atatürk imza rozeti", price: 150, set: "ataturk",
    draw: () => ({
      mid: (
        <g>
          <rect x="74" y="153" width="52" height="24" rx="12" fill="#fff" stroke="#C0392B" strokeWidth="2.4" />
          <text x="100" y="170" textAnchor="middle" fontSize="14" fontStyle="italic" fontWeight="700" fill="#0E3A5B" fontFamily="'Brush Script MT','Segoe Script','Snell Roundhand',cursive">Atatürk</text>
        </g>
      ),
    }),
  },
  {
    id: "neck-medal", slot: "neck", name: "Cumhuriyet madalyası", price: 200, set: "ataturk",
    draw: () => ({
      mid: (
        <g strokeLinejoin="round">
          <path d="M86 138 L100 168 L114 138 L108 136 L100 150 L92 136Z" fill="#C0392B" stroke="#8F271D" strokeWidth="1.2" />
          <circle cx="100" cy="177" r="13" fill="#FFC94D" stroke="#C9971F" strokeWidth="2.4" />
          <path d={star5(100, 177, 8)} fill="#C0392B" />
        </g>
      ),
    }),
  },

  /* — Kıyafet — */
  { id: "top-none", slot: "top", name: "Kıyafetsiz", price: 0, draw: () => ({}) },
  {
    id: "top-tee", slot: "top", name: "Beyaz tişört", price: 0,
    draw: (c) => ({ mid: <g>{sleeve("#F4F7FA", 172)}{torso("#F4F7FA")}{neckV(c.cs)}</g> }),
  },
  {
    id: "top-bigova", slot: "top", name: "Bigova tişörtü", price: 80, set: "bigova",
    draw: (c) => ({
      mid: (
        <g>
          {sleeve("#0E3A5B", 172)}{torso("#0E3A5B")}{neckV(c.cs)}
          <path d="M82 175 q6 -8 12 0 t12 0 t12 0" stroke="#FFB84D" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M86 184 q5 -6 10 0 t10 0 t10 0" stroke="#fff" strokeOpacity=".7" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "top-comu", slot: "top", name: "ÇOMÜ sweatshirt", price: 150, set: "comu",
    draw: (c) => ({
      mid: (
        <g>
          {sleeve("#1F3C88", 196)}{torso("#1F3C88")}{neckV(c.cs)}
          <path d="M80 184 H120 L124 200 H76Z" fill="#183070" />
          <text x="100" y="176" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="'Baloo 2', sans-serif">ÇOMÜ</text>
          <path d="M84 181 H116" stroke="#FFB84D" strokeWidth="2" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "top-jersey", slot: "top", name: "Turkuaz forma", price: 140,
    draw: (c) => ({
      mid: (
        <g>
          {sleeve("#2CC4B5", 170)}{torso("#2CC4B5")}
          <path d="M89 140 Q100 160 111 140" stroke="#1B8F84" strokeWidth="5" fill={c.cs} />
          <text x="100" y="188" textAnchor="middle" fontSize="27" fontWeight="800" fill="#fff" fontFamily="'Baloo 2', sans-serif">10</text>
        </g>
      ),
    }),
  },
  {
    id: "top-cumhuriyet", slot: "top", name: "Kırmızı forma", price: 130, set: "ataturk",
    draw: (c) => ({
      mid: (
        <g>
          {sleeve("#D9322B", 172)}{torso("#D9322B")}{neckV(c.cs)}
          <rect x="68" y="178" width="64" height="9" fill="#fff" opacity=".92" />
          <circle cx="86" cy="162" r="5" fill="#fff" /><circle cx="88" cy="162" r="4" fill="#D9322B" />
          <path d={star5(95, 162, 2.8)} fill="#fff" />
        </g>
      ),
    }),
  },
  {
    id: "top-stripe", slot: "top", name: "Çizgili sweat", price: 100,
    draw: (c) => ({
      mid: (
        <g>
          <clipPath id={`${c.uid}ts`}><rect x="68" y="140" width="64" height="62" rx="14" /></clipPath>
          {sleeve("#F4F7FA", 196)}{torso("#F4F7FA")}
          <g clipPath={`url(#${c.uid}ts)`} fill="#0E3A5B">
            {[150, 164, 178, 192].map((y) => <rect key={y} x="68" y={y} width="64" height="6" />)}
          </g>
          {neckV(c.cs)}
          <path d="M64 150 L53 196 M136 150 L147 196" stroke="#0E3A5B" strokeWidth="17" strokeDasharray="6 10" fill="none" opacity=".9" />
        </g>
      ),
    }),
  },
  {
    id: "top-hoodie", slot: "top", name: "Kırmızı hoodie", price: 120,
    draw: () => ({
      mid: (
        <g>
          {sleeve("#E5533D", 196)}{torso("#E5533D")}
          <path d="M76 142 Q100 168 124 142 L118 139 Q100 154 82 139Z" fill="#B83E2B" />
          <path d="M80 184 H120 L124 200 H76Z" fill="#D2462F" />
          <path d="M95 154 V170 M105 154 V170" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "top-rain", slot: "top", name: "Sarı yağmurluk", price: 150,
    draw: () => ({
      mid: (
        <g>
          {sleeve("#F6C343", 196)}{torso("#F6C343")}
          <path d="M86 139 L100 160 L114 139 L121 146 L100 168 L79 146Z" fill="#E3AE2A" />
          {[172, 182, 192].map((y) => <circle key={y} cx="100" cy={y} r="2.6" fill="#B8861A" />)}
        </g>
      ),
    }),
  },
  {
    id: "top-blazer", slot: "top", name: "Ceket", price: 200,
    draw: () => ({
      mid: (
        <g>
          {sleeve("#2B3A55", 196)}{torso("#2B3A55")}
          <path d="M90 140 L100 180 L110 140Z" fill="#F4F7FA" />
          <path d="M97 150 H103 L105 177 L100 185 L95 177Z" fill="#E5533D" />
          <path d="M90 140 L82 172 L98 182 M110 140 L118 172 L102 182" stroke="#1B263B" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
        </g>
      ),
    }),
  },
  {
    id: "top-sailor", slot: "top", name: "Gemici bluzu", price: 110, set: "biga",
    draw: () => ({
      mid: (
        <g>
          {sleeve("#F4F7FA", 180)}{torso("#F4F7FA")}
          <path d="M70 152 H130 M69 164 H131 M69 176 H131 M70 188 H130" stroke="#0E3A5B" strokeWidth="4" />
          <path d="M82 140 L100 164 L118 140 L112 138 L100 150 L88 138Z" fill="#0E3A5B" />
          <path d="M96 152 H104 L102 168 H98Z" fill="#E5533D" />
        </g>
      ),
    }),
  },
  {
    id: "top-vest", slot: "top", name: "Kazdağı yeleği", price: 110, set: "biga",
    draw: () => ({
      mid: (
        <g>
          {sleeve("#E9DFC8", 180)}{torso("#6B8F4E")}
          <path d="M100 140 V202" stroke="#4F6E38" strokeWidth="2.4" />
          <rect x="74" y="172" width="20" height="14" rx="3" fill="#587A3E" /><rect x="106" y="172" width="20" height="14" rx="3" fill="#587A3E" />
          <rect x="68" y="192" width="64" height="5" fill="#F29A3C" />
        </g>
      ),
    }),
  },

  /* — El — */
  { id: "hand-none", slot: "hand", name: "Elleri boş", price: 0, draw: () => ({}) },
  {
    id: "hand-flag", slot: "hand", name: "Türk bayrağı", price: 90, set: "ataturk",
    draw: (c) => ({
      over: (
        <g>
          {pole(147, 96, 228)}
          <path d="M150.5 100 Q164 96 172 100 T194 100 V130 Q182 134 172 130 T150.5 130Z" fill="#E30A17" />
          <circle cx="165" cy="115" r="7" fill="#fff" /><circle cx="167.4" cy="115" r="5.7" fill="#E30A17" />
          <path d={star5(175, 115, 3.8)} fill="#fff" />
          {fist(c)}
        </g>
      ),
    }),
  },
  {
    id: "hand-scroll", slot: "hand", name: "Gençliğe Hitabe", price: 120, set: "ataturk",
    draw: (c) => ({
      over: (
        <g>
          <rect x="140" y="170" width="28" height="44" rx="4" fill="#F6E7C1" stroke="#C9A15A" strokeWidth="2" />
          <ellipse cx="154" cy="170" rx="15" ry="4.5" fill="#E8D4A0" stroke="#C9A15A" strokeWidth="2" />
          <ellipse cx="154" cy="214" rx="15" ry="4.5" fill="#E8D4A0" stroke="#C9A15A" strokeWidth="2" />
          <path d="M146 182 H162 M146 189 H162 M146 196 H158" stroke="#8A6A3E" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M148 206 H160" stroke="#C0392B" strokeWidth="2.4" strokeLinecap="round" />
          {fist(c, 146)}
        </g>
      ),
    }),
  },
  {
    id: "hand-bigova-flag", slot: "hand", name: "Bigova flaması", price: 70, set: "bigova",
    draw: (c) => ({
      over: (
        <g>
          {pole(147, 96, 228)}
          <path d="M150.5 100 L194 114 L150.5 128Z" fill="#0E3A5B" strokeLinejoin="round" />
          <path d="M156 114 q4 -5 8 0 t8 0 t8 0" stroke="#FFB84D" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          {fist(c)}
        </g>
      ),
    }),
  },
  {
    id: "hand-simit", slot: "hand", name: "Simit", price: 40,
    draw: (c) => ({
      over: (
        <g>
          <circle cx="158" cy="194" r="15" fill="none" stroke="#D58A2F" strokeWidth="10" />
          <circle cx="158" cy="194" r="15" fill="none" stroke="#E9A94A" strokeWidth="4" strokeDasharray="5 7" />
          <g fill="#FFF1C9"><circle cx="146" cy="190" r="1.3" /><circle cx="152" cy="180" r="1.3" /><circle cx="166" cy="181" r="1.3" /><circle cx="171" cy="196" r="1.3" /><circle cx="160" cy="208" r="1.3" /></g>
          {fist(c)}
        </g>
      ),
    }),
  },
  {
    id: "hand-book", slot: "hand", name: "Ders kitabı", price: 60, set: "comu",
    draw: (c) => ({
      over: (
        <g>
          <rect x="136" y="180" width="38" height="28" rx="3.5" fill="#2CC4B5" stroke="#1B8F84" strokeWidth="2" />
          <rect x="136" y="180" width="7" height="28" rx="3" fill="#1B8F84" />
          <path d="M150 190 H166 M150 196 H162" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="140" y="206" width="32" height="4" rx="2" fill="#F4F7FA" />
          {fist(c, 144)}
        </g>
      ),
    }),
  },
  {
    id: "hand-tea", slot: "hand", name: "Çay bardağı", price: 50,
    draw: (c) => ({
      over: (
        <g>
          <ellipse cx="152" cy="217" rx="14" ry="3.6" fill="#fff" stroke="#C9D6DE" strokeWidth="1.5" />
          <path d="M142 184 H162 Q160 211 152 214 Q144 211 142 184Z" fill="#B5312A" fillOpacity=".92" stroke="#E7EEF2" strokeWidth="2" />
          <path d="M142 184 H162" stroke="#E7EEF2" strokeWidth="3" strokeLinecap="round" />
          <path d="M148 176 q-3 -5 0 -10 M156 176 q-3 -5 0 -10" stroke="#fff" strokeOpacity=".8" strokeWidth="2" fill="none" strokeLinecap="round" />
          {fist(c, 142)}
        </g>
      ),
    }),
  },
  {
    id: "hand-horse", slot: "hand", name: "Truva atı", price: 150, set: "biga",
    draw: (c) => ({
      over: (
        <g fill="#B07A3E" stroke="#7A5126" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M136 194 H168 V210 H136Z" />
          <path d="M162 196 L166 176 L180 168 L186 176 L178 184 L172 196Z" />
          <path d="M139 210 V224 H146 V210 M158 210 V224 H165 V210" />
          <path d="M166 176 L162 168 L170 172Z" fill="#7A5126" />
          <circle cx="178" cy="174" r="1.4" fill="#2B1A0E" stroke="none" />
          <path d="M142 200 H160" stroke="#7A5126" strokeWidth="1.4" fill="none" />
          {fist(c, 142)}
        </g>
      ),
    }),
  },
  {
    id: "hand-amphora", slot: "hand", name: "Parion amforası", price: 130, set: "biga",
    draw: (c) => ({
      over: (
        <g strokeLinejoin="round">
          <path d="M146 176 H162 C160 186 172 196 170 208 C168 222 144 222 142 208 C140 196 148 186 146 176Z" fill="#C86A3A" stroke="#8F4524" strokeWidth="2" />
          <path d="M141 196 Q170 202 171 196 M142 208 Q156 214 170 208" stroke="#2B1A0E" strokeWidth="3" fill="none" />
          <path d="M146 180 Q138 184 144 196 M162 180 Q172 184 166 196" stroke="#8F4524" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="154" cy="176" rx="9" ry="3" fill="#8F4524" />
          {fist(c, 144)}
        </g>
      ),
    }),
  },
  {
    id: "hand-cheese", slot: "hand", name: "Ezine peyniri", price: 70, set: "biga",
    draw: (c) => ({
      over: (
        <g strokeLinejoin="round" stroke="#D9A82E" strokeWidth="1.6">
          <path d="M138 200 L178 190 V208 L138 216Z" fill="#FFD76A" />
          <path d="M138 200 L158 186 L178 190Z" fill="#FFEBA8" />
          <g fill="#F2BE48" stroke="none"><circle cx="152" cy="208" r="2.6" /><circle cx="166" cy="203" r="2.2" /><circle cx="160" cy="196" r="1.8" /></g>
          {fist(c, 142)}
        </g>
      ),
    }),
  },
  {
    id: "hand-shield", slot: "hand", name: "Granikos kalkanı", price: 140, set: "biga",
    draw: (c) => ({
      over: (
        <g>
          <circle cx="44" cy="196" r="24" fill="#C58A3A" stroke="#8A5A1E" strokeWidth="2.6" />
          <circle cx="44" cy="196" r="16" fill="none" stroke="#E3B261" strokeWidth="2.4" />
          <path d="M44 172 V220 M20 196 H68" stroke="#8A5A1E" strokeWidth="1.8" opacity=".55" />
          <circle cx="44" cy="196" r="5" fill="#E3B261" stroke="#8A5A1E" strokeWidth="1.6" />
          <circle cx="52" cy="203" r="9" fill={c.limb} />
        </g>
      ),
    }),
  },
  {
    id: "hand-balloon", slot: "hand", name: "Balon", price: 50,
    draw: (c) => ({
      over: (
        <g>
          <path d="M148 203 Q153 168 160 140" stroke="#8895A5" strokeWidth="1.6" fill="none" />
          <ellipse cx="162" cy="124" rx="16" ry="19" fill="#E5533D" />
          <path d="M162 143 l-3.5 5 h7Z" fill="#B83E2B" />
          <ellipse cx="156" cy="116" rx="4" ry="6.5" transform="rotate(20 156 116)" fill="#fff" opacity=".4" />
          {fist(c)}
        </g>
      ),
    }),
  },

  /* — Sırt — */
  { id: "back-none", slot: "back", name: "Sırtsız", price: 0, draw: () => ({}) },
  { id: "back-pack", slot: "back", name: "Sırt çantası", price: 120, draw: () => pack("#F6C343", "#C9971F", "#C9971F") },
  {
    id: "back-comu", slot: "back", name: "ÇOMÜ çantası", price: 130, set: "comu",
    draw: () => pack("#1F3C88", "#14285F", "#14285F", <rect x="91" y="182" width="18" height="10" rx="3" fill="#FFB84D" />),
  },
  {
    id: "back-cape", slot: "back", name: "Kırmızı pelerin", price: 160,
    draw: () => ({
      back: (
        <g>
          <path d="M62 142 H138 L156 240 Q100 260 44 240Z" fill="#D9322B" />
          <path d="M100 150 V250" stroke="#B02720" strokeWidth="2" opacity=".6" />
        </g>
      ),
      mid: (
        <g>
          <path d="M70 143 Q100 157 130 143" stroke="#FFC94D" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="74" cy="144" r="4.2" fill="#FFC94D" /><circle cx="126" cy="144" r="4.2" fill="#FFC94D" />
        </g>
      ),
    }),
  },
  {
    id: "back-wings-marti", slot: "back", name: "Martı kanatları", price: 220, set: "bigova",
    draw: () => ({
      back: mir(
        <g strokeLinejoin="round">
          <path d="M72 150 C36 132 8 150 4 192 C24 180 38 184 48 194 C52 178 62 170 74 172Z" fill="#fff" stroke="#C9D6DE" strokeWidth="2" />
          <path d="M4 192 L18 186 L14 202Z M20 186 L34 184 L28 198Z" fill="#2B3A55" />
        </g>,
      ),
    }),
  },
  {
    id: "back-wings-butterfly", slot: "back", name: "Kelebek kanatları", price: 200,
    draw: () => ({
      back: mir(
        <g>
          <path d="M70 146 C30 108 8 132 24 164 C34 180 58 174 70 162Z" fill="#E87AA8" />
          <path d="M70 166 C46 178 38 206 56 208 C68 208 72 188 72 176Z" fill="#8E74E8" />
          <g fill="#fff" opacity=".75"><circle cx="38" cy="144" r="6" /><circle cx="54" cy="194" r="4" /></g>
        </g>,
      ),
    }),
  },
  {
    id: "back-jet", slot: "back", name: "Jetpack", price: 260,
    draw: () => ({
      back: (
        <g>
          <rect x="62" y="140" width="28" height="58" rx="11" fill="#8895A5" stroke="#5F6C7C" strokeWidth="2" />
          <rect x="110" y="140" width="28" height="58" rx="11" fill="#8895A5" stroke="#5F6C7C" strokeWidth="2" />
          <path d="M66 198 q10 30 20 0Z M114 198 q10 30 20 0Z" fill="#FFB347" />
          <path d="M71 198 q5 14 10 0Z M119 198 q5 14 10 0Z" fill="#FFE08A" />
          <rect x="62" y="150" width="28" height="7" fill="#E5533D" /><rect x="110" y="150" width="28" height="7" fill="#E5533D" />
        </g>
      ),
      mid: <g fill="#5F6C7C"><rect x="77" y="141" width="8" height="46" rx="3" /><rect x="115" y="141" width="8" height="46" rx="3" /></g>,
    }),
  },

  /* — Arka plan — */
  {
    id: "bg-sky", slot: "bg", name: "Açık gökyüzü", price: 0,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#BFE6F2" b="#F3F8FA" />{bgRect(`${c.uid}bg`)}
          <g fill="#fff" opacity=".85"><ellipse cx="52" cy="52" rx="24" ry="9" /><ellipse cx="148" cy="86" rx="20" ry="7" /></g>
        </g>
      ),
    }),
  },
  {
    id: "bg-sea", slot: "bg", name: "Ege denizi", price: 40,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#7FD8CE" b="#0E3A5B" />{bgRect(`${c.uid}bg`)}
          <path d="M0 214 Q25 200 50 214 T100 214 T150 214 T200 214 V270 H0Z" fill="#fff" opacity=".13" />
          <path d="M0 238 Q25 226 50 238 T100 238 T150 238 T200 238 V270 H0Z" fill="#fff" opacity=".12" />
        </g>
      ),
    }),
  },
  {
    id: "bg-sunset", slot: "bg", name: "Gün batımı", price: 40,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#FFB347" b="#D9486B" />{bgRect(`${c.uid}bg`)}
          <circle cx="150" cy="70" r="24" fill="#FFE08A" opacity=".92" />
        </g>
      ),
    }),
  },
  {
    id: "bg-forest", slot: "bg", name: "Orman", price: 40,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#CDE8C8" b="#4FA36B" />{bgRect(`${c.uid}bg`)}
          <g fill="#2E7D4F" opacity=".75">
            <path d="M14 232 L36 160 L58 232Z" /><path d="M150 232 L172 150 L196 232Z" /><path d="M118 232 L134 184 L152 232Z" />
          </g>
        </g>
      ),
    }),
  },
  {
    id: "bg-lav", slot: "bg", name: "Lavanta", price: 40,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#DDD2F7" b="#8E74E8" />{bgRect(`${c.uid}bg`)}
          <g fill="#fff" opacity=".28"><circle cx="40" cy="60" r="22" /><circle cx="156" cy="110" r="30" /><circle cx="60" cy="204" r="16" /></g>
        </g>
      ),
    }),
  },
  {
    id: "bg-night", slot: "bg", name: "Yıldızlı gece", price: 60,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#0A1520" b="#2A5F8C" />{bgRect(`${c.uid}bg`)}
          <circle cx="150" cy="54" r="17" fill="#FFE9A8" />
          <g fill="#fff">
            {[[32, 40, 2], [64, 84, 1.5], [96, 30, 1.8], [30, 130, 1.4], [170, 140, 1.6], [120, 70, 1.3]].map(([x, y, r]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r={r} />
            ))}
          </g>
        </g>
      ),
    }),
  },
  {
    id: "bg-gold", slot: "bg", name: "Altın ışıltı", price: 300,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#FFF1C2" b="#E9A92B" />{bgRect(`${c.uid}bg`)}
          <g fill="#fff" opacity=".9">
            <path d={sparkle(40, 54, 12)} /><path d={sparkle(160, 96, 16)} /><path d={sparkle(52, 186, 9)} /><path d={sparkle(150, 208, 11)} />
          </g>
        </g>
      ),
    }),
  },
  {
    id: "bg-bigova", slot: "bg", name: "Bigova dalgaları", price: 60, set: "bigova",
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#145282" b="#0E3A5B" />{bgRect(`${c.uid}bg`)}
          <g stroke="#FFB84D" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".85">
            <path d="M0 214 Q25 198 50 214 T100 214 T150 214 T200 214" /><path d="M0 238 Q25 224 50 238 T100 238 T150 238 T200 238" opacity=".6" />
          </g>
          <g stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8">
            <path d="M28 52 q7 -9 14 0 q7 -9 14 0" /><path d="M140 82 q6 -8 12 0 q6 -8 12 0" /><path d="M64 110 q5 -7 10 0 q5 -7 10 0" opacity=".6" />
          </g>
        </g>
      ),
    }),
  },
  {
    id: "bg-comu", slot: "bg", name: "ÇOMÜ kampüsü", price: 90, set: "comu",
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#CFE6F5" b="#F3F8FA" />{bgRect(`${c.uid}bg`)}
          <path d="M0 218 Q50 204 100 214 T200 208 V270 H0Z" fill="#7DBA6A" />
          <g>
            <path d="M30 150 L100 124 L170 150Z" fill="#B8523A" />
            <rect x="36" y="150" width="128" height="68" fill="#F2EBDD" />
            <g fill="#CFE0F2">{[48, 70, 92, 114, 136].map((x) => <rect key={x} x={x} y="164" width="12" height="18" rx="2" />)}</g>
            <rect x="92" y="190" width="16" height="28" rx="3" fill="#1F3C88" />
            <rect x="99" y="96" width="2.6" height="30" fill="#8A6A3E" /><path d="M101.6 98 H122 V108 H101.6Z" fill="#1F3C88" />
          </g>
          <circle cx="40" cy="60" r="16" fill="#fff" opacity=".8" /><circle cx="170" cy="48" r="12" fill="#fff" opacity=".7" />
        </g>
      ),
    }),
  },
  {
    id: "bg-granikos", slot: "bg", name: "Biga Ovası", price: 60, set: "biga",
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#BFE6F2" b="#E9F4D8" />{bgRect(`${c.uid}bg`)}
          <circle cx="152" cy="62" r="20" fill="#FFE9A8" />
          <path d="M0 196 Q50 164 100 188 T200 178 V270 H0Z" fill="#8CC474" />
          <path d="M0 226 Q60 204 120 222 T200 214 V270 H0Z" fill="#6DAE5C" />
          <path d="M70 270 Q92 236 124 222 Q148 212 176 204" stroke="#6EC3E8" strokeWidth="12" fill="none" strokeLinecap="round" opacity=".9" />
          <g fill="#E5533D">{[[24, 240], [44, 252], [150, 246], [172, 236], [18, 220], [182, 258]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3.2" />)}</g>
        </g>
      ),
    }),
  },
  {
    id: "bg-kordon", slot: "bg", name: "Çanakkale kordonu", price: 80, set: "biga",
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#FFB347" b="#C95A7A" />{bgRect(`${c.uid}bg`)}
          <circle cx="60" cy="108" r="22" fill="#FFE08A" opacity=".9" />
          <path d="M0 176 H200 V270 H0Z" fill="#2F5E8C" opacity=".85" />
          <path d="M0 196 Q25 188 50 196 T100 196 T150 196 T200 196" stroke="#fff" strokeOpacity=".25" strokeWidth="3" fill="none" />
          <g fill="#3A2A28">
            <path d="M120 176 V138 H158 V176Z" /><path d="M150 140 L156 112 L174 104 L182 114 L170 124 L162 140Z" /><path d="M124 176 V196 H132 V176 M144 176 V196 H152 V176Z" />
          </g>
          <path d="M0 176 H200" stroke="#3A2A28" strokeWidth="4" />
        </g>
      ),
    }),
  },
  {
    id: "bg-bridge", slot: "bg", name: "1915 Çanakkale Köprüsü", price: 100, set: "biga",
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#FFC58A" b="#4A5E9B" />{bgRect(`${c.uid}bg`)}
          <path d="M0 214 H200 V270 H0Z" fill="#2B3F73" opacity=".9" />
          <rect x="0" y="198" width="200" height="6" fill="#E9EEF3" />
          <g fill="#D9322B"><rect x="38" y="64" width="9" height="140" /><rect x="153" y="64" width="9" height="140" /></g>
          <g fill="#fff"><rect x="38" y="90" width="9" height="8" /><rect x="153" y="90" width="9" height="8" /><rect x="38" y="116" width="9" height="8" /><rect x="153" y="116" width="9" height="8" /></g>
          <g stroke="#E9EEF3" strokeWidth="2.4" fill="none">
            <path d="M42 68 Q100 190 158 68" /><path d="M0 196 Q20 150 42 68 M200 196 Q180 150 158 68" />
          </g>
          <g stroke="#E9EEF3" strokeWidth="1" opacity=".7">{[58, 74, 90, 110, 130, 146].map((x) => <path key={x} d={`M${x} 198 V${x < 100 ? 120 + (100 - x) * 0.2 : 120 + (x - 100) * 0.2}`} />)}</g>
        </g>
      ),
    }),
  },
  {
    id: "bg-anitkabir", slot: "bg", name: "Anıtkabir", price: 120, set: "ataturk",
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#F6E7C8" b="#EEF4F7" />{bgRect(`${c.uid}bg`)}
          <path d="M0 226 H200 V270 H0Z" fill="#B9AE98" />
          <rect x="22" y="196" width="156" height="32" fill="#D8C9A8" />
          <rect x="16" y="222" width="168" height="8" fill="#C4B590" />
          <rect x="30" y="140" width="140" height="10" fill="#CDBE9C" />
          <rect x="34" y="150" width="132" height="48" fill="#E3D6B8" />
          <g fill="#CDBE9C">{[40, 60, 80, 100, 120, 140, 158].map((x) => <rect key={x} x={x} y="150" width="7" height="48" />)}</g>
          <rect x="70" y="100" width="60" height="40" fill="#D8C9A8" /><rect x="64" y="94" width="72" height="8" fill="#C4B590" />
          <rect x="99" y="58" width="2.8" height="38" fill="#8A6A3E" /><path d="M101.8 60 H124 V72 H101.8Z" fill="#E30A17" />
        </g>
      ),
    }),
  },
  {
    id: "bg-bozca", slot: "bg", name: "Bozcaada bağları", price: 70, set: "biga",
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#FFD9A0" b="#E98F6B" />{bgRect(`${c.uid}bg`)}
          <circle cx="150" cy="80" r="22" fill="#FFF1C2" opacity=".9" />
          <g fill="#7A5A44"><rect x="26" y="150" width="46" height="34" /><path d="M22 150 H76 V142 H68 V136 H60 V142 H52 V136 H44 V142 H36 V136 H28 V142 H22Z" /></g>
          <path d="M0 190 Q60 168 120 186 T200 176 V270 H0Z" fill="#8A9E4E" />
          <g stroke="#5E7A38" strokeWidth="3" opacity=".8" fill="none">
            <path d="M-10 216 Q60 196 210 206" /><path d="M-10 234 Q60 214 210 224" /><path d="M-10 252 Q60 232 210 242" />
          </g>
          <g fill="#7C3F8F">{[[30, 205], [64, 200], [110, 200], [152, 204], [40, 224], [90, 218], [130, 222], [172, 224]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="4" />)}</g>
        </g>
      ),
    }),
  },
  {
    id: "bg-kazdagi", slot: "bg", name: "Kazdağları", price: 70, set: "biga",
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#CFE3EE" b="#8FB9A8" />{bgRect(`${c.uid}bg`)}
          <path d="M0 170 L46 104 L84 150 L124 88 L170 156 L200 128 V270 H0Z" fill="#9DB7C4" opacity=".75" />
          <path d="M0 200 L40 150 L84 196 L130 140 L200 206 V270 H0Z" fill="#5E8E78" />
          <g fill="#2E5E48">
            {[[24, 250], [160, 246], [184, 256]].map(([x, y]) => <path key={x} d={`M${x} ${y} L${x + 12} ${y - 48} L${x + 24} ${y}Z`} />)}
          </g>
          <ellipse cx="60" cy="140" rx="40" ry="8" fill="#fff" opacity=".45" /><ellipse cx="150" cy="116" rx="34" ry="7" fill="#fff" opacity=".4" />
        </g>
      ),
    }),
  },
];

/* ───────── Hayvan türleri de mağazadaki birer parçadır ───────── */
const SPECIES_ITEMS: Item[] = SPECIES.map((s) => ({
  id: `sp-${s.id}`,
  slot: "species",
  name: s.name,
  price: s.price,
  draw: () => ({}),
}));

export const ITEMS: Item[] = [...SPECIES_ITEMS, ...ACCESSORIES];
export const ITEM_MAP: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const itemsOf = (slot: Slot) => ITEMS.filter((i) => i.slot === slot);
export const isFree = (id: string) => (ITEM_MAP[id]?.price ?? 1) === 0;
export const speciesOf = (itemId: string) => SPECIES_MAP[itemId.replace(/^sp-/, "")] ?? SPECIES[0];
