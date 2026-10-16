import { mir, star5 } from "./draw";
import type { Item } from "./items";
import { arcPoints, circlePath, flower, neckV, sleeve, torso } from "./itemsKit";

/* ═════════ Şapkalar (kafa uzayı: baş merkezi 100,84 · tepe y≈38) ═════════ */
const HATS: Item[] = [
  {
    id: "hat-fez", slot: "hat", name: "Fes", price: 90,
    draw: () => ({
      over: (
        <g>
          <path d="M70 66 L76 30 H124 L130 66 Q100 74 70 66Z" fill="#C8202B" />
          <ellipse cx="100" cy="30" rx="24" ry="5" fill="#A5171F" />
          <path d="M71 59 Q100 67 129 59" stroke="#8E1219" strokeWidth="3" fill="none" />
          <path d="M100 30 Q146 22 148 58" stroke="#F2C230" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="144.5" y="56" width="7" height="16" rx="3" fill="#F2C230" />
        </g>
      ),
    }),
  },
  {
    id: "hat-chef", slot: "hat", name: "Aşçı şapkası", price: 80,
    draw: () => ({
      over: (
        <g fill="#fff" stroke="#D5DCE2" strokeWidth="1.6">
          <circle cx="76" cy="40" r="15" /><circle cx="124" cy="40" r="15" /><circle cx="100" cy="30" r="17" />
          <path d="M70 72 V46 H130 V72 Q100 78 70 72Z" />
          <path d="M84 52 V68 M100 52 V70 M116 52 V68" stroke="#E3E8EC" fill="none" />
        </g>
      ),
    }),
  },
  {
    id: "hat-pirate", slot: "hat", name: "Korsan şapkası", price: 130,
    draw: () => ({
      over: (
        <g strokeLinejoin="round">
          <path d="M38 66 Q70 28 100 38 Q130 28 162 66 Q132 54 100 62 Q68 54 38 66Z" fill="#1E1E24" stroke="#D9A93A" strokeWidth="2" />
          <circle cx="100" cy="47" r="6" fill="#F4F7FA" />
          <path d="M92 54 L108 60 M108 54 L92 60" stroke="#F4F7FA" strokeWidth="2" strokeLinecap="round" />
          <circle cx="98" cy="46" r="1.3" fill="#1E1E24" /><circle cx="102" cy="46" r="1.3" fill="#1E1E24" />
        </g>
      ),
    }),
  },
  {
    id: "hat-santa", slot: "hat", name: "Noel şapkası", price: 90,
    draw: () => ({
      over: (
        <g>
          <path d="M54 68 C56 38 78 22 104 22 C128 22 146 38 150 68Z" fill="#D9322B" />
          <path d="M104 22 C132 12 152 22 160 46" stroke="#D9322B" strokeWidth="16" fill="none" strokeLinecap="round" />
          <circle cx="160" cy="50" r="9" fill="#fff" />
          <rect x="48" y="60" width="104" height="16" rx="8" fill="#fff" stroke="#E3E8EC" strokeWidth="1.2" />
        </g>
      ),
    }),
  },
  {
    id: "hat-flowers", slot: "hat", name: "Çiçek tacı", price: 90,
    draw: () => ({
      over: (
        <g>
          <path d="M54 72 Q54 38 100 33 Q146 38 146 72" stroke="#5FAF5A" strokeWidth="5" fill="none" strokeLinecap="round" />
          {flower(60, 58, 7, "#F4A6B8", "#FFD84D", 1)}
          {flower(74, 42, 7, "#fff", "#FFB347", 2)}
          {flower(100, 34, 8, "#E8718A", "#FFD84D", 3)}
          {flower(126, 42, 7, "#B79BE8", "#FFD84D", 4)}
          {flower(140, 58, 7, "#F4A6B8", "#FFD84D", 5)}
          <g fill="#5FAF5A"><ellipse cx="88" cy="38" rx="5" ry="2.6" /><ellipse cx="112" cy="38" rx="5" ry="2.6" /></g>
        </g>
      ),
    }),
  },
  {
    id: "hat-party", slot: "hat", name: "Parti şapkası", price: 60,
    draw: () => ({
      over: (
        <g strokeLinejoin="round">
          <path d="M100 2 L132 60 Q100 68 68 60Z" fill="#8E5FD0" />
          <path d="M92 18 L112 30 M86 30 L120 46 M80 42 L126 58" stroke="#FFD84D" strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="4" r="6" fill="#F6C343" />
          <g fill="#fff" opacity=".85"><circle cx="90" cy="48" r="2" /><circle cx="108" cy="40" r="2" /><circle cx="100" cy="24" r="2" /></g>
        </g>
      ),
    }),
  },
  {
    id: "hat-headphones", slot: "hat", name: "Kulaklık", price: 110,
    draw: () => ({
      over: (
        <g>
          <path d="M52 86 C46 28 154 28 148 86" stroke="#2B2F3A" strokeWidth="7" fill="none" strokeLinecap="round" />
          <ellipse cx="50" cy="90" rx="10" ry="15" fill="#E5533D" />
          <ellipse cx="150" cy="90" rx="10" ry="15" fill="#E5533D" />
          <ellipse cx="54" cy="90" rx="6" ry="11" fill="#B83E2B" />
          <ellipse cx="146" cy="90" rx="6" ry="11" fill="#B83E2B" />
        </g>
      ),
    }),
  },
  {
    id: "hat-viking", slot: "hat", name: "Viking miğferi", price: 170,
    draw: () => ({
      over: (
        <g strokeLinejoin="round">
          {mir(<path d="M62 52 C42 56 32 40 30 22 C40 36 52 40 64 40Z" fill="#F2E6C8" stroke="#CDBA8E" strokeWidth="1.6" />)}
          <path d="M58 72 C58 36 78 24 100 24 C122 24 142 36 142 72Z" fill="#9AA3AE" stroke="#6C7580" strokeWidth="1.6" />
          <rect x="56" y="62" width="88" height="11" rx="3" fill="#7A838E" />
          <g fill="#D9A93A"><circle cx="70" cy="67.5" r="2" /><circle cx="100" cy="67.5" r="2" /><circle cx="130" cy="67.5" r="2" /></g>
          <path d="M100 26 V62" stroke="#6C7580" strokeWidth="3" />
        </g>
      ),
    }),
  },
  {
    id: "hat-cowboy", slot: "hat", name: "Kovboy şapkası", price: 100,
    draw: () => ({
      over: (
        <g strokeLinejoin="round">
          <path d="M30 68 Q58 80 100 76 Q142 80 170 68 Q152 56 134 59 Q100 63 66 59 Q48 56 30 68Z" fill="#A8743A" />
          <path d="M68 62 C66 36 80 28 100 33 C120 28 134 36 132 62 Q100 68 68 62Z" fill="#B9834A" />
          <path d="M68 56 Q100 63 132 56 V50 Q100 57 68 50Z" fill="#6B3F1D" />
          <path d="M89 35 Q100 43 111 35" stroke="#8A5A2A" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "hat-halo", slot: "hat", name: "Melek halesi", price: 250,
    draw: () => ({
      over: (
        <g>
          <ellipse cx="100" cy="20" rx="27" ry="8" fill="#FFF3A8" opacity=".35" />
          <ellipse cx="100" cy="20" rx="25" ry="7" fill="none" stroke="#FFD84D" strokeWidth="5" />
          <ellipse cx="100" cy="18.6" rx="25" ry="7" fill="none" stroke="#FFF3A8" strokeWidth="1.6" opacity=".8" />
        </g>
      ),
    }),
  },
  {
    id: "hat-bee", slot: "hat", name: "Arı antenleri", price: 80,
    draw: () => ({
      over: (
        <g strokeLinecap="round">
          <path d="M60 54 Q100 36 140 54" stroke="#2B2B2B" strokeWidth="3.4" fill="none" />
          <path d="M82 44 Q76 24 66 16 M118 44 Q124 24 134 16" stroke="#2B2B2B" strokeWidth="3" fill="none" />
          <circle cx="65" cy="15" r="6.5" fill="#F6C343" stroke="#2B2B2B" strokeWidth="2" />
          <circle cx="135" cy="15" r="6.5" fill="#F6C343" stroke="#2B2B2B" strokeWidth="2" />
        </g>
      ),
    }),
  },
  {
    id: "hat-comu-beanie", slot: "hat", name: "ÇOMÜ beresi", price: 110, set: "comu",
    draw: () => ({
      over: (
        <g>
          <path d="M51 78 C47 32 74 18 100 18 C126 18 153 32 149 78Z" fill="#1F3C88" />
          <path d="M72 30 V68 M100 22 V68 M128 30 V68" stroke="#14285F" strokeWidth="2" opacity=".5" />
          <rect x="48" y="66" width="104" height="17" rx="8.5" fill="#14285F" />
          <path d={star5(100, 74.5, 6)} fill="#FFB84D" />
          <circle cx="100" cy="17" r="9" fill="#FFB84D" />
        </g>
      ),
    }),
  },
];

/* ═════════ Gözlükler (gözler 84,90 ve 116,90) ═════════ */
const GLASSES: Item[] = [
  {
    id: "glasses-aviator", slot: "glasses", name: "Pilot gözlüğü", price: 90,
    draw: () => ({
      over: (
        <g>
          {mir(<path d="M69 81 H98 Q98 106 83 106 Q66 102 69 81Z" fill="#3A5F7A" fillOpacity=".5" stroke="#D9A93A" strokeWidth="2.4" strokeLinejoin="round" />)}
          <path d="M97 85 Q100 82 103 85 M69 85 L56 83 M131 85 L144 83" stroke="#D9A93A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M74 86 L80 86 M120 86 L126 86" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "glasses-nerd", slot: "glasses", name: "Kalın çerçeve", price: 60,
    draw: () => ({
      over: (
        <g stroke="#1C2A3A" strokeWidth="4.4" fill="#fff" fillOpacity=".15" strokeLinejoin="round">
          <rect x="70" y="79" width="26" height="22" rx="6" /><rect x="104" y="79" width="26" height="22" rx="6" />
          <path d="M96 86 H104 M70 85 L58 84 M130 85 L142 84" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "glasses-cat", slot: "glasses", name: "Kedi gözü gözlük", price: 100,
    draw: () => ({
      over: (
        <g>
          {mir(<path d="M66 92 L60 80 Q72 78 84 80 Q99 82 98 94 Q86 104 66 92Z" fill="#fff" fillOpacity=".18" stroke="#D9486B" strokeWidth="3" strokeLinejoin="round" />)}
          <path d="M98 88 Q100 86 102 88" stroke="#D9486B" strokeWidth="3" fill="none" strokeLinecap="round" />
          <g fill="#F7B5C8"><circle cx="63" cy="82" r="1.6" /><circle cx="137" cy="82" r="1.6" /></g>
        </g>
      ),
    }),
  },
  {
    id: "glasses-vr", slot: "glasses", name: "VR gözlük", price: 140,
    draw: () => ({
      over: (
        <g>
          <path d="M62 90 H44 M138 90 H156" stroke="#2A2F3A" strokeWidth="7" strokeLinecap="round" />
          <rect x="60" y="75" width="80" height="30" rx="11" fill="#2A2F3A" />
          <rect x="66" y="80" width="68" height="20" rx="8" fill="#5FD3F0" fillOpacity=".4" />
          <path d="M100 80 V100" stroke="#2A2F3A" strokeWidth="3" />
          <path d="M72 84 L84 84" stroke="#fff" strokeOpacity=".6" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="132" cy="90" r="2" fill="#6EE08A" />
        </g>
      ),
    }),
  },
  {
    id: "glasses-swim", slot: "glasses", name: "Yüzücü gözlüğü", price: 80,
    draw: () => ({
      over: (
        <g>
          <path d="M72 90 H54 M128 90 H146" stroke="#1F3C88" strokeWidth="5" strokeLinecap="round" />
          <circle cx="84" cy="90" r="13" fill="#6EC8F0" fillOpacity=".45" stroke="#1F3C88" strokeWidth="3.6" />
          <circle cx="116" cy="90" r="13" fill="#6EC8F0" fillOpacity=".45" stroke="#1F3C88" strokeWidth="3.6" />
          <path d="M97 90 H103" stroke="#1F3C88" strokeWidth="4" />
          <path d="M77 84 L82 82 M109 84 L114 82" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "glasses-rainbow", slot: "glasses", name: "Gökkuşağı gözlük", price: 120,
    draw: (c) => ({
      over: (
        <g>
          <defs>
            <linearGradient id={`${c.uid}rg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FF6B8A" /><stop offset=".33" stopColor="#F6E05E" /><stop offset=".66" stopColor="#6BD68A" /><stop offset="1" stopColor="#4FA8F0" />
            </linearGradient>
          </defs>
          <rect x="70" y="79" width="27" height="22" rx="9" fill={`url(#${c.uid}rg)`} fillOpacity=".85" stroke="#fff" strokeWidth="2.4" />
          <rect x="103" y="79" width="27" height="22" rx="9" fill={`url(#${c.uid}rg)`} fillOpacity=".85" stroke="#fff" strokeWidth="2.4" />
          <path d="M97 86 H103 M70 86 L58 84 M130 86 L142 84" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "glasses-eyepatch", slot: "glasses", name: "Göz bandı", price: 70,
    draw: () => ({
      over: (
        <g>
          <path d="M106 82 Q80 60 54 68 M126 82 Q142 72 148 76" stroke="#1C1C22" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="116" cy="91" rx="13" ry="12" fill="#1C1C22" />
          <ellipse cx="111" cy="86" rx="3.6" ry="2" fill="#fff" opacity=".18" />
        </g>
      ),
    }),
  },
  {
    id: "glasses-hero", slot: "glasses", name: "Kahraman maskesi", price: 90,
    draw: () => ({
      over: (
        <g>
          <path
            fillRule="evenodd" fill="#D9322B" stroke="#A12019" strokeWidth="1.6" strokeLinejoin="round"
            d={`M58 86 Q72 76 84 80 Q100 86 116 80 Q128 76 142 86 Q140 104 118 104 Q108 102 100 95 Q92 102 82 104 Q60 104 58 86Z ${circlePath(84, 91, 9.5)} ${circlePath(116, 91, 9.5)}`}
          />
          <path d="M62 86 Q72 80 82 83 M138 86 Q128 80 118 83" stroke="#fff" strokeOpacity=".35" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },
];

/* ═════════ Boyun & Rozet (gövde uzayı: boyun y≈140-156) ═════════ */
const NECKS: Item[] = [
  {
    id: "neck-pearl", slot: "neck", name: "İnci kolye", price: 100,
    draw: () => ({
      mid: (
        <g>
          {arcPoints(11, 74, 126, 141, 17).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === 5 ? 4.6 : 3.4} fill="#FDF6F0" stroke="#D9CFC4" strokeWidth="1" />
          ))}
        </g>
      ),
    }),
  },
  {
    id: "neck-lei", slot: "neck", name: "Çiçek kolye", price: 80,
    draw: () => ({
      mid: (
        <g>
          {arcPoints(7, 76, 124, 142, 17).map(([x, y], i) => flower(x, y + 2, 6, ["#F4A6B8", "#FFB347", "#fff", "#B79BE8"][i % 4], "#FFD84D", i))}
        </g>
      ),
    }),
  },
  {
    id: "neck-stetho", slot: "neck", name: "Steteskop", price: 90, set: "comu",
    draw: () => ({
      mid: (
        <g strokeLinecap="round">
          <path d="M84 139 Q78 172 100 178 Q122 172 116 139" stroke="#2B2F3A" strokeWidth="3.4" fill="none" />
          <circle cx="84" cy="139" r="3" fill="#8895A5" /><circle cx="116" cy="139" r="3" fill="#8895A5" />
          <circle cx="100" cy="180" r="7" fill="#8895A5" stroke="#5F6C7C" strokeWidth="2" />
          <circle cx="100" cy="180" r="3.4" fill="#C9D3DE" />
        </g>
      ),
    }),
  },
  {
    id: "neck-camera", slot: "neck", name: "Fotoğraf makinesi", price: 110,
    draw: () => ({
      mid: (
        <g>
          <path d="M82 139 Q100 168 118 139" stroke="#2B2F3A" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="86" y="160" width="28" height="19" rx="4" fill="#3A4250" />
          <rect x="92" y="156" width="8" height="5" rx="1.5" fill="#2B2F3A" />
          <circle cx="100" cy="170" r="7" fill="#1C2A3A" stroke="#8895A5" strokeWidth="2" />
          <circle cx="98" cy="168" r="2" fill="#fff" opacity=".6" />
          <rect x="106" y="163" width="5" height="3" rx="1" fill="#FFB84D" />
        </g>
      ),
    }),
  },
  {
    id: "neck-gold-medal", slot: "neck", name: "Altın madalya", price: 160,
    draw: () => ({
      mid: (
        <g strokeLinejoin="round">
          <path d="M84 139 L100 164 L116 139 L109 139 L100 153 L91 139Z" fill="#E5533D" />
          <path d="M91 139 L100 153 L109 139Z" fill="#2F6FD6" />
          <circle cx="100" cy="170" r="11" fill="#F6C343" stroke="#C9971F" strokeWidth="2" />
          <path d={star5(100, 170, 6.4)} fill="#FFE59A" stroke="#C9971F" strokeWidth="1" />
        </g>
      ),
    }),
  },
  {
    id: "neck-bandana", slot: "neck", name: "Bandana", price: 60,
    draw: () => ({
      mid: (
        <g strokeLinejoin="round">
          <path d="M72 138 Q100 152 128 138 L118 156 L100 174 L82 156Z" fill="#D9322B" />
          <path d="M72 138 Q100 152 128 138" stroke="#A12019" strokeWidth="2.4" fill="none" />
          <g fill="#fff" opacity=".85"><circle cx="90" cy="152" r="2" /><circle cx="110" cy="152" r="2" /><circle cx="100" cy="162" r="2" /><circle cx="100" cy="148" r="1.6" /></g>
        </g>
      ),
    }),
  },
  {
    id: "neck-comu-scarf", slot: "neck", name: "ÇOMÜ atkısı", price: 90, set: "comu",
    draw: () => ({
      mid: (
        <g>
          <path d="M108 150 H126 L128 188 Q117 193 108 188Z" fill="#1F3C88" />
          <path d="M108 162 H127 M108 172 H127 M108 182 H127" stroke="#fff" strokeWidth="3" />
          <path d="M76 137 Q100 158 124 137 L128 150 Q100 170 72 150Z" fill="#1F3C88" />
          <path d="M80 142 L78 154 M92 149 L91 161 M104 151 L104 162 M116 148 L117 160" stroke="#fff" strokeWidth="3" />
        </g>
      ),
    }),
  },
  {
    id: "neck-nazar", slot: "neck", name: "Nazar boncuğu", price: 70,
    draw: () => ({
      mid: (
        <g>
          <path d="M80 139 Q100 166 120 139" stroke="#2B2F3A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="164" r="11.5" fill="#1F5FBF" />
          <circle cx="100" cy="164" r="8.2" fill="#fff" />
          <circle cx="100" cy="164" r="5.4" fill="#52B6F0" />
          <circle cx="100" cy="164" r="2.6" fill="#101820" />
        </g>
      ),
    }),
  },
];

/* ═════════ Kıyafetler (gövde uzayı) ═════════ */
const TOPS: Item[] = [
  {
    id: "top-polo", slot: "top", name: "Mavi polo", price: 90,
    draw: (c) => ({
      mid: (
        <g>
          {sleeve("#3F7CB3", 172)}{torso("#3F7CB3")}{neckV(c.cs)}
          <path d="M86 140 L100 155 L114 140 L119 146 L100 160 L81 146Z" fill="#F4F7FA" />
          <path d="M100 156 V182" stroke="#2F5F8C" strokeWidth="2.4" />
          <g fill="#F4F7FA"><circle cx="100" cy="166" r="1.8" /><circle cx="100" cy="175" r="1.8" /></g>
        </g>
      ),
    }),
  },
  {
    id: "top-overall", slot: "top", name: "Tulum", price: 130,
    draw: (c) => ({
      mid: (
        <g>
          {sleeve("#F6C343", 172)}{torso("#F6C343")}{neckV(c.cs)}
          <path d="M82 138 V162 M118 138 V162" stroke="#3F66A8" strokeWidth="8" strokeLinecap="round" />
          <rect x="79" y="158" width="42" height="44" rx="6" fill="#4A74BC" />
          <rect x="89" y="174" width="22" height="14" rx="3" fill="#3F66A8" />
          <path d="M79 202 H121" stroke="#3F66A8" strokeWidth="2" />
          <g fill="#F6C343" stroke="#C9971F" strokeWidth="1"><circle cx="82" cy="162" r="2.6" /><circle cx="118" cy="162" r="2.6" /></g>
        </g>
      ),
    }),
  },
  {
    id: "top-chef", slot: "top", name: "Aşçı önlüğü", price: 120,
    draw: () => ({
      mid: (
        <g>
          {sleeve("#FFFFFF", 196)}{torso("#F7F9FB")}
          <path d="M80 140 L100 152 L120 140" stroke="#D5DCE2" strokeWidth="2.4" fill="none" />
          <path d="M100 152 V202" stroke="#D5DCE2" strokeWidth="2" />
          <g fill="#C9D3DA"><circle cx="90" cy="164" r="2.6" /><circle cx="90" cy="178" r="2.6" /><circle cx="90" cy="192" r="2.6" /><circle cx="110" cy="164" r="2.6" /><circle cx="110" cy="178" r="2.6" /><circle cx="110" cy="192" r="2.6" /></g>
          <path d="M88 141 L100 150 L112 141 L108 158 L100 152 L92 158Z" fill="#D9322B" />
        </g>
      ),
    }),
  },
  {
    id: "top-lab", slot: "top", name: "Laboratuvar önlüğü", price: 130, set: "comu",
    draw: () => ({
      mid: (
        <g>
          {sleeve("#F7F9FB", 196)}{torso("#F7F9FB")}
          <path d="M88 140 L100 174 L112 140Z" fill="#4A9AE0" />
          <path d="M80 140 L98 176 M120 140 L102 176" stroke="#D5DCE2" strokeWidth="2.4" fill="none" />
          <path d="M100 176 V202" stroke="#D5DCE2" strokeWidth="2" />
          <rect x="108" y="180" width="16" height="14" rx="2.6" fill="none" stroke="#D5DCE2" strokeWidth="1.8" />
          <path d="M114 176 V186 M118 177 V186" stroke="#E5533D" strokeWidth="2" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "top-space", slot: "top", name: "Astronot kıyafeti", price: 220,
    draw: () => ({
      mid: (
        <g>
          {sleeve("#E9EEF3", 196)}{torso("#E9EEF3")}
          <path d="M80 140 Q100 154 120 140" stroke="#F08A2E" strokeWidth="7" fill="none" strokeLinecap="round" />
          <rect x="84" y="162" width="32" height="20" rx="5" fill="#8895A5" stroke="#5F6C7C" strokeWidth="1.6" />
          <circle cx="92" cy="172" r="3" fill="#E5533D" /><circle cx="100" cy="172" r="3" fill="#6EE08A" /><circle cx="108" cy="172" r="3" fill="#F6C343" />
          <circle cx="76" cy="190" r="6" fill="#2F6FD6" stroke="#fff" strokeWidth="1.6" />
          <path d="M72 190 H80 M76 186 V194" stroke="#fff" strokeWidth="1.2" />
          <path d="M68 198 H132" stroke="#F08A2E" strokeWidth="4" />
          <path d="M57 176 L52 192 M143 176 L148 192" stroke="#F08A2E" strokeWidth="5" strokeLinecap="round" />
        </g>
      ),
    }),
  },
  {
    id: "top-tux", slot: "top", name: "Smokin", price: 260,
    draw: () => ({
      mid: (
        <g>
          {sleeve("#23232C", 196)}{torso("#23232C")}
          <path d="M88 140 L100 192 L112 140Z" fill="#F7F9FB" />
          <path d="M78 140 L96 178 L86 198 L72 150Z M122 140 L104 178 L114 198 L128 150Z" fill="#33333D" />
          <g fill="#23232C"><circle cx="100" cy="162" r="1.8" /><circle cx="100" cy="174" r="1.8" /><circle cx="100" cy="186" r="1.8" /></g>
          <path d="M100 150 L88 143 V157Z M100 150 L112 143 V157Z" fill="#D9322B" stroke="#A12019" strokeWidth="1" strokeLinejoin="round" />
          <rect x="96" y="146" width="8" height="8" rx="2.6" fill="#B02720" />
        </g>
      ),
    }),
  },
  {
    id: "top-hawaii", slot: "top", name: "Hawaii gömleği", price: 100,
    draw: (c) => ({
      mid: (
        <g>
          {sleeve("#2CC4B5", 172)}{torso("#2CC4B5")}{neckV(c.cs)}
          <path d="M86 140 L100 160 L114 140 L120 146 L100 168 L80 146Z" fill="#F4F7FA" />
          {flower(80, 172, 6, "#F4A6B8", "#FFD84D", 1)}
          {flower(118, 178, 6, "#FFB347", "#fff", 2)}
          {flower(92, 192, 5, "#fff", "#E8718A", 3)}
          {flower(112, 160, 4.4, "#F4A6B8", "#FFD84D", 4)}
          <g fill="#1B8F84"><ellipse cx="74" cy="182" rx="5" ry="2.4" /><ellipse cx="124" cy="190" rx="5" ry="2.4" /></g>
        </g>
      ),
    }),
  },
  {
    id: "top-xmas", slot: "top", name: "Noel kazağı", price: 100,
    draw: () => ({
      mid: (
        <g>
          {sleeve("#C8202B", 196)}{torso("#C8202B")}
          <path d="M78 140 Q100 158 122 140 L124 148 Q100 166 76 148Z" fill="#F4F7FA" />
          <path d="M68 168 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8" stroke="#F4F7FA" strokeWidth="3" fill="none" strokeLinejoin="round" />
          <path d="M68 184 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8" stroke="#2F9E5A" strokeWidth="3" fill="none" strokeLinejoin="round" />
          <g fill="#F4F7FA"><circle cx="84" cy="196" r="2" /><circle cx="100" cy="196" r="2" /><circle cx="116" cy="196" r="2" /></g>
          <path d="M68 198 H132" stroke="#F4F7FA" strokeWidth="4" />
        </g>
      ),
    }),
  },
  {
    id: "top-bigova-hoodie", slot: "top", name: "Bigova hoodie", price: 140, set: "bigova",
    draw: () => ({
      mid: (
        <g>
          {sleeve("#0E3A5B", 196)}{torso("#0E3A5B")}
          <path d="M76 142 Q100 168 124 142 L118 139 Q100 154 82 139Z" fill="#072638" />
          <path d="M80 186 H120 L124 202 H76Z" fill="#0A2D47" />
          <path d="M95 154 V168 M105 154 V168" stroke="#F4F7FA" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="100" cy="177" r="8" fill="#F6C343" stroke="#C9971F" strokeWidth="1.6" />
          <circle cx="100" cy="177" r="4.6" fill="none" stroke="#C9971F" strokeWidth="1.4" />
        </g>
      ),
    }),
  },
];

export const EXTRA_A: Item[] = [...HATS, ...GLASSES, ...NECKS, ...TOPS];
