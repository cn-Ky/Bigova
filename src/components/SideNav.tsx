"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Mascot from "./Mascot";
import { tabs, isOn } from "./tabs";

export default function SideNav() {
  const p = usePathname();
  return (
    <aside aria-label="Yan menü" className="fixed left-0 top-0 z-40 hidden h-dvh w-[264px] flex-col bg-gradient-to-b from-sea to-sea2 p-5 text-white lg:flex">
      <Link href="/" className="flex items-center gap-2"><Mascot size={56} /><span className="font-display text-3xl font-extrabold">Bigova</span></Link>
      <p className="mt-1 text-sm text-white/70">Biga'da öğrenci olmak kolay</p>
      <ul className="mt-8 grid gap-1">
        {tabs.map((t) => {
          const on = isOn(p, t.href);
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? "page" : undefined} className="relative flex items-center gap-3 rounded-2xl px-4 py-3 font-bold">
                {on && <motion.span layoutId="sidepill" className="absolute inset-0 rounded-2xl bg-white/20" transition={{ type: "spring", stiffness: 520, damping: 34 }} />}
                <FontAwesomeIcon icon={t.i} className="relative w-5" /><span className="relative">{t.l}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/giris" className="mt-auto rounded-2xl bg-white/15 p-4 text-center font-bold">Giriş yap / Kayıt ol</Link>
    </aside>
  );
}
