"use client";
import Avatar from "@/components/bigocuk/Avatar";
import type { AvatarConfig } from "@/lib/bigocuk/items";
import { BG_TINT } from "@/components/bigocuk/bgTint";

const initial = (name: string) => (name || "?").trim()[0]?.toLocaleUpperCase("tr-TR") ?? "?";

/**
 * Yuvarlak profil avatarı. Avatar henüz yüklenmediyse veya yoksa baş harf gösterir.
 * Küçük listelerde `bust` (göğüs üstü), profil başlığında `full` kullan.
 */
export default function UserAvatar({
  name,
  avatar,
  size = 44,
  className = "",
}: {
  name: string;
  avatar?: AvatarConfig;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full [clip-path:circle(50%)] bg-tide/25 font-display font-extrabold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4, background: avatar ? BG_TINT : undefined }}
      aria-hidden={avatar ? undefined : true}
    >
      {avatar ? (
        <Avatar config={avatar} view="bust" size="fluid" className="h-full w-full" label={`${name || "Öğrenci"} avatarı`} />
      ) : (
        initial(name)
      )}
    </span>
  );
}
