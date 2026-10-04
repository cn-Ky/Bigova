import type { ReactNode } from "react";
import { accent, mir, shade, star5, tint, heart } from "./draw";

/* ═════════════ Tipler ═════════════ */
export type Pal = { id: string; name: string; c: string; b?: string };
/** Türün çizim bağlamı: seçilen renkten türetilen tonlar + özellik indeksi (0-2). */
export type SpCtx = {
  uid: string;
  c: string; // ana renk
  cs: string; // koyu ton
  cd: string; // çok koyu ton
  cl: string; // açık ton
  belly: string; // karın / yüz açık rengi
  f: number; // seçilen özellik (0, 1, 2)
};
export type Parts = {
  back?: ReactNode; // gövdenin arkası: kabuk, kanat… (gövdeyle birlikte ölçeklenir)
  low?: ReactNode; // bacakların arkası: yere değen kuyruklar (bacaklarla birlikte ölçeklenir)
  legs?: ReactNode; // varsayılan bacakların yerine
  limb?: string; // kol/bacak rengi
  hand?: string; // el rengi
  foot?: string; // ayak rengi
  headBack?: ReactNode; // kafanın arkası: kulak, yele, boynuz…
  head?: string; // kafa rengi
  body?: string; // gövde rengi
  bellyFill?: string | null; // karın lekesi (null = yok)
  bodyOver?: ReactNode; // gövde üstü (önlük/leke) – kıyafetin altında kalır
  headRx?: number;
  headRy?: number;
  face?: ReactNode; // gözlerin ALTINDA: yüz maskesi, burun bölgesi
  after?: ReactNode; // gözlerin ÜSTÜNDE: burun, ağız, gaga, bıyık
  over?: ReactNode; // en üstte: boynuz, tepelik
  eyes?: { s?: number; ring?: string };
};
export type SpeciesDef = {
  id: string;
  name: string;
  price: number;
  tier: "Yaygın" | "Nadir" | "Efsanevi";
  featureLabel: string;
  features: [string, string, string];
  palette: Pal[];
  parts: (c: SpCtx) => Parts;
};

const pal = (rows: [string, string, string?][]): Pal[] =>
  rows.map(([name, c, b], i) => ({ id: `c${i + 1}`, name, c, b }));
const INK = "#1C2A3A";
const PINK = "#F4A6B8";

/** İnce kuş bacakları + perdeli ayaklar. */
const birdLegs = (color: string) => (
  <g fill={color}>
    <rect x="83" y="196" width="8" height="52" rx="4" />
    <rect x="109" y="196" width="8" height="52" rx="4" />
    <path d="M70 254 Q87 242 104 254 Q87 258 70 254Z" />
    <path d="M96 254 Q113 242 130 254 Q113 258 96 254Z" />
  </g>
);

