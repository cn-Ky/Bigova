"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronRight, faUser } from "@fortawesome/free-solid-svg-icons";
import { THEMES, applyTheme } from "@/lib/themes";

export default function Ayarlar() {
  const [cur, setCur] = useState("sabah");
  useEffect(() => setCur(document.documentElement.dataset.theme || "sabah"), []);
  const pick = (id: string) => { setCur(id); applyTheme(id); };
  return (
    <main>
      <header className="rounded-b-[28px] bg-gradient-to-b from-sea to-sea2 px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
        <h1 className="font-display text-2xl font-extrabold">Ayarlar</h1>
        <p className="text-sm text-white/75">Uygulamayı sana göre ayarla.</p>
      </header>
      <section className="px-5 pt-6">
        <Link href="/giris" className="flex items-center gap-3 rounded-[22px] bg-card p-4 shadow-sm transition active:scale-[.97]">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-sea text-white"><FontAwesomeIcon icon={faUser} /></span>
          <span className="flex-1"><b className="block">Hesap</b><span className="text-sm opacity-70">Giriş yap veya kayıt ol</span></span>
          <FontAwesomeIcon icon={faChevronRight} className="opacity-40" />
        </Link>
        <h2 className="mb-1 mt-7 font-display text-xl font-bold">Tema</h2>
        <p className="mb-3 text-sm opacity-70">Seçimin bu cihazda kayıtlı kalır.</p>
        <ul role="radiogroup" aria-label="Tema" className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {THEMES.map((t) => {
            const on = cur === t.id;
            return (
              <motion.li key={t.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: THEMES.indexOf(t) * 0.05 }}>
                <button role="radio" aria-checked={on} onClick={() => pick(t.id)} className="relative w-full rounded-[22px] bg-card p-2 text-left shadow-sm active:scale-[.97]">
                  {on && <motion.span layoutId="ring" className="absolute inset-0 rounded-[22px] ring-[3px] ring-sun" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                  <div className="rounded-2xl p-3" style={{ background: t.foam }}>
                    <div className="h-3 w-2/3 rounded-full" style={{ background: t.sea }} />
                    <div className="mt-2 h-6 rounded-lg" style={{ background: t.card }} />
                    <div className="mt-2 flex gap-1.5">{[t.sea, t.tide, t.sun].map((c) => <span key={c} className="h-4 w-4 rounded-full" style={{ background: c }} />)}</div>
                  </div>
                  <div className="flex items-center justify-between px-2 pb-1 pt-2 text-sm font-bold">{t.name}{on && <FontAwesomeIcon icon={faCheck} className="text-tide" />}</div>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
