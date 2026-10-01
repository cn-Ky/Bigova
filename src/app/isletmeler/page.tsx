"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone, faClock, faRestroom, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import Mascot from "@/components/Mascot";

type B = { id: string; name: string; category: string; phone?: string; price_info?: string; has_toilet: boolean; opens_at?: string; closes_at?: string };

export default function Isletmeler() {
  const [q, setQ] = useState(""); const [cat, setCat] = useState("Tümü");
  const [items, setItems] = useState<B[] | null>(null);
  useEffect(() => { const v = new URLSearchParams(location.search).get("q"); if (v) setQ(v); }, []);
  useEffect(() => {
    const t = setTimeout(() => fetch(`/api/businesses?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => setItems([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  const cats = useMemo(() => ["Tümü", ...Array.from(new Set((items ?? []).map((b) => b.category)))], [items]);
  const shown = (items ?? []).filter((b) => cat === "Tümü" || b.category === cat);
  return (
    <main>
      <header className="sticky top-0 z-20 rounded-b-[28px] bg-sea px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <h1 className="font-display text-2xl font-extrabold">İşletmeler</h1>
        <label className="mt-3 flex items-center gap-2 rounded-full bg-card px-4 py-3 text-ink">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="opacity-50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İşletme ara" aria-label="İşletme ara" className="w-full bg-transparent outline-none" />
        </label>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {cats.map((c) => (
            <motion.button whileTap={{ scale: 0.9 }} key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${cat === c ? "bg-sun text-deep" : "bg-white/15 text-white"}`}>{c}</motion.button>
          ))}
        </div>
      </header>
      <ul className="grid gap-3 px-5 pt-5 md:grid-cols-2 xl:grid-cols-3">
        {items === null && [0, 1, 2].map((i) => <li key={i} className="shimmer h-28 rounded-[24px]" />)}
        <AnimatePresence initial={false}>
          {shown.map((b) => (
            <motion.li key={b.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} whileTap={{ scale: 0.97 }} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="rounded-[24px] bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <b className="font-display text-lg leading-tight">{b.name}</b>
                <span className="rounded-full bg-tide/20 px-3 py-0.5 text-xs font-bold">{b.category}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/80">
                {b.opens_at && <span><FontAwesomeIcon icon={faClock} /> {b.opens_at}–{b.closes_at}</span>}
                <span><FontAwesomeIcon icon={faRestroom} /> {b.has_toilet ? "Tuvalet var" : "Tuvalet yok"}</span>
                {b.price_info && <span className="font-bold text-coral">{b.price_info}</span>}
              </div>
              {b.phone && <motion.a whileTap={{ scale: 0.9 }} href={`tel:${b.phone.replace(/\s/g, "")}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2 text-sm font-bold text-white"><FontAwesomeIcon icon={faPhone} /> Ara</motion.a>}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {items && shown.length === 0 && (
        <div className="px-5 py-12 text-center"><Mascot size={96} className="mx-auto" /><p className="mt-2 font-display text-lg font-bold">Sonuç bulunamadı</p><p className="text-sm text-ink/70">Başka bir kelimeyle ara ya da kategoriyi "Tümü" yap.</p></div>
      )}
    </main>
  );
}
