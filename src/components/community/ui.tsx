"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Topluluk bölümünün ortak görsel dili. Sitenin diğer sayfalarındaki (İşletmeler, Notlar, Haberler…)
 * kalıpların aynısıdır; böylece yükleme, hover ve basma animasyonları her yerde aynı hissettirir.
 * Renkler yalnızca tema değişkenlerinden (bg-card, bg-sea, bg-sun…) gelir; Ayarlar'daki tüm temalarla çalışır.
 */

/** İşletmeler/Notlar sayfalarındaki kartların yay (spring) ayarı. */
export const SPRING = { type: "spring", stiffness: 300, damping: 24 } as const;

/** Kartların sınıfı: yuvarlak köşe + gölge, üzerine gelince gölge büyür (isletmeler/haberler ile aynı). */
export const CARD_CLASS = "rounded-[24px] bg-card shadow-sm transition-shadow hover:shadow-lg";

/** Girişte aşağıdan kayarak gelen, üzerine gelince hafif yükselen tıklanabilir kart hareketi. */
export const cardMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95 },
  whileHover: { y: -3 },
  transition: SPRING,
} as const;

/** Bir listede (örn. liste elemanı) basınca küçülen kart hareketi. */
export const cardTapMotion = { ...cardMotion, whileTap: { scale: 0.98 } } as const;

type Opt<T extends string> = { id: T; label: string };

/**
 * Sekme/filtre çipleri. İşletmeler, Notlar ve Haberler'deki çiplerle aynı biçim:
 * - tone="header": lacivert başlık üzerinde (etkin: sarı, pasif: yarı saydam beyaz)
 * - tone="body": sayfa zemini üzerinde (etkin: tema rengi, pasif: kart)
 */
export function TabChips<T extends string>({
  items,
  value,
  onChange,
  label,
  tone = "body",
  fill = false,
  className = "",
}: {
  items: readonly Opt<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  tone?: "header" | "body";
  /** Çipler satırı eşit paylaşsın (kaydırma yok). */
  fill?: boolean;
  className?: string;
}) {
  const on = tone === "header" ? "bg-sun text-deep" : "bg-sea text-white shadow-sm";
  const off = tone === "header" ? "bg-white/15 text-white" : "bg-card shadow-sm hover:shadow-md";
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex gap-2 ${fill ? "" : "overflow-x-auto pb-1 [scrollbar-width:none]"} ${tone === "header" ? "-mx-5 px-5" : ""} ${className}`}
    >
      {items.map((it) => (
        <motion.button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(it.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-bold transition-[background-color,color,box-shadow] ${fill ? "flex-1" : "shrink-0"} ${value === it.id ? on : off}`}
        >
          {it.label}
        </motion.button>
      ))}
    </div>
  );
}

/** Boş durum kartı (metin + isteğe bağlı eylemler). */
export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-[24px] bg-card p-6 text-center shadow-sm">{children}</div>;
}

/** Birincil eylem düğmesi: sitedeki "bg-sea" hap düğmeleriyle aynı, basınca küçülür. */
export function PrimaryButton({
  children,
  className = "",
  ...rest
}: Omit<React.ComponentProps<typeof motion.button>, "children"> & { children: ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.03 }}
      {...rest}
      className={`rounded-full bg-sea px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** İkincil (yüzeyli) düğme: kart rengi + gölge. */
export function SoftButton({
  children,
  className = "",
  ...rest
}: Omit<React.ComponentProps<typeof motion.button>, "children"> & { children: ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      {...rest}
      className={`rounded-full bg-card px-4 py-2 text-sm font-bold shadow-sm transition-shadow hover:shadow-md disabled:opacity-60 ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** Sağ alttaki yüzen "paylaş" düğmesi — Kitap pazarı/Haberler'deki ekle düğmeleriyle aynı renk (bg-sun). */
export function Fab({
  onClick,
  label,
  children,
  wide = false,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      initial={{ scale: 0, rotate: -40 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.88 }}
      transition={SPRING}
      className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 items-center justify-center gap-2 rounded-full bg-sun font-display font-bold text-deep shadow-xl lg:bottom-8 ${wide ? "px-5 text-sm" : "w-14 text-xl"}`}
    >
      {children}
    </motion.button>
  );
}
