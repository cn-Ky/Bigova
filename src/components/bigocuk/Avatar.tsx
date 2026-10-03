"use client";
import {
  HAIR_COLORS,
  ITEM_MAP,
  SKINS,
  shade,
  type AvatarConfig,
  type DrawCtx,
  type Layers,
  type Slot,
} from "@/lib/bigocuk/items";
import { memo, useId } from "react";

/** Avatarın hangi bölgesinin gösterileceği (SVG viewBox kırpması). */
export const VIEWS = {
  full: "0 0 200 270",
  bust: "34 12 132 140",
  hair: "30 10 140 130",
  top: "34 134 132 92",
  bottom: "40 176 120 94",
  shoes: "44 214 112 56",
} as const;
export type View = keyof typeof VIEWS;
export const SLOT_VIEW: Record<Slot, View> = {
  bg: "full", hair: "hair", hat: "hair", glasses: "hair", extra: "top", top: "top", bottom: "bottom", shoes: "shoes",
};

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
  const skin = (SKINS.find((s) => s.id === config.skin) ?? SKINS[1]).c;
  const hair = (HAIR_COLORS.find((h) => h.id === config.hairColor) ?? HAIR_COLORS[1]).c;
  const ctx: DrawCtx = { uid, skin, skinShade: shade(skin, -0.14), hair, hairShade: shade(hair, -0.28) };
  const L = (slot: Slot): Layers => ITEM_MAP[config[slot]]?.draw(ctx) ?? {};
  const bg = L("bg"), hr = L("hair"), tp = L("top"), bt = L("bottom"), sh = L("shoes"), gl = L("glasses"), ht = L("hat"), ex = L("extra");

  const vb = VIEWS[view];
  const [, , vw, vh] = vb.split(" ").map(Number);
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
      <ellipse cx="100" cy="261" rx="46" ry="6" fill="#000" opacity=".14" />
      {ex.back}
      {hr.back}

      {/* bacaklar */}
      <g fill={skin}>
        <rect x="78" y="196" width="19" height="52" rx="8" />
        <rect x="103" y="196" width="19" height="52" rx="8" />
      </g>
      {sh.mid}
      {bt.mid}

      {/* gövde: boyun, kollar, eller */}
      <rect x="91" y="122" width="18" height="24" rx="7" fill={ctx.skinShade} />
      <g stroke={skin} strokeWidth="15" strokeLinecap="round" fill="none">
        <path d="M64 150 L53 198" />
        <path d="M136 150 L147 198" />
      </g>
      <circle cx="52" cy="203" r="8.5" fill={skin} />
      <circle cx="148" cy="203" r="8.5" fill={skin} />
      {tp.mid}
      {ex.mid}

      {/* kafa ve yüz */}
      <circle cx="56" cy="92" r="8" fill={skin} />
      <circle cx="144" cy="92" r="8" fill={skin} />
      <ellipse cx="100" cy="84" rx="44" ry="46" fill={skin} />
      <ellipse cx="73" cy="102" rx="7" ry="4.5" fill="#FF6B57" opacity=".28" />
      <ellipse cx="127" cy="102" rx="7" ry="4.5" fill="#FF6B57" opacity=".28" />
      <g className="bc-blink">
        <ellipse cx="84" cy="90" rx="4.2" ry="5.6" fill="#1C2A3A" />
        <ellipse cx="116" cy="90" rx="4.2" ry="5.6" fill="#1C2A3A" />
        <circle cx="85.5" cy="88" r="1.5" fill="#fff" />
        <circle cx="117.5" cy="88" r="1.5" fill="#fff" />
      </g>
      <g stroke={ctx.hairShade} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M76 79 Q84 74 92 78" />
        <path d="M108 78 Q116 74 124 79" />
      </g>
      <path d="M98 99 Q100 102 102 99" stroke={ctx.skinShade} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M91 108 Q100 117 109 108" stroke="#8A3B2E" strokeWidth="3" strokeLinecap="round" fill="none" />

      {hr.over}
      {ex.over}
      {gl.over}
      {ht.over}
    </svg>
  );
}
const Avatar = memo(AvatarImpl);
export default Avatar;
