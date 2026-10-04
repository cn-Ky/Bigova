"use client";
import { accent, lum, shade, star5, tint } from "@/lib/bigocuk/draw";
import {
  EYE_COLORS,
  ITEM_MAP,
  speciesOf,
  type AvatarConfig,
  type DrawCtx,
  type Layers,
  type Slot,
} from "@/lib/bigocuk/items";
import { INK } from "@/lib/bigocuk/species";
import { memo, useId, type ReactNode } from "react";

/** Avatarın hangi bölgesinin gösterileceği (SVG viewBox kırpması). */
export const VIEWS = {
  full: "0 0 200 270",
  bust: "26 12 148 172",
  head: "28 6 144 182",
  torso: "36 164 128 100",
  hand: "0 118 200 150",
} as const;
export type View = keyof typeof VIEWS;
export const SLOT_VIEW: Record<Slot, View> = {
  species: "full", bg: "full", hat: "head", glasses: "head", neck: "torso", top: "torso", hand: "hand", back: "full",
};

/*
 * Şirin (chibi) oran: büyük, geniş kafa + minik gövde + kısa bacaklar.
 * Parçalar özgün 200×270 koordinatlarında çizilir; gruplar şu dönüşümlerle yerleşir:
 *   gövde (UP): torsonun altı y=240'a oturur   · bacaklar (LOW): ayak tabanı y=258'e oturur
 *   kafa (HEAD): çene noktası (100,130) → (100,182), yatayda biraz daha geniş
 */
const S = 0.85;
const UP = `translate(100 ${240 - 204 * S}) scale(${S}) translate(-100 0)`;
const LOW = `translate(100 ${258 - 258 * S}) scale(${S}) translate(-100 0)`;
const HEAD = "translate(100 182) scale(1.38 1.3) translate(-100 -130)";

/** "c3" → 2, "p1" → 0 … Geçersiz değerlerde 0. */
const idx = (id: string | undefined) => Math.max(0, (parseInt(String(id ?? "").slice(1), 10) || 1) - 1);

/** Seçili desenin kafa ve gövde katmanları. */
function patterns(k: number, base: string) {
  const pc = accent(base, 0.3);
  const pl = lum(base) > 0.75 ? shade(base, -0.18) : tint(base, 0.75);
  const head: ReactNode[] = [
    null,
    <g key="s" fill={pc} opacity=".55"><circle cx="70" cy="60" r="5.5" /><circle cx="126" cy="56" r="4.5" /><circle cx="112" cy="66" r="3.4" /><circle cx="100" cy="50" r="3.6" /><circle cx="60" cy="104" r="4" /><circle cx="140" cy="106" r="4" /></g>,
    <g key="t" stroke={pc} strokeWidth="4.4" strokeLinecap="round" opacity=".55" fill="none"><path d="M100 40 V58 M86 42 L84 58 M114 42 L116 58 M57 94 L72 96 M57 103 L72 103 M143 94 L128 96 M143 103 L128 103" /></g>,
    <path key="m" d="M52 82 Q100 66 148 82 L148 101 Q124 94 100 100 Q76 94 52 101Z" fill={pc} opacity=".5" />,
    <path key="b" d="M100 36 C110 56 110 84 100 100 C90 84 90 56 100 36Z" fill={pl} opacity=".85" />,
    <g key="x" fill={pl} opacity=".9"><path d={star5(66, 66, 4.6)} /><path d={star5(131, 60, 3.6)} /><path d={star5(112, 47, 3)} /><path d={star5(141, 100, 3.6)} /><path d={star5(60, 100, 3)} /></g>,
  ];
  const body: ReactNode[] = [
    null,
    <g key="s" fill={pc} opacity=".5"><circle cx="82" cy="160" r="5" /><circle cx="117" cy="172" r="6" /><circle cx="90" cy="190" r="4.5" /><circle cx="121" cy="150" r="4" /></g>,
    <g key="t" stroke={pc} strokeWidth="5" opacity=".5" fill="none" strokeLinecap="round"><path d="M68 154 Q100 160 132 154 M68 168 Q100 174 132 168 M68 182 Q100 188 132 182 M68 196 Q100 202 132 196" /></g>,
    null,
    <path key="b" d="M100 146 L113 170 L100 194 L87 170Z" fill={pl} opacity=".8" />,
    <g key="x" fill={pl} opacity=".9"><path d={star5(86, 160, 4)} /><path d={star5(114, 176, 3.5)} /><path d={star5(98, 194, 3)} /><path d={star5(124, 152, 3)} /></g>,
  ];
  return { head: head[k] ?? null, body: body[k] ?? null };
}

