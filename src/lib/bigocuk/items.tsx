import type { ReactNode } from "react";

/* ───────── Tipler ───────── */
export type Slot = "bg" | "hair" | "top" | "bottom" | "shoes" | "glasses" | "hat" | "extra";
export type AvatarConfig = { skin: string; hairColor: string } & Record<Slot, string>;
export type Layers = { back?: ReactNode; mid?: ReactNode; over?: ReactNode };
export type DrawCtx = { uid: string; skin: string; skinShade: string; hair: string; hairShade: string };
export type Item = { id: string; slot: Slot; name: string; price: number; draw: (c: DrawCtx) => Layers };

export const SLOTS: { id: Slot; label: string }[] = [
  { id: "hair", label: "Saç" },
  { id: "top", label: "Üst" },
  { id: "bottom", label: "Alt" },
  { id: "shoes", label: "Ayakkabı" },
  { id: "glasses", label: "Gözlük" },
  { id: "hat", label: "Şapka" },
  { id: "extra", label: "Aksesuar" },
  { id: "bg", label: "Arka plan" },
];

/* ───────── Ücretsiz seçimler: ten ve saç rengi ───────── */
export const SKINS = [
  { id: "s1", name: "Açık", c: "#FFDDBF" },
  { id: "s2", name: "Bej", c: "#F5C7A0" },
  { id: "s3", name: "Buğday", c: "#E0A878" },
  { id: "s4", name: "Bronz", c: "#C68A5C" },
  { id: "s5", name: "Kahve", c: "#8D5A38" },
  { id: "s6", name: "Koyu", c: "#5E3A24" },
];
export const HAIR_COLORS = [
  { id: "h1", name: "Siyah", c: "#1D1B22" },
  { id: "h2", name: "Koyu kahve", c: "#4A2C1A" },
  { id: "h3", name: "Kestane", c: "#7A4A2A" },
  { id: "h4", name: "Bal", c: "#C9A15A" },
  { id: "h5", name: "Sarı", c: "#F0D27A" },
  { id: "h6", name: "Kızıl", c: "#B8481F" },
  { id: "h7", name: "Mavi", c: "#2F7FB8" },
  { id: "h8", name: "Pembe", c: "#E87AA8" },
];

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "s2",
  hairColor: "h2",
  bg: "bg-sky",
  hair: "hair-short",
  top: "top-tee",
  bottom: "bottom-jeans",
  shoes: "shoes-white",
  glasses: "glasses-none",
  hat: "hat-none",
  extra: "extra-none",
};

