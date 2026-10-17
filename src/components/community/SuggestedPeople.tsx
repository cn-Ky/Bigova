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

/** "Tanıyor olabilirsin": yatay kaydırmalı kişi kartları. Öneri yoksa hiçbir şey çizmez. */
export default function SuggestedPeople({ enabled, className = "" }: { enabled: boolean; className?: string }) {
  const { people, dismiss } = useSuggestedPeople(enabled);
  const [rel, setRel] = useState<Record<string, FollowRelation>>({});
  const avatars = useAvatars(useMemo(() => (people ?? []).map((p) => p.user_id), [people]));
  if (!people || people.length === 0) return null;
  return (
    <section aria-label="Tanıyor olabileceklerin" className={className}>
      <h2 className="mb-2 font-display text-lg font-extrabold">Tanıyor olabilirsin</h2>
      <ul className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        <AnimatePresence initial={false}>
          {people.map((p) => (
            <motion.li key={p.user_id} layout exit={{ opacity: 0, scale: 0.9 }} className="relative w-36 shrink-0 rounded-[22px] bg-card p-3 text-center shadow-sm">
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
