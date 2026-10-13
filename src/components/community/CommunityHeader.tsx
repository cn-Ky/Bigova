"use client";
import UnreadBadge from "@/components/UnreadBadge";
import {
  faArrowLeft,
  faCircleQuestion,
  faComments,
  faNewspaper,
  faPeopleGroup,
  faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export type CommunityTab = "akis" | "topluluklar" | "soru" | "forum" | "arkadaslar";
const TABS: { id: CommunityTab; href: string; l: string; i: typeof faNewspaper }[] = [
  { id: "akis", href: "/topluluk", l: "Akış", i: faNewspaper },
  { id: "topluluklar", href: "/topluluk/topluluklar", l: "Topluluklar", i: faPeopleGroup },
  { id: "soru", href: "/topluluk/soru-cevap", l: "Soru-Cevap", i: faCircleQuestion },
  { id: "forum", href: "/topluluk/forum", l: "Forum", i: faComments },
  { id: "arkadaslar", href: "/arkadaslar", l: "Arkadaşlar", i: faUserGroup },
];

/** Topluluk bölümleri arasında gezinti (Arkadaşlar sayfasında da kullanılır). */
export function CommunityTabs({ active, className = "" }: { active: CommunityTab; className?: string }) {
  return (
    <nav aria-label="Topluluk bölümleri" className={`-mx-5 overflow-x-auto px-5 [scrollbar-width:none] ${className}`}>
      <ul className="flex w-max gap-2">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <li key={t.id}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-extrabold ${on ? "bg-white text-sea" : "bg-white/15 text-white"}`}
              >
                <FontAwesomeIcon icon={t.i} className="text-xs" />
                {t.l}
                {t.id === "arkadaslar" && <UnreadBadge className="!static !ml-1 !h-4 !min-w-4 !text-[10px]" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function CommunityHeader({ active, subtitle, children }: { active: CommunityTab; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="rounded-b-[24px] bg-sea px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
      <h1 className="font-display text-2xl font-extrabold">Topluluk</h1>
      <p className="text-sm text-white/75">{subtitle ?? "Gönderi paylaş, soru sor, gruplara katıl, sohbet et."}</p>
      <CommunityTabs active={active} className="mt-3" />
      {children}
    </header>
  );
}

/** Alt sayfalar (topluluk, gönderi, sohbet) için geri düğmeli üst bar. */
export function BackHeader({ title, subtitle, fallback = "/topluluk", right }: { title: string; subtitle?: string; fallback?: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 rounded-b-[24px] bg-sea px-4 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] text-white shadow-lg">
      <button
        type="button"
        aria-label="Geri"
        onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15"
      >
        <FontAwesomeIcon icon={faArrowLeft} />
      </button>
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
      <div className="max-w-sm rounded-[24px] bg-card p-6 text-center shadow-sm">
        <h1 className="font-display text-xl font-extrabold">Giriş yapman gerekiyor</h1>
        <p className="mt-2 text-sm text-ink/70">{what} için Bigova hesabınla giriş yap.</p>
        <Link href="/giris" className="mt-4 inline-block rounded-full bg-sea px-5 py-2.5 text-sm font-extrabold text-white">
          Giriş yap
        </Link>
      </div>
    </main>
  );
}

export function Notice({ text, tone = "error" }: { text: string; tone?: "error" | "info" }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm font-bold ${tone === "error" ? "bg-coral/25" : "bg-sun/25"}`}>
      {text}
    </p>
  );
}

export function Skeleton({ n = 3, h = "h-36" }: { n?: number; h?: string }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={`${h} animate-pulse rounded-[22px] bg-card/70`} />
      ))}
    </div>
  );
}
