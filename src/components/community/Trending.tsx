"use client";
import type { TrendingTag } from "@/lib/community";
import { faFire } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

/** Etiketin Keşfet'teki arama adresi. */
export const tagHref = (tag: string) => `/bigola/kesfet?q=${encodeURIComponent(tag)}`;

/**
 * "Gündemde": son günlerin en çok kullanılan #etiketleri, sıralı liste (X'teki gibi).
 * Tıklanınca Keşfet'te o etiketin gönderileri açılır. Etiket yoksa hiçbir şey çizmez.
 */
export default function Trending({ tags, limit = 8, className = "" }: { tags: TrendingTag[]; limit?: number; className?: string }) {
  if (!tags.length) return null;
  return (
    <section aria-label="Gündem etiketleri" className={`min-w-0 rounded-[24px] bg-card p-2 shadow-sm ring-1 ring-ink/[0.04] ${className}`}>
      <h2 className="flex items-center gap-2 px-3 pb-1 pt-2.5 font-display text-lg font-extrabold">
        <FontAwesomeIcon icon={faFire} className="text-sm text-coral" />
        Gündemde
      </h2>
      <ol>
        {tags.slice(0, limit).map((t, i) => (
          <li key={t.tag}>
            <Link href={tagHref(t.tag)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-foam">
              <span aria-hidden className="w-5 shrink-0 text-center text-sm font-extrabold tabular-nums text-ink/40">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <b className="block truncate text-[15px] font-extrabold text-sea">{t.tag}</b>
                <span className="block text-xs text-ink/55">{t.uses} gönderi</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