function AvatarImpl({
  config,
  size = 160,
  view = "full",
  className = "",
  label = "Bigocuk avatarı",
}: {
  config: AvatarConfig;
  size?: number | "fluid";
  view?: View;
  className?: string;
  label?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const sp = speciesOf(config.species);
  const pal = sp.palette[idx(config.color)] ?? sp.palette[0];
  const c = pal.c;
  const cs = shade(c, -0.14);
  const belly = pal.b ?? tint(c, 0.55);
  const f = Math.min(2, idx(config.feature));
  const P = sp.parts({ uid, c, cs, cd: shade(c, -0.3), cl: tint(c, 0.35), belly, f });

  const headFill = P.head ?? c;
  const bodyFill = P.body ?? c;
  const limb = P.limb ?? c;
  const hand = P.hand ?? limb;
  const foot = P.foot ?? shade(limb, -0.14);
  const eyeC = (EYE_COLORS.find((e) => e.id === config.eyes) ?? EYE_COLORS[0]).c;
  const E = P.eyes ?? {};
  const es = E.s ?? 1;
  const hrx = P.headRx ?? 44;
  const hry = P.headRy ?? 46;
  const k = idx(config.pattern);
  const pat = patterns(k, headFill);
  const bodyPat = patterns(k, bodyFill).body;
  // çok açık renklerde (beyaz martı, kar tilkisi…) arka planla karışmasın diye ince çerçeve
  const edge = (fill: string) => (lum(fill) > 0.78 ? { stroke: shade(fill, -0.2), strokeWidth: 1.6 } : {});
  const ctx: DrawCtx = { uid, c, cs, limb };
  const L = (slot: Slot): Layers => ITEM_MAP[config[slot]]?.draw(ctx) ?? {};
  const bg = L("bg"), tp = L("top"), nk = L("neck"), gl = L("glasses"), ht = L("hat"), hd = L("hand"), bk = L("back");

  const vb = VIEWS[view];
  const [, , vw, vh] = vb.split(" ").map(Number);
  const bellyFill = P.bellyFill === undefined ? belly : P.bellyFill;

  return (
    <svg
      viewBox={vb}
      width={size === "fluid" ? "100%" : size}
      height={size === "fluid" ? "100%" : Math.round((size * vh) / vw)}
      className={className}
      role="img"
      aria-label={label}
    >
      {bg.back}
      <ellipse cx="100" cy="259" rx="54" ry="7" fill="#000" opacity=".14" />

      {/* gövdenin arkası: kabuk, kanat, pelerin… */}
      <g transform={UP}>{P.back}{bk.back}</g>

      {/* kısa bacaklar */}
      <g transform={LOW}>
        {P.low}
        {P.legs ?? (
          <g>
            <g fill={limb}>
              <rect x="78" y="196" width="19" height="52" rx="9" />
              <rect x="103" y="196" width="19" height="52" rx="9" />
            </g>
            <g fill={foot}>
              <ellipse cx="86" cy="250" rx="15" ry="8" />
              <ellipse cx="114" cy="250" rx="15" ry="8" />
            </g>
          </g>
        )}
      </g>

      {/* minik gövde: kollar, eller, karın, kıyafet */}
      <g transform={UP}>
        <g stroke={limb} strokeWidth="16" strokeLinecap="round" fill="none">
          <path d="M64 150 L52 196" />
          <path d="M136 150 L148 196" />
        </g>
        <circle cx="52" cy="200" r="9.5" fill={hand} />
        <circle cx="148" cy="200" r="9.5" fill={hand} />
        <clipPath id={`${uid}bc`}><rect x="68" y="138" width="64" height="66" rx="24" /></clipPath>
        <rect x="68" y="138" width="64" height="66" rx="26" fill={bodyFill} {...edge(bodyFill)} />
        {bellyFill && <ellipse cx="100" cy="174" rx="23" ry="27" fill={bellyFill} />}
        {P.bodyOver}
        <g clipPath={`url(#${uid}bc)`}>
          {bodyPat}
          <ellipse cx="100" cy="140" rx="32" ry="10" fill="#000" opacity=".1" />
        </g>
        {tp.mid}
        {nk.mid}
        {bk.mid}
      </g>

      {/* büyük kafa */}
      <g transform={HEAD}>
        {P.headBack}
        <clipPath id={`${uid}hc`}><ellipse cx="100" cy="84" rx={hrx} ry={hry} /></clipPath>
        <ellipse cx="100" cy="84" rx={hrx} ry={hry} fill={headFill} {...edge(headFill)} />
        {P.face}
        <g clipPath={`url(#${uid}hc)`}>{pat.head}</g>
        <ellipse cx="68" cy="104" rx="8" ry="5.2" fill="#FF6B57" opacity=".34" />
        <ellipse cx="132" cy="104" rx="8" ry="5.2" fill="#FF6B57" opacity=".34" />
        <g className="bc-blink">
          {[84, 116].map((x) => (
            <g key={x}>
              {E.ring && <ellipse cx={x} cy="90" rx={6.8 * es + 3} ry={8 * es + 3} fill={E.ring} />}
              <ellipse cx={x} cy="90" rx={6.8 * es} ry={8 * es} fill={INK} />
              <ellipse cx={x} cy="91" rx={5 * es} ry={6.4 * es} fill={eyeC} />
              <ellipse cx={x} cy="92" rx={2.8 * es} ry={4 * es} fill="#10161F" />
              <circle cx={x + 2.4 * es} cy={86.6 - (es - 1) * 2} r={2.5 * es} fill="#fff" />
              <circle cx={x - 2.4 * es} cy={95 + (es - 1) * 2} r={1.2 * es} fill="#fff" opacity=".9" />
            </g>
          ))}
        </g>
        {P.after}
        {P.over}
        {gl.over}
        {ht.over}
      </g>

      {/* elde tutulanlar kafanın önünde görünür */}
      <g transform={UP}>{hd.over}</g>
    </svg>
  );
}
const Avatar = memo(AvatarImpl);
export default Avatar;
