"use client";
import { useUser } from "@/lib/useUser";
import { KIND_META, KIND_ORDER, norm, searchStatic, tokens, type SearchHit, type SearchKind } from "@/lib/globalSearch";
import { LIVE_SOURCES, prefetchPlaces } from "@/lib/globalSearchLive";
import {
  faArrowRight,
  faArrowUpRightFromSquare,
  faBook,
  faBookOpen,
  faBriefcase,
  faClockRotateLeft,
  faCompass,
  faFeatherPointed,
  faHashtag,
  faLandmark,
  faLightbulb,
  faLocationDot,
  faMagnifyingGlass,
  faNewspaper,
  faScrewdriverWrench,
  faStore,
  faUser,
  faXmark,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

const ICON: Record<SearchKind, IconDefinition> = {
  page: faCompass,
  business: faStore,
  news: faNewspaper,
  job: faBriefcase,
  usta: faScrewdriverWrench,
  book: faBook,
  note: faBookOpen,
  post: faFeatherPointed,
  person: faUser,
  tag: faHashtag,
  place: faLocationDot,
  guide: faLightbulb,
  culture: faLandmark,
};

/** Rozet renkleri (tema değişkenleriyle uyumlu) */
const TONE: Record<SearchKind, string> = {
  page: "bg-sea text-white",
  business: "bg-tide text-deep",
  news: "bg-coral text-deep",
  job: "bg-tide text-deep",
  usta: "bg-sun text-deep",
  book: "bg-coral text-deep",
  note: "bg-sea text-white",
  post: "bg-sky text-deep",
  person: "bg-sky text-deep",
  tag: "bg-sky text-deep",
  place: "bg-sun text-deep",
  guide: "bg-sun text-deep",
  culture: "bg-sky text-deep",
};

const WORDS = ["Kafe", "Haber", "İş ilanı", "Ders notu", "Usta", "#etiket", "Eczane", "Yemek menüsü", "Kitap"];
const SUGGESTIONS = ["Kafe", "Eczane", "Otobüs", "Ders notu", "Staj", "Yemekhane", "#biga"];
const RECENT_KEY = "bigova-recent-search";
const PER_GROUP = 4;
const MAX_CHARS = 80;

const readRecent = (): string[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
};
const writeRecent = (list: string[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
  } catch {}
};

/** Eşleşen kelimeleri kalın gösterir (Türkçe harf duyarsız). */
function Mark({ text, q }: { text: string; q: string }) {
  const ts = tokens(q);
  if (!ts.length || !text) return <>{text}</>;
  // norm 1:1 harf eşlemesi yaptığı için indeksler özgün metinle aynıdır
  const low = norm(text);
  const marks: [number, number][] = [];
  for (const w of ts) {
    let from = 0;
    for (;;) {
      const i = low.indexOf(w, from);
      if (i < 0) break;
      marks.push([i, i + w.length]);
      from = i + w.length;
    }
  }
  if (!marks.length) return <>{text}</>;
  marks.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const m of marks) {
    const last = merged[merged.length - 1];
    if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
    else merged.push([...m]);
  }
  const out: React.ReactNode[] = [];
  let at = 0;
  merged.forEach(([a, b], i) => {
    if (a > at) out.push(text.slice(at, a));
    out.push(
      <b key={i} className="font-extrabold text-sea underline decoration-tide decoration-2 underline-offset-2">
        {text.slice(a, b)}
      </b>,
    );
    at = b;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

type Filter = "all" | SearchKind;

export default function GlobalSearch() {
  const router = useRouter();
  const { user } = useUser();
  const uid = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [word, setWord] = useState(0);
  const [live, setLive] = useState<SearchHit[]>([]);
  const [pending, setPending] = useState(0);
  const [debounced, setDebounced] = useState("");

  const term = q.trim();
  const ready = tokens(term).length > 0 && term.replace(/^#/, "").length >= 1;

  useEffect(() => {
    const t = setInterval(() => setWord((n) => (n + 1) % WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => setRecent(readRecent()), []);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Yazmayı bırakınca (250 ms) canlı kaynaklar sorgulanır
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    if (!open || !debounced || tokens(debounced).length === 0) {
      setLive([]);
      setPending(0);
      return;
    }
    const sig = { cancelled: false };
    const sources = LIVE_SOURCES.filter((s) => !s.needsAuth || user);
    setPending(sources.length);
    setLive([]);
    sources.forEach((s) => {
      s.run(debounced, sig)
        .catch(() => [] as SearchHit[])
        .then((hits) => {
          if (sig.cancelled) return;
          setLive((cur) => [...cur.filter((h) => !hits.some((n) => n.key === h.key)), ...hits]);
          setPending((n) => n - 1);
        });
    });
    return () => {
      sig.cancelled = true;
    };
  }, [debounced, open, user]);

  // Anında (statik) sonuçlar yazarken beklemeden gelir
  const statics = useMemo(() => (ready ? searchStatic(term) : []), [term, ready]);

  const groups = useMemo(() => {
    const all = [...statics, ...live];
    const byKind = new Map<SearchKind, SearchHit[]>();
    for (const h of all) {
      const l = byKind.get(h.kind) ?? [];
      l.push(h);
      byKind.set(h.kind, l);
    }
    byKind.forEach((l) => l.sort((a, b) => b.score - a.score));
    return KIND_ORDER.filter((k) => byKind.has(k)).map((k) => ({ kind: k, hits: byKind.get(k)! }));
  }, [statics, live]);

  const shownGroups = useMemo(
    () =>
      filter === "all"
        ? groups.map((g) => ({ ...g, shown: g.hits.slice(0, PER_GROUP) }))
        : groups.filter((g) => g.kind === filter).map((g) => ({ ...g, shown: g.hits.slice(0, 12) })),
    [groups, filter],
  );
  const flat = useMemo(() => shownGroups.flatMap((g) => g.shown), [shownGroups]);

  // Süzgeç artık sonuç vermiyorsa "Tümü"ne dön; sonuçlar değişince seçili satır başa döner
  useEffect(() => {
    if (filter !== "all" && !groups.some((g) => g.kind === filter)) setFilter("all");
  }, [groups, filter]);
  useEffect(() => setActive(0), [term, filter]);

  const remember = useCallback((text: string) => {
    const t = text.trim();
    if (t.length < 2) return;
    const next = [t, ...readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())];
    writeRecent(next);
    setRecent(next.slice(0, 6));
  }, []);

  const openHit = useCallback(
    (h: SearchHit) => {
      remember(term);
      setOpen(false);
      if (/^https?:/.test(h.href)) window.open(h.href, "_blank", "noopener,noreferrer");
      else router.push(h.href);
    },
    [remember, router, term],
  );

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!term) {
      setOpen(true);
      return;
    }
    if (flat[active]) return openHit(flat[active]);
    // Henüz sonuç yok / hiç yok: önceki davranış — işletmelerde ara
    remember(term);
    router.push(`/isletmeler?q=${encodeURIComponent(term)}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) return setOpen(true);
    if (!flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + flat.length) % flat.length);
    }
  };

  // Seçili satırı görünür tut
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, uid]);

  const pickText = (t: string) => {
    setQ(t);
    setFilter("all");
    setOpen(true);
    inputRef.current?.focus();
  };

  const showEmpty = open && !ready;
  const showResults = open && ready;
  const loading = pending > 0;
  let rowIndex = -1;

  return (
    <div ref={boxRef} className="relative z-30 mx-5 -mt-7" onKeyDown={onKey}>
      <motion.form
        role="search"
        onSubmit={submit}
        whileHover={{ scale: 1.01 }}
        className="relative flex items-center gap-3 rounded-full bg-card px-5 py-4 text-ink shadow-[0_10px_30px_rgba(14,58,91,.16)] transition-shadow focus-within:shadow-[0_14px_40px_rgba(44,196,181,.45)] focus-within:ring-2 focus-within:ring-tide"
      >
        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-ink/60" />
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value.slice(0, MAX_CHARS));
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              prefetchPlaces();
            }}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${uid}-list`}
            aria-activedescendant={showResults && flat.length ? `${uid}-opt-${active}` : undefined}
            aria-autocomplete="list"
            aria-label="Bigova'da ara"
            className="w-full bg-transparent !outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {!q && (
            <span className="pointer-events-none absolute inset-0 flex items-center gap-1 overflow-hidden whitespace-nowrap text-ink/60">
              <AnimatePresence mode="wait">
                <motion.b key={word} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.25 }} className="font-semibold">
                  {WORDS[word]}
                </motion.b>
              </AnimatePresence>{" "}
              ara…
            </span>
          )}
        </div>
        {q && (
          <button
            type="button"
            aria-label="Aramayı temizle"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink/10 text-xs"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}
        <motion.button whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.1 }} aria-label="Ara" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sea text-white">
          <FontAwesomeIcon icon={faArrowRight} />
        </motion.button>
      </motion.form>

      <AnimatePresence>
        {(showEmpty || showResults) && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-0 top-full mt-2 max-h-[min(68vh,34rem)] overflow-y-auto overscroll-contain rounded-[26px] bg-card text-ink shadow-[0_18px_50px_rgba(14,58,91,.24)] ring-1 ring-ink/[0.06]"
          >
            {showEmpty && (
              <div className="p-4">
                {recent.length > 0 && (
                  <section aria-label="Son aramalar">
                    <div className="mb-1.5 flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink/50">Son aramalar</h3>
                      <button
                        type="button"
                        onClick={() => {
                          writeRecent([]);
                          setRecent([]);
                        }}
                        className="text-xs font-bold text-sea"
                      >
                        Temizle
                      </button>
                    </div>
                    <ul>
                      {recent.map((r) => (
                        <li key={r}>
                          <button type="button" onClick={() => pickText(r)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-foam">
                            <FontAwesomeIcon icon={faClockRotateLeft} className="w-4 text-ink/40" />
                            <span className="min-w-0 flex-1 truncate">{r}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <section aria-label="Öneriler" className={recent.length ? "mt-3" : ""}>
                  <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink/50">Şunları dene</h3>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" onClick={() => pickText(s)} className="rounded-full bg-foam px-3.5 py-1.5 text-sm font-bold">
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-ink/55">Haber, işletme, iş ilanı, usta, kitap, ders notu, Bigola gönderi ve kişileri, harita ve rehber içeriklerini tek yerden ara.</p>
                </section>
              </div>
            )}

            {showResults && (
              <div id={`${uid}-list`} role="listbox" aria-label="Arama sonuçları">
                {groups.length > 1 && (
                  <div className="sticky top-0 z-10 -mb-1 flex gap-1.5 overflow-x-auto bg-card/95 px-3 pb-2 pt-3 backdrop-blur [scrollbar-width:none]" role="tablist" aria-label="Bölüme göre süz">
                    <Chip active={filter === "all"} onClick={() => setFilter("all")} label="Tümü" count={groups.reduce((n, g) => n + g.hits.length, 0)} />
                    {groups.map((g) => (
                      <Chip key={g.kind} active={filter === g.kind} onClick={() => setFilter(g.kind)} label={KIND_META[g.kind].plural} count={g.hits.length} />
                    ))}
                  </div>
                )}

                {shownGroups.map((g) => {
                  const meta = KIND_META[g.kind];
                  const see = meta.seeAll?.(term);
                  return (
                    <section key={g.kind} aria-label={meta.plural} className="px-2 pb-2 pt-2">
                      <div className="flex items-center justify-between px-2 pb-1">
                        <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink/50">{meta.plural}</h3>
                        {see && (
                          <Link href={see} onClick={() => remember(term)} className="text-xs font-extrabold text-sea">
                            {g.hits.length > g.shown.length ? `Tümünü gör (${g.hits.length}+)` : "Sayfada aç"}
                          </Link>
                        )}
                      </div>
                      <ul>
                        {g.shown.map((h) => {
                          rowIndex += 1;
                          const idx = rowIndex;
                          const on = idx === active;
                          const external = /^https?:/.test(h.href);
                          return (
                            <li key={h.key} role="presentation">
                              <Link
                                id={`${uid}-opt-${idx}`}
                                role="option"
                                aria-selected={on}
                                href={h.href}
                                target={external ? "_blank" : undefined}
                                rel={external ? "noopener noreferrer" : undefined}
                                onClick={() => {
                                  remember(term);
                                  setOpen(false);
                                }}
                                onMouseEnter={() => setActive(idx)}
                                className={`flex items-center gap-3 rounded-2xl px-2 py-2 ${on ? "bg-foam" : ""}`}
                              >
                                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base ${TONE[h.kind]}`}>
                                  <FontAwesomeIcon icon={ICON[h.kind]} />
                                </span>
                                <span className="min-w-0 flex-1 leading-tight">
                                  <b className="block truncate font-display text-[15px]">
                                    <Mark text={h.title} q={term} />
                                  </b>
                                  {h.sub && (
                                    <span className="mt-0.5 block truncate text-[13px] text-ink/60">
                                      <Mark text={h.sub} q={term} />
                                    </span>
                                  )}
                                </span>
                                {h.demo && <span className="shrink-0 rounded-full bg-sun/30 px-2 py-0.5 text-[10px] font-extrabold">Örnek</span>}
                                <FontAwesomeIcon icon={external ? faArrowUpRightFromSquare : faArrowRight} className="shrink-0 text-xs text-ink/35" />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}

                {loading && (
                  <p className="flex items-center gap-2 px-5 pb-3 pt-1 text-sm text-ink/60" role="status">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-tide border-t-transparent" aria-hidden="true" />
                    Tüm bölümlerde aranıyor…
                  </p>
                )}
                {!loading && flat.length === 0 && (
                  <div className="px-5 py-7 text-center" role="status">
                    <p className="font-display text-base font-extrabold">“{term}” için sonuç yok</p>
                    <p className="mt-1 text-sm text-ink/65">Yazımı kontrol et ya da daha kısa/genel bir kelime dene.</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS.slice(0, 4).map((s) => (
                        <button key={s} type="button" onClick={() => pickText(s)} className="rounded-full bg-foam px-3.5 py-1.5 text-sm font-bold">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {!user && !loading && flat.length > 0 && (
                  <p className="px-5 pb-3 text-xs text-ink/55">
                    Notlar, Bigola gönderi ve kişileri için{" "}
                    <Link href="/giris" className="font-bold text-sea">
                      giriş yap
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors ${active ? "bg-sea text-white" : "bg-foam text-ink"}`}
    >
      {label} <span className={active ? "text-white/75" : "text-ink/50"}>{count}</span>
    </button>
  );
}
