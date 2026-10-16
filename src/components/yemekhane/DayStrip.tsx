"use client";
import { daysInMonth, weekdayOf, ymd } from "@/lib/menus/types";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

const WD = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export type DayState = { has: boolean; closed: boolean };

/** Ayın günleri: yatay kaydırılır, seçili gün kayan bir hap ile vurgulanır, bugün nokta taşır, verisi olmayan günler sönüktür. */
export default function DayStrip({
  ym,
  selected,
  today,
  stateOf,
  onSelect,
}: {
  ym: string;
  selected: string;
  today: string | null;
  stateOf: (date: string) => DayState;
  onSelect: (date: string) => void;
}) {
  const [y, m] = ym.split("-").map(Number);
  const days = Array.from({ length: daysInMonth(y, m) }, (_, i) => ymd(y, m, i + 1));
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`[data-d="${selected}"]`);
    if (el && box.current) box.current.scrollTo({ left: el.offsetLeft - box.current.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [selected, ym]);

  return (
    <div ref={box} className="day-strip -mx-5 flex gap-1.5 overflow-x-auto px-5 py-2" role="listbox" aria-label="Gün seç">
      {days.map((d) => {
        const st = stateOf(d);
        const on = d === selected;
        const wd = weekdayOf(d);
        return (
          <motion.button
            key={d}
            data-d={d}
            type="button"
            role="option"
            aria-selected={on}
            whileTap={{ scale: 0.88 }}
            onClick={() => onSelect(d)}
            className={`relative grid h-[68px] w-[52px] shrink-0 place-items-center rounded-[20px] text-center transition-colors ${on ? "text-deep" : st.has || st.closed ? "bg-card shadow-sm" : "bg-card/50 text-ink/40"}`}
          >
            {on && <motion.span layoutId="day-pill" className="absolute inset-0 rounded-[20px] bg-sun shadow-md" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
            <span className="relative leading-none">
              <span className="block text-[10px] font-extrabold uppercase tracking-wide opacity-70">{WD[wd]}</span>
              <b className="mt-1 block font-display text-xl">{Number(d.slice(8))}</b>
              <span className="mt-1 flex h-1.5 items-center justify-center">
                {d === today ? <span className="h-1.5 w-1.5 rounded-full bg-coral" /> : st.closed ? <span className="h-1.5 w-1.5 rounded-full bg-ink/30" /> : st.has ? <span className="h-1 w-1 rounded-full bg-tide" /> : null}
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
