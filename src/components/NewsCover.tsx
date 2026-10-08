import { categoryMeta } from "@/lib/newsData";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

/**
 * Fotoğraf olmadan da her haberin kendine ait bir kapağı olsun diye: kategori renginde gradyan,
 * Bigova'nın dalga motifi ve kategori ikonu. Aynı haber her zaman aynı kapağı alır.
 */
export default function NewsCover({
  category,
  seed = "",
  size = "card",
  className = "",
}: {
  category: string;
  seed?: string;
  size?: "hero" | "card" | "thumb";
  className?: string;
}) {
  const { icon, tone } = categoryMeta(category);
  // Başlıktan türetilen küçük sapma: aynı kategorideki kapaklar birbirinin kopyası olmasın
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const tilt = (h % 24) - 12;
  const dotX = 12 + (h % 60);
  const light = tone === "sea" ? "text-white" : "text-deep";
  const iconSize = size === "hero" ? "text-[110px]" : size === "card" ? "text-[76px]" : "text-[34px]";
  return (
    <div
      aria-hidden="true"
      className={`news-cover relative isolate overflow-hidden ${light} ${className}`}
      style={{
        ["--tone" as string]: `var(--${tone})`,
        background: `linear-gradient(${135 + tilt}deg, rgb(var(--tone)) 0%, rgb(var(--tone) / .62) 100%)`,
      }}
    >
      <span
        className="absolute -right-3 -top-3 h-28 w-28 rounded-full bg-white/20"
        style={{ transform: `translateX(${dotX / 4}px)` }}
      />
      <span className="absolute left-[18%] top-[22%] h-3 w-3 rounded-full bg-white/40" />
      <span className="absolute left-[34%] top-[12%] h-1.5 w-1.5 rounded-full bg-white/50" />
      <FontAwesomeIcon
        icon={icon}
        className={`news-cover-icon absolute right-[9%] top-1/2 -translate-y-1/2 opacity-[.28] ${iconSize}`}
        style={{ transform: `translateY(-50%) rotate(${tilt}deg)` }}
      />
      {size !== "thumb" && (
        <>
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="wave-a absolute bottom-0 left-0 h-[34%] w-[200%]">
            <path d="M0 30 Q150 0 300 30 T600 30 T900 30 T1200 30 V60 H0Z" style={{ fill: "rgb(255 255 255 / .22)" }} />
          </svg>
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="wave-b absolute bottom-0 left-0 h-[26%] w-[200%]">
            <path d="M0 30 Q150 0 300 30 T600 30 T900 30 T1200 30 V60 H0Z" style={{ fill: "rgb(255 255 255 / .18)" }} />
          </svg>
        </>
      )}
    </div>
  );
}
