"use client";
import DishArt from "@/components/yemekhane/DishArt";
import { CATEGORY_META, CATEGORY_ORDER, sumKcal, type DishCategory, type MenuItem, type MenuRow } from "@/lib/menus/types";
import { faCaretDown, faLeaf, faBagShopping, faFlag } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export const TONE: Record<DishCategory, { bg: string; solid: string }> = {
  kahvalti: { bg: "bg-sun/30", solid: "bg-sun" },
  corba: { bg: "bg-coral/25", solid: "bg-coral" },
  ana: { bg: "bg-tide/25", solid: "bg-tide" },
  pilav: { bg: "bg-sun/30", solid: "bg-sun" },
  yan: { bg: "bg-sky/30", solid: "bg-sky" },
  tatli: { bg: "bg-coral/25", solid: "bg-coral" },
  icecek: { bg: "bg-sky/30", solid: "bg-sky" },
};

const list = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const row = {
  hidden: { opacity: 0, x: -18, scale: 0.97 },
  show: { opacity: 1, x: 0, scale: 1, transition: { type: "spring" as const, stiffness: 320, damping: 24 } },
};

function Dish({ it, hl }: { it: MenuItem; hl?: string }) {
  const parts = hl ? it.name.split(new RegExp(`(${hl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i")) : [it.name];
  return (
    <motion.li variants={row} className="flex items-center gap-3 rounded-[20px] bg-card p-2.5 pr-3 shadow-sm">
      <motion.span
        whileHover={{ rotate: -8, scale: 1.08 }}
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-deep ${TONE[it.cat].bg}`}
      >
        <DishArt cat={it.cat} size={34} />
      </motion.span>
      <span className="min-w-0 flex-1">
        {it.alt && <span className="mb-0.5 mr-1.5 inline-block rounded-full bg-ink/10 px-2 py-px text-[10px] font-extrabold uppercase tracking-wide text-ink/60">veya</span>}
        <b className="font-display text-[15px] font-bold leading-tight">
          {parts.map((p, i) => (hl && p.toLocaleLowerCase("tr") === hl.toLocaleLowerCase("tr") ? <mark key={i} className="rounded bg-sun/60 px-0.5 text-inherit">{p}</mark> : <span key={i}>{p}</span>))}
        </b>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink/55">
          {it.amount && <span>{it.amount}</span>}
          {(it.vegan || it.vegetarian) && (
            <span className="inline-flex items-center gap-1 font-bold text-tide">
              <FontAwesomeIcon icon={faLeaf} className="text-[10px]" />
              {it.vegan ? "Vegan" : "Vejetaryen"}
            </span>
          )}
        </span>
      </span>
      {typeof it.kcal === "number" && (
        <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-extrabold tabular-nums shadow-sm">{it.kcal} <span className="font-bold text-ink/50">kcal</span></span>
      )}
    </motion.li>
  );
}

/** Kategori bazında kalori dağılımı: soldan sağa dolan renkli çubuk. */
function KcalBar({ items }: { items: MenuItem[] }) {
  const std = items.filter((i) => !i.alt && (i.kcal ?? 0) > 0);
  const total = sumKcal(std);
  if (!total) return null;
  const segs = CATEGORY_ORDER.map((c) => ({ c, kcal: std.filter((i) => i.cat === c).reduce((a, i) => a + (i.kcal ?? 0), 0) })).filter((s) => s.kcal > 0);
  return (
    <div className="rounded-[22px] bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55">Yaklaşık enerji</span>
        <motion.b
          key={total}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl font-extrabold tabular-nums"
        >
          {total.toLocaleString("tr-TR")} <span className="text-sm font-bold text-ink/55">kcal</span>
        </motion.b>
      </div>
      <div className="mt-2.5 flex h-3.5 gap-[3px] overflow-hidden rounded-full bg-foam" role="img" aria-label={`Toplam ${total} kcal`}>
        {segs.map((s, i) => (
          <motion.span
            key={s.c}
            className={`h-full rounded-full ${TONE[s.c].solid}`}
            initial={{ width: 0 }}
            animate={{ width: `${(s.kcal / total) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.15 + i * 0.07 }}
            title={`${CATEGORY_META[s.c].label}: ${s.kcal} kcal`}
          />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] font-bold text-ink/65">
        {segs.map((s) => (
          <li key={s.c} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${TONE[s.c].solid}`} />
            {CATEGORY_META[s.c].label} <span className="tabular-nums text-ink/45">{s.kcal}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Takeaways({ menu }: { menu: MenuRow }) {
  const [open, setOpen] = useState(false);
  if (!menu.takeaways?.length) return null;
  return (
    <div className="rounded-[22px] bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-[22px] p-4 text-left"
      >
        <span className="inline-flex items-center gap-2.5 font-display font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sun/40"><FontAwesomeIcon icon={faBagShopping} /></span>
          Al götür paketleri <span className="rounded-full bg-foam px-2 py-0.5 text-xs">{menu.takeaways.length}</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }}><FontAwesomeIcon icon={faCaretDown} /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid gap-3 px-4 pb-4">
              {menu.takeaways.map((t) => (
                <div key={t.name} className="rounded-2xl bg-foam p-3">
                  <b className="font-display text-sm">{t.name}</b>
                  <ul className="mt-1.5 space-y-1 text-sm text-ink/80">
                    {t.items.map((i) => (
                      <li key={i.name} className="flex justify-between gap-3">
                        <span>{i.name}</span>
                        {typeof i.kcal === "number" && <span className="tabular-nums text-ink/50">{i.kcal} kcal</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MealPlate({ menu, highlight }: { menu: MenuRow; highlight?: string }) {
  if (menu.status === "closed" || !menu.items.length) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[26px] bg-coral p-6 text-center text-deep shadow-sm">
        <motion.span animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 2.4 }} className="inline-grid h-16 w-16 place-items-center rounded-full bg-white/50 text-3xl">
          <FontAwesomeIcon icon={faFlag} />
        </motion.span>
        <p className="mt-3 font-display text-xl font-extrabold">{menu.note ?? "Yemekhane kapalı"}</p>
        <p className="text-sm opacity-75">Bu gün için yemek servisi yapılmıyor.</p>
      </motion.div>
    );
  }
  const groups = CATEGORY_ORDER.map((c) => ({ c, items: menu.items.filter((i) => i.cat === c) })).filter((g) => g.items.length);
  return (
    <div className="space-y-3">
      <motion.ul variants={list} initial="hidden" animate="show" className="space-y-2" aria-label="Menü">
        {groups.flatMap((g) => g.items.map((it) => <Dish key={`${g.c}-${it.name}`} it={it} hl={highlight} />))}
      </motion.ul>
      {menu.note && <p className="rounded-2xl bg-sun/30 px-4 py-2 text-sm font-bold">{menu.note}</p>}
      <KcalBar items={menu.items} />
      <Takeaways menu={menu} />
    </div>
  );
}
