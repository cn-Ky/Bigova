"use client";
import Avatar, { type View } from "@/components/bigocuk/Avatar";
import { DEFAULT_AVATAR, type AvatarConfig } from "@/lib/bigocuk/items";
import { SPECIES_MAP } from "@/lib/bigocuk/species";
import { useMemo } from "react";

/** Safari hayvanının avatar ayarı: yalnızca tür + renk, kıyafet ve arka plan yok. */
export const wildConfig = (species: string, variant: number): AvatarConfig => ({
  ...DEFAULT_AVATAR,
  species: `sp-${species}`,
  color: `c${Math.min(8, Math.max(1, variant))}`,
  top: "top-none",
  bg: "", // boş: arka plan çizilmez, hayvan kameranın / haritanın üstünde durur
});

export const speciesName = (species: string) => SPECIES_MAP[species]?.name ?? species;

/** Bilinmeyen tür gelirse (ör. sunucu yeni tür eklediyse) çökmek yerine martıya döner. */
export default function WildAnimal({
  species,
  variant = 1,
  size = 160,
  view = "full",
  silhouette = false,
  className = "",
}: {
  species: string;
  variant?: number;
  size?: number | "fluid";
  view?: View;
  /** Defterde henüz yakalanmamış hayvan: siyah gölge */
  silhouette?: boolean;
  className?: string;
}) {
  const known = !!SPECIES_MAP[species];
  // Aynı nesne kimliği: Avatar memo'su sayesinde saniyede bir yeniden çizim olmaz
  const config = useMemo(() => wildConfig(known ? species : "marti", variant), [known, species, variant]);
  return (
    <span
      className={className}
      style={silhouette ? { filter: "brightness(0) opacity(.28)", display: "inline-block" } : { display: "inline-block" }}
    >
      <Avatar
        config={config}
        size={size}
        view={view}
        label={silhouette ? "Henüz yakalanmadı" : speciesName(species)}
      />
    </span>
  );
}
