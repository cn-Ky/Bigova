"use client";
import NewsCover from "@/components/NewsCover";
import { safeImg } from "@/lib/newsData";
import { useState } from "react";

/**
 * Haber görseli: lisanslı temsili fotoğraf varsa onu, yoksa (ya da yüklenemezse) NewsCover kapağını gösterir.
 * Görsel yayıncı fotoğrafı değildir; kredi bilgisi detay sayfasında gösterilir.
 */
export default function NewsMedia({
  category,
  seed,
  size,
  className = "",
  imageUrl,
}: {
  category: string;
  seed: string;
  size: "hero" | "card" | "thumb";
  className?: string;
  imageUrl?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const src = safeImg(imageUrl);
  if (!src || failed) return <NewsCover category={category} seed={seed} size={size} className={className} />;
  return (
    <div className={`relative overflow-hidden bg-foam ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