/* ───────── Yardımcılar ───────── */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + k))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => f(v).toString(16).padStart(2, "0"))
    .join("")}`;
}
// kol ekseni: omuz (64,150) → el (53,198)
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
const pants = (c: string, endY: number) => (
  <g fill={c}>
    <rect x="69" y="194" width="62" height="18" rx="9" />
    <rect x="77" y="198" width="21" height={endY - 198} rx="7" />
    <rect x="102" y="198" width="21" height={endY - 198} rx="7" />
  </g>
);
const shoePair = (c: string, sole: string, tall = 0, edge = "none") => (
  <g>
    {[85, 115].map((x) => (
      <g key={x}>
        {tall > 0 && <rect x={x - 10} y={246 - tall} width="20" height={tall + 4} rx="5" fill={c} />}
        <ellipse cx={x} cy="250" rx="14.5" ry="8" fill={c} stroke={edge} strokeWidth="1.5" />
        <rect x={x - 14.5} y="254.5" width="29" height="5" rx="2.5" fill={sole} />
      </g>
    ))}
  </g>
);
const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.1} ${cx - s * 0.9} ${cy - s * 1.2} ${cx} ${cy - s * 0.3} C${cx + s * 0.9} ${cy - s * 1.2} ${cx + s * 1.6} ${cy - s * 0.1} ${cx} ${cy + s * 0.9}Z`;
const star = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r} L${cx + r * 0.28} ${cy - r * 0.28} L${cx + r} ${cy} L${cx + r * 0.28} ${cy + r * 0.28} L${cx} ${cy + r} L${cx - r * 0.28} ${cy + r * 0.28} L${cx - r} ${cy} L${cx - r * 0.28} ${cy - r * 0.28}Z`;
const Grad = ({ id, a, b }: { id: string; a: string; b: string }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  </defs>
);
const bgRect = (id: string) => <rect width="200" height="270" rx="28" fill={`url(#${id})`} />;

// saç: kısa saçın ortak ön hatları
const CAP = "M53 90 C48 44 72 28 100 28 C128 28 152 44 147 90 C143 76 138 66 128 62 C112 70 92 60 76 66 C64 70 57 80 53 90Z";
const PART = "M53 92 C48 44 72 28 100 28 C128 28 152 44 147 92 C142 74 124 58 100 56 C76 58 58 74 53 92Z";
const hairProps = (c: DrawCtx) => ({ fill: c.hair, stroke: c.hairShade, strokeWidth: 1.5, strokeLinejoin: "round" as const });

/* ───────── Parçalar ───────── */
export const ITEMS: Item[] = [
  /* — Saç — */
  { id: "hair-short", slot: "hair", name: "Kısa saç", price: 0, draw: (c) => ({ over: <path d={CAP} {...hairProps(c)} /> }) },
  {
    id: "hair-long", slot: "hair", name: "Uzun saç", price: 40,
    draw: (c) => ({
      back: <path d="M50 92 C42 40 70 26 100 26 C130 26 158 40 150 92 L157 178 Q100 192 43 178Z" {...hairProps(c)} />,
      over: <path d={PART} {...hairProps(c)} />,
    }),
  },
  {
    id: "hair-bun", slot: "hair", name: "Topuz", price: 40,
    draw: (c) => ({
      over: (
        <g>
          <circle cx="100" cy="22" r="15" {...hairProps(c)} />
          <path d={CAP} {...hairProps(c)} />
        </g>
      ),
    }),
  },
  {
    id: "hair-pony", slot: "hair", name: "At kuyruğu", price: 50,
    draw: (c) => ({
      back: <path d="M134 52 C178 44 186 112 160 152 C158 120 150 98 136 88Z" {...hairProps(c)} />,
      over: <path d={CAP} {...hairProps(c)} />,
    }),
  },
  {
    id: "hair-curly", slot: "hair", name: "Kıvırcık", price: 60,
    draw: (c) => ({
      over: (
        <g {...hairProps(c)}>
          {[[56, 76], [60, 54], [76, 38], [100, 31], [124, 38], [140, 54], [144, 76]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="13" />
          ))}
          <path d={CAP} stroke="none" />
          {[[72, 66], [88, 61], [106, 60], [123, 63], [134, 69]].map(([x, y]) => (
            <circle key={`f${x}`} cx={x} cy={y} r="8.5" />
          ))}
        </g>
      ),
    }),
  },
  {
    id: "hair-afro", slot: "hair", name: "Kabarık", price: 60,
    draw: (c) => ({
      back: <circle cx="100" cy="68" r="58" {...hairProps(c)} />,
      over: <path d="M56 88 C54 44 146 44 144 88 C136 68 118 62 100 62 C82 62 64 68 56 88Z" fill={c.hair} />,
    }),
  },

  /* — Üst — */
  {
    id: "top-tee", slot: "top", name: "Beyaz tişört", price: 0,
    draw: (c) => ({ mid: <g>{sleeve("#F4F7FA", 172)}{torso("#F4F7FA")}{neckV(c.skinShade)}</g> }),
  },
  {
    id: "top-bigova", slot: "top", name: "Bigova tişörtü", price: 80,
    draw: (c) => ({
      mid: (
        <g>
          {sleeve("#0E3A5B", 172)}{torso("#0E3A5B")}{neckV(c.skinShade)}
          <path d="M82 175 q6 -8 12 0 t12 0 t12 0" stroke="#FFB84D" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M86 184 q5 -6 10 0 t10 0 t10 0" stroke="#fff" strokeOpacity=".7" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "top-jersey", slot: "top", name: "Turkuaz forma", price: 140,
    draw: (c) => ({
      mid: (
        <g>
          {sleeve("#2CC4B5", 170)}
          {torso("#2CC4B5")}
          <path d="M89 140 Q100 160 111 140" stroke="#1B8F84" strokeWidth="5" fill={c.skinShade} />
          <text x="100" y="188" textAnchor="middle" fontSize="27" fontWeight="800" fill="#fff" fontFamily="'Baloo 2', sans-serif">10</text>
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
          {neckV(c.skinShade)}
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

  /* — Alt — */
  {
    id: "bottom-jeans", slot: "bottom", name: "Mavi kot", price: 0,
    draw: () => ({ mid: <g>{pants("#3B6EA8", 243)}<path d="M100 208 V243" stroke="#2D5788" strokeWidth="2" /></g> }),
  },
  { id: "bottom-black", slot: "bottom", name: "Siyah pantolon", price: 60, draw: () => ({ mid: pants("#2A2E37", 243) }) },
  { id: "bottom-shorts", slot: "bottom", name: "Şort", price: 50, draw: () => ({ mid: pants("#E2B24A", 224) }) },
  {
    id: "bottom-skirt", slot: "bottom", name: "Etek", price: 70,
    draw: () => ({ mid: <path d="M69 194 H131 L143 229 Q100 238 57 229Z" fill="#D9486B" /> }),
  },
  {
    id: "bottom-cargo", slot: "bottom", name: "Kargo pantolon", price: 80,
    draw: () => ({
      mid: (
        <g>
          {pants("#7B8B5A", 243)}
          <rect x="79" y="216" width="16" height="14" rx="3" fill="#66744A" />
          <rect x="105" y="216" width="16" height="14" rx="3" fill="#66744A" />
        </g>
      ),
    }),
  },
  {
    id: "bottom-track", slot: "bottom", name: "Eşofman", price: 60,
    draw: () => ({
      mid: (
        <g>
          {pants("#8A93A3", 243)}
          <path d="M80 204 V243 M120 204 V243" stroke="#fff" strokeWidth="2.4" />
        </g>
      ),
    }),
  },

  /* — Ayakkabı — */
  { id: "shoes-white", slot: "shoes", name: "Beyaz spor ayakkabı", price: 0, draw: () => ({ mid: shoePair("#FFFFFF", "#DCE5EC", 0, "#C5D2DB") }) },
  { id: "shoes-red", slot: "shoes", name: "Kırmızı spor ayakkabı", price: 60, draw: () => ({ mid: shoePair("#E5533D", "#FFFFFF") }) },
  { id: "shoes-boots", slot: "shoes", name: "Siyah bot", price: 70, draw: () => ({ mid: shoePair("#1F2229", "#0B0D11", 14) }) },
  { id: "shoes-rain", slot: "shoes", name: "Sarı çizme", price: 90, draw: () => ({ mid: shoePair("#F6C343", "#C9971F", 18) }) },

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
    draw: () => ({
      over: (
        <g>
          <path d={heart(84, 90, 11)} fill="#FF6B8A" fillOpacity=".82" stroke="#B02A4D" strokeWidth="2" strokeLinejoin="round" />
          <path d={heart(116, 90, 11)} fill="#FF6B8A" fillOpacity=".82" stroke="#B02A4D" strokeWidth="2" strokeLinejoin="round" />
          <path d="M96 87 H104 M69 86 L58 84 M131 86 L142 84" stroke="#B02A4D" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      ),
    }),
  },

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
    id: "hat-cap", slot: "hat", name: "Kep", price: 70,
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

  /* — Aksesuar — */
  { id: "extra-none", slot: "extra", name: "Aksesuarsız", price: 0, draw: () => ({}) },
  {
    id: "extra-phones", slot: "extra", name: "Kulaklık", price: 100,
    draw: () => ({
      over: (
        <g>
          <path d="M55 90 C50 26 150 26 145 90" stroke="#2B3A55" strokeWidth="6" fill="none" strokeLinecap="round" />
          <rect x="45" y="80" width="17" height="28" rx="8.5" fill="#E5533D" />
          <rect x="138" y="80" width="17" height="28" rx="8.5" fill="#E5533D" />
          <rect x="49" y="86" width="9" height="16" rx="4.5" fill="#B83E2B" />
          <rect x="142" y="86" width="9" height="16" rx="4.5" fill="#B83E2B" />
        </g>
      ),
    }),
  },
  {
    id: "extra-scarf", slot: "extra", name: "Atkı", price: 80,
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
    id: "extra-pack", slot: "extra", name: "Sırt çantası", price: 120,
    draw: () => ({
      back: <rect x="57" y="138" width="86" height="62" rx="18" fill="#F6C343" stroke="#C9971F" strokeWidth="2" />,
      mid: (
        <g fill="#C9971F">
          <rect x="77" y="141" width="9" height="52" rx="3" />
          <rect x="114" y="141" width="9" height="52" rx="3" />
        </g>
      ),
    }),
  },
  {
    id: "extra-badge", slot: "extra", name: "Martı rozeti", price: 60,
    draw: () => ({
      mid: (
        <g>
          <circle cx="118" cy="160" r="9" fill="#fff" stroke="#0E3A5B" strokeWidth="2" />
          <path d="M112.5 160 q3 -5 5.5 0 q2.5 -5 5.5 0" stroke="#0E3A5B" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      ),
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
            <path d={star(40, 54, 12)} /><path d={star(160, 96, 16)} /><path d={star(52, 186, 9)} /><path d={star(150, 208, 11)} />
          </g>
        </g>
      ),
    }),
  },
];

export const ITEM_MAP: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const itemsOf = (slot: Slot) => ITEMS.filter((i) => i.slot === slot);
export const isFree = (id: string) => (ITEM_MAP[id]?.price ?? 1) === 0;
