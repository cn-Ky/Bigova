"use client";
import DishArt from "@/components/yemekhane/DishArt";
import { TONE } from "@/components/yemekhane/MealPlate";
import { addDays, weekdayOf, type MenuRow } from "@/lib/menus/types";
import { motion } from "framer-motion";

const WD = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/** Seçili günün haftası: her gün için çorba ve ana yemek özeti. Dokununca o güne gider. */
export default function WeekGlance({
  selected,
  today,
  days,
  menuOf,
  onSelect,
}: {
  selected: string;
  today: string | null;
  days: number; // 5 (hafta içi) ya da 7
  menuOf: (date: string) => MenuRow | undefined;
  onSelect: (date: string) => void;
}) {
  const monday = addDays(selected, -weekdayOf(selected));
  const week = Array.from({ length: days }, (_, i) => addDays(monday, i));
  return (
    <section aria-label="Bu haftanın menüsü" className="mt-6">
      <h2 className="font-display text-xl font-extrabold">Haftaya bir bak</h2>
      <ul className="-mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0" style={{ gridTemplateColumns: days === 7 ? "repeat(7,minmax(0,1fr))" : undefined }}>
        {week.map((d, i) => {
          const m = menuOf(d);
          const main = m?.items.find((x) => x.cat === "ana" && !x.alt) ?? m?.items[1];
          const soup = m?.items.find((x) => x.cat === "corba");
          const on = d === selected;
          return (
            <motion.li key={d} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: "spring", stiffness: 280, damping: 24 }} className="w-[132px] shrink-0 md:w-auto">
              <button
                type="button"
                onClick={() => onSelect(d)}
                aria-current={on ? "date" : undefined}
                className={`h-full w-full rounded-[22px] p-3 text-left shadow-sm transition-transform active:scale-95 ${on ? "bg-sun text-deep" : "bg-card"}`}
              >
                <span className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide opacity-70">
                  {WD[weekdayOf(d)]} {Number(d.slice(8))}
                  {d === today && <span className="rounded-full bg-coral px-1.5 py-px text-[9px] text-deep">Bugün</span>}
                </span>
                {m?.status === "closed" ? (
                  <span className="mt-3 block text-xs font-bold opacity-70">{m.note ?? "Kapalı"}</span>
                ) : main ? (
                  <>
                    <span className={`mt-2 grid h-10 w-10 place-items-center rounded-xl text-deep ${on ? "bg-white/50" : TONE[main.cat].bg}`}>
                      <DishArt cat={main.cat} size={28} />
                    </span>
                    <b className="mt-1.5 line-clamp-2 block font-display text-[13px] leading-tight">{main.name}</b>
                    {soup && <span className="mt-0.5 line-clamp-1 block text-[11px] opacity-65">{soup.name}</span>}
                  </>
                ) : (
                  <span className="mt-3 block text-xs opacity-50">Menü yok</span>
                )}
              </button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
