import { mir, shade, star5, tint } from "./draw";
import { flower } from "./itemsKit";
import type { Pal, SpeciesDef } from "./species";

/* İkinci ek tür grubu (Civciv, Kuzu, İnek, Fare, Papağan, Fil, Kaplan, Zebra, Flamingo, Hayalet, Galaksi Kedisi). */
const pal = (rows: [string, string, string?][]): Pal[] =>
  rows.map(([name, c, b], i) => ({ id: `c${i + 1}`, name, c, b }));
const PINK = "#F4A6B8";
const DARK = "#2B2430";

const birdLegs = (color: string) => (
  <g fill={color}>
    <rect x="83" y="196" width="8" height="52" rx="4" />
    <rect x="109" y="196" width="8" height="52" rx="4" />
    <path d="M70 254 Q87 242 104 254 Q87 258 70 254Z" />
    <path d="M96 254 Q113 242 130 254 Q113 258 96 254Z" />
  </g>
);

export const EXTRA_SPECIES_2: SpeciesDef[] = [
  /* ───── Civciv ───── */
  {
    id: "civciv", name: "Civciv", price: 60, tier: "Yaygın",
    featureLabel: "Tüy", features: ["Tüy tepeli", "Minik tüylü", "Yumurta kabuklu"],
    palette: pal([
      ["Sarı", "#FFD84D"], ["Limon", "#F2EC6A"], ["Turuncu", "#FFAA4D"], ["Pembe", "#F7A8C4"],
      ["Mavi", "#7FC4F0"], ["Nane", "#9BE3C0"], ["Lila", "#C5A8F0"], ["Beyaz", "#F4F1EA"],
    ]),
    parts: (x) => ({
      foot: "#FF9A3C", legs: birdLegs("#FF9A3C"),
      back: mir(<path d="M68 154 C44 156 42 192 64 194Z" fill={x.cs} />),
      after: (
        <g>
          <path d="M91 99 Q100 92 109 99 Q107 111 100 113 Q93 111 91 99Z" fill="#FF9A3C" stroke="#D9701A" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M94 103 Q100 106 106 103" stroke="#D9701A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      ),
      over:
        x.f === 0 ? (
          <g fill={x.c} stroke={x.cs} strokeWidth="1.4" strokeLinejoin="round">
            <path d="M94 44 Q86 26 96 14 Q100 28 102 16 Q112 30 106 44Z" />
          </g>
        ) : x.f === 1 ? (
          <path d="M96 44 Q94 32 104 28 Q104 38 106 44Z" fill={x.c} stroke={x.cs} strokeWidth="1.4" strokeLinejoin="round" />
        ) : (
          <path d="M56 62 C54 26 146 26 144 62 L134 52 L123 66 L112 52 L100 67 L88 52 L77 66 L66 52Z" fill="#fff" stroke="#E0D9CC" strokeWidth="1.6" strokeLinejoin="round" />
        ),
    }),
  },

  /* ───── Kuzu ───── */
  {
    id: "kuzu", name: "Kuzu", price: 70, tier: "Yaygın",
    featureLabel: "Süs", features: ["Yünlü", "Boynuzlu", "Çiçekli"],
    palette: pal([
      ["Bulut", "#F4F2EE", "#4A3F45"], ["Krem", "#EFE3CC", "#7A5C48"], ["Pembe", "#F7D3E0", "#F6E3D0"], ["Mavi", "#CFE3F6", "#F6E3D0"],
      ["Lila", "#DCCBF3", "#F6E3D0"], ["Nane", "#CFEBDD", "#F6E3D0"], ["Kömür", "#6A6672", "#D6D0DC"], ["Altın", "#F2D893", "#F6E8CF"],
    ]),
    parts: (x) => ({
      limb: x.belly, hand: x.belly, foot: shade(x.belly, -0.3), bellyFill: tint(x.c, 0.5),
      eyes: { ring: "#fff" },
      headBack: (
        <g>
          <g fill={x.c} stroke={x.cs} strokeWidth="1.2">
            {[[58, 62], [74, 44], [100, 38], [126, 44], [142, 62], [56, 90], [144, 90]].map(([cx, cy]) => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="17" />)}
          </g>
          {mir(<ellipse cx="50" cy="88" rx="15" ry="8" transform="rotate(24 50 88)" fill={x.belly} stroke={shade(x.belly, -0.2)} strokeWidth="1.2" />)}
          {x.f === 1 && mir(<path d="M64 50 C46 40 40 62 54 66 C46 58 50 50 60 54" stroke="#C9A26A" strokeWidth="5" fill="none" strokeLinecap="round" />)}
        </g>
      ),
      face: <path d="M66 72 Q100 56 134 72 Q144 102 128 120 Q100 134 72 120 Q56 102 66 72Z" fill={x.belly} />,
      after: (
        <g>
          <ellipse cx="100" cy="102" rx="6" ry="4.4" fill={DARK} opacity=".85" />
          <path d="M100 106 V110 M100 110 Q94 116 89 112 M100 110 Q106 116 111 112" stroke={DARK} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".85" />
        </g>
      ),
      over: (
        <g>
          <g fill={x.c} stroke={x.cs} strokeWidth="1.2"><circle cx="86" cy="52" r="12" /><circle cx="100" cy="48" r="13" /><circle cx="114" cy="52" r="12" /></g>
          {x.f === 2 && flower(126, 46, 7, PINK, "#FFD84D")}
        </g>
      ),
    }),
  },

  /* ───── İnek ───── */
  {
    id: "inek", name: "İnek", price: 90, tier: "Yaygın",
    featureLabel: "Leke", features: ["Göz lekeli", "Çift leke", "Düz"],
    palette: pal([
      ["Siyah", "#2E2B33"], ["Kahve", "#8B5A33"], ["Gül", "#E77FA5"], ["Gökyüzü", "#5B8BC9"],
      ["Orman", "#4F8F5A"], ["Mor", "#8D6BC9"], ["Turuncu", "#E8873A"], ["Gri", "#8E949C"],
    ]),
    parts: (x) => ({
      head: "#FAFAF6", body: "#FAFAF6", bellyFill: "#FFFFFF", limb: "#F3F1EA", hand: "#F3F1EA", foot: x.c,
      back: <path d="M128 202 C160 204 166 184 160 170" stroke="#F3F1EA" strokeWidth="8" strokeLinecap="round" fill="none" />,
      bodyOver: x.f === 2 ? null : <g fill={x.c}><ellipse cx="82" cy="156" rx="11" ry="8" /><ellipse cx="122" cy="188" rx="9" ry="10" /></g>,
      headBack: (
        <g>
          {mir(<path d="M62 58 C54 44 56 34 66 30 C70 40 72 50 74 58Z" fill="#EFE3C6" stroke="#D9C9A4" strokeWidth="1.4" />)}
          {mir(<g><ellipse cx="48" cy="80" rx="17" ry="9" transform="rotate(22 48 80)" fill="#FAFAF6" /><ellipse cx="48" cy="80" rx="10" ry="5" transform="rotate(22 48 80)" fill={PINK} /></g>)}
        </g>
      ),
      face: (
        <g>
          <clipPath id={`${x.uid}hd`}><ellipse cx="100" cy="84" rx="44" ry="46" /></clipPath>
          <g clipPath={`url(#${x.uid}hd)`} fill={x.c}>
            {x.f === 0 && <ellipse cx="72" cy="74" rx="20" ry="22" transform="rotate(-12 72 74)" />}
            {x.f === 1 && (<><ellipse cx="66" cy="96" rx="14" ry="12" /><ellipse cx="128" cy="56" rx="15" ry="13" /></>)}
          </g>
          <ellipse cx="100" cy="109" rx="27" ry="17" fill="#F8B7C5" />
        </g>
      ),
      after: (
        <g fill="#B8566E">
          <ellipse cx="90" cy="109" rx="3.6" ry="5" /><ellipse cx="110" cy="109" rx="3.6" ry="5" />
          <path d="M92 119 Q100 124 108 119" stroke="#B8566E" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      ),
    }),
  },

  /* ───── Fare ───── */
  {
    id: "fare", name: "Fare", price: 70, tier: "Yaygın",
    featureLabel: "Detay", features: ["Büyük kulak", "Küçük kulak", "Peynirli"],
    palette: pal([
      ["Gri", "#A3A9B3", "#F4D8DF"], ["Beyaz", "#F4F1F0", "#FFD9E2"], ["Kahve", "#A8774C", "#F0D2B8"], ["Siyah", "#3C3A43", "#B79AA6"],
      ["Krem", "#E8D3AE", "#FFE6EA"], ["Mavi", "#8BB0D9", "#F2DCE8"], ["Pembe", "#F0A9C2", "#FFE6EE"], ["Altın", "#E2B25E", "#FBE6BC"],
    ]),
    parts: (x) => ({
      back: <path d="M126 206 C176 218 192 176 170 150" stroke={PINK} strokeWidth="5" strokeLinecap="round" fill="none" />,
      headBack: mir(
        <g>
          <circle cx="62" cy="54" r={x.f === 1 ? 14 : 20} fill={x.c} />
          <circle cx="62" cy="54" r={x.f === 1 ? 8.5 : 12.5} fill={PINK} />
        </g>,
      ),
      face: <ellipse cx="100" cy="108" rx="19" ry="13" fill={x.belly} />,
      after: (
        <g>
          <ellipse cx="100" cy="100" rx="5" ry="4" fill="#EE7F9B" />
          <path d="M100 104 V108 M100 108 Q94 113 90 110 M100 108 Q106 113 110 110" stroke="#6B3B3B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <rect x="96.6" y="109" width="3.2" height="6.4" rx="1" fill="#fff" stroke="#D9CFC3" strokeWidth=".6" />
          <rect x="100.4" y="109" width="3.2" height="6.4" rx="1" fill="#fff" stroke="#D9CFC3" strokeWidth=".6" />
          <path d="M80 104 L58 98 M80 109 L58 110 M80 114 L60 122 M120 104 L142 98 M120 109 L142 110 M120 114 L140 122" stroke={x.cd} strokeWidth="1.4" strokeLinecap="round" opacity=".5" />
        </g>
      ),
      over: x.f === 2 ? (
        <g strokeLinejoin="round">
          <path d="M82 38 L120 44 L114 62 L82 58Z" fill="#F6C343" stroke="#C9971F" strokeWidth="1.6" />
          <g fill="#E3A82A"><circle cx="96" cy="50" r="2.8" /><circle cx="108" cy="54" r="2.2" /><circle cx="90" cy="56" r="1.8" /></g>
        </g>
      ) : null,
    }),
  },

  /* ───── Papağan ───── */
  {
    id: "papagan", name: "Papağan", price: 250, tier: "Nadir",
    featureLabel: "İbik", features: ["Kırmızı ibik", "Mavi ibik", "Yeşil ibik"],
    palette: pal([
      ["Kırmızı", "#E5533D", "#FFB59C"], ["Mavi", "#2F7FD6", "#A8D0F7"], ["Yeşil", "#3FAE5E", "#B8EBC6"], ["Sarı", "#F6C343", "#FFE9A6"],
      ["Mor", "#8E5FD0", "#D8C4F6"], ["Turkuaz", "#2CB8B0", "#B0EEE9"], ["Turuncu", "#F28A2E", "#FFCFA0"], ["Pembe", "#EC7FAE", "#FFC9DF"],
    ]),
    parts: (x) => {
      const crest = ["#E5533D", "#2F7FD6", "#3FAE5E"][x.f];
      return {
        foot: "#7C7F8A", legs: birdLegs("#8E919C"), hand: x.cs,
        low: (
          <g strokeLinecap="round" fill="none">
            <path d="M92 206 L86 264" stroke="#E5533D" strokeWidth="8" />
            <path d="M108 206 L114 264" stroke="#2F7FD6" strokeWidth="8" />
            <path d="M100 206 L100 268" stroke="#F6C343" strokeWidth="8" />
          </g>
        ),
        back: mir(<path d="M68 150 C40 158 34 196 50 216 C58 192 66 178 74 170Z" fill={x.cs} stroke={shade(x.cs, -0.2)} strokeWidth="1.4" strokeLinejoin="round" />),
        face: mir(<ellipse cx="84" cy="92" rx="17" ry="17" fill="#FFFFFF" />),
        eyes: { s: 0.95 },
        after: (
          <g strokeLinejoin="round">
            <path d="M89 99 Q100 89 111 99 Q114 114 100 124 Q96 116 89 99Z" fill="#3A3A44" />
            <path d="M89 99 Q100 89 111 99 Q108 104 100 104 Q92 104 89 99Z" fill="#F08A2E" />
            <path d="M94 97 Q98 94 101 95" stroke="#fff" strokeOpacity=".5" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        ),
        over: (
          <g strokeLinejoin="round">
            <path d="M96 44 Q82 26 90 8 Q98 22 100 12 Q104 26 112 12 Q120 28 108 44Z" fill={crest} stroke={shade(crest, -0.25)} strokeWidth="1.4" />
            <path d="M100 42 Q98 26 102 18" stroke="#fff" strokeOpacity=".4" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        ),
      };
    },
  },

  /* ───── Fil ───── */
  {
    id: "fil", name: "Fil", price: 270, tier: "Nadir",
    featureLabel: "Kulak", features: ["Büyük kulak", "Orta kulak", "Kısa hortum"],
    palette: pal([
      ["Gri", "#A7B0BD", "#E9EDF2"], ["Mavi", "#8FB6E0", "#E3EFFA"], ["Pembe", "#F0A9C2", "#FFE6EE"], ["Kahve", "#A9805E", "#EEDCC8"],
      ["Mor", "#A890D8", "#EEE8FA"], ["Nane", "#9CD6BE", "#E4F7EE"], ["Altın", "#E2BB6C", "#FBEBC8"], ["Gece", "#59607A", "#B7BDD0"],
    ]),
    parts: (x) => {
      const ear = x.f === 1 ? 19 : 24;
      const short = x.f === 2;
      return {
        back: <path d="M128 204 C150 206 156 190 152 178" stroke={x.c} strokeWidth="6" strokeLinecap="round" fill="none" />,
        headBack: mir(
          <g>
            <ellipse cx="52" cy="86" rx={ear} ry={ear * 1.12} fill={x.c} />
            <ellipse cx="54" cy="88" rx={ear * 0.62} ry={ear * 0.74} fill={PINK} opacity=".85" />
          </g>,
        ),
        face: <ellipse cx="100" cy="108" rx="20" ry="14" fill={x.belly} opacity=".85" />,
        after: (
          <g strokeLinejoin="round" strokeLinecap="round">
            {mir(<path d="M88 114 Q82 124 80 134 Q88 130 93 122Z" fill="#FFFDF4" stroke="#E3DCC8" strokeWidth="1.2" />)}
            <path
              d={short ? "M92 102 Q91 118 98 122 Q104 124 106 118 Q108 112 108 102Z" : "M92 102 Q90 128 98 138 Q106 144 108 132 Q109 118 108 102Z"}
              fill={x.c} stroke={x.cs} strokeWidth="1.4"
            />
            <path d={short ? "M93 108 Q100 112 107 108 M93 114 Q100 118 106 114" : "M92 112 Q100 117 108 112 M92 120 Q100 125 108 120 M93 128 Q100 133 107 128"} stroke={x.cs} strokeWidth="1.4" fill="none" opacity=".6" />
          </g>
        ),
      };
    },
  },

  /* ───── Kaplan ───── */
  {
    id: "kaplan", name: "Kaplan", price: 290, tier: "Nadir",
    featureLabel: "Desen", features: ["Kalın şerit", "İnce şerit", "Benekli"],
    palette: pal([
      ["Turuncu", "#F0933A", "#FFF0DA"], ["Beyaz", "#F1EFEA", "#FFFFFF"], ["Altın", "#E3B04E", "#FFF1CE"], ["Kar mavisi", "#9CC2E8", "#EAF4FC"],
      ["Kızıl", "#C45A2A", "#F6D6BA"], ["Gece", "#4A4A5A", "#B7B9C8"], ["Pembe", "#F2A0BE", "#FFE8F0"], ["Zümrüt", "#58B58A", "#DDF5E9"],
    ]),
    parts: (x) => {
      const st = "#2A1F1A";
      return {
        back: (
          <g>
            <path d="M126 204 C172 214 188 172 168 142" stroke={x.c} strokeWidth="12" strokeLinecap="round" fill="none" />
            <path d="M176 156 L164 160 M182 172 L168 174 M172 190 L160 186" stroke={st} strokeWidth="4.4" strokeLinecap="round" />
          </g>
        ),
        headBack: mir(<g><circle cx="64" cy="52" r="15" fill={x.c} /><circle cx="64" cy="52" r="8.4" fill={x.belly} /></g>),
        bodyOver: (
          <g stroke={st} strokeWidth={x.f === 1 ? 3 : 5} strokeLinecap="round" opacity=".85">
            <path d="M70 160 L84 164 M70 176 L86 178 M130 160 L116 164 M130 176 L114 178 M72 192 L86 190 M128 192 L114 190" />
          </g>
        ),
        face: (
          <g>
            <clipPath id={`${x.uid}hd`}><ellipse cx="100" cy="84" rx="44" ry="46" /></clipPath>
            <g clipPath={`url(#${x.uid}hd)`} stroke={st} strokeLinecap="round" fill="none" strokeWidth={x.f === 1 ? 2.8 : 5}>
              {x.f !== 2 && (
                <g>
                  <path d="M100 36 V58 M88 38 L91 56 M112 38 L109 56" />
                  {mir(<path d="M54 90 L74 94 M54 102 L72 102" />)}
                  {x.f === 1 && <path d="M78 40 L81 52 M122 40 L119 52" />}
                </g>
              )}
              {x.f === 2 && (
                <g fill={st} stroke="none" opacity=".85">
                  {[[70, 56], [86, 48], [114, 48], [130, 56], [62, 82], [138, 82], [100, 44], [64, 104], [136, 104]].map(([cx, cy]) => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="4.2" />)}
                </g>
              )}
            </g>
            <ellipse cx="100" cy="108" rx="21" ry="14" fill={x.belly} />
          </g>
        ),
        after: (
          <g>
            <path d="M93 99 Q100 95 107 99 Q104 106 100 106 Q96 106 93 99Z" fill="#E8718A" />
            <path d="M100 106 V109 M100 109 Q93 115 88 111 M100 109 Q107 115 112 111" stroke="#4A2E2E" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        ),
      };
    },
  },

  /* ───── Zebra ───── */
  {
    id: "zebra", name: "Zebra", price: 280, tier: "Nadir",
    featureLabel: "Süs", features: ["Yeleli", "Yelesiz", "Fiyonklu"],
    palette: pal([
      ["Klasik", "#2A2A32", "#D9CFC4"], ["Lacivert", "#2B3F7A", "#D6D9E6"], ["Kahve", "#6B4423", "#E3CDB0"], ["Pembe", "#E0709A", "#F6D6E2"],
      ["Mor", "#6E55B8", "#E0D8F4"], ["Orman", "#2F7A4F", "#D6EADD"], ["Turuncu", "#E5772E", "#F6DEC6"], ["Okyanus", "#2F7FB8", "#D6E8F4"],
    ]),
    parts: (x) => ({
      head: "#FAFAF7", body: "#FAFAF7", bellyFill: "#FFFFFF", limb: "#F2F1EC", hand: "#F2F1EC", foot: x.c,
      back: <path d="M128 204 C156 206 164 188 158 174" stroke={x.c} strokeWidth="7" strokeLinecap="round" fill="none" />,
      bodyOver: (
        <g stroke={x.c} strokeWidth="5" strokeLinecap="round" opacity=".9">
          <path d="M70 158 L86 162 M70 174 L88 176 M130 158 L114 162 M130 174 L112 176 M72 190 L88 188 M128 190 L112 188" />
        </g>
      ),
      headBack: mir(<g><path d="M62 72 L56 28 L90 52Z" fill="#FAFAF7" stroke="#D9D9D2" strokeWidth="1.4" strokeLinejoin="round" /><path d="M66 62 L63 40 L82 52Z" fill={x.c} /></g>),
      face: (
        <g>
          <clipPath id={`${x.uid}hd`}><ellipse cx="100" cy="84" rx="44" ry="46" /></clipPath>
          <g clipPath={`url(#${x.uid}hd)`} stroke={x.c} strokeWidth="6" strokeLinecap="round" fill="none">
            {mir(<path d="M56 68 L74 74 M52 84 L70 88 M54 100 L68 100 M76 38 L82 56" />)}
            <path d="M100 36 V54" />
          </g>
          <ellipse cx="100" cy="108" rx="22" ry="15" fill={x.belly} />
        </g>
      ),
      after: (
        <g>
          <ellipse cx="91" cy="106" rx="3.2" ry="4.4" fill={DARK} opacity=".8" /><ellipse cx="109" cy="106" rx="3.2" ry="4.4" fill={DARK} opacity=".8" />
          <path d="M92 116 Q100 122 108 116" stroke={DARK} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".8" />
        </g>
      ),
      over:
        x.f === 0 ? (
          <path d="M84 44 C86 30 92 22 96 18 C98 28 98 34 100 40 C102 34 102 28 104 18 C108 22 114 30 116 44Z" fill={x.c} />
        ) : x.f === 2 ? (
          <g strokeLinejoin="round" fill="#F46A94" stroke="#C93E69" strokeWidth="1.4">
            <path d="M124 48 L146 36 V62Z" /><path d="M124 48 L102 36 V62Z" />
            <rect x="118" y="42" width="12" height="12" rx="4" />
          </g>
        ) : null,
    }),
  },

  /* ───── Flamingo ───── */
  {
    id: "flamingo", name: "Flamingo", price: 260, tier: "Nadir",
    featureLabel: "Süs", features: ["Tüy tepeli", "Sade", "Çiçekli"],
    palette: pal([
      ["Pembe", "#F48FB1", "#FFD3E2"], ["Mercan", "#F7826E", "#FFD0C4"], ["Gül", "#E86A9A", "#FFC4DA"], ["Şeftali", "#FFB38A", "#FFE3D1"],
      ["Lila", "#C39BEA", "#EEDFFB"], ["Turkuaz", "#4FC7C7", "#CDF3F1"], ["Sarı", "#F6C94E", "#FFEDB0"], ["Beyaz", "#F4EFEF", "#FFFFFF"],
    ]),
    parts: (x) => ({
      foot: shade(x.c, -0.2), legs: birdLegs(shade(x.c, -0.12)),
      back: mir(<path d="M68 150 C44 156 42 188 56 204 C60 184 68 174 74 166Z" fill={x.cs} />),
      after: (
        <g strokeLinejoin="round">
          <path d="M88 98 Q100 90 112 98 Q114 112 100 122 Q86 112 88 98Z" fill="#FFE1CF" stroke="#E3B9A2" strokeWidth="1.2" />
          <path d="M91 110 Q100 124 109 110 Q106 118 100 122 Q94 118 91 110Z" fill="#2B2B33" />
          <circle cx="96" cy="103" r="1.4" fill="#C98F7A" /><circle cx="104" cy="103" r="1.4" fill="#C98F7A" />
        </g>
      ),
      over:
        x.f === 0 ? (
          <g fill={x.c} stroke={x.cs} strokeWidth="1.4" strokeLinejoin="round">
            <path d="M90 44 Q76 30 84 14 Q94 24 98 40Z" /><path d="M98 44 Q96 22 108 10 Q112 28 108 44Z" /><path d="M106 44 Q112 26 128 22 Q124 38 112 46Z" />
          </g>
        ) : x.f === 2 ? (
          <g>{flower(120, 46, 8, "#FF6FA0", "#FFD84D")}{flower(104, 40, 6, "#fff", "#FFB347")}</g>
        ) : null,
    }),
  },

  /* ───── Hayalet (efsanevi) ───── */
  {
    id: "hayalet", name: "Hayalet", price: 700, tier: "Efsanevi",
    featureLabel: "Surat", features: ["Gülen", "Şaşkın", "Uykulu"],
    palette: pal([
      ["Hayalet", "#F3F1FB"], ["Nane", "#D2F5E6"], ["Pembe", "#FFDDEB"], ["Mavi", "#D4E8FF"],
      ["Lila", "#E3D6FA"], ["Altın", "#FFF0C2"], ["Gece", "#8C86B8"], ["Balkabağı", "#FFD2A6"],
    ]),
    parts: (x) => ({
      bellyFill: null, limb: x.c, hand: x.c, foot: x.cs,
      legs: (
        <path d="M70 190 H130 V244 Q121 256 112 244 Q103 256 94 244 Q85 256 76 244 Q70 250 70 244Z" fill={x.c} stroke={shade(x.c, -0.2)} strokeWidth="1.6" strokeLinejoin="round" />
      ),
      headBack: (
        <g fill={tint(x.c, 0.2)} opacity=".9">
          <path d={star5(38, 56, 7)} /><path d={star5(166, 70, 6)} /><path d={star5(150, 30, 4.6)} />
        </g>
      ),
      after: (
        <g stroke="#3A3550" strokeLinecap="round" fill="none" strokeWidth="2.4">
          {x.f === 0 && <path d="M90 108 Q100 120 110 108" />}
          {x.f === 1 && <ellipse cx="100" cy="112" rx="6" ry="8" fill="#3A3550" stroke="none" />}
          {x.f === 2 && <path d="M92 110 Q96 114 100 110 Q104 114 108 110" />}
        </g>
      ),
      over: <path d="M100 42 Q92 26 106 20 Q112 30 104 34" stroke={shade(x.c, -0.18)} strokeWidth="4" fill="none" strokeLinecap="round" />,
    }),
  },

  /* ───── Galaksi Kedisi (efsanevi) ───── */
  {
    id: "galaksi", name: "Galaksi Kedisi", price: 780, tier: "Efsanevi",
    featureLabel: "Desen", features: ["Yıldız tozu", "Bulutsu", "Ay lekesi"],
    palette: pal([
      ["Gece", "#2C2F6B", "#8E93E8"], ["Mor", "#4B2C7A", "#B58AF0"], ["Okyanus", "#1F5A6B", "#6FD3E0"], ["Bordo", "#6B2442", "#E58AB0"],
      ["Siyah", "#1C1F2E", "#7C86B8"], ["Lacivert", "#233A7A", "#7FA8F2"], ["Zümrüt", "#1F6B52", "#7FE0B8"], ["Gül", "#8A3F7A", "#F0A0DC"],
    ]),
    parts: (x) => ({
      back: (
        <g>
          <path d="M126 204 C176 214 192 168 170 138" stroke={x.c} strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d={star5(171, 134, 11)} fill="#FFE59A" stroke="#E3B040" strokeWidth="1.4" strokeLinejoin="round" />
        </g>
      ),
      bodyOver: (
        <g>
          <path d={star5(84, 162, 4.6)} fill="#fff" opacity=".9" /><path d={star5(118, 176, 3.6)} fill="#FFE59A" /><path d={star5(92, 192, 3)} fill="#fff" opacity=".8" /><path d={star5(122, 152, 3)} fill="#fff" opacity=".7" />
        </g>
      ),
      headBack: mir(
        <g>
          <path d="M54 76 L56 28 L94 50Z" fill={x.c} strokeLinejoin="round" />
          <path d="M62 66 L63 41 L84 53Z" fill={x.belly} opacity=".8" />
          <path d={star5(60, 24, 6)} fill="#FFE59A" />
        </g>,
      ),
      face: (
        <g>
          <clipPath id={`${x.uid}hd`}><ellipse cx="100" cy="84" rx="44" ry="46" /></clipPath>
          <g clipPath={`url(#${x.uid}hd)`}>
            {x.f === 0 && (
              <g fill="#fff" opacity=".9">
                {[[66, 62, 2.4], [82, 48, 1.8], [118, 50, 2.2], [134, 64, 1.8], [60, 90, 1.6], [140, 92, 2], [100, 44, 1.6], [74, 78, 1.4], [128, 78, 1.4]].map(([cx, cy, r]) => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={r} />)}
                <path d={star5(112, 62, 5)} fill="#FFE59A" />
              </g>
            )}
            {x.f === 1 && (
              <g>
                <ellipse cx="74" cy="64" rx="26" ry="14" fill="#FF7AC8" opacity=".38" transform="rotate(-18 74 64)" />
                <ellipse cx="128" cy="74" rx="24" ry="12" fill="#6FD3E0" opacity=".38" transform="rotate(16 128 74)" />
                <g fill="#fff" opacity=".85"><circle cx="90" cy="52" r="1.6" /><circle cx="116" cy="58" r="1.6" /><circle cx="64" cy="88" r="1.4" /></g>
              </g>
            )}
            {x.f === 2 && <path d="M96 40 A14 14 0 1 0 108 66 A11 11 0 1 1 96 40Z" fill="#FFE59A" />}
          </g>
          <ellipse cx="100" cy="108" rx="16" ry="10.5" fill={x.belly} opacity=".9" />
        </g>
      ),
      after: (
        <g>
          <path d="M94.5 98.5 Q100 96 105.5 98.5 Q102.5 105 100 105 Q97.5 105 94.5 98.5Z" fill="#FF8FC0" />
          <path d="M100 105 V108 M100 108 Q94 113 89 109 M100 108 Q106 113 111 109" stroke="#E8F0FF" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M72 104 L48 99 M72 109 L48 111 M128 104 L152 99 M128 109 L152 111" stroke="#C9D4FF" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
        </g>
      ),
    }),
  },
];
