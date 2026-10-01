"use client";
import Mascot from "@/components/Mascot";
import { demoRoutes } from "@/lib/demoData";
import {
    faBus,
    faChevronDown,
    faClock,
    faLocationDot,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type R = {
  id: string;
  name: string;
  type: string;
  destination: string;
  first_departure?: string;
  last_departure?: string;
  price?: number;
  stops?: string[];
};

export default function Ulasim() {
  const [items, setItems] = useState<R[] | null>(null);
  const [type, setType] = useState("Tümü");
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch("/api/transport")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) && d.length ? d : demoRoutes))
      .catch(() => {
        setErr(true);
        setItems(demoRoutes);
      });
  }, []);
  const types = useMemo(
    () => ["Tümü", ...Array.from(new Set((items ?? []).map((r) => r.type)))],
    [items],
  );
  const shown = (items ?? []).filter((r) => type === "Tümü" || r.type === type);
  return (
    <main>
      <header className="sticky top-0 z-20 rounded-b-[28px] bg-sea px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <h1 className="font-display text-2xl font-extrabold">Ulaşım</h1>
        <p className="text-sm text-white/75">
          Otobüs ve servis saatleri, güzergâh, ücret.
        </p>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {types.map((c) => (
            <motion.button
              whileTap={{ scale: 0.92 }}
              key={c}
              onClick={() => setType(c)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${type === c ? "bg-sun text-deep" : "bg-white/15"}`}
            >
              {c}
            </motion.button>
          ))}
        </div>
      </header>
      <ul className="grid gap-3 px-5 pt-5 md:grid-cols-2">
        {items === null &&
          [0, 1, 2].map((i) => (
            <li key={i} className="shimmer h-24 rounded-[24px]" />
          ))}
        <AnimatePresence initial={false}>
          {shown.map((r) => {
            const on = open === r.id;
            return (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                whileHover={{ y: -3 }}
                className="self-start overflow-hidden rounded-[24px] bg-card shadow-sm"
              >
                <button
                  onClick={() => setOpen(on ? null : r.id)}
                  aria-expanded={on}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sun text-deep">
                    <FontAwesomeIcon icon={faBus} />
                  </span>
                  <span className="flex-1">
                    <b className="block font-display text-lg leading-tight">
                      {r.name}
                    </b>
                    <span className="text-sm text-ink/70">
                      <FontAwesomeIcon icon={faClock} />{" "}
                      {r.first_departure ?? "?"}–{r.last_departure ?? "?"} ·{" "}
                      {r.destination}
                    </span>
                  </span>
                  {r.price != null && (
                    <span className="font-bold text-coral">{r.price} ₺</span>
                  )}
                  <motion.span animate={{ rotate: on ? 180 : 0 }}>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className="opacity-50"
                    />
                  </motion.span>
                </button>
                {(r.id.startsWith("demo-") || r.name.startsWith("Örnek ·")) && (
                  <p className="px-4 pb-2 text-xs font-bold text-coral">
                    Temsili örnek sefer · saat ve ücret bilgisi gerçek değildir
                  </p>
                )}
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.ol
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden px-5"
                    >
                      <div className="mb-4 border-l-2 border-dashed border-tide pl-4">
                        {(r.stops?.length
                          ? r.stops
                          : ["Durak bilgisi yakında"]
                        ).map((s, i) => (
                          <motion.li
                            key={s}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="relative py-1 text-sm"
                          >
                            <FontAwesomeIcon
                              icon={faLocationDot}
                              className="absolute -left-[26px] top-2 rounded-full bg-card text-tide"
                            />{" "}
                            {s}
                          </motion.li>
                        ))}
                      </div>
                    </motion.ol>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {items && shown.length === 0 && (
        <div className="px-5 py-12 text-center">
          <Mascot size={96} className="mx-auto" />
          <p className="mt-2 font-display text-lg font-bold">
            {err ? "Bağlantı hatası" : "Henüz güzergâh eklenmemiş"}
          </p>
          <p className="text-sm text-ink/70">
            {err
              ? "Biraz sonra tekrar dene."
              : "Supabase'de transport_routes tablosuna kayıt ekle."}
          </p>
        </div>
      )}
    </main>
  );
}
