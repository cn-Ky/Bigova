"use client";
import Mascot from "@/components/Mascot";
import { SPRING } from "./ui";
import { formatCount, useUnreadNotifications } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import {
  faArrowLeft,
  faBell,
  faCircleQuestion,
  faCompass,
  faComments,
  faNewspaper,
  faPeopleGroup,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export type CommunityTab = "akis" | "kesfet" | "topluluklar" | "soru" | "forum";
const TABS: { id: CommunityTab; href: string; l: string; i: typeof faNewspaper }[] = [
  { id: "akis", href: "/topluluk", l: "Akış", i: faNewspaper },
  { id: "kesfet", href: "/topluluk/kesfet", l: "Keşfet", i: faCompass },
  { id: "topluluklar", href: "/topluluk/topluluklar", l: "Topluluklar", i: faPeopleGroup },
  { id: "soru", href: "/topluluk/soru-cevap", l: "Soru-Cevap", i: faCircleQuestion },
  { id: "forum", href: "/topluluk/forum", l: "Forum", i: faComments },
];

/** Topluluk bölümleri arasında gezinti. */
export function CommunityTabs({ active, className = "" }: { active: CommunityTab; className?: string }) {
  return (
    <nav aria-label="Topluluk bölümleri" className={`-mx-5 overflow-x-auto px-5 [scrollbar-width:none] ${className}`}>
      <ul className="flex w-max gap-2">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <li key={t.id}>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Link
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${on ? "bg-sun text-deep" : "bg-white/15 text-white"}`}
                >
                  <FontAwesomeIcon icon={t.i} className="text-xs" />
                  {t.l}
                </Link>
              </motion.div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Bildirimler bağlantısı: okunmamış sayısı rozetle gösterilir. */
export function NotificationBell({ className = "" }: { className?: string }) {
  const { user } = useUser();
  const { count } = useUnreadNotifications(!!user);
  const n = formatCount(count);
  return (
    <motion.div whileTap={{ scale: 0.88 }} className={`relative ${className}`}>
      <Link href="/topluluk/bildirimler" aria-label={count > 0 ? `Bildirimler, ${count} okunmamış` : "Bildirimler"} className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white">
        <FontAwesomeIcon icon={faBell} />
      </Link>
      {count > 0 && (
        <span aria-hidden className="pointer-events-none absolute -right-1 -top-1 grid min-w-[1.15rem] place-items-center rounded-full bg-coral px-1 text-[10px] font-extrabold leading-[1.15rem] text-white ring-2 ring-sea">
          {n}
        </span>
      )}
    </motion.div>
  );
}

export default function CommunityHeader({ active, subtitle, children }: { active: CommunityTab; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="rounded-b-[24px] bg-sea px-5 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] text-white shadow-lg">
      <div className="flex items-center gap-3">
        <h1 className="min-w-0 flex-1 truncate font-display text-xl font-extrabold">Topluluk</h1>
        <NotificationBell />
      </div>
      {subtitle && <p className="mt-0.5 text-xs text-white/75">{subtitle}</p>}
      <CommunityTabs active={active} className="mt-2" />
      {children}
    </header>
  );
}

/** Alt sayfalar (topluluk, gönderi, sohbet) için geri düğmeli üst bar. */
export function BackHeader({ title, subtitle, fallback = "/topluluk", right }: { title: string; subtitle?: string; fallback?: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 rounded-b-[28px] bg-sea px-4 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] text-white shadow-lg">
      <motion.button
        type="button"
        aria-label="Geri"
        whileTap={{ scale: 0.88 }}
        whileHover={{ x: -2 }}
        onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15"
      >
        <FontAwesomeIcon icon={faArrowLeft} />
      </motion.button>
      <div className="min-w-0 flex-1 leading-tight">
        <h1 className="truncate font-display text-lg font-extrabold">{title}</h1>
        {subtitle && <p className="truncate text-xs text-white/75">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function NeedLogin({ what = "Topluluğu kullanmak" }: { what?: string }) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="max-w-sm rounded-[24px] bg-card p-6 text-center shadow-sm">
        <Mascot size={96} className="mx-auto" />
        <h1 className="mt-2 font-display text-xl font-extrabold">Giriş yapman gerekiyor</h1>
        <p className="mt-2 text-sm text-ink/70">{what} için Bigova hesabınla giriş yap.</p>
        <motion.div whileTap={{ scale: 0.92 }} className="mt-4 inline-block">
          <Link href="/giris" className="shine inline-block rounded-full bg-sea px-5 py-2.5 text-sm font-bold text-white">
            Giriş yap
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}

export function Notice({ text, tone = "error" }: { text: string; tone?: "error" | "info" }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-2xl px-4 py-3 text-sm font-bold ${tone === "error" ? "bg-coral/25" : "bg-sun/25"}`}
    >
      {text}
    </motion.p>
  );
}

export function Skeleton({ n = 3, h = "h-36" }: { n?: number; h?: string }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={`shimmer ${h} rounded-[24px]`} />
      ))}
    </div>
  );
}
