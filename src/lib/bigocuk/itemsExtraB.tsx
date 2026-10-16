import { Grad, bgRect, mir, sparkle, star5 } from "./draw";
import type { Item } from "./items";
import { fist } from "./itemsKit";

/* ═════════ El eşyaları (gövde uzayı; yumruk ≈ 148,203) ═════════ */
const HANDS: Item[] = [
  {
    id: "hand-coffee", slot: "hand", name: "Kahve bardağı", price: 50,
    draw: (c) => ({
      over: (
        <g>
          <path d="M146 166 q-5 -8 0 -14 M154 168 q-5 -8 0 -14" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".7" />
          <path d="M138 176 H166 L163 208 Q152 212 141 208Z" fill="#F4F7FA" stroke="#D5DCE2" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M139.5 190 H164.5 L163.6 200 H140.5Z" fill="#8A5A33" />
          <rect x="136" y="172" width="32" height="6" rx="3" fill="#E3E8EC" />
          {fist(c, 150)}
        </g>
      ),
    }),
  },
  {
    id: "hand-phone", slot: "hand", name: "Telefon", price: 60,
    draw: (c) => ({
      over: (
        <g>
          <rect x="138" y="168" width="24" height="42" rx="6" fill="#2B2F3A" />
          <rect x="141" y="172" width="18" height="32" rx="3" fill="#5FD3F0" />
          <path d="M143 177 H157 M143 183 H152" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
          <rect x="146" y="169.6" width="8" height="2" rx="1" fill="#1C2A3A" />
          {fist(c, 150)}
        </g>
      ),
    }),
  },
  {
    id: "hand-laptop", slot: "hand", name: "Dizüstü bilgisayar", price: 110, set: "comu",
    draw: (c) => ({
      over: (
        <g strokeLinejoin="round">
          <path d="M132 168 H176 L172 196 H136Z" fill="#2B2F3A" />
          <path d="M136 172 H172 L169.6 192 H138.4Z" fill="#7FD1F5" />
          <path d="M141 177 H156 M141 182 H164 M141 187 H152" stroke="#1F3C88" strokeWidth="2" strokeLinecap="round" opacity=".55" />
          <path d="M128 196 H180 L176 204 H132Z" fill="#8895A5" stroke="#5F6C7C" strokeWidth="1.4" />
          {fist(c, 146)}
        </g>
      ),
    }),
  },
  {
    id: "hand-pizza", slot: "hand", name: "Pizza dilimi", price: 60,
    draw: (c) => ({
      over: (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M136 172 L178 180 L152 216Z" fill="#F6C343" stroke="#E3A82A" strokeWidth="2" />
          <path d="M136 172 L178 180" stroke="#D9923A" strokeWidth="8" />
          <g fill="#D9322B"><circle cx="154" cy="186" r="5" /><circle cx="164" cy="195" r="4.4" /><circle cx="150" cy="200" r="3.6" /></g>
          <g fill="#4FAE6B"><circle cx="160" cy="184" r="1.6" /><circle cx="152" cy="193" r="1.6" /></g>
          {fist(c, 150)}
        </g>
      ),
    }),
  },
  {
    id: "hand-icecream", slot: "hand", name: "Dondurma", price: 50,
    draw: (c) => ({
      over: (
        <g>
          <path d="M141 186 L150 214 L159 186Z" fill="#D9923A" stroke="#B87420" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M144 192 L156 204 M156 192 L144 204" stroke="#B87420" strokeWidth="1.2" opacity=".7" />
          <circle cx="150" cy="180" r="12" fill="#F4A6B8" />
          <circle cx="150" cy="167" r="10" fill="#F6E8C8" />
          <circle cx="150" cy="156" r="4" fill="#D9322B" />
          <path d="M150 152 q3 -6 7 -7" stroke="#4FAE6B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          {fist(c, 150)}
        </g>
      ),
    }),
  },
  {
    id: "hand-wand", slot: "hand", name: "Sihirli değnek", price: 130,
    draw: (c) => ({
      over: (
        <g>
          <path d="M150 208 L176 154" stroke="#6B4423" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M176 154 L178 150" stroke="#F6C343" strokeWidth="6" strokeLinecap="round" />
          <path d={star5(180, 142, 12)} fill="#FFD84D" stroke="#E3A82A" strokeWidth="1.6" strokeLinejoin="round" />
          <path d={sparkle(160, 138, 6)} fill="#fff" opacity=".9" />
          <path d={sparkle(192, 162, 4)} fill="#FFE59A" />
          {fist(c, 150)}
        </g>
      ),
    }),
  },
  {
    id: "hand-tulip", slot: "hand", name: "Lale", price: 60,
    draw: (c) => ({
      over: (
        <g>
          <path d="M152 208 Q148 190 154 168" stroke="#3F9E5A" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M151 196 Q138 188 138 176 Q150 180 152 192Z" fill="#4FAE6B" />
          <path d="M147 160 Q145 146 154 144 Q163 146 161 160 Q154 168 147 160Z" fill="#E5334D" stroke="#B3203A" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M149 150 L154 160 L159 150" stroke="#B3203A" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
          {fist(c, 152)}
        </g>
      ),
    }),
  },
  {
    id: "hand-trophy", slot: "hand", name: "Kupa", price: 160,
    draw: (c) => ({
      over: (
        <g strokeLinejoin="round">
          <path d="M138 168 q-12 2 -8 14 q4 8 12 8 M170 168 q12 2 8 14 q-4 8 -12 8" stroke="#C9971F" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M138 166 H170 Q170 192 154 196 Q138 192 138 166Z" fill="#F6C343" stroke="#C9971F" strokeWidth="2" />
          <path d={star5(154, 178, 7)} fill="#FFE59A" stroke="#C9971F" strokeWidth="1" />
          <path d="M143 170 Q143 184 148 190" stroke="#fff" strokeOpacity=".5" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <rect x="150" y="195" width="8" height="9" fill="#E3AE2A" />
          <rect x="142" y="204" width="24" height="7" rx="2" fill="#8A6238" />
          {fist(c, 154)}
        </g>
      ),
    }),
  },
  {
    id: "hand-baglama", slot: "hand", name: "Bağlama", price: 140, set: "biga",
    draw: (c) => ({
      over: (
        <g strokeLinecap="round">
          <path d="M166 186 L184 128" stroke="#6B4423" strokeWidth="6.6" />
          <rect x="178" y="118" width="12" height="15" rx="3" fill="#4F3320" transform="rotate(16 184 125)" />
          <ellipse cx="160" cy="198" rx="17" ry="21" transform="rotate(16 160 198)" fill="#A8672E" stroke="#7A4A22" strokeWidth="2" />
          <ellipse cx="160" cy="198" rx="6" ry="7.6" transform="rotate(16 160 198)" fill="#3A2416" />
          <path d="M166 186 L183 130 M169 187 L186 131" stroke="#F4F7FA" strokeWidth="1" opacity=".8" />
          {fist(c, 150)}
        </g>
      ),
    }),
  },
  {
    id: "hand-umbrella", slot: "hand", name: "Şemsiye", price: 80,
    draw: (c) => ({
      over: (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M150 214 q0 6 -7 6" stroke="#4A3A2A" strokeWidth="3.4" fill="none" />
          <path d="M150 214 V124" stroke="#4A3A2A" strokeWidth="3.4" />
          <path d="M116 150 Q150 104 184 150 Q175 143 167 150 Q158 143 150 150 Q142 143 133 150 Q125 143 116 150Z" fill="#E5533D" stroke="#B83E2B" strokeWidth="1.6" />
          <path d="M150 150 L150 112 M150 150 L131 118 M150 150 L169 118" stroke="#B83E2B" strokeWidth="1.2" opacity=".7" />
          <path d="M142 128 Q150 114 158 128" stroke="#fff" strokeOpacity=".5" strokeWidth="2.4" fill="none" />
          {fist(c, 150)}
        </g>
      ),
    }),
  },
  {
    id: "hand-bigcoin", slot: "hand", name: "Dev Bigcoin", price: 100, set: "bigova",
    draw: (c) => ({
      over: (
        <g>
          <circle cx="160" cy="184" r="21" fill="#F6C343" stroke="#C9971F" strokeWidth="3.4" />
          <circle cx="160" cy="184" r="15" fill="none" stroke="#C9971F" strokeWidth="2" />
          <path d={star5(160, 184, 9)} fill="#FFE59A" stroke="#C9971F" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M146 174 Q150 166 160 164" stroke="#fff" strokeOpacity=".6" strokeWidth="3" fill="none" strokeLinecap="round" />
          {fist(c, 150)}
        </g>
      ),
    }),
  },
];

