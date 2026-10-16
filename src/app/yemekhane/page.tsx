"use client";
import DayStrip from "@/components/yemekhane/DayStrip";
import MealPlate from "@/components/yemekhane/MealPlate";
import WeekGlance from "@/components/yemekhane/WeekGlance";
import Mascot from "@/components/Mascot";
import SearchBox from "@/components/SearchBox";
import { useMenus } from "@/lib/menus/client";
import {
  addMonths,
  BIGA_DORMS,
  COMU_CAMPUS,
  COMU_SCOPE,
  daysInMonth,
  istanbulClock,
  istanbulToday,
  KYK_SCOPE,
  monthKey,
  norm,
  SOURCE_LINKS,
  ymd,
  type MenuRow,
  type MenuSource,
  type MenuVariant,
} from "@/lib/menus/types";
import {
  faArrowUpRightFromSquare,
  faBed,
  faChevronLeft,
  faChevronRight,
  faCircleInfo,
  faClock,
  faLeaf,
  faMoon,
  faMugHot,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import "./yemekhane.css";

type Tab = "kyk" | "comu";
type Meal = "breakfast" | "dinner";

const MEAL_LABEL: Record<string, string> = { breakfast: "Kahvaltı", dinner: "Akşam yemeği", daily: "Günün menüsü" };
const dateObj = (d: string) => new Date(`${d}T12:00:00Z`);
const fmtLong = (d: string) => dateObj(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long", timeZone: "UTC" });
const fmtMonth = (k: string) => dateObj(`${k}-01`).toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtStamp = (iso: string) => new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const dayDiff = (a: string, b: string) => Math.round((dateObj(a).getTime() - dateObj(b).getTime()) / 86_400_000);
const rel = (d: string, t: string | null) => (t ? ({ 0: "Bugün", 1: "Yarın", "-1": "Dün" } as Record<string, string>)[String(dayDiff(d, t))] : undefined);

/** Ağaköy yemekhanesinin şu anki servis durumu (SKS saatlerine göre). */
function serviceStatus(c: { minutes: number; weekday: number } | null): { live: boolean; text: string } | null {
  if (!c) return null;
  if (c.weekday >= 5) return { live: false, text: "Hafta sonu menü yayınlanmıyor" };
  const { lunch, dinner } = COMU_CAMPUS;
  const mm = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const m = c.minutes;
  if (m < mm(lunch.from)) return { live: false, text: `Öğle servisi ${lunch.from}'de başlıyor` };
  if (m < mm(lunch.to)) return { live: true, text: `Öğle servisi açık · ${lunch.to}'e kadar` };
  if (m < mm(dinner.from)) return { live: false, text: `Akşam servisi ${dinner.from}'da başlıyor` };
  if (m < mm(dinner.to)) return { live: true, text: `Akşam servisi açık · ${dinner.to}'e kadar` };
  return { live: false, text: "Bugünkü servis sona erdi" };
}

function HeroBowl() {
  return (
    <svg viewBox="0 0 140 120" className="hero-bowl pointer-events-none absolute -right-2 top-3 h-28 w-32 text-white sm:right-6 sm:h-32 sm:w-36" aria-hidden>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" opacity=".7">
        <path className="hero-steam" d="M48 40c-8-9 8-14 0-26" />
        <path className="hero-steam" d="M70 40c-8-9 8-14 0-26" style={{ animationDelay: ".7s" }} />
        <path className="hero-steam" d="M92 40c-8-9 8-14 0-26" style={{ animationDelay: "1.4s" }} />
      </g>
      <path d="M14 52h112c0 30-22 50-56 50S14 82 14 52z" fill="rgb(var(--sun))" />
      <path d="M14 52h112" stroke="rgb(var(--coral))" strokeWidth="7" strokeLinecap="round" />
      <path d="M44 106h52" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity=".5" />
      <ellipse cx="70" cy="54" rx="48" ry="5" fill="#fff" opacity=".35" />
      <path d="M118 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="rgb(var(--sun))" className="hero-spark" />
      <path d="M20 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="currentColor" className="hero-spark" style={{ animationDelay: "1.2s" }} />
    </svg>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2.5" aria-busy>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="shimmer h-[68px] rounded-[20px]" style={{ opacity: 1 - i * 0.12 }} />
      ))}
      <div className="shimmer h-24 rounded-[22px]" />
    </div>
  );
}

function Empty({ title, text, link }: { title: string; text: string; link?: { label: string; url: string } }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[26px] bg-card px-5 py-9 text-center shadow-sm">
      <Mascot size={96} className="mx-auto" />
      <p className="mt-2 font-display text-lg font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink/70">{text}</p>
      {link && (
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun px-4 py-2 text-sm font-extrabold text-deep">
          {link.label} <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
        </a>
      )}
    </motion.div>
  );
}

