"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { SUGGEST_REASON, useSuggestedPeople, type FollowRelation } from "@/lib/community";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FollowButton } from "./FollowBar";

/**
 * "Tanıyor olabilirsin" önerileri. Öneri yoksa hiçbir şey çizmez.
 * - variant="scroll": yatay kaydırmalı kişi kartları (akış, keşfet)
 * - variant="list": dikey, kompakt liste (masaüstü yan çubuğu)
 */
export default function SuggestedPeople({ enabled, className = "", variant = "scroll", limit }: { enabled: boolean; className?: string; variant?: "scroll" | "list"; limit?: number }) {
  const { people, dismiss } = useSuggestedPeople(enabled);
  const [rel, setRel] = useState<Record<string, FollowRelation>>({});
  const shown = useMemo(() => (people ?? []).slice(0, limit ?? 99), [people, limit]);
  const avatars = useAvatars(useMemo(() => shown.map((p) => p.user_id), [shown]));
  if (shown.length === 0) return null;

  if (variant === "list")
    return (
      <section aria-label="Tanıyor olabileceklerin" className={`min-w-0 rounded-[24px] bg-card p-2 shadow-sm ring-1 ring-ink/[0.04] ${className}`}>
        <h2 className="px-3 pb-1 pt-2.5 font-display text-lg font-extrabold">Kimi takip etmeli</h2>
        <ul>
          <AnimatePresence initial={false}>
            {shown.map((p) => (
              <motion.li key={p.user_id} layout exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
                <Link href={`/profil/${p.user_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar name={p.name} avatar={avatars[p.user_id]} size={42} />
                  <span className="min-w-0 leading-tight">
                    <b className="block truncate text-sm font-extrabold">{p.name}</b>
                    <span className="block truncate text-xs text-ink/55">{p.reason === "department" && p.department ? p.department : SUGGEST_REASON[p.reason]}</span>
                  </span>
                </Link>
                <FollowButton compact userId={p.user_id} name={p.name} relation={rel[p.user_id] ?? "none"} onChange={(r) => setRel((cur) => ({ ...cur, [p.user_id]: r }))} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    );

  return (
    <section aria-label="Tanıyor olabileceklerin" className={`min-w-0 ${className}`}>
      <h2 className="mb-2 font-display text-lg font-extrabold">Tanıyor olabilirsin</h2>
      <ul className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
        <AnimatePresence initial={false}>
          {shown.map((p) => (
            <motion.li key={p.user_id} layout exit={{ opacity: 0, scale: 0.9 }} className="relative w-36 shrink-0 rounded-[22px] bg-card p-3 text-center shadow-sm ring-1 ring-ink/[0.04]">
              <button type="button" aria-label={`${p.name} önerisini kaldır`} onClick={() => dismiss(p.user_id)} className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-[10px] text-ink/40 hover:bg-foam hover:text-ink">
                <FontAwesomeIcon icon={faXmark} />
              </button>
              <Link href={`/profil/${p.user_id}`} className="block">
                <UserAvatar name={p.name} avatar={avatars[p.user_id]} size={64} className="mx-auto" />
                <b className="mt-2 block truncate text-sm font-extrabold">{p.name}</b>
                <span className="mt-0.5 block min-h-[2rem] text-[11px] leading-tight text-ink/55">{p.reason === "department" && p.department ? p.department : SUGGEST_REASON[p.reason]}</span>
              </Link>
              <div className="mt-2 flex justify-center">
                <FollowButton compact userId={p.user_id} name={p.name} relation={rel[p.user_id] ?? "none"} onChange={(r) => setRel((cur) => ({ ...cur, [p.user_id]: r }))} />
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