/* ═════════ Sırt parçaları ═════════ */
const BACKS: Item[] = [
  {
    id: "back-wings-angel", slot: "back", name: "Melek kanatları", price: 240,
    draw: () => ({
      back: mir(
        <g strokeLinejoin="round" transform="translate(72 150) scale(1.24) translate(-72 -150)">
          <path d="M72 152 C36 142 6 112 4 56 C18 66 30 70 42 66 C38 84 50 96 64 98 C58 112 66 126 76 132Z" fill="#fff" stroke="#9FB6CC" strokeWidth="2.4" />
          <path d="M18 72 C24 100 44 124 68 138 M32 76 C36 98 50 116 68 128" stroke="#9FB6CC" strokeWidth="2" fill="none" />
          <path d="M4 56 C18 66 30 70 42 66" stroke="#FFF3A8" strokeWidth="2.4" fill="none" opacity=".8" />
        </g>,
      ),
    }),
  },
  {
    id: "back-wings-bat", slot: "back", name: "Yarasa kanatları", price: 220,
    draw: () => ({
      back: mir(
        <g strokeLinejoin="round" transform="translate(72 150) scale(1.24) translate(-72 -150)">
          <path d="M72 148 L36 96 Q30 112 26 124 Q20 114 12 120 Q12 98 2 84 Q26 86 38 70 Q60 92 74 132Z" fill="#4A3470" stroke="#2D1F4A" strokeWidth="2" />
          <path d="M72 148 L38 72 M72 148 L26 124 M72 148 L12 120" stroke="#2D1F4A" strokeWidth="2.4" strokeLinecap="round" />
        </g>,
      ),
    }),
  },
  {
    id: "back-wings-dragon", slot: "back", name: "Ejderha kanatları", price: 280,
    draw: () => ({
      back: mir(
        <g strokeLinejoin="round" strokeLinecap="round" transform="translate(72 150) scale(1.24) translate(-72 -150)">
          <path d="M70 148 L4 62 Q16 92 12 108 Q26 112 24 128 Q40 128 38 144 Q54 144 72 154Z" fill="#4FA06E" stroke="#2E6E48" strokeWidth="2" />
          <path d="M70 148 L4 62 M70 148 L12 108 M70 148 L24 128 M70 148 L38 144" stroke="#2E6E48" strokeWidth="3" fill="none" />
          <path d="M4 62 L-2 52 M12 108 L4 108 M24 128 L16 132" stroke="#2E6E48" strokeWidth="3" />
        </g>,
      ),
    }),
  },
  {
    id: "back-surfboard", slot: "back", name: "Sörf tahtası", price: 150,
    draw: () => ({
      back: (
        <g>
          <ellipse cx="160" cy="150" rx="18" ry="86" transform="rotate(12 160 150)" fill="#2CC4B5" stroke="#1B8F84" strokeWidth="2.4" />
          <path d="M178 70 Q166 150 144 232" stroke="#F4F7FA" strokeWidth="3.4" fill="none" opacity=".9" />
          <path d="M146 222 l8 14 l-12 -4Z" fill="#1B8F84" />
        </g>
      ),
      mid: <path d="M72 142 L128 196" stroke="#2B2F3A" strokeWidth="4" strokeLinecap="round" opacity=".85" />,
    }),
  },
  {
    id: "back-guitar", slot: "back", name: "Gitar", price: 140,
    draw: () => ({
      back: (
        <g strokeLinejoin="round">
          <g transform="rotate(26 160 190)">
            <rect x="156" y="74" width="9" height="104" rx="3" fill="#5A3A22" />
            <rect x="153" y="58" width="15" height="20" rx="3" fill="#3A2416" />
            <ellipse cx="160" cy="206" rx="24" ry="21" fill="#C9772E" stroke="#8A5020" strokeWidth="2" />
            <ellipse cx="160" cy="176" rx="16" ry="14" fill="#C9772E" stroke="#8A5020" strokeWidth="2" />
            <circle cx="160" cy="196" r="6.4" fill="#3A2416" />
          </g>
        </g>
      ),
      mid: <path d="M74 142 L130 200" stroke="#8A5A33" strokeWidth="5" strokeLinecap="round" opacity=".9" />,
    }),
  },
  {
    id: "back-bow", slot: "back", name: "Yay ve ok", price: 150,
    draw: () => ({
      back: (
        <g strokeLinecap="round">
          <g transform="rotate(-14 36 160)">
            <rect x="28" y="132" width="16" height="62" rx="5" fill="#7A4A2A" stroke="#4F2F18" strokeWidth="1.6" />
            <path d="M32 132 V104 M36 132 V98 M40 132 V104" stroke="#C9A06A" strokeWidth="2" />
            <path d="M30 106 L28 96 M34 100 L36 90 M38 106 L40 96" stroke="#D9322B" strokeWidth="3" />
          </g>
          <path d="M156 110 Q196 172 156 238" stroke="#8A5A33" strokeWidth="4.6" fill="none" />
          <path d="M156 110 V238" stroke="#E9EEF3" strokeWidth="1.4" />
        </g>
      ),
      mid: <path d="M70 142 L128 198" stroke="#6B4423" strokeWidth="4" strokeLinecap="round" opacity=".9" />,
    }),
  },
  {
    id: "back-rainbow", slot: "back", name: "Gökkuşağı pelerini", price: 250,
    draw: (c) => ({
      back: (
        <g>
          <clipPath id={`${c.uid}rc`}><path d="M62 142 H138 L158 240 Q100 262 42 240Z" /></clipPath>
          <g clipPath={`url(#${c.uid}rc)`}>
            {["#FF5C7A", "#FF9F4A", "#FFD84D", "#5FD68A", "#4FA8F0", "#9C6BE8"].map((col, i) => (
              <rect key={col} x={38 + i * 21} y="138" width="22" height="130" fill={col} />
            ))}
          </g>
          <path d="M100 150 V250" stroke="#000" strokeOpacity=".12" strokeWidth="2" />
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
];

/* ═════════ Arka planlar (200×270) ═════════ */
const stars = (pts: [number, number, number][], fill = "#fff") => (
  <g fill={fill}>{pts.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />)}</g>
);
const STAR_PTS: [number, number, number][] = [[24, 30, 1.6], [56, 64, 1.2], [90, 24, 1.8], [128, 52, 1.2], [168, 28, 1.6], [180, 84, 1.2], [40, 110, 1.4], [150, 120, 1.2], [76, 140, 1], [12, 76, 1.2], [110, 96, 1]];

const BGS: Item[] = [
  {
    id: "bg-space", slot: "bg", name: "Uzay", price: 80,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#0B1030" b="#2E1F66" />{bgRect(`${c.uid}bg`)}
          {stars(STAR_PTS)}
          <circle cx="158" cy="44" r="20" fill="#E8943A" />
          <path d="M142 38 Q158 46 174 36 M140 52 Q158 60 176 48" stroke="#C9722A" strokeWidth="3" fill="none" opacity=".6" />
          <ellipse cx="158" cy="44" rx="34" ry="8" transform="rotate(-18 158 44)" fill="none" stroke="#F6D79A" strokeWidth="3" opacity=".85" />
          <path d="M40 100 L18 112" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".8" />
          <circle cx="42" cy="99" r="2.6" fill="#fff" />
          <path d="M0 232 Q100 206 200 232 V270 H0Z" fill="#3A3556" />
          <g fill="#2B2745" opacity=".8"><ellipse cx="50" cy="246" rx="14" ry="4" /><ellipse cx="150" cy="242" rx="18" ry="5" /></g>
        </g>
      ),
    }),
  },
  {
    id: "bg-beach", slot: "bg", name: "Plaj", price: 60,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#9FDDF2" b="#FFF4D6" />{bgRect(`${c.uid}bg`)}
          <circle cx="150" cy="62" r="20" fill="#FFE08A" opacity=".95" />
          <rect x="0" y="146" width="200" height="50" fill="#3FA7D6" />
          <path d="M0 160 Q25 154 50 160 T100 160 T150 160 T200 160 M0 176 Q25 170 50 176 T100 176 T150 176 T200 176" stroke="#fff" strokeOpacity=".5" strokeWidth="2.4" fill="none" />
          <path d="M0 196 Q50 186 100 194 T200 190 V270 H0Z" fill="#F2D9A0" />
          <path d="M34 236 Q28 190 40 140" stroke="#8A6A3E" strokeWidth="7" fill="none" strokeLinecap="round" />
          <g fill="#3F9E5A">
            <path d="M40 140 Q18 128 6 140 Q22 132 40 144Z" /><path d="M40 140 Q66 126 78 140 Q60 132 40 144Z" />
            <path d="M40 140 Q30 118 14 116 Q32 120 42 138Z" /><path d="M40 140 Q54 118 70 116 Q52 122 40 138Z" />
          </g>
        </g>
      ),
    }),
  },
  {
    id: "bg-snow", slot: "bg", name: "Karlı dağ", price: 70,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#CFE6F5" b="#F6FAFD" />{bgRect(`${c.uid}bg`)}
          <path d="M-10 190 L50 90 L96 168 L130 110 L210 196Z" fill="#8FA9C4" />
          <path d="M50 90 L36 114 L48 108 L56 118 L64 106Z M130 110 L116 134 L128 128 L136 138 L146 126Z" fill="#fff" />
          <path d="M0 214 Q100 196 200 214 V270 H0Z" fill="#fff" />
          <g fill="#2F6B52">
            {[[26, 232], [166, 226], [186, 238]].map(([x, y]) => <path key={x} d={`M${x} ${y} L${x + 11} ${y - 38} L${x + 22} ${y}Z`} />)}
          </g>
          {stars([[30, 40, 2], [70, 70, 1.6], [120, 36, 2], [160, 70, 1.6], [180, 120, 2], [20, 130, 1.6], [100, 130, 1.6], [140, 150, 1.6]], "#fff")}
        </g>
      ),
    }),
  },
  {
    id: "bg-city", slot: "bg", name: "Şehir gecesi", price: 80,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#1B2250" b="#6B4A9B" />{bgRect(`${c.uid}bg`)}
          <circle cx="152" cy="52" r="16" fill="#FFF3C4" />
          {stars([[30, 36, 1.4], [70, 56, 1.2], [110, 28, 1.6], [180, 100, 1.2], [20, 90, 1.2]])}
          {([[0, 36, 90], [30, 30, 120], [58, 40, 76], [100, 32, 108], [134, 38, 84], [168, 34, 120]] as [number, number, number][]).map(([x, w, h]) => (
            <g key={x}>
              <rect x={x} y={232 - h} width={w} height={h + 40} fill="#161B3A" />
              {Array.from({ length: Math.floor(h / 16) }).map((_, r) =>
                [0, 1].map((k) => (
                  <rect key={`${r}${k}`} x={x + 6 + k * Math.max(12, w / 2 - 2)} y={232 - h + 8 + r * 16} width="6" height="8" fill={(r * 3 + k + x) % 4 === 0 ? "#3A3F66" : "#FFD66B"} />
                )),
              )}
            </g>
          ))}
          <rect x="0" y="236" width="200" height="34" fill="#0F1330" />
          <path d="M0 252 H200" stroke="#FFD66B" strokeWidth="2" strokeDasharray="10 10" opacity=".6" />
        </g>
      ),
    }),
  },
  {
    id: "bg-library", slot: "bg", name: "Kütüphane", price: 70, set: "comu",
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#E9D3A8" b="#C9A06A" />{bgRect(`${c.uid}bg`)}
          {[70, 126, 182].map((y, si) => (
            <g key={y}>
              <rect x="0" y={y} width="200" height="6" fill="#6B4423" />
              {Array.from({ length: 13 }).map((_, i) => {
                const h = 30 + ((i * 7 + si * 5) % 5) * 4;
                const cols = ["#C8202B", "#1F3C88", "#2F9E5A", "#E3AE2A", "#7A4AA8", "#2CC4B5"];
                return <rect key={i} x={4 + i * 15} y={y - h} width="12" height={h} rx="1.6" fill={cols[(i + si * 2) % cols.length]} stroke="#00000022" />;
              })}
            </g>
          ))}
          <rect x="0" y="238" width="200" height="32" fill="#8A5A33" />
          <path d="M0 238 H200" stroke="#6B4423" strokeWidth="3" />
        </g>
      ),
    }),
  },
  {
    id: "bg-cherry", slot: "bg", name: "Kiraz çiçeği", price: 70,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#FDE0EA" b="#FFF8FA" />{bgRect(`${c.uid}bg`)}
          <path d="M-4 40 Q60 56 120 30 M40 48 Q60 90 52 120 M96 36 Q130 60 150 56" stroke="#7A4A3A" strokeWidth="6" fill="none" strokeLinecap="round" />
          <g fill="#F7A8C2">
            {[[20, 46], [44, 60], [66, 52], [90, 36], [112, 34], [136, 54], [54, 100], [48, 118], [150, 54], [30, 70], [78, 70]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="9" />)}
          </g>
          <g fill="#FFD3E0">
            {[[28, 52], [58, 44], [100, 44], [126, 44], [60, 108], [140, 58], [84, 62]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5.6" />)}
          </g>
          <g fill="#F7A8C2" opacity=".85">
            {[[150, 120], [170, 160], [30, 170], [120, 190], [180, 220], [70, 210], [20, 230]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="5" ry="3" transform={`rotate(${(x * 7) % 90} ${x} ${y})`} />)}
          </g>
          <path d="M0 246 Q100 232 200 246 V270 H0Z" fill="#F6D6E0" />
        </g>
      ),
    }),
  },
  {
    id: "bg-aurora", slot: "bg", name: "Kutup ışıkları", price: 120,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#07162B" b="#123A4F" />{bgRect(`${c.uid}bg`)}
          {stars(STAR_PTS)}
          <path d="M-10 80 Q40 20 90 70 T210 50" stroke="#4FFFB0" strokeWidth="26" fill="none" opacity=".35" strokeLinecap="round" />
          <path d="M-10 110 Q50 60 100 100 T210 84" stroke="#7B6BFF" strokeWidth="20" fill="none" opacity=".35" strokeLinecap="round" />
          <path d="M-10 60 Q50 10 100 46 T210 30" stroke="#B6FFE0" strokeWidth="8" fill="none" opacity=".35" strokeLinecap="round" />
          <path d="M0 190 L40 150 L76 184 L120 140 L160 180 L200 156 V270 H0Z" fill="#0E2A3D" />
          <path d="M0 226 Q100 208 200 226 V270 H0Z" fill="#DCEBF5" />
        </g>
      ),
    }),
  },
  {
    id: "bg-desert", slot: "bg", name: "Çöl", price: 60,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#FFD59A" b="#FCEBCB" />{bgRect(`${c.uid}bg`)}
          <circle cx="160" cy="46" r="22" fill="#FFF0B8" opacity=".95" />
          <path d="M0 180 Q60 150 120 176 T200 164 V270 H0Z" fill="#E7B66B" />
          <path d="M0 214 Q70 190 140 212 T200 204 V270 H0Z" fill="#D9A04F" />
          <g fill="#4F8F4A">
            <rect x="30" y="170" width="9" height="42" rx="4.5" /><rect x="20" y="182" width="6" height="16" rx="3" /><rect x="43" y="178" width="6" height="14" rx="3" />
            <rect x="20" y="194" width="14" height="5" rx="2.5" /><rect x="36" y="188" width="12" height="5" rx="2.5" />
          </g>
          <path d="M150 184 L176 160 L200 188Z" fill="#CFA25E" /><path d="M176 160 L188 174 L176 190Z" fill="#B8884A" />
        </g>
      ),
    }),
  },
  {
    id: "bg-rain", slot: "bg", name: "Yağmurlu gün", price: 60,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#7B8FA5" b="#BFCAD6" />{bgRect(`${c.uid}bg`)}
          <g fill="#5F7188"><ellipse cx="50" cy="44" rx="38" ry="16" /><ellipse cx="90" cy="38" rx="30" ry="18" /><ellipse cx="150" cy="50" rx="40" ry="16" /></g>
          <g stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round">
            {Array.from({ length: 26 }).map((_, i) => {
              const x = (i * 37) % 200, y = 70 + ((i * 53) % 160);
              return <path key={i} d={`M${x} ${y} l-5 14`} />;
            })}
          </g>
          <path d="M0 238 Q100 228 200 238 V270 H0Z" fill="#8FA3B8" />
          <g fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.6"><ellipse cx="46" cy="252" rx="14" ry="3.6" /><ellipse cx="150" cy="256" rx="18" ry="4" /></g>
        </g>
      ),
    }),
  },
  {
    id: "bg-neon", slot: "bg", name: "Neon ızgara", price: 100,
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#12002B" b="#47106E" />{bgRect(`${c.uid}bg`)}
          <defs>
            <linearGradient id={`${c.uid}ns`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE55C" /><stop offset="1" stopColor="#FF4FA3" /></linearGradient>
            <clipPath id={`${c.uid}nc`}><rect x="0" y="0" width="200" height="104" /></clipPath>
          </defs>
          <g clipPath={`url(#${c.uid}nc)`}>
            <circle cx="100" cy="62" r="40" fill={`url(#${c.uid}ns)`} />
            {[78, 86, 93, 99].map((y, i) => <rect key={y} x="50" y={y} width="100" height={2 + i * 1.2} fill="#47106E" />)}
          </g>
          <rect x="0" y="104" width="200" height="166" fill="#1A0838" />
          <g stroke="#FF4FA3" strokeWidth="1.6" opacity=".9">
            {[-120, -70, -34, 0, 34, 70, 120].map((dx) => <path key={dx} d={`M${100 + dx * 0.15} 104 L${100 + dx * 3} 270`} />)}
            {[112, 124, 140, 162, 194, 238].map((y) => <path key={y} d={`M0 ${y} H200`} />)}
          </g>
          <path d="M0 104 H200" stroke="#4FE0FF" strokeWidth="2.4" />
        </g>
      ),
    }),
  },
  {
    id: "bg-troy", slot: "bg", name: "Truva surları", price: 90, set: "biga",
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#FFB36B" b="#6B4A8C" />{bgRect(`${c.uid}bg`)}
          <circle cx="164" cy="40" r="20" fill="#FFE2A0" opacity=".95" />
          <path d="M0 176 H200 V270 H0Z" fill="#4A3328" />
          <path d="M0 176 V160 H12 V168 H24 V160 H36 V168 H48 V160 H60 V168 H72 V160 H84 V168 H96 V160 H108 V168 H120 V160 H132 V168 H144 V160 H156 V168 H168 V160 H180 V168 H192 V160 H200 V176Z" fill="#4A3328" />
          <path d="M36 176 V210 Q36 192 52 192 Q68 192 68 210 V176Z" fill="#2A1C16" />
          <g fill="#9A6B43" stroke="#2A1C16" strokeWidth="1.6" transform="translate(136 224) scale(.78) translate(-104 -224)">
            <path d="M104 190 H150 V176 L162 160 L170 164 L162 188 L156 192 V214 H148 V198 H134 V214 H126 V198 H112 V214 H104Z" />
            <path d="M162 160 L176 154 L180 162 L170 164Z" />
            <circle cx="112" cy="218" r="6" /><circle cx="148" cy="218" r="6" />
          </g>
        </g>
      ),
    }),
  },
  {
    id: "bg-assos", slot: "bg", name: "Assos Athena Tapınağı", price: 90, set: "biga",
    draw: (c) => ({
      back: (
        <g>
          <Grad id={`${c.uid}bg`} a="#CFEAF7" b="#8CC0DC" />{bgRect(`${c.uid}bg`)}
          <rect x="0" y="186" width="200" height="84" fill="#2F7FB8" />
          <path d="M0 202 Q25 196 50 202 T100 202 T150 202 T200 202" stroke="#fff" strokeOpacity=".4" strokeWidth="2.4" fill="none" />
          <path d="M0 150 Q50 110 110 138 Q150 150 170 170 L200 186 V270 H0Z" fill="#B9A77A" />
          <path d="M0 150 Q50 110 110 138 Q150 150 170 170 L200 186" stroke="#8F7E52" strokeWidth="2" fill="none" />
          <g transform="translate(-6 -34) scale(.9)">
            <rect x="22" y="118" width="86" height="8" fill="#E9DFC4" />
            {[28, 42, 56, 70, 84, 98].map((x) => <rect key={x} x={x} y="92" width="6" height="26" fill="#F3EBD6" stroke="#D5C8A4" strokeWidth=".8" />)}
            <path d="M20 92 H110 L65 70Z" fill="#E9DFC4" stroke="#D5C8A4" strokeWidth="1.2" />
          </g>
          <path d="M150 214 l12 -10 l12 10Z" fill="#fff" /><path d="M162 204 V190" stroke="#8A6A3E" strokeWidth="2" /><path d="M162 190 L174 202 H162Z" fill="#F6C343" />
        </g>
      ),
    }),
  },
];

export const EXTRA_B: Item[] = [...HANDS, ...BACKS, ...BGS];
