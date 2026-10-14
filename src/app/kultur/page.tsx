"use client";
import Mascot from "@/components/Mascot";
import SearchBox from "@/components/SearchBox";
import { KULTUR_NOTES, KULTUR_TAGS, noteOfTheDay, upcomingDays } from "@/lib/kulturData";
import {
  faArrowRight,
  faCalendarDay,
  faLandmark,
  faMapLocationDot,
  faTree,
  faUtensils,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const TAG_META: Record<string, { icon: IconDefinition; chip: string }> = {
  Tarih: { icon: faLandmark, chip: "bg-sun/30" },
  Gezi: { icon: faMapLocationDot, chip: "bg-sky/30" },
  Doğa: { icon: faTree, chip: "bg-tide/25" },
  Lezzet: { icon: faUtensils, chip: "bg-coral/25" },
};

const fmtDate = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
const inLabel = (n: number) => (n === 0 ? "Bugün" : n === 1 ? "Yarın" : `${n} gün kaldı`);

function TagChip({ tag }: { tag: string }) {
  const m = TAG_META[tag] ?? TAG_META.Tarih;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${m.chip}`}>
      <FontAwesomeIcon icon={m.icon} className="text-[10px]" />
      {tag}
    </span>
  );
}

export default function Kultur() {
  // Tarih/saat sunucuda değil tarayıcıda hesaplanır (hidrasyon uyuşmazlığı olmasın)
  const [now, setNow] = useState<Date | null>(null);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string>("Tümü");
  const [allDays, setAllDays] = useState(false);
  useEffect(() => setNow(new Date()), []);

  const days = useMemo(() => (now ? upcomingDays(now) : []), [now]);
  const today = useMemo(() => (now ? noteOfTheDay(now) : null), [now]);
  const next = days[0];

  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    return KULTUR_NOTES.filter(
      (n) => (tag === "Tümü" || n.tag === tag) && `${n.title} ${n.text} ${n.tag}`.toLocaleLowerCase("tr").includes(needle),
    );
  }, [q, tag]);

  return (
    <main>
      <header className="rounded-b-[28px] bg-sea px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sun">Bigova &amp; Kültür</p>
        <h1 className="font-display text-2xl font-extrabold leading-tight">Kültür Rehberi</h1>
        <p className="text-sm text-white/75">Biga ve Çanakkale&apos;nin tarihi, doğası ve lezzetleri; yaklaşan özel günler.</p>
        <SearchBox className="mt-3" value={q} onChange={setQ} placeholder="Rehberde ara" label="Kültür rehberinde ara" />
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {["Tümü", ...KULTUR_TAGS].map((c) => (
            <motion.button
              whileTap={{ scale: 0.9 }}
              key={c}
              onClick={() => setTag(c)}
              aria-pressed={tag === c}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${tag === c ? "bg-sun text-deep" : "bg-white/15 text-white"}`}
            >
              {c}
            </motion.button>
          ))}
        </div>
      </header>

      {/* Günün notu + sıradaki özel gün */}
      <section className="grid gap-3 px-5 pt-4 md:grid-cols-2" aria-label="Öne çıkanlar">
        {today ? (
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="rounded-[26px] bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55">Günün kültür notu</span>
              <TagChip tag={today.tag} />
            </div>
            <h2 className="mt-2 font-display text-xl font-extrabold leading-tight">{today.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">{today.text}</p>
          </motion.article>
        ) : (
          <div className="shimmer h-36 rounded-[26px]" />
        )}

        {next ? (
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.06 }}
            className="rounded-[26px] bg-coral p-5 text-deep shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-70">Sıradaki özel gün</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1 text-xs font-extrabold">
                <FontAwesomeIcon icon={faCalendarDay} />
                {inLabel(next.in)}
              </span>
            </div>
            <h2 className="mt-2 font-display text-xl font-extrabold leading-tight">{next.title}</h2>
            <p className="text-xs font-bold opacity-70">{fmtDate(next.date)}</p>
            <p className="mt-2 text-sm leading-relaxed opacity-85">{next.text}</p>
          </motion.article>
        ) : (
          <div className="shimmer h-36 rounded-[26px]" />
        )}
      </section>

      {/* Özel günler listesi */}
      {days.length > 0 && (
        <section className="px-5 pt-5" aria-label="Özel günler">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-extrabold">Özel günler</h2>
            <button
              type="button"
              onClick={() => setAllDays((v) => !v)}
              aria-expanded={allDays}
              className="rounded-full bg-foam px-4 py-1.5 text-sm font-bold"
            >
              {allDays ? "Daha az göster" : "Tümünü göster"}
            </button>
          </div>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {(allDays ? days : days.slice(1, 4)).map((g) => (
              <li key={g.title} className="flex items-center gap-3 rounded-[20px] bg-card p-3 shadow-sm">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sun text-center leading-none text-deep">
                  <span>
                    <b className="block font-display text-xl">{g.date.getDate()}</b>
                    <span className="text-[10px] font-extrabold uppercase">
                      {g.date.toLocaleDateString("tr-TR", { month: "short" })}
                    </span>
                  </span>
                </span>
                <span className="min-w-0">
                  <b className="block font-display text-[15px] leading-tight">{g.title}</b>
                  <span className="text-xs text-ink/60">{inLabel(g.in)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink/55">
            Yalnızca tarihi sabit resmî gün ve anma günleri listelenir; dinî bayramların tarihi her yıl değiştiği için yer almaz.
          </p>
        </section>
      )}

      {/* Keşfet */}
      <section className="px-5 pt-6" aria-label="Keşfet">
        <h2 className="font-display text-xl font-extrabold">Keşfet</h2>
        <ul className="mt-3 grid items-start gap-3 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {shown.map((n) => (
              <motion.li
                key={n.title}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="rounded-[24px] bg-card p-4 shadow-sm"
              >
                <TagChip tag={n.tag} />
                <h3 className="mt-2 font-display text-[17px] font-extrabold leading-tight">{n.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{n.text}</p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {shown.length === 0 && (
          <div className="py-10 text-center">
            <Mascot size={96} className="mx-auto" />
            <p className="mt-2 font-display text-lg font-bold">Sonuç bulunamadı</p>
            <p className="text-sm text-ink/70">Başka bir kelimeyle ara ya da kategoriyi “Tümü” yap.</p>
          </div>
        )}
      </section>

      <section className="grid gap-3 px-5 pt-6 sm:grid-cols-2" aria-label="İlgili sayfalar">
        <Link href="/harita" className="group flex items-center justify-between rounded-[22px] bg-sky p-4 font-display font-bold text-deep shadow-sm">
          <span className="inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faMapLocationDot} /> Biga&apos;yı haritada keşfet
          </span>
          <FontAwesomeIcon icon={faArrowRight} className="transition group-hover:translate-x-1" />
        </Link>
        <Link href="/ataturk" className="group flex items-center justify-between rounded-[22px] bg-tide p-4 font-display font-bold text-deep shadow-sm">
          <span className="inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faLandmark} /> Atatürk Köşesi
          </span>
          <FontAwesomeIcon icon={faArrowRight} className="transition group-hover:translate-x-1" />
        </Link>
      </section>

      <p className="px-5 pb-2 pt-5 text-center text-xs text-ink/55">
        Bilgiler genel kültür amaçlıdır. Müze, feribot ve etkinlik saatlerini gitmeden resmî kaynaklardan kontrol et.
      </p>
    </main>
  );
}
