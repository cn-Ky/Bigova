"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { tabs, isOn } from "./tabs";

export default function BottomNav() {
  const p = usePathname();
  return (
    <nav aria-label="Ana menü" className="fixed bottom-0 left-1/2 z-40 w-full max-w-[440px] md:max-w-[520px] lg:hidden -translate-x-1/2 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
      <ul className="flex rounded-[28px] bg-card/90 p-1.5 shadow-[0_10px_34px_rgba(14,58,91,.22)] backdrop-blur-md">
        {tabs.map((t) => {
          const on = isOn(p, t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link href={t.href} aria-current={on ? "page" : undefined} className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold">
                {on && <motion.span layoutId="pill" className="absolute inset-0 rounded-[22px] bg-sea" transition={{ type: "spring", stiffness: 520, damping: 34 }} />}
                <span className={`relative flex flex-col items-center gap-0.5 ${on ? "text-white" : "text-ink/60"}`}>
                  <FontAwesomeIcon icon={t.i} className="text-[17px]" />{t.l}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
