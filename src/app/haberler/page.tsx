"use client";
import Mascot from "@/components/Mascot";
import NewsCover from "@/components/NewsCover";
import SearchBox from "@/components/SearchBox";
import { fetchNews, useSavedNews } from "@/lib/newsClient";
import {
  NEWS_CATEGORIES,
  categoryMeta,
  isDemoNews,
  readingMinutes,
  timeAgo,
  todayLine,
  type NewsArticle,
} from "@/lib/newsData";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
  faArrowRight,
  faBookmark,
  faClock,
  faPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const inputClass = "w-full rounded-xl bg-foam px-4 py-3 field-ring";
const emptyForm = {
  title: "",
  summary: "",
  body: "",
  category: NEWS_CATEGORIES[0] as string,
  author_name: "",
  source_name: "",
  source_url: "",
  featured: false,
};

function Chip({ category }: { category: string }) {
  const { icon } = categoryMeta(category);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-tide/20 px-2.5 py-0.5 text-[11px] font-extrabold">
      <FontAwesomeIcon icon={icon} className="text-[10px]" />
      {category}
    </span>
  );
}

function SaveButton({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.8 }}
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? `${label} kaydedilenlerden çıkar` : `${label} kaydet`}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${on ? "bg-sun text-deep" : "bg-foam text-ink/60"}`}
    >
      <FontAwesomeIcon icon={faBookmark} />
    </motion.button>
  );
}

export default function Haberler() {
  const { user } = useUser();
  const isAdmin = user?.app_metadata?.role === "admin";
  const { saved, toggle, isSaved } = useSavedNews();
  const [items, setItems] = useState<NewsArticle[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tümü");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const load = () => fetchNews().then(setItems);
  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    return (items ?? []).filter(
      (a) =>
        (cat === "Tümü" || (cat === "Kaydedilenler" ? saved.includes(a.id) : a.category === cat)) &&
        `${a.title} ${a.summary} ${a.body} ${a.category}`.toLocaleLowerCase("tr").includes(needle),
    );
  }, [items, q, cat, saved]);

  const defaultView = cat === "Tümü" && !q.trim();
  const hero = defaultView ? (filtered.find((a) => a.featured) ?? filtered[0]) : undefined;
  const rest = hero ? filtered.filter((a) => a.id !== hero.id) : filtered;
  const ticker = (items ?? []).slice(0, 5);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = form.source_url.trim();
    if (form.title.trim().length < 5) return setNotice("Başlık en az 5 karakter olmalı.");
    if (form.summary.trim().length < 10) return setNotice("Özet en az 10 karakter olmalı.");
    if (form.body.trim().length < 20) return setNotice("Haber metni en az 20 karakter olmalı.");
    if (url && !/^https?:\/\/\S+$/i.test(url)) return setNotice("Kaynak bağlantısı http(s):// ile başlamalı.");
    setBusy(true);
    setNotice("");
    const { error } = await supabaseBrowser()
      .from("news_articles")
      .insert({
        title: form.title.trim(),
        summary: form.summary.trim(),
        body: form.body.trim(),
        category: form.category,
        author_name: form.author_name.trim() || null,
        source_name: form.source_name.trim() || null,
        source_url: url || null,
        featured: form.featured,
      });
    setBusy(false);
    if (error) return setNotice(`Haber eklenemedi: ${error.message}`);
    setForm(emptyForm);
    setShowForm(false);
    await load();
  }

  return (
    <main>
      <header className="sticky top-0 z-20 rounded-b-[28px] bg-sea px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sun">Bigova haber</p>
            <h1 className="font-display text-2xl font-extrabold leading-tight">Biga Gündemi</h1>
            <p className="text-sm capitalize text-white/75">{todayLine()}</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setNotice("");
                setShowForm(true);
              }}
              aria-label="Haber ekle"
              title="Haber ekle"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sun text-deep"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          )}
        </div>
        <SearchBox className="mt-3" value={q} onChange={setQ} placeholder="Haberlerde ara" label="Haber ara" />
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {["Tümü", ...NEWS_CATEGORIES, "Kaydedilenler"].map((c) => (
            <motion.button
              whileTap={{ scale: 0.9 }}
              key={c}
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${cat === c ? "bg-sun text-deep" : "bg-white/15 text-white"}`}
            >
              {c === "Kaydedilenler" && saved.length > 0 ? `${c} · ${saved.length}` : c}
            </motion.button>
          ))}
        </div>
      </header>

      {ticker.length > 0 && defaultView && (
        <div className="news-ticker mx-5 mt-4 flex items-center gap-3 rounded-full bg-card py-2 pl-2 pr-4 shadow-sm">
          <span className="shrink-0 rounded-full bg-coral px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-deep">
            Son
          </span>
          <div className="news-ticker-viewport">
            <div className="news-ticker-track">
              {[0, 1].map((copy) => (
                <span key={copy} className="flex shrink-0 gap-8 pr-8" aria-hidden={copy === 1 ? true : undefined}>
                  {ticker.map((a) => (
                    <Link
                      key={a.id}
                      href={`/haberler/${a.id}`}
                      tabIndex={copy === 1 ? -1 : undefined}
                      className="whitespace-nowrap text-sm font-bold hover:text-sea"
                    >
                      {a.title}
                    </Link>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {items === null && (
        <div className="grid gap-3 px-5 pt-4">
          <div className="shimmer h-72 rounded-[28px]" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer h-28 rounded-[24px]" />
          ))}
        </div>
      )}

      {hero && (
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="group relative mx-5 mt-4 overflow-hidden rounded-[28px] bg-card shadow-sm transition-shadow hover:shadow-lg"
        >
          <Link href={`/haberler/${hero.id}`} aria-label={hero.title} className="absolute inset-0 z-0" />
          <NewsCover category={hero.category} seed={hero.title} size="hero" className="h-44 md:h-56" />
          <div className="relative z-10 p-5">
            <div className="pointer-events-none flex flex-wrap items-center gap-2">
              <Chip category={hero.category} />
              {isDemoNews(hero) && <span className="text-[11px] font-extrabold text-coral">Örnek haber</span>}
            </div>
            <h2 className="pointer-events-none mt-2 font-display text-2xl font-extrabold leading-tight md:text-3xl">
              {hero.title}
            </h2>
            <p className="pointer-events-none mt-2 text-sm text-ink/75 md:text-base">{hero.summary}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="pointer-events-none flex items-center gap-3 text-xs text-ink/60">
                <span>
                  <FontAwesomeIcon icon={faClock} className="mr-1" />
                  {timeAgo(hero.published_at)}
                </span>
                <span>{readingMinutes(hero)} dk okuma</span>
              </span>
              <span className="flex items-center gap-2">
                <SaveButton on={isSaved(hero.id)} onClick={() => toggle(hero.id)} label={hero.title} />
                <span className="pointer-events-none inline-flex items-center gap-2 text-sm font-extrabold text-sea">
                  Oku <FontAwesomeIcon icon={faArrowRight} className="transition group-hover:translate-x-1" />
                </span>
              </span>
            </div>
          </div>
        </motion.article>
      )}

      <ul className="grid items-start gap-3 px-5 pt-4 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {rest.map((a) => (
            <motion.li
              key={a.id}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="group relative flex gap-3 rounded-[24px] bg-card p-3 shadow-sm transition-shadow hover:shadow-lg"
            >
              <Link href={`/haberler/${a.id}`} aria-label={a.title} className="absolute inset-0 z-0 rounded-[24px]" />
              <NewsCover category={a.category} seed={a.title} size="thumb" className="pointer-events-none h-24 w-24 shrink-0 rounded-2xl" />
              <div className="relative z-10 flex min-w-0 flex-1 flex-col">
                <div className="pointer-events-none flex flex-wrap items-center gap-2">
                  <Chip category={a.category} />
                  {isDemoNews(a) && <span className="text-[10px] font-extrabold text-coral">Örnek</span>}
                </div>
                <h3 className="pointer-events-none mt-1.5 line-clamp-3 font-display text-[17px] font-extrabold leading-tight">
                  {a.title}
                </h3>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <span className="pointer-events-none text-xs text-ink/60">
                    {timeAgo(a.published_at)} · {readingMinutes(a)} dk
                  </span>
                  <SaveButton on={isSaved(a.id)} onClick={() => toggle(a.id)} label={a.title} />
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {items && filtered.length === 0 && (
        <div className="px-5 py-12 text-center">
          <Mascot size={96} className="mx-auto" />
          <p className="mt-2 font-display text-lg font-bold">
            {cat === "Kaydedilenler" ? "Henüz kaydettiğin haber yok" : "Haber bulunamadı"}
          </p>
          <p className="text-sm text-ink/70">
            {cat === "Kaydedilenler"
              ? "Haberlerdeki yer işaretine dokunarak sonra okumak üzere kaydedebilirsin."
              : "Başka bir kelimeyle ara ya da kategoriyi “Tümü” yap."}
          </p>
        </div>
      )}

      {items && (
        <p className="px-5 pb-2 pt-5 text-center text-xs text-ink/55">
          “Örnek” etiketli içerikler biçimi göstermek için hazırlanmış genel yazılardır, gerçek bir olayı bildirmez.
          Kaydettiğin haberler yalnızca bu tarayıcıda tutulur.
        </p>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-deep/60 backdrop-blur-sm md:items-center"
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="grid max-h-[92dvh] w-full max-w-md gap-3 overflow-y-auto rounded-t-[24px] bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink md:rounded-[24px]"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold">Yeni haber</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Kapat" className="grid h-9 w-9 place-items-center rounded-full bg-foam">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={160} placeholder="Başlık" required />
            <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)} aria-label="Kategori">
              {NEWS_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <textarea className={inputClass} rows={2} maxLength={400} value={form.summary} onChange={(e) => set("summary", e.target.value)} placeholder="Özet (liste ve giriş metni)" required />
            <textarea className={inputClass} rows={7} maxLength={20000} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Haber metni. Paragrafları boş satırla ayır." required />
            <input className={inputClass} value={form.author_name} onChange={(e) => set("author_name", e.target.value)} maxLength={80} placeholder="Yazar / editör (isteğe bağlı)" />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputClass} value={form.source_name} onChange={(e) => set("source_name", e.target.value)} maxLength={80} placeholder="Kaynak adı" />
              <input className={inputClass} type="url" value={form.source_url} onChange={(e) => set("source_url", e.target.value)} placeholder="Kaynak bağlantısı" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-[rgb(var(--tide))]" />
              Manşet yap (sayfanın en üstünde büyük görünür)
            </label>
            {notice && (
              <p role="alert" className="text-sm font-bold text-coral">
                {notice}
              </p>
            )}
            <button disabled={busy} className="rounded-xl bg-sea p-3 font-bold text-white disabled:opacity-50">
              {busy ? "Yayınlanıyor…" : "Haberi yayınla"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