/* ═════════════ Türler ═════════════ */
export const SPECIES: SpeciesDef[] = [
  /* ───── Martı (Bigova'nın maskotu) ───── */
  {
    id: "marti", name: "Martı", price: 0, tier: "Yaygın",
    featureLabel: "Baş", features: ["Düz", "Tüy tepeli", "Kara başlıklı"],
    palette: pal([
      ["Ege grisi", "#9DB7C4"], ["Fırtına", "#6E7F8C"], ["Boğaz mavisi", "#3F7CB3"], ["Genç martı", "#B39A7A"],
      ["Şeker pembe", "#E8A0BF"], ["Nane", "#8FD4B8"], ["Gün batımı", "#F2A65A"], ["Gece", "#3A4250"],
    ]),
    parts: (x) => ({
      head: "#FFFFFF", body: "#FFFFFF", bellyFill: null, limb: x.c, hand: shade(x.c, -0.55), foot: "#FF9A3C",
      legs: birdLegs("#FF9A3C"),
      low: (
        <g>
          <path d="M84 196 L100 242 L116 196Z" fill="#FFFFFF" stroke="#CBD6DD" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M93 228 L100 242 L107 228Z" fill="#2B3A55" />
        </g>
      ),
      face:
        x.f === 2 ? (
          <g>
            <clipPath id={`${x.uid}hd`}><ellipse cx="100" cy="84" rx="44" ry="46" /></clipPath>
            <path clipPath={`url(#${x.uid}hd)`} d="M40 36 H160 V104 Q130 114 100 108 Q70 114 40 104Z" fill="#3B2F33" />
            <ellipse cx="84" cy="90" rx="9" ry="9.5" fill="#fff" />
            <ellipse cx="116" cy="90" rx="9" ry="9.5" fill="#fff" />
          </g>
        ) : null,
      after: (
        <g>
          <path d="M89 99 Q100 93 111 99 Q110 111 100 119 Q90 111 89 99Z" fill={x.f === 2 ? "#D9483A" : "#FFB84D"} />
          {x.f !== 2 && <circle cx="100" cy="112" r="2.6" fill="#E5533D" />}
          <path d="M92 103 Q100 106 108 103" stroke="#C9871F" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".7" />
        </g>
      ),
      over:
        x.f === 1 ? (
          <path d="M94 42 Q86 24 98 12 Q100 26 104 14 Q112 28 106 42Z" fill="#fff" stroke="#CBD6DD" strokeWidth="1.5" strokeLinejoin="round" />
        ) : null,
    }),
  },

  /* ───── Kedi ───── */
  {
    id: "kedi", name: "Kedi", price: 0, tier: "Yaygın",
    featureLabel: "Kulak", features: ["Sivri", "Yuvarlak", "Püsküllü"],
    palette: pal([
      ["Turuncu", "#E8943A", "#FFE2BC"], ["Gri", "#8E9AA8", "#E6ECF2"], ["Siyah", "#2B2B33", "#4A4A56"], ["Beyaz", "#F2F2F0", "#FFFFFF"],
      ["Krem", "#E8C99A", "#FFF3DE"], ["Çikolata", "#7A4A2A", "#C9A07A"], ["Rus mavisi", "#6C7A8C", "#C9D3DE"], ["Şeker pembe", "#F2A0C0", "#FFE3EE"],
    ]),
    parts: (x) => ({
      back: <path d="M126 202 C174 208 184 150 160 124" stroke={x.c} strokeWidth="13" strokeLinecap="round" fill="none" />,
      headBack: mir(
        x.f === 1 ? (
          <g><circle cx="66" cy="52" r="17" fill={x.c} /><circle cx="66" cy="52" r="10" fill={PINK} /></g>
        ) : (
          <g>
            <path d="M54 76 L56 28 L94 50Z" fill={x.c} strokeLinejoin="round" />
            <path d="M62 66 L63 41 L84 53Z" fill={PINK} />
            {x.f === 2 && <path d="M56 28 L51 13 M56 28 L61 12" stroke={x.cd} strokeWidth="3.2" strokeLinecap="round" />}
          </g>
        ),
      ),
      face: <ellipse cx="100" cy="107" rx="16" ry="10.5" fill={x.belly} />,
      after: (
        <g>
          <path d="M94.5 98.5 Q100 96 105.5 98.5 Q102.5 105 100 105 Q97.5 105 94.5 98.5Z" fill="#E8718A" />
          <path d="M100 105 V108 M100 108 Q94 113 89 109 M100 108 Q106 113 111 109" stroke="#6B3B3B" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M72 104 L48 99 M72 109 L48 111 M128 104 L152 99 M128 109 L152 111" stroke={x.cd} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
        </g>
      ),
    }),
  },

  /* ───── Köpek ───── */
  {
    id: "kopek", name: "Köpek", price: 0, tier: "Yaygın",
    featureLabel: "Kulak", features: ["Sarkık", "Dik", "Tek kulak sarkık"],
    palette: pal([
      ["Altın", "#D9A557", "#F7E3BE"], ["Kahve", "#8B5A33", "#D9B48A"], ["Siyah", "#2E2B33", "#55515C"], ["Beyaz", "#F1EEE8", "#FFFFFF"],
      ["Husky gri", "#9AA0A8", "#F1F3F5"], ["Kızıl", "#B5522E", "#F0C8A8"], ["Krem", "#E9D2A8", "#FFF4DE"], ["Gökyüzü", "#5B8BC9", "#D6E6F8"],
    ]),
    parts: (x) => {
      const floppy = <path d="M60 52 C36 54 30 100 44 114 C58 110 66 84 66 62Z" fill={x.cs} />;
      const erect = <path d="M58 68 C50 42 58 24 72 28 C82 36 86 52 84 64Z" fill={x.cs} />;
      return {
        back: <path d="M128 202 C154 202 162 182 155 166" stroke={x.c} strokeWidth="12" strokeLinecap="round" fill="none" />,
        headBack: x.f === 0 ? mir(floppy) : x.f === 1 ? mir(erect) : (<><g>{floppy}</g><g transform="matrix(-1 0 0 1 200 0)">{erect}</g></>),
        face: <ellipse cx="100" cy="107" rx="21" ry="15" fill={x.belly} />,
        after: (
          <g>
            <path d="M100 105 V110 M100 110 Q93 117 87 112 M100 110 Q107 117 113 112" stroke="#5A2E2E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M95 113 Q100 126 105 113Z" fill="#F0748A" />
            <ellipse cx="100" cy="99" rx="7.5" ry="5.2" fill="#2A2630" />
            <ellipse cx="98" cy="97.6" rx="2.4" ry="1.2" fill="#fff" opacity=".6" />
          </g>
        ),
      };
    },
  },

  /* ───── Tavşan ───── */
  {
    id: "tavsan", name: "Tavşan", price: 0, tier: "Yaygın",
    featureLabel: "Kulak", features: ["Dik", "Sarkık", "Tek bükük"],
    palette: pal([
      ["Beyaz", "#F4F0EC", "#FFFFFF"], ["Gri", "#A9A39C", "#EFEAE4"], ["Kahve", "#A06B42", "#E8CFAE"], ["Siyah", "#38343A", "#5C575F"],
      ["Krem", "#E6CFA6", "#FFF4DD"], ["Şeker pembe", "#F0B6CC", "#FFF0F5"], ["Lila", "#B9A3E8", "#F0EBFB"], ["Buz mavisi", "#8EC6E8", "#EAF6FC"],
    ]),
    parts: (x) => {
      const up = <g><ellipse cx="76" cy="31" rx="11.5" ry="29" transform="rotate(-6 76 31)" fill={x.c} /><ellipse cx="76" cy="33" rx="5.5" ry="21" transform="rotate(-6 76 33)" fill={PINK} /></g>;
      const lop = <g><ellipse cx="49" cy="92" rx="12.5" ry="29" transform="rotate(14 49 92)" fill={x.cs} /><ellipse cx="50" cy="94" rx="6" ry="21" transform="rotate(14 50 94)" fill={PINK} opacity=".8" /></g>;
      const bent = (
        <g>
          <path d="M112 58 C106 34 112 14 128 8 C142 4 148 16 138 20 C130 24 130 38 132 58Z" fill={x.c} />
          <path d="M118 52 C114 34 118 22 128 16" stroke={PINK} strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
      );
      return {
        back: <circle cx="136" cy="208" r="12.5" fill={x.belly} stroke={x.cs} strokeWidth="1.2" />,
        headBack: x.f === 0 ? mir(up) : x.f === 1 ? mir(lop) : (<><g>{up}</g>{bent}</>),
        face: <ellipse cx="100" cy="106" rx="14" ry="9.5" fill={x.belly} />,
        after: (
          <g>
            <path d="M96 98 Q100 95.5 104 98 Q102 102 100 102 Q98 102 96 98Z" fill="#E8718A" />
            <path d="M100 102 V105 M100 105 Q95 110 91 106 M100 105 Q105 110 109 106" stroke="#6B3B3B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <rect x="96" y="107" width="8" height="8" rx="2" fill="#fff" stroke="#D5D9DE" strokeWidth="1" />
            <path d="M100 107.5 V114.5" stroke="#D5D9DE" strokeWidth="1" />
          </g>
        ),
      };
    },
  },

  /* ───── Tilki ───── */
  {
    id: "tilki", name: "Tilki", price: 150, tier: "Nadir",
    featureLabel: "Kulak", features: ["Klasik", "Büyük", "Yanak tüylü"],
    palette: pal([
      ["Kızıl", "#E2762B", "#FFF1DC"], ["Gümüş", "#8D96A3", "#F2F5F8"], ["Kar", "#F0F3F5", "#FFFFFF"], ["Çöl", "#D9B27A", "#FFF3DE"],
      ["Siyah", "#35323B", "#8A8590"], ["Kahve", "#96562F", "#F0D8BC"], ["Okyanus", "#5D9BD6", "#E3F0FB"], ["Mor", "#9A74D6", "#EEE6FB"],
    ]),
    parts: (x) => ({
      back: (
        <g>
          <path d="M126 202 C176 214 196 170 172 128 C164 150 150 170 128 178Z" fill={x.c} />
          <path d="M172 128 C190 160 188 186 168 198 C178 176 178 152 172 128Z" fill="#FFFFFF" />
        </g>
      ),
      headBack: (
        <g>
          {mir(
            x.f === 1 ? (
              <g><path d="M54 80 L42 12 L96 50Z" fill={x.c} /><path d="M60 68 L52 30 L86 54Z" fill="#3B2A24" /></g>
            ) : (
              <g><path d="M55 78 L52 24 L92 52Z" fill={x.c} /><path d="M61 66 L59 40 L80 54Z" fill="#3B2A24" /></g>
            ),
          )}
          {x.f === 2 && mir(<path d="M60 88 L36 94 L56 102 L40 114 L66 112Z" fill={x.belly} />)}
        </g>
      ),
      face: <path d="M57 92 C66 110 84 118 100 118 C116 118 134 110 143 92 C148 118 126 130 100 130 C74 130 52 118 57 92Z" fill={x.belly} />,
      after: (
        <g>
          <ellipse cx="100" cy="102" rx="7" ry="4.8" fill="#2A2630" />
          <path d="M100 106 V109 M100 109 Q94 114 89 110 M100 109 Q106 114 111 110" stroke="#4A3030" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      ),
    }),
  },

  /* ───── Panda ───── */
  {
    id: "panda", name: "Panda", price: 200, tier: "Nadir",
    featureLabel: "Göz yaması", features: ["Oval", "Kalp", "Yıldız"],
    palette: pal([
      ["Klasik", "#2A2A30"], ["Kahve", "#6B4423"], ["Gece mavisi", "#26396B"], ["Bambu", "#3C8D5A"],
      ["Gül", "#D9627F"], ["Mor", "#6E55B8"], ["Turuncu", "#E5772E"], ["Okyanus", "#2F7FB8"],
    ]),
    parts: (x) => ({
      head: "#F7F7F2", body: "#F7F7F2", limb: x.c, hand: x.c, foot: x.c, bellyFill: "#FFFFFF",
      back: <circle cx="100" cy="208" r="9" fill="#FFFFFF" stroke="#D9D9D2" strokeWidth="1.2" />,
      headBack: mir(<circle cx="62" cy="52" r="15" fill={x.c} />),
      face: mir(
        x.f === 1 ? (
          <path d={heart(84, 91, 13)} fill={x.c} />
        ) : x.f === 2 ? (
          <path d={star5(84, 92, 16)} fill={x.c} strokeLinejoin="round" stroke={x.c} strokeWidth="3" />
        ) : (
          <ellipse cx="83" cy="92" rx="11" ry="14.5" transform="rotate(22 83 92)" fill={x.c} />
        ),
      ),
      eyes: { ring: "#F7F7F2" },
      after: (
        <g>
          <ellipse cx="100" cy="102" rx="6.5" ry="4.4" fill={x.c} />
          <path d="M100 106 V109 M100 109 Q94 114 89 110 M100 109 Q106 114 111 110" stroke={x.c} strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      ),
    }),
  },

  /* ───── Penguen ───── */
  {
    id: "penguen", name: "Penguen", price: 200, tier: "Nadir",
    featureLabel: "Tüy", features: ["Düz", "Sarı tepeli", "Sarı yanaklı"],
    palette: pal([
      ["Siyah", "#2B3340"], ["Lacivert", "#1E3A5F"], ["Kayrak", "#6E7B8C"], ["Kahve", "#6B4A32"],
      ["Mavi", "#3A86C8"], ["Mor", "#6B4FB0"], ["Gül", "#D95F8A"], ["Orman", "#2F7D5E"],
    ]),
    parts: (x) => ({
      bellyFill: null, foot: "#FF9A3C",
      legs: (
        <g fill="#FF9A3C">
          <rect x="80" y="206" width="14" height="40" rx="6" /><rect x="106" y="206" width="14" height="40" rx="6" />
          <ellipse cx="86" cy="250" rx="16" ry="6.5" /><ellipse cx="114" cy="250" rx="16" ry="6.5" />
        </g>
      ),
      low: <path d="M86 198 L100 236 L114 198Z" fill={x.cs} />,
      bodyOver: <ellipse cx="100" cy="172" rx="27" ry="32" fill="#FFFFFF" />,
      headBack: x.f === 1 ? mir(<path d="M74 52 C62 44 54 32 46 16 M82 46 C74 36 70 26 68 12" stroke="#FFC94D" strokeWidth="4.5" strokeLinecap="round" fill="none" />) : null,
      face: (
        <g>
          <path d="M60 86 C60 72 78 74 100 90 C122 74 140 72 140 86 C140 112 120 124 100 124 C80 124 60 112 60 86Z" fill="#FFFFFF" />
          {x.f === 2 && mir(<ellipse cx="68" cy="103" rx="8" ry="11" fill="#FFC94D" />)}
        </g>
      ),
      after: <path d="M91 99 Q100 94 109 99 Q107 111 100 116 Q93 111 91 99Z" fill="#FF9A3C" stroke="#E07A1E" strokeWidth="1.2" strokeLinejoin="round" />,
      over: x.f === 1 ? mir(<path d="M62 76 Q72 68 86 74" stroke="#FFC94D" strokeWidth="4" strokeLinecap="round" fill="none" />) : null,
    }),
  },

  /* ───── Baykuş ───── */
  {
    id: "baykus", name: "Baykuş", price: 250, tier: "Nadir",
    featureLabel: "Yüz", features: ["Kulaklı", "Kalp yüzlü", "Kaşlı"],
    palette: pal([
      ["Kahve", "#8A5E3B", "#EBD9BE"], ["Gri", "#8C94A0", "#EEF0F3"], ["Kar", "#ECEBE6", "#FFFFFF"], ["Kızıl", "#B8602E", "#F3D8BC"],
      ["Gece", "#3A3640", "#9C97A6"], ["Altın", "#C9A15A", "#F8EBCB"], ["Mor", "#7C64B8", "#E9E2F8"], ["Mavi", "#4F86B8", "#E0EDF8"],
    ]),
    parts: (x) => ({
      limb: x.cs, hand: x.cs, foot: "#F2A33A",
      low: <path d="M82 198 L100 240 L118 198Z" fill={x.cs} />,
      headBack: x.f === 1 ? null : mir(<path d="M56 64 L48 20 L88 44Z" fill={x.cs} />),
      face:
        x.f === 1 ? (
          <path d="M100 68 C92 48 58 56 60 88 C62 110 84 126 100 128 C116 126 138 110 140 88 C142 56 108 48 100 68Z" fill={x.belly} stroke={x.cs} strokeWidth="2" />
        ) : (
          mir(<circle cx="82" cy="90" r="22" fill={x.belly} stroke={x.cs} strokeWidth="2" />)
        ),
      eyes: { s: 1.3, ring: "#FFF8E0" },
      after: (
        <g>
          <path d="M93 99 L107 99 L100 115Z" fill="#F2A33A" stroke="#C97F1A" strokeWidth="1.2" strokeLinejoin="round" />
          {x.f === 2 && mir(<path d="M62 74 Q78 60 96 76 Q80 72 62 74Z" fill={x.cd} />)}
        </g>
      ),
    }),
  },

  /* ───── Aslan ───── */
  {
    id: "aslan", name: "Aslan", price: 350, tier: "Nadir",
    featureLabel: "Yele", features: ["Gür", "Kısa", "Yelesiz"],
    palette: pal([
      ["Altın", "#D9A441", "#F6E2B4"], ["Kum", "#E3C58C", "#FFF1D6"], ["Kızıl", "#C0702A", "#F0CDA4"], ["Beyaz", "#EFE9DC", "#FFFFFF"],
      ["Gece", "#3B3540", "#6C6572"], ["Kahve", "#8B5A33", "#D9B48A"], ["Gri", "#9AA1AA", "#E8EBEE"], ["Mor", "#8E6BC9", "#EAE2F8"],
    ]),
    parts: (x) => {
      const mane = accent(x.c, 0.34);
      return {
        back: (
          <g>
            <path d="M128 202 C170 198 178 164 170 142" stroke={x.c} strokeWidth="9" strokeLinecap="round" fill="none" />
            <ellipse cx="170" cy="136" rx="10" ry="15" fill={mane} />
          </g>
        ),
        headBack: (
          <g>
            {x.f !== 2 && (
              <g fill={mane}>
                <circle cx="100" cy="86" r={x.f === 0 ? 56 : 51} />
                {Array.from({ length: 12 }).map((_, i) => {
                  const a = (Math.PI * 2 * i) / 12;
                  const r = x.f === 0 ? 52 : 47;
                  return <circle key={i} cx={100 + r * Math.cos(a)} cy={86 + r * Math.sin(a)} r={x.f === 0 ? 17 : 14} />;
                })}
              </g>
            )}
            {mir(<g><circle cx="63" cy="49" r="13" fill={x.c} /><circle cx="63" cy="49" r="7.5" fill={PINK} /></g>)}
          </g>
        ),
        face: <ellipse cx="100" cy="108" rx="19" ry="13" fill={x.belly} />,
        after: (
          <g>
            <path d="M93.5 98.5 Q100 95 106.5 98.5 Q103 106 100 106 Q97 106 93.5 98.5Z" fill="#6B3F33" />
            <path d="M100 106 V109 M100 109 Q93 115 87 110 M100 109 Q107 115 113 110" stroke="#5A2E2E" strokeWidth="2" strokeLinecap="round" fill="none" />
            <g fill={x.cd} opacity=".35"><circle cx="88" cy="108" r="1.3" /><circle cx="86" cy="112" r="1.3" /><circle cx="112" cy="108" r="1.3" /><circle cx="114" cy="112" r="1.3" /></g>
          </g>
        ),
      };
    },
  },

  /* ───── Ahtapot ───── */
  {
    id: "ahtapot", name: "Ahtapot", price: 300, tier: "Nadir",
    featureLabel: "Kollar", features: ["Kıvrık", "Sarmal", "Dalgalı"],
    palette: pal([
      ["Pembe", "#E87AA8"], ["Mercan", "#E0503A"], ["Mor", "#8E5FD0"], ["Turkuaz", "#2CB8A8"],
      ["Mavi", "#3F86D8"], ["Turuncu", "#F29A3C"], ["Yosun", "#5DB65A"], ["Kayrak", "#8895A5"],
    ]),
    parts: (x) => {
      const path = (sx: number, d: number) =>
        x.f === 0
          ? `M${sx} 200 Q${sx + d * 12} 222 ${sx + d * 22} 238 Q${sx + d * 28} 250 ${sx + d * 17} 254`
          : x.f === 1
          ? `M${sx} 200 C${sx + 12 * d} 214 ${sx - 12 * d} 226 ${sx + 6 * d} 238 C${sx + 20 * d} 247 ${sx + 10 * d} 257 ${sx + 2 * d} 251`
          : `M${sx} 200 q${9 * d} 12 0 24 q${-9 * d} 12 0 24 q${9 * d} 6 ${5 * d} 6`;
      return {
        foot: x.c,
        legs: (
          <g stroke={x.c} strokeWidth="13" strokeLinecap="round" fill="none">
            {[64, 78, 92, 108, 122, 136].map((sx, i) => (<path key={sx} d={path(sx, i < 3 ? -1 : 1)} />))}
          </g>
        ),
        headBack: <ellipse cx="100" cy="58" rx="36" ry="34" fill={x.c} />,
        face: <ellipse cx="100" cy="112" rx="22" ry="12" fill={x.cl} opacity=".35" />,
        after: <path d="M91 107 Q100 114 109 107" stroke="#8A3B4E" strokeWidth="2.6" strokeLinecap="round" fill="none" />,
      };
    },
  },

  /* ───── Kaplumbağa ───── */
  {
    id: "kaplumbaga", name: "Kaplumbağa", price: 250, tier: "Nadir",
    featureLabel: "Kabuk", features: ["Altıgen", "Halka", "Benekli"],
    palette: pal([
      ["Çimen", "#6DB36B"], ["Orman", "#3C8A58"], ["Kum", "#C9B07A"], ["Lagün", "#3BB5B0"],
      ["Mavi", "#5B93D6"], ["Toprak", "#8A6B45"], ["Gül", "#E49AB6"], ["Altın", "#D9B440"],
    ]),
    parts: (x) => {
      const shell = shade(x.c, -0.38);
      const line = tint(shell, 0.35);
      return {
        back: (
          <g>
            <path d="M126 208 L148 216 L128 216Z" fill={x.cs} />
            <ellipse cx="100" cy="172" rx="68" ry="58" fill={shell} stroke={line} strokeWidth="4" />
            {x.f === 0 && (
              <g stroke={line} strokeWidth="2.6" fill="none" strokeLinejoin="round">
                <path d="M100 150 L118 160 V182 L100 192 L82 182 V160Z" />
                <path d="M100 150 V128 M118 160 L140 150 M118 182 L140 196 M100 192 V214 M82 182 L60 196 M82 160 L60 150" />
              </g>
            )}
            {x.f === 1 && (
              <g stroke={line} strokeWidth="2.6" fill="none">
                <ellipse cx="100" cy="172" rx="48" ry="40" /><ellipse cx="100" cy="172" rx="28" ry="23" /><circle cx="100" cy="172" r="8" />
              </g>
            )}
            {x.f === 2 && (
              <g fill={line}>
                {[[64, 150, 7], [136, 150, 7], [100, 134, 6], [52, 184, 6], [148, 184, 6], [76, 208, 6], [124, 208, 6], [100, 214, 5]].map(([cx, cy, r]) => (
                  <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={r} />
                ))}
              </g>
            )}
          </g>
        ),
        face: <ellipse cx="100" cy="110" rx="18" ry="11" fill={x.cl} opacity=".4" />,
        after: (
          <g>
            <path d="M90 108 Q100 117 110 108" stroke="#5A3A2E" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <circle cx="96" cy="101" r="1.3" fill={x.cd} /><circle cx="104" cy="101" r="1.3" fill={x.cd} />
          </g>
        ),
      };
    },
  },

  /* ───── Ejderha ───── */
  {
    id: "ejderha", name: "Ejderha", price: 700, tier: "Efsanevi",
    featureLabel: "Boynuz", features: ["Kıvrık", "Dikenli", "Dallı"],
    palette: pal([
      ["Zümrüt", "#3FA46A"], ["Alev", "#D9472F"], ["Gökyüzü", "#3A7BD5"], ["Mor", "#8450C8"],
      ["Altın", "#D9A82E"], ["Gölge", "#3B3B4A"], ["Buz", "#7FC8E6"], ["Gül", "#E0709A"],
    ]),
    parts: (x) => {
      const bone = "#F2E3B8";
      return {
        bellyFill: tint(x.c, 0.62), foot: x.cs,
        back: (
          <g>
            <path d="M126 204 C172 214 188 178 172 156" stroke={x.c} strokeWidth="13" strokeLinecap="round" fill="none" />
            <path d="M172 158 L158 160 L178 140 L188 162Z" fill={x.cd} strokeLinejoin="round" />
            {mir(
              <g>
                <path d="M70 152 C54 122 30 104 8 98 C18 114 14 128 20 142 C30 134 38 138 40 152 C48 144 58 150 68 164Z" fill={x.cs} />
                <path d="M70 152 L12 100 M70 152 L20 140 M70 152 L40 152" stroke={x.cd} strokeWidth="2.4" strokeLinecap="round" />
              </g>,
            )}
          </g>
        ),
        headBack: mir(
          x.f === 0 ? (
            <path d="M66 58 C48 50 42 28 52 12 C54 30 66 40 80 46Z" fill={bone} />
          ) : x.f === 1 ? (
            <g fill={bone} strokeLinejoin="round"><path d="M62 62 L48 36 L76 54Z" /><path d="M72 50 L66 22 L86 46Z" /></g>
          ) : (
            <g stroke={bone} strokeWidth="5" strokeLinecap="round" fill="none"><path d="M72 54 L58 18 M65 36 L48 32 M60 24 L53 8" /></g>
          ),
        ),
        face: <ellipse cx="100" cy="108" rx="19" ry="13" fill={tint(x.c, 0.32)} />,
        after: (
          <g>
            <circle cx="93" cy="103" r="1.9" fill={x.cd} /><circle cx="107" cy="103" r="1.9" fill={x.cd} />
            <path d="M86 111 Q100 120 114 111" stroke={x.cd} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M92 114 l2.2 5 l2.2 -5Z M105.6 114 l2.2 5 l2.2 -5Z" fill="#fff" />
          </g>
        ),
        over: <path d="M82 44 L88 30 L94 43 L100 24 L106 43 L112 30 L118 44Z" fill={x.cd} strokeLinejoin="round" />,
      };
    },
  },

  /* ───── Anka Kuşu ───── */
  {
    id: "anka", name: "Anka Kuşu", price: 900, tier: "Efsanevi",
    featureLabel: "Kuyruk", features: ["Alev", "Tüy", "Işık"],
    palette: pal([
      ["Ateş", "#F0592B"], ["Altın", "#F2B31F"], ["Mavi alev", "#3B8FE8"], ["Mor alev", "#9A5CE0"],
      ["Zümrüt", "#36B57A"], ["Işık", "#F2E4A8"], ["Kor", "#C42A2A"], ["Gül", "#F06A9B"],
    ]),
    parts: (x) => {
      const glow = tint(x.c, 0.5);
      return {
        bellyFill: glow, limb: x.c, hand: x.cs, foot: "#FFC94D", legs: birdLegs("#FFC94D"),
        back: (
          <g>
            {x.f === 2 && (
              <g stroke="#FFE08A" strokeWidth="5" strokeLinecap="round" opacity=".85">
                {Array.from({ length: 9 }).map((_, i) => {
                  const a = Math.PI * (1.1 + (0.8 * i) / 8);
                  return <path key={i} d={`M${100 + 60 * Math.cos(a)} ${150 - 60 * Math.sin(a)} L${100 + 96 * Math.cos(a)} ${150 - 96 * Math.sin(a)}`} />;
                })}
              </g>
            )}
            {mir(
              <path d="M70 150 C40 130 24 100 20 70 C38 90 52 100 66 104 C54 118 58 134 72 150Z" fill={x.cs} />,
            )}
          </g>
        ),
        low: (
          <g>
            {x.f === 0 && (
              <g>
                <path d="M100 196 C70 220 72 248 84 268 C90 246 96 234 100 228 C104 234 110 246 116 268 C128 248 130 220 100 196Z" fill={x.c} />
                <path d="M100 206 C86 224 90 244 100 256 C110 244 114 224 100 206Z" fill={glow} />
              </g>
            )}
            {x.f === 1 && (
              <g>
                {[[-1, 36], [0, 0], [1, 36]].map(([d, rot], i) => (
                  <g key={i} transform={`rotate(${(d as number) * 24} 100 196)`}>
                    <path d="M100 196 C88 222 90 248 100 268 C110 248 112 222 100 196Z" fill={i === 1 ? x.c : x.cs} />
                    <ellipse cx="100" cy="246" rx="6" ry="9" fill={glow} /><ellipse cx="100" cy="246" rx="2.6" ry="4.5" fill={x.cd} />
                    {rot ? null : null}
                  </g>
                ))}
              </g>
            )}
            {x.f === 2 && (
              <g>
                <path d="M100 196 C80 226 84 252 100 266 C116 252 120 226 100 196Z" fill="#FFE08A" />
                <path d="M100 206 C90 228 94 246 100 256 C106 246 110 228 100 206Z" fill="#FFFFFF" />
              </g>
            )}
          </g>
        ),
        headBack: (
          <g>
            <path d="M100 46 C88 28 98 16 96 2 C108 14 118 28 108 46Z" fill="#FFD966" />
            <path d="M80 52 C64 38 70 22 62 8 C80 16 90 32 92 50Z" fill={x.c} />
            <path d="M120 52 C136 38 130 22 138 8 C120 16 110 32 108 50Z" fill={x.c} />
          </g>
        ),
        after: (
          <g>
            <path d="M90 98 Q100 92 110 98 Q108 110 100 118 Q92 110 90 98Z" fill="#FFC94D" stroke="#D99A1E" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M93 103 Q100 106 107 103" stroke="#D99A1E" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </g>
        ),
      };
    },
  },

  /* ───── Tek Boynuzlu At ───── */
  {
    id: "unicorn", name: "Tek Boynuzlu At", price: 800, tier: "Efsanevi",
    featureLabel: "Yele", features: ["Gökkuşağı", "Mor", "Yıldızlı"],
    palette: pal([
      ["Beyaz", "#F5F2F7", "#FFFFFF"], ["Krem", "#F0E2CC", "#FFF6E6"], ["Sis", "#B9BEC8", "#ECEEF2"], ["Pembe", "#F6BDD3", "#FFE9F1"],
      ["Lila", "#CDB8F0", "#F1EBFB"], ["Nane", "#B8E6D2", "#EAFAF3"], ["Gece", "#3A3644", "#6E6A7C"], ["Altın", "#F2D27A", "#FFF3CC"],
    ]),
    parts: (x) => {
      const gid = `${x.uid}mane`;
      const mane = x.f === 0 ? `url(#${gid})` : x.f === 1 ? "#8E5FD0" : "#2A2F6B";
      const stars = x.f === 2 && (
        <g fill="#fff">
          <path d={star5(34, 112, 5)} /><path d={star5(48, 76, 4)} /><path d={star5(166, 112, 5)} /><path d={star5(152, 76, 4)} />
        </g>
      );
      return {
        foot: "#9B8FA8",
        low: (
          <g>
            <defs>
              <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1="52" x2="0" y2="150">
                <stop offset="0" stopColor="#FF6B8A" /><stop offset=".22" stopColor="#FFB347" /><stop offset=".42" stopColor="#F6E05E" />
                <stop offset=".62" stopColor="#6BD68A" /><stop offset=".8" stopColor="#4FA8F0" /><stop offset="1" stopColor="#A06BE8" />
              </linearGradient>
            </defs>
            <linearGradient id={`${gid}t`} gradientUnits="userSpaceOnUse" x1="0" y1="196" x2="0" y2="266">
              <stop offset="0" stopColor="#FF6B8A" /><stop offset=".3" stopColor="#F6E05E" /><stop offset=".6" stopColor="#6BD68A" /><stop offset=".8" stopColor="#4FA8F0" /><stop offset="1" stopColor="#A06BE8" />
            </linearGradient>
            <path d="M126 198 C176 188 190 236 150 264 C160 238 142 228 124 226Z" fill={x.f === 0 ? `url(#${gid}t)` : mane} />
          </g>
        ),
        headBack: (
          <g>
            {mir(<path d="M60 52 C28 58 20 108 38 146 C52 126 48 108 60 96Z" fill={mane} />)}
            {mir(<g><path d="M62 64 L64 30 L90 50Z" fill={x.c} /><path d="M68 58 L69 40 L83 51Z" fill={PINK} /></g>)}
            {stars}
          </g>
        ),
        face: <ellipse cx="100" cy="108" rx="17" ry="12" fill={x.belly} />,
        after: (
          <g>
            <circle cx="94" cy="108" r="1.8" fill="#6B4B5B" /><circle cx="106" cy="108" r="1.8" fill="#6B4B5B" />
            <path d="M92 114 Q100 119 108 114" stroke="#8A4B5B" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        ),
        over: (
          <g>
            <path d="M62 54 C78 40 108 40 126 52 C112 52 104 62 100 72 C94 60 80 54 62 54Z" fill={mane} />
            <path d="M91 48 L100 2 L109 48Z" fill="#FFE9A8" stroke="#E3C060" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M93 38 L108 33 M95 28 L106 24 M97 18 L104 15 M98 9 L102 7" stroke="#E3B040" strokeWidth="2" strokeLinecap="round" />
          </g>
        ),
      };
    },
  },
];

export const SPECIES_MAP: Record<string, SpeciesDef> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

/* ═════════════ Görünüm özellikleri (hayvandan bağımsız seçenekler) ═════════════ */
export const PATTERNS = [
  { id: "p1", name: "Düz" },
  { id: "p2", name: "Benekli" },
  { id: "p3", name: "Çizgili" },
  { id: "p4", name: "Maskeli" },
  { id: "p5", name: "Alın lekesi" },
  { id: "p6", name: "Yıldız tozu" },
] as const;

export const EYE_COLORS = [
  { id: "e1", name: "Kahve", c: "#8A5A33" },
  { id: "e2", name: "Kehribar", c: "#E0A030" },
  { id: "e3", name: "Yeşil", c: "#4FAE6B" },
  { id: "e4", name: "Mavi", c: "#4A9AE0" },
  { id: "e5", name: "Mor", c: "#8E6BD8" },
  { id: "e6", name: "Kızıl", c: "#E0503A" },
  { id: "e7", name: "Buz", c: "#9FE0F0" },
  { id: "e8", name: "Altın", c: "#F2C94C" },
];

export { INK };
