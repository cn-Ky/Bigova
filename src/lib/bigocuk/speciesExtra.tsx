import { mir, shade, tint } from "./draw";
import type { Pal, SpeciesDef } from "./species";

/*
 * Ek hayvan türleri. species.tsx bu listeyi SPECIES dizisinin sonuna ekler.
 * (Burada yalnızca TİP import ediliyor; böylece species.tsx ile döngüsel bağımlılık oluşmaz.)
 */
const pal = (rows: [string, string, string?][]): Pal[] =>
  rows.map(([name, c, b], i) => ({ id: `c${i + 1}`, name, c, b }));
const PINK = "#F4A6B8";

export const EXTRA_SPECIES: SpeciesDef[] = [
  /* ───── Hamster ───── */
  {
    id: "hamster", name: "Hamster", price: 80, tier: "Yaygın",
    featureLabel: "Yanak", features: ["Tombul yanak", "Çizgili alın", "Tüylü kulak"],
    palette: pal([
      ["Altın", "#E3A85A", "#FFF0D6"], ["Krem", "#EBD3A8", "#FFF8EA"], ["Gri", "#9CA3AE", "#EEF1F4"], ["Çikolata", "#85583A", "#E6C9A8"],
      ["Beyaz", "#F3EFEA", "#FFFFFF"], ["Karamel", "#C98A4B", "#F8DFB8"], ["Siyah", "#3A3740", "#8C8793"], ["Şeker pembe", "#EFA9BF", "#FFE8F0"],
    ]),
    parts: (x) => ({
      headRx: 46, headRy: 44,
      back: <ellipse cx="100" cy="206" rx="9" ry="7" fill={x.cs} />,
      headBack: mir(
        <g>
          <circle cx="66" cy="50" r="12" fill={x.c} />
          <circle cx="66" cy="50" r="7" fill={PINK} />
          {x.f === 2 && <path d="M58 40 L54 28 M64 38 L64 25 M71 40 L74 28" stroke={x.cs} strokeWidth="3" strokeLinecap="round" />}
        </g>,
      ),
      face: (
        <g>
          {mir(<ellipse cx="66" cy="106" rx={x.f === 0 ? 19 : 14} ry={x.f === 0 ? 14 : 11} fill={x.belly} />)}
          <ellipse cx="100" cy="106" rx="17" ry="12" fill={x.belly} />
          {x.f === 1 && <path d="M100 38 V62 M89 41 L90 58 M111 41 L110 58" stroke={x.cs} strokeWidth="4" strokeLinecap="round" opacity=".7" />}
        </g>
      ),
      after: (
        <g>
          <path d="M95 99 Q100 96 105 99 Q102 104 100 104 Q98 104 95 99Z" fill="#E8718A" />
          <path d="M100 104 V108 M100 108 Q94 112 90 109 M100 108 Q106 112 110 109" stroke="#6B3B3B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <rect x="96.5" y="108.5" width="3" height="6" rx="1" fill="#fff" stroke="#D9CFC3" strokeWidth=".6" />
          <rect x="100.5" y="108.5" width="3" height="6" rx="1" fill="#fff" stroke="#D9CFC3" strokeWidth=".6" />
          <path d="M76 106 L56 102 M76 111 L56 114 M124 106 L144 102 M124 111 L144 114" stroke={x.cd} strokeWidth="1.3" strokeLinecap="round" opacity=".5" />
        </g>
      ),
    }),
  },

  /* ───── Kurbağa ───── */
  {
    id: "kurbaga", name: "Kurbağa", price: 100, tier: "Yaygın",
    featureLabel: "Özellik", features: ["Sade", "Kırmızı yanak", "Boğaz balonu"],
    palette: pal([
      ["Çayır", "#6DBE62", "#E4F5B8"], ["Zümrüt", "#2E9C6A", "#CDF0D8"], ["Limon", "#B6D44A", "#F4F9C4"], ["Okyanus", "#3E9CC9", "#D6EEF8"],
      ["Zehirli mor", "#8B63C9", "#E8DEF8"], ["Turuncu", "#EE8A3A", "#FFE8CC"], ["Pembe", "#EE88AE", "#FFE3EE"], ["Gece", "#34506B", "#9FB8CC"],
    ]),
    parts: (x) => ({
      eyes: { s: 1.12, ring: tint(x.c, 0.55) },
      back: <ellipse cx="100" cy="206" rx="22" ry="10" fill={x.cs} opacity=".5" />,
      headBack: (
        <g>
          {mir(<g><circle cx="70" cy="52" r="19" fill={x.c} /><circle cx="70" cy="52" r="19" fill="none" stroke={x.cs} strokeWidth="1.5" opacity=".5" /></g>)}
          {x.f === 2 && (
            <g>
              <ellipse cx="100" cy="128" rx="26" ry="18" fill={x.belly} stroke={x.cs} strokeWidth="1.6" />
              <path d="M82 126 Q100 138 118 126" stroke={x.cs} strokeWidth="1.4" fill="none" opacity=".4" />
            </g>
          )}
        </g>
      ),
      face: <ellipse cx="100" cy="112" rx="30" ry="15" fill={x.belly} opacity=".85" />,
      after: (
        <g>
          <path d="M72 108 Q100 128 128 108" stroke="#2F5A3A" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <circle cx="94" cy="100" r="1.8" fill="#2F5A3A" /><circle cx="106" cy="100" r="1.8" fill="#2F5A3A" />
          {x.f === 1 && mir(<ellipse cx="64" cy="106" rx="9" ry="6" fill="#FF6B6B" opacity=".75" />)}
        </g>
      ),
    }),
  },

  /* ───── Ayı ───── */
  {
    id: "ayi", name: "Ayı", price: 220, tier: "Nadir",
    featureLabel: "Kulak", features: ["Yuvarlak", "Büyük", "Göğüs lekeli"],
    palette: pal([
      ["Kahverengi", "#8A5A38", "#E3C39C"], ["Bal", "#C8914A", "#F6E0B8"], ["Siyah", "#2F2C34", "#7B7683"], ["Kutup", "#F1F0EC", "#FFFFFF"],
      ["Çikolata", "#5C3A25", "#C49A76"], ["Kızıl", "#B5522E", "#F0C8A8"], ["Gri", "#8E949C", "#E4E8EC"], ["Şeker", "#E996B4", "#FFE4EE"],
    ]),
    parts: (x) => ({
      back: <circle cx="100" cy="208" r="9" fill={x.cs} />,
      headBack: mir(
        <g>
          <circle cx="62" cy="53" r={x.f === 1 ? 19 : 15} fill={x.c} />
          <circle cx="62" cy="53" r={x.f === 1 ? 11 : 8.5} fill={x.belly} />
        </g>,
      ),
      face: <ellipse cx="100" cy="108" rx="21" ry="15" fill={x.belly} />,
      bodyOver: x.f === 2 ? <path d="M84 142 Q100 168 116 142 Q100 150 84 142Z" fill={x.belly} /> : null,
      after: (
        <g>
          <ellipse cx="100" cy="100" rx="8" ry="5.6" fill="#2A2630" />
          <ellipse cx="98" cy="98.4" rx="2.6" ry="1.3" fill="#fff" opacity=".55" />
          <path d="M100 105 V110 M100 110 Q93 117 87 112 M100 110 Q107 117 113 112" stroke="#4A2E2E" strokeWidth="2.1" strokeLinecap="round" fill="none" />
        </g>
      ),
    }),
  },

  /* ───── Kurt ───── */
  {
    id: "kurt", name: "Kurt", price: 260, tier: "Nadir",
    featureLabel: "Detay", features: ["Sivri kulak", "Yanak tüylü", "Alın çizgili"],
    palette: pal([
      ["Bozkurt", "#8D939B", "#E9ECEF"], ["Kutup", "#E9ECEF", "#FFFFFF"], ["Gece", "#3A3C46", "#9096A2"], ["Orman", "#7A6A58", "#E4D6C2"],
      ["Kızıl", "#A9622F", "#F2D2B0"], ["Buz mavisi", "#7FA4C9", "#E4EFF9"], ["Kömür", "#555A64", "#BAC0CA"], ["Mor", "#8470B8", "#E8E2F6"],
    ]),
    parts: (x) => ({
      back: (
        <g>
          <path d="M126 204 C172 214 188 170 170 140 C162 164 148 180 126 184Z" fill={x.c} />
          <path d="M170 140 C184 164 182 190 164 204 C172 184 172 162 170 140Z" fill={x.cs} opacity=".7" />
        </g>
      ),
      headBack: (
        <g>
          {mir(<g><path d="M56 80 L50 16 L98 52Z" fill={x.c} strokeLinejoin="round" /><path d="M63 68 L58 32 L88 54Z" fill={x.cs} /></g>)}
          {x.f === 1 && mir(<path d="M58 90 L34 96 L54 104 L38 116 L64 112Z" fill={x.c} />)}
        </g>
      ),
      face: (
        <g>
          <path d="M60 94 C68 112 84 120 100 120 C116 120 132 112 140 94 C144 120 124 132 100 132 C76 132 56 120 60 94Z" fill={x.belly} />
          {x.f === 2 && <path d="M100 38 V62 M90 41 L92 58 M110 41 L108 58" stroke={x.cd} strokeWidth="4" strokeLinecap="round" opacity=".55" />}
        </g>
      ),
      after: (
        <g>
          <path d="M92 99 Q100 94 108 99 Q105 107 100 107 Q95 107 92 99Z" fill="#26222B" />
          <path d="M100 107 V110 M100 110 Q94 116 88 112 M100 110 Q106 116 112 112" stroke="#3E2A2A" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M94 114 L96 119 L98 114Z M102 114 L104 119 L106 114Z" fill="#fff" />
        </g>
      ),
    }),
  },

  /* ───── Maymun ───── */
  {
    id: "maymun", name: "Maymun", price: 240, tier: "Nadir",
    featureLabel: "Saç", features: ["Düz", "Tepelik", "Favorili"],
    palette: pal([
      ["Kahve", "#8B5E3C", "#F0D2AE"], ["Koyu", "#4F3A2E", "#E2BE98"], ["Altın", "#D6A04A", "#FBE3B6"], ["Kızıl", "#B95A2E", "#F6D0AE"],
      ["Gri", "#8C9199", "#EBD9C4"], ["Siyah", "#2E2B31", "#D8B796"], ["Krem", "#E8CFA4", "#FFF1D6"], ["Mavi", "#5C86BE", "#F1DDC4"],
    ]),
    parts: (x) => ({
      back: <path d="M128 206 C176 210 190 160 164 142 C160 150 166 160 160 170" stroke={x.c} strokeWidth="9" strokeLinecap="round" fill="none" />,
      headBack: mir(
        <g>
          <circle cx="54" cy="86" r="15" fill={x.c} />
          <circle cx="54" cy="86" r="9" fill={x.belly} />
        </g>,
      ),
      face: (
        <g>
          <path d="M62 88 C60 70 86 72 100 86 C114 72 140 70 138 88 C142 114 122 128 100 128 C78 128 58 114 62 88Z" fill={x.belly} />
          {x.f === 2 && mir(<path d="M58 80 L46 96 L58 104Z" fill={x.cs} />)}
        </g>
      ),
      after: (
        <g>
          <circle cx="95" cy="103" r="1.8" fill="#6B4B3B" /><circle cx="105" cy="103" r="1.8" fill="#6B4B3B" />
          <path d="M86 112 Q100 123 114 112" stroke="#6B3B3B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
      ),
      over: x.f === 1 ? <path d="M88 44 Q92 28 100 36 Q104 22 112 38 Q118 30 118 46 Q104 40 88 44Z" fill={x.cs} /> : null,
    }),
  },

  /* ───── Koala ───── */
  {
    id: "koala", name: "Koala", price: 280, tier: "Nadir",
    featureLabel: "Kulak", features: ["Büyük", "Orta", "Yaprak süslü"],
    palette: pal([
      ["Gri", "#9AA0A8", "#F1F2F4"], ["Gümüş", "#B8BEC6", "#FFFFFF"], ["Kahve", "#8E7360", "#EFE1D2"], ["Duman", "#6F7680", "#D8DCE1"],
      ["Krem", "#D9CBB4", "#FFF8EA"], ["Mavi", "#8FA9C9", "#EAF1F9"], ["Pembe", "#D9A9BC", "#FFEFF5"], ["Gece", "#454A56", "#9AA0AC"],
    ]),
    parts: (x) => ({
      back: <circle cx="100" cy="208" r="8" fill={x.cs} />,
      headBack: mir(
        <g>
          <circle cx="56" cy="58" r={x.f === 0 ? 23 : 18} fill={x.c} />
          <circle cx="56" cy="58" r={x.f === 0 ? 14 : 10.5} fill="#F7F3EE" />
          <path d="M44 52 q4 -5 8 0 M60 46 q4 -5 8 0" stroke="#F7F3EE" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".0" />
        </g>,
      ),
      face: <ellipse cx="100" cy="108" rx="20" ry="14" fill={x.belly} opacity=".9" />,
      after: (
        <g>
          <path d="M88 96 C88 90 112 90 112 96 C112 108 106 114 100 114 C94 114 88 108 88 96Z" fill="#33303A" />
          <ellipse cx="96" cy="97" rx="3.2" ry="1.6" fill="#fff" opacity=".5" />
          <path d="M100 114 V117 M100 117 Q95 121 91 118 M100 117 Q105 121 109 118" stroke="#4A3A3A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
      ),
      over: x.f === 2 ? (
        <g>
          <path d="M122 50 C136 30 156 34 156 34 C154 54 138 62 122 50Z" fill="#5FBF6A" />
          <path d="M126 50 C136 44 146 40 154 36" stroke="#2E8C4A" strokeWidth="1.6" fill="none" />
        </g>
      ) : null,
    }),
  },

  /* ───── Geyik (Kazdağları'nın sakini) ───── */
  {
    id: "geyik", name: "Geyik", price: 300, tier: "Nadir",
    featureLabel: "Boynuz", features: ["Büyük boynuz", "Küçük boynuz", "Yavru (benekli)"],
    palette: pal([
      ["Kızıl", "#B9703A", "#F4E0C2"], ["Bal", "#D1A25C", "#FBEBCB"], ["Kahve", "#7F5434", "#E2C9A6"], ["Gri", "#9A8F84", "#EEE7DD"],
      ["Kar", "#EDEAE4", "#FFFFFF"], ["Koyu", "#4B382B", "#BFA283"], ["Altın", "#E1B84E", "#FFF1C8"], ["Orman", "#6F8A52", "#E4EDD0"],
    ]),
    parts: (x) => {
      const horn = "#8A6238";
      const big = (
        <g stroke={horn} strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M72 54 C66 38 60 26 58 8 M65 36 L48 28 M62 22 L72 10 M60 14 L48 8" />
        </g>
      );
      const small = (
        <g stroke={horn} strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M72 54 C68 44 64 36 62 24 M66 38 L56 34" />
        </g>
      );
      const nub = <g fill={horn}><ellipse cx="72" cy="48" rx="5" ry="8" transform="rotate(-18 72 48)" /></g>;
      return {
        back: <ellipse cx="146" cy="196" rx="8" ry="11" fill="#FFFFFF" transform="rotate(25 146 196)" />,
        headBack: (
          <g>
            {mir(x.f === 0 ? big : x.f === 1 ? small : nub)}
            {mir(<g><ellipse cx="52" cy="66" rx="9" ry="17" transform="rotate(-48 52 66)" fill={x.c} /><ellipse cx="52" cy="66" rx="4.5" ry="11" transform="rotate(-48 52 66)" fill={PINK} /></g>)}
          </g>
        ),
        face: (
          <g>
            <ellipse cx="100" cy="109" rx="19" ry="14" fill={x.belly} />
            {x.f === 2 && (
              <g fill="#fff" opacity=".75">
                <circle cx="70" cy="62" r="3.4" /><circle cx="86" cy="50" r="3" /><circle cx="116" cy="52" r="3.2" /><circle cx="132" cy="66" r="3.4" /><circle cx="100" cy="46" r="2.8" />
              </g>
            )}
          </g>
        ),
        after: (
          <g>
            <ellipse cx="100" cy="101" rx="7" ry="5" fill="#2E2A30" />
            <ellipse cx="98" cy="99.6" rx="2.2" ry="1.1" fill="#fff" opacity=".55" />
            <path d="M100 106 V110 M100 110 Q94 116 89 112 M100 110 Q106 116 111 112" stroke="#4A3030" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        ),
      };
    },
  },

  /* ───── Kirpi ───── */
  {
    id: "kirpi", name: "Kirpi", price: 200, tier: "Nadir",
    featureLabel: "Diken", features: ["Uzun diken", "Kısa diken", "Yaprak taçlı"],
    palette: pal([
      ["Kahve", "#7D5A40", "#F2DDC0"], ["Koyu", "#4C3A30", "#E6CDAA"], ["Gri", "#8A8F98", "#F0EEEA"], ["Kum", "#C6A474", "#FBEBCF"],
      ["Kızıl", "#A9552E", "#F6D6B4"], ["Gece mavisi", "#3F4F76", "#E6DDCB"], ["Yeşil", "#6B8A55", "#F1ECCF"], ["Pembe", "#D58BA6", "#FFE9DD"],
    ]),
    parts: (x) => {
      const long = x.f !== 1;
      const R = long ? 58 : 50;
      const spikes = Array.from({ length: 13 }).map((_, i) => {
        const a = Math.PI + (Math.PI * (i + 0.5)) / 13;
        const cx = 100 + 38 * Math.cos(a), cy = 88 + 38 * Math.sin(a);
        const tx = 100 + R * Math.cos(a), ty = 88 + R * Math.sin(a);
        const px = -Math.sin(a) * 7, py = Math.cos(a) * 7;
        return <path key={i} d={`M${(cx + px).toFixed(1)} ${(cy + py).toFixed(1)} L${tx.toFixed(1)} ${ty.toFixed(1)} L${(cx - px).toFixed(1)} ${(cy - py).toFixed(1)}Z`} fill={i % 2 ? x.cs : x.c} />;
      });
      const bodySpikes = Array.from({ length: 9 }).map((_, i) => {
        const a = Math.PI * 0.9 + (Math.PI * 1.2 * i) / 8;
        const bx = 100 + 36 * Math.cos(a), by = 180 + 34 * Math.sin(a);
        const tx = 100 + 54 * Math.cos(a), ty = 180 + 50 * Math.sin(a);
        const px = -Math.sin(a) * 6, py = Math.cos(a) * 6;
        return <path key={i} d={`M${(bx + px).toFixed(1)} ${(by + py).toFixed(1)} L${tx.toFixed(1)} ${ty.toFixed(1)} L${(bx - px).toFixed(1)} ${(by - py).toFixed(1)}Z`} fill={i % 2 ? x.cs : x.c} />;
      });
      return {
        back: <g>{bodySpikes}<ellipse cx="100" cy="182" rx="38" ry="34" fill={x.cs} /></g>,
        headBack: (
          <g>
            {spikes}
            {mir(<g><circle cx="57" cy="68" r="8" fill={x.belly} /><circle cx="57" cy="68" r="4.4" fill={PINK} /></g>)}
          </g>
        ),
        face: <path d="M56 96 C62 74 82 70 100 80 C118 70 138 74 144 96 C146 122 124 132 100 132 C76 132 54 122 56 96Z" fill={x.belly} />,
        after: (
          <g>
            <ellipse cx="100" cy="107" rx="6.5" ry="5" fill="#2A2630" />
            <ellipse cx="98.4" cy="105.6" rx="2" ry="1" fill="#fff" opacity=".6" />
            <path d="M100 111 V114 M100 114 Q95 119 91 116 M100 114 Q105 119 109 116" stroke="#5A3A30" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>
        ),
        over: x.f === 2 ? (
          <g>
            <path d="M82 44 C74 34 84 22 96 32 C94 40 90 44 82 44Z" fill="#E8812E" />
            <path d="M100 38 C102 24 116 20 120 32 C116 42 108 42 100 38Z" fill="#C9472E" />
            <path d="M112 44 C118 34 132 36 132 46 C126 52 118 50 112 44Z" fill="#E8B22E" />
          </g>
        ) : null,
      };
    },
  },

  /* ───── Yunus (Ege'nin neşesi) ───── */
  {
    id: "yunus", name: "Yunus", price: 330, tier: "Nadir",
    featureLabel: "Yüzgeç", features: ["Büyük yüzgeç", "Küçük yüzgeç", "Benekli"],
    palette: pal([
      ["Ege", "#5C9ED6", "#EAF4FC"], ["Derin deniz", "#3A5F9C", "#DDE7F5"], ["Gümüş", "#9BAAB8", "#F3F6F9"], ["Turkuaz", "#3FBFC4", "#E4F8F8"],
      ["Pembe", "#EC9CC0", "#FFEAF3"], ["Gece", "#37455F", "#B3BFD3"], ["Lavanta", "#9C86D6", "#EEE8FA"], ["Gün batımı", "#F09A6A", "#FFEBDD"],
    ]),
    parts: (x) => ({
      limb: x.c, hand: x.c, foot: x.cs,
      low: <path d="M126 214 C150 214 164 196 160 170 C176 186 184 214 150 232 C136 238 126 232 126 224Z" fill={x.cs} />,
      headBack: mir(<path d="M58 104 C40 108 30 124 28 142 C44 136 56 128 66 118Z" fill={x.cs} />),
      face: (
        <g>
          <path d="M58 100 C70 120 86 128 100 128 C114 128 130 120 142 100 C146 124 124 138 100 138 C76 138 54 124 58 100Z" fill={x.belly} />
          {x.f === 2 && <g fill={x.cd} opacity=".25"><circle cx="68" cy="68" r="3.2" /><circle cx="84" cy="56" r="3" /><circle cx="116" cy="58" r="3.2" /><circle cx="132" cy="70" r="3" /><circle cx="100" cy="50" r="2.6" /></g>}
        </g>
      ),
      after: (
        <g>
          <ellipse cx="100" cy="112" rx="21" ry="10" fill={x.belly} stroke={x.cs} strokeWidth="1.4" />
          <path d="M84 113 Q100 124 116 113" stroke="#3A5F7A" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="94" cy="107" r="1.4" fill="#3A5F7A" /><circle cx="106" cy="107" r="1.4" fill="#3A5F7A" />
        </g>
      ),
      over: (
        <path
          d={x.f === 1 ? "M92 40 Q102 28 116 32 Q108 38 108 44Z" : "M90 42 Q100 18 126 22 Q112 34 110 46Z"}
          fill={x.cs} stroke={shade(x.cs, -0.15)} strokeWidth="1.2" strokeLinejoin="round"
        />
      ),
    }),
  },

  /* ───── Grifon (efsanevi) ───── */
  {
    id: "grifon", name: "Grifon", price: 850, tier: "Efsanevi",
    featureLabel: "Kanat", features: ["Tunç kanat", "Gümüş kanat", "Gök kanat"],
    palette: pal([
      ["Altın aslan", "#D9A441", "#FBE7B8"], ["Kızıl", "#C0602A", "#F6D2B0"], ["Gece", "#454052", "#A39EB2"], ["Kar", "#E8E4DC", "#FFFFFF"],
      ["Zümrüt", "#4E9A78", "#D6F0E2"], ["Mor", "#8466C4", "#E6DDF8"], ["Okyanus", "#4C86C4", "#DCEBF8"], ["Gül", "#D77E9C", "#FFE5EE"],
    ]),
    parts: (x) => {
      const wing = x.f === 0 ? shade(x.c, -0.28) : x.f === 1 ? "#B9C4D0" : "#4A7FC9";
      const wingTip = x.f === 0 ? shade(x.c, -0.5) : x.f === 1 ? "#8E9CAD" : "#2D55A0";
      return {
        head: "#FBF8F0",
        foot: "#E3AE2A",
        back: (
          <g>
            {mir(
              <g>
                <path d="M66 148 C30 134 6 100 -6 40 C10 52 22 54 32 48 C28 62 40 72 48 70 C46 86 56 98 68 102Z" fill={wing} />
                <path d="M-6 40 C10 52 22 54 32 48 C28 62 40 72 48 70 C40 76 28 76 18 70 C10 62 2 54 -6 40Z" fill={wingTip} />
                <path d="M18 66 C24 90 38 118 62 138 M34 78 C38 98 48 116 64 130" stroke={wingTip} strokeWidth="2" fill="none" opacity=".45" />
              </g>,
            )}
            <path d="M128 204 C176 214 192 168 170 140 C162 164 148 178 128 184Z" fill={x.c} />
            <ellipse cx="172" cy="140" rx="9" ry="14" fill={shade(x.c, -0.3)} />
          </g>
        ),
        headBack: mir(
          <g>
            <path d="M60 78 L50 18 L98 54Z" fill={x.c} strokeLinejoin="round" />
            <path d="M64 66 L58 34 L88 54Z" fill="#FBF8F0" />
          </g>,
        ),
        face: (
          <path d="M58 90 C70 110 86 116 100 116 C114 116 130 110 142 90 C146 118 124 130 100 130 C76 130 54 118 58 90Z" fill="#F0E9D6" />
        ),
        after: (
          <g>
            <path d="M86 96 Q100 88 114 96 Q116 114 100 128 Q84 114 86 96Z" fill="#F6B93B" stroke="#D18F1A" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M92 102 Q100 98 108 102" stroke="#D18F1A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <circle cx="96" cy="104" r="1.5" fill="#B87812" /><circle cx="104" cy="104" r="1.5" fill="#B87812" />
          </g>
        ),
        over: (
          <g>
            <path d="M92 44 Q84 24 96 8 Q100 24 104 10 Q114 28 108 44Z" fill="#F6C343" stroke="#D18F1A" strokeWidth="1.4" strokeLinejoin="round" />
          </g>
        ),
      };
    },
  },
];