export default function Yemekhane() {
  const [demo, setDemo] = useState<boolean | null>(null);
  const data = useMenus(demo);
  const [today, setToday] = useState<string | null>(null);
  const [clock, setClock] = useState<{ minutes: number; weekday: number } | null>(null);
  const [tab, setTab] = useState<Tab>("kyk");
  const [variant, setVariant] = useState<MenuVariant>("normal");
  const [meal, setMeal] = useState<Meal>("dinner");
  const [sel, setSel] = useState<string | null>(null);
  const [dir, setDir] = useState(1);
  const [q, setQ] = useState("");

  // Tarih/saat ve URL tercihleri sunucuda değil tarayıcıda okunur (hidrasyon uyuşmazlığı olmasın).
  useEffect(() => {
    const c = istanbulClock();
    setDemo(new URLSearchParams(window.location.search).get("demo") === "1");
    const h = window.location.hash.replace("#", "");
    if (h === "kyk" || h === "comu") setTab(h);
    setToday(istanbulToday());
    setClock(c);
    setMeal(c.minutes < 10 * 60 ? "breakfast" : "dinner");
  }, []);
  useEffect(() => {
    const id = setInterval(() => setClock(istanbulClock()), 60_000);
    return () => clearInterval(id);
  }, []);

  const source: MenuSource = tab;
  const scope = tab === "kyk" ? KYK_SCOPE : COMU_SCOPE;
  const effVariant: MenuVariant = tab === "comu" ? variant : "normal";

  const index = useMemo(() => {
    const m = new Map<string, MenuRow>();
    for (const r of data?.rows ?? []) m.set(`${r.scope}|${r.variant}|${r.date}|${r.meal}`, r);
    return m;
  }, [data]);
  const get = (v: MenuVariant, date: string, ml: string) => index.get(`${scope}|${v}|${date}|${ml}`);
  const hasVegan = useMemo(() => (data?.rows ?? []).some((r) => r.scope === COMU_SCOPE && r.variant === "vegan"), [data]);

  /** Bu sekmede (herhangi bir öğünde) menüsü olan tarihler, sıralı. */
  const dates = useMemo(
    () => [...new Set((data?.rows ?? []).filter((r) => r.scope === scope && r.variant === effVariant).map((r) => r.date))].sort(),
    [data, scope, effVariant],
  );
  const dateSet = useMemo(() => new Set(dates), [dates]);

  const pick = (t: string | null) => (t && (dateSet.has(t) ? t : dates.find((d) => d >= t) ?? dates[dates.length - 1])) || t;
  // İlk seçim: bugün; yoksa en yakın sonraki menülü gün.
  useEffect(() => {
    if (data && today && !sel) setSel(pick(today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, today, sel]);
  // Sekme/çeşit değişince seçili gün menüsüzse en yakın menülü güne atla.
  useEffect(() => {
    if (sel && dates.length && !dateSet.has(sel)) {
      const n = pick(today ?? sel);
      if (n) setSel(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, effVariant, dates]);

  const go = (d: string) => {
    if (sel) setDir(d >= sel ? 1 : -1);
    setSel(d);
  };
  const switchTab = (t: Tab) => {
    setTab(t);
    setQ("");
    try {
      window.history.replaceState(null, "", `#${t}`);
    } catch {}
  };
  const prev = sel ? [...dates].reverse().find((d) => d < sel) : undefined;
  const next = sel ? dates.find((d) => d > sel) : undefined;
  const ym = sel ? monthKey(sel) : today ? monthKey(today) : "";
  const shiftMonth = (n: number) => {
    if (!sel) return;
    const key = addMonths(ym, n);
    const [y, m] = key.split("-").map(Number);
    go(ymd(y, m, Math.min(Number(sel.slice(8)), daysInMonth(y, m))));
  };

  const mealKey = tab === "kyk" ? meal : "daily";
  const menu = sel ? get(effVariant, sel, mealKey) : undefined;

  /** Yemek arama: "mantı ne zaman?" */
  const results = useMemo(() => {
    const needle = norm(q);
    if (needle.length < 2 || !data) return [];
    const hits: { date: string; meal: string; names: string[] }[] = [];
    for (const r of data.rows) {
      if (r.scope !== scope || r.variant !== effVariant || r.status !== "open") continue;
      const names = r.items.filter((i) => norm(i.name).includes(needle)).map((i) => i.name);
      if (names.length) hits.push({ date: r.date, meal: r.meal, names });
    }
    const t = today ?? "";
    return hits.sort((a, b) => (a.date >= t === b.date >= t ? (a.date >= t ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) : a.date >= t ? -1 : 1)).slice(0, 30);
  }, [q, data, scope, effVariant, today]);

  const status = tab === "comu" ? serviceStatus(clock) : null;
  const updated = data?.updated[source];
  const noDataAtAll = !!data && !data.demo && dates.length === 0;
  const weekend = sel ? new Date(`${sel}T12:00:00Z`).getUTCDay() % 6 === 0 : false;

  return (
    <main className="pb-6">
      <header className="relative overflow-hidden rounded-b-[28px] bg-sea px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <HeroBowl />
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sun">Bigova &amp; Kampüs</p>
        <h1 className="font-display text-2xl font-extrabold leading-tight">Yemekhane</h1>
        <p className="max-w-[16rem] text-sm text-white/75 sm:max-w-md">Biga&apos;daki KYK yurtları ve Ağaköy yemekhanesi: bugün ne var?</p>
        <SearchBox className="mt-3 sm:mr-44" value={q} onChange={setQ} placeholder="Yemek ara (mantı, baklava…)" label="Menülerde yemek ara" />
        <div className="relative mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/12 p-1" role="tablist" aria-label="Yemek kaynağı">
          {(
            [
              ["kyk", "KYK Yurtları", faBed],
              ["comu", "ÇOMÜ Ağaköy", faUtensils],
            ] as const
          ).map(([id, label, icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => switchTab(id)} className={`relative rounded-full px-3 py-2 text-sm font-bold transition-colors ${tab === id ? "text-deep" : "text-white"}`}>
              {tab === id && <motion.span layoutId="src-pill" className="absolute inset-0 rounded-full bg-sun" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              <span className="relative inline-flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={icon} className="text-xs" />
                {label}
              </span>
            </button>
          ))}
        </div>
      </header>

      <div className="px-5">
        {data?.demo && (
          <p className="mt-3 rounded-2xl bg-coral/30 px-4 py-2 text-center text-xs font-extrabold">Örnek veri: gerçek menü değildir, yalnızca tasarım önizlemesidir.</p>
        )}

        {/* Kaynağa özel tanıtım kartı */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mt-4"
            aria-label={tab === "kyk" ? "Biga KYK yurtları" : "Ağaköy yemekhanesi"}
          >
            {tab === "kyk" ? (
              <>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {BIGA_DORMS.map((d, i) => (
                    <motion.div key={d.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08, type: "spring", stiffness: 280, damping: 24 }} className="flex items-center gap-3 rounded-[22px] bg-card p-3 shadow-sm">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-deep ${d.gender === "kiz" ? "bg-coral" : "bg-sky"}`}>
                        <FontAwesomeIcon icon={faBed} />
                      </span>
                      <span className="min-w-0">
                        <b className="block font-display text-[15px] leading-tight">{d.name}</b>
                        <span className="text-xs text-ink/60">{d.area} · {d.gender === "kiz" ? "Kız" : "Erkek"} yurdu</span>
                      </span>
                    </motion.div>
                  ))}
                </div>
                <p className="mt-2 flex items-start gap-2 text-xs text-ink/60">
                  <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5" />
                  KYK menüsü il bazında hazırlanır; Biga&apos;daki yurtların hepsi Çanakkale menüsünü kullanır. Servis saatleri yurdunuza göre değişebilir.
                </p>
              </>
            ) : (
              <div className="rounded-[24px] bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <b className="block font-display text-[17px] leading-tight">{COMU_CAMPUS.name}</b>
                    <span className="text-xs text-ink/60">ÇOMÜ {COMU_CAMPUS.short} · Sağlık, Kültür ve Spor Daire Başkanlığı</span>
                  </div>
                  {status && (
                    <span className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${status.live ? "bg-tide/30" : "bg-foam"}`}>
                      <span className={`live-dot h-2 w-2 rounded-full ${status.live ? "text-tide" : "text-ink/30"}`} style={{ background: "currentColor" }} />
                      {status.text}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Öğle", COMU_CAMPUS.lunch],
                    ["Akşam", COMU_CAMPUS.dinner],
                  ].map(([l, t]) => (
                    <span key={l as string} className="flex items-center gap-2 whitespace-nowrap rounded-2xl bg-foam px-3 py-2 text-[13px] font-bold">
                      <FontAwesomeIcon icon={faClock} className="text-ink/50" />
                      {l as string} <span className="tabular-nums text-ink/70">{(t as typeof COMU_CAMPUS.lunch).from}–{(t as typeof COMU_CAMPUS.lunch).to}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>

        {/* Arama sonuçları */}
        <AnimatePresence>
          {norm(q).length >= 2 && (
            <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden" aria-label="Arama sonuçları">
              <h2 className="font-display text-xl font-extrabold">&ldquo;{q.trim()}&rdquo; ne zaman?</h2>
              {results.length === 0 ? (
                <p className="mt-2 text-sm text-ink/70">Bu aralıktaki menülerde eşleşme yok.</p>
              ) : (
                <ul className="mt-2 grid gap-2 md:grid-cols-2">
                  {results.map((r, i) => (
                    <motion.li key={`${r.date}-${r.meal}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (tab === "kyk" && (r.meal === "breakfast" || r.meal === "dinner")) setMeal(r.meal);
                          go(r.date);
                          setQ("");
                        }}
                        className="flex w-full items-center gap-3 rounded-[20px] bg-card p-3 text-left shadow-sm active:scale-[0.98]"
                      >
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sun text-center leading-none text-deep">
                          <span>
                            <b className="block font-display text-lg">{Number(r.date.slice(8))}</b>
                            <span className="text-[9px] font-extrabold uppercase">{dateObj(r.date).toLocaleDateString("tr-TR", { month: "short", timeZone: "UTC" })}</span>
                          </span>
                        </span>
                        <span className="min-w-0">
                          <b className="block truncate font-display text-[15px]">{r.names.join(", ")}</b>
                          <span className="text-xs text-ink/60">{fmtLong(r.date).split(" ").slice(-1)[0]}{tab === "kyk" ? ` · ${MEAL_LABEL[r.meal]}` : ""}{rel(r.date, today) ? ` · ${rel(r.date, today)}` : ""}</span>
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Gün seçici */}
        {sel && !noDataAtAll && (
          <section className="mt-5" aria-label="Tarih">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-extrabold capitalize">{fmtMonth(ym)}</h2>
              <div className="flex items-center gap-1.5">
                {sel !== today && today && (
                  <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} type="button" onClick={() => go(pick(today)!)} className="rounded-full bg-coral px-3 py-1.5 text-xs font-extrabold text-deep">
                    Bugün
                  </motion.button>
                )}
                {[-1, 1].map((n) => (
                  <motion.button key={n} whileTap={{ scale: 0.85 }} type="button" onClick={() => shiftMonth(n)} aria-label={n < 0 ? "Önceki ay" : "Sonraki ay"} className="grid h-9 w-9 place-items-center rounded-full bg-card shadow-sm">
                    <FontAwesomeIcon icon={n < 0 ? faChevronLeft : faChevronRight} className="text-sm" />
                  </motion.button>
                ))}
              </div>
            </div>
            <DayStrip
              ym={ym}
              selected={sel}
              today={today}
              stateOf={(d) => ({ has: dateSet.has(d), closed: (["breakfast", "dinner", "daily"] as const).some((m) => get(effVariant, d, m)?.status === "closed") })}
              onSelect={go}
            />
          </section>
        )}

        {/* Seçenekler: öğün / çeşit */}
        {sel && !noDataAtAll && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {tab === "kyk" ? (
              (
                [
                  ["breakfast", "Kahvaltı", faMugHot],
                  ["dinner", "Akşam yemeği", faMoon],
                ] as const
              ).map(([id, label, icon]) => (
                <motion.button key={id} whileTap={{ scale: 0.93 }} type="button" aria-pressed={meal === id} onClick={() => setMeal(id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${meal === id ? "bg-sun text-deep" : "bg-card shadow-sm"}`}>
                  <FontAwesomeIcon icon={icon} /> {label}
                </motion.button>
              ))
            ) : (
              <>
                <motion.button whileTap={{ scale: 0.93 }} type="button" aria-pressed={variant === "normal"} onClick={() => setVariant("normal")} className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${variant === "normal" ? "bg-sun text-deep" : "bg-card shadow-sm"}`}>
                  <FontAwesomeIcon icon={faUtensils} className="mr-2" /> Standart menü
                </motion.button>
                {hasVegan && (
                  <motion.button whileTap={{ scale: 0.93 }} type="button" aria-pressed={variant === "vegan"} onClick={() => setVariant("vegan")} className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${variant === "vegan" ? "bg-tide text-deep" : "bg-card shadow-sm"}`}>
                    <FontAwesomeIcon icon={faLeaf} className="mr-2" /> Vegan menü
                  </motion.button>
                )}
              </>
            )}
          </div>
        )}

        {/* Menü kartı */}
        <section className="mt-4" aria-live="polite">
          {!data || !sel ? (
            <Skeleton />
          ) : noDataAtAll ? (
            <Empty
              title="Menü henüz yüklenmedi"
              text={tab === "kyk" ? "Çanakkale KYK menüsü kaynağından henüz alınamadı. Güncel liste için yurt panosuna bakabilirsin; menü yayınlandığında burada görünür." : "Bu ayın menü PDF'i henüz yayınlanmadı ya da işlenmedi. Resmî sayfadan bakabilirsin; menü gelince burada görünür."}
              link={tab === "comu" ? { label: "ÇOMÜ SKS yemek listesi", url: SOURCE_LINKS.comu.url } : undefined}
            />
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.85 }} type="button" disabled={!prev} onClick={() => prev && go(prev)} aria-label="Önceki gün" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card shadow-sm disabled:opacity-30">
                  <FontAwesomeIcon icon={faChevronLeft} />
                </motion.button>
                <div className="min-w-0 flex-1 text-center">
                  <motion.h2 key={sel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-xl font-extrabold capitalize leading-tight">{fmtLong(sel)}</motion.h2>
                  <p className="text-xs font-bold text-ink/55">
                    {[rel(sel, today), tab === "kyk" ? MEAL_LABEL[meal] : variant === "vegan" ? "Vegan menü" : "Günün menüsü"].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.85 }} type="button" disabled={!next} onClick={() => next && go(next)} aria-label="Sonraki gün" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card shadow-sm disabled:opacity-30">
                  <FontAwesomeIcon icon={faChevronRight} />
                </motion.button>
              </div>

              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div
                  key={`${tab}|${effVariant}|${mealKey}|${sel}`}
                  custom={dir}
                  variants={{
                    enter: (d: number) => ({ opacity: 0, x: d * 48 }),
                    center: { opacity: 1, x: 0 },
                    exit: (d: number) => ({ opacity: 0, x: d * -48 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 340, damping: 32 }}
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.22}
                  onDragEnd={(_, i) => {
                    if (i.offset.x < -70 && next) go(next);
                    else if (i.offset.x > 70 && prev) go(prev);
                  }}
                  style={{ touchAction: "pan-y" }}
                >
                  {menu ? (
                    <MealPlate menu={menu} highlight={undefined} />
                  ) : (
                    <Empty
                      title={tab === "comu" && weekend ? "Hafta sonu menü yok" : "Bu gün için menü yok"}
                      text={tab === "comu" && weekend ? "Ağaköy yemekhanesi menüsü yalnızca hafta içi günler için yayınlanır." : "Bu günün menüsü henüz yayınlanmamış olabilir. Yan taraftaki günlere göz at."}
                      link={tab === "comu" ? { label: "Resmî menü sayfası", url: SOURCE_LINKS.comu.url } : undefined}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
              <p className="mt-2 text-center text-[11px] text-ink/45">İpucu: menüyü sola/sağa kaydırarak günler arasında gezebilirsin.</p>
            </>
          )}
        </section>

        {/* Haftalık bakış */}
        {sel && !noDataAtAll && data && (
          <WeekGlance selected={sel} today={today} days={tab === "comu" ? 5 : 7} menuOf={(d) => get(effVariant, d, mealKey)} onSelect={go} />
        )}

        {/* Notlar ve kaynak */}
        <section className="mt-6 space-y-2 text-xs text-ink/60" aria-label="Notlar">
          {tab === "comu" && (
            <>
              <p>Parantez içindeki değerler yemeklerin kcal karşılığıdır; ekmek ayrıdır (1 paket roll ekmek 128 kcal). Üretimde gluten, yumurta, süt ürünleri, kuruyemiş gibi alerjenler kullanılabilir.</p>
              <p>Menü günlük tek liste olarak yayınlanır; akşam servisi yalnızca SKS&apos;nin belirttiği yemekhanelerde (Ağaköy dahil) verilir.</p>
            </>
          )}
          <p>
            Menüler her gün otomatik kontrol edilir{updated ? ` · son güncelleme ${fmtStamp(updated)}` : ""}. Yemekhane/yurt yönetimi menüyü değiştirebilir; gitmeden önce panodaki listeye bakmak en doğrusudur.
          </p>
          <p className="flex flex-wrap items-center gap-x-1.5">
            Kaynak:
            {tab === "comu" ? (
              <a href={SOURCE_LINKS.comu.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">{SOURCE_LINKS.comu.label}</a>
            ) : (
              <>
                <a href={SOURCE_LINKS.kepce.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">{SOURCE_LINKS.kepce.label}</a>
                <span>(GSB/KYK&apos;ya bağlı olmayan bağımsız bir topluluk projesidir)</span>
              </>
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
