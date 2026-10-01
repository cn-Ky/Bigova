"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Mascot from "./Mascot";
import { tabs, isOn } from "./tabs";

const WAVE = "M0 30 Q150 0 300 30 T600 30 T900 30 T1200 30 V60 H0Z";
const Wave = ({ c, cls }: { c: string; cls: string }) => (
  <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className={`absolute bottom-0 left-0 h-3/4 w-[200%] ${cls}`}><path d={WAVE} fill={c} /></svg>
);

export default function BottomNav() {
  const p = usePathname();
  const { scrollY } = useScroll();
  const [hide, setHide] = useState(false);
  // aşağı kaydırınca dock saklanır, yukarı kaydırınca geri gelir
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (y > prev + 6 && y > 120) setHide(true); else if (y < prev - 6 || y < 80) setHide(false);
  });
  return (
    <motion.nav aria-label="Ana menü" initial={{ y: 120 }} animate={{ y: hide ? 120 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[440px] -translate-x-1/2 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] md:max-w-[520px] lg:hidden">
      <ul className="flex items-end rounded-[30px] bg-card/90 p-1.5 shadow-[0_12px_38px_rgba(14,58,91,.28)] ring-1 ring-ink/5 backdrop-blur-xl">
        {tabs.map((t) => {
          const on = isOn(p, t.href);
          return (
            <motion.li key={t.href} animate={{ flexGrow: on ? 1.7 : 1 }} transition={{ type: "spring", stiffness: 380, damping: 30 }} className="flex-1 basis-0">
              <Link href={t.href} aria-current={on ? "page" : undefined} className="relative flex items-center justify-center gap-1.5 py-3">
                {on && (
                  <>
                    <motion.span layoutId="pill" transition={{ type: "spring", stiffness: 480, damping: 32 }} className="absolute inset-0 overflow-hidden rounded-[24px] bg-sea shadow-[0_6px_18px_rgb(var(--sea)/.45)]">
                      <Wave c="rgba(255,255,255,.14)" cls="wave-a" /><Wave c="rgba(255,255,255,.10)" cls="wave-b" />
                    </motion.span>
                    <motion.span layoutId="gull-m" transition={{ type: "spring", stiffness: 300, damping: 20 }} className="pointer-events-none absolute -top-5 left-1/2 z-10 -translate-x-1/2"><Mascot size={34} /></motion.span>
                  </>
                )}
                <motion.span whileTap={{ scale: 0.6, rotate: -12 }} animate={on ? { y: [0, -7, 0], scale: [1, 1.3, 1] } : { y: 0, scale: 1 }} transition={{ duration: 0.45 }}
                  className={`relative text-[18px] ${on ? "text-white" : "text-ink/60"}`}><FontAwesomeIcon icon={t.i} /></motion.span>
                {on && <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} className="relative overflow-hidden whitespace-nowrap text-[12px] font-bold text-white">{t.l}</motion.span>}
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
