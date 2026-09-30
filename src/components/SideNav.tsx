"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import Mascot from "./Mascot";
import { tabs, isOn } from "./tabs";
import { useUser } from "@/lib/useUser";

const WAVE = "M0 30 Q150 0 300 30 T600 30 T900 30 T1200 30 V60 H0Z";
const Wave = ({ c, cls }: { c: string; cls: string }) => (
  <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className={`absolute bottom-0 left-0 h-full w-[200%] ${cls}`}><path d={WAVE} fill={c} /></svg>
);

function Item({ t, on }: { t: (typeof tabs)[number]; on: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 });
  const move = (e: React.MouseEvent) => {
    const b = ref.current!.getBoundingClientRect();
    x.set((e.clientX - b.left - b.width / 2) * 0.1); y.set((e.clientY - b.top - b.height / 2) * 0.25);
  };
  return (
    <motion.li style={{ x, y }} onMouseMove={move} onMouseLeave={() => { x.set(0); y.set(0); }}>
      <Link ref={ref} href={t.href} aria-current={on ? "page" : undefined} className="group relative block rounded-2xl px-4 py-3">
        {on && (
          <>
            <motion.span layoutId="sidepill" transition={{ type: "spring", stiffness: 420, damping: 32 }} className="absolute inset-0 overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/30">
              <Wave c="rgba(255,255,255,.16)" cls="wave-a" /><Wave c="rgba(255,255,255,.12)" cls="wave-b" />
            </motion.span>
            <motion.span layoutId="gull" transition={{ type: "spring", stiffness: 300, damping: 22 }} className="pointer-events-none absolute -right-3 -top-7 z-10"><Mascot size={44} /></motion.span>
          </>
        )}
        <span className="absolute inset-0 rounded-2xl bg-white/0 transition group-hover:bg-white/10" />
        <span className="relative flex items-center gap-3">
          <motion.span whileHover={{ rotate: [0, -14, 12, 0], scale: 1.2 }} transition={{ duration: 0.5 }} className={`grid h-9 w-9 place-items-center rounded-xl ${on ? "bg-sun text-deep" : "bg-white/10"}`}>
            <FontAwesomeIcon icon={t.i} />
          </motion.span>
          <span className="leading-tight"><b className="block font-display text-[17px]">{t.l}</b>
            <span className="block max-h-0 overflow-hidden text-[11px] text-white/70 opacity-0 transition-all duration-300 group-hover:max-h-5 group-hover:opacity-100">{t.hint}</span></span>
        </span>
      </Link>
    </motion.li>
  );
}

export default function SideNav() {
  const p = usePathname();
  const { user, name, no, signOut } = useUser();
  const glow = (e: React.MouseEvent<HTMLElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - b.left}px`); e.currentTarget.style.setProperty("--my", `${e.clientY - b.top}px`);
  };
  return (
    <aside onMouseMove={glow} aria-label="Yan menü" className="side-bg fixed left-0 top-0 z-40 hidden h-dvh w-[264px] flex-col overflow-hidden p-5 text-white lg:flex">
      <div className="bubbles" aria-hidden><i /><i /><i /><i /><i /></div>
      <Link href="/" className="relative z-10 flex items-center gap-1">
        <Mascot size={58} />
        <span className="font-display text-3xl font-extrabold">{"Bigova".split("").map((c, i) => (
          <motion.span key={i} whileHover={{ y: -8, color: "#FFB84D" }} transition={{ type: "spring", stiffness: 500, damping: 12 }} className="inline-block">{c}</motion.span>))}</span>
      </Link>
      <p className="relative z-10 text-sm text-white/70">Biga'da öğrenci olmak kolay</p>

      <ul className="relative z-10 mt-10 grid gap-2">{tabs.map((t) => <Item key={t.href} t={t} on={isOn(p, t.href)} />)}</ul>

      <div className="absolute inset-x-0 bottom-0 h-44" aria-hidden>
        <Wave c="rgba(255,255,255,.07)" cls="wave-a" /><Wave c="rgba(7,38,56,.35)" cls="wave-b" />
      </div>
      <div className="relative z-10 mt-auto">
        {user ? (
          <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-sun font-display text-lg font-extrabold text-deep">{(name ?? "?")[0].toUpperCase()}</span>
            <span className="min-w-0 flex-1 leading-tight"><b className="block truncate">{name}</b><span className="text-xs text-white/70">{no}</span></span>
            <motion.button whileTap={{ scale: 0.85 }} whileHover={{ rotate: -10 }} onClick={signOut} aria-label="Çıkış yap" className="grid h-9 w-9 place-items-center rounded-full bg-white/15"><FontAwesomeIcon icon={faRightFromBracket} /></motion.button>
          </motion.div>
        ) : (
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link href="/giris" className="shine group flex items-center justify-between rounded-2xl bg-sun p-4 font-display text-lg font-bold text-deep">
              Giriş yap / Kayıt ol <FontAwesomeIcon icon={faArrowRight} className="transition group-hover:translate-x-1.5" />
            </Link>
          </motion.div>
        )}
      </div>
    </aside>
  );
}
