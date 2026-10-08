"use client";
import Mascot from "@/components/Mascot";
import NewsCover from "@/components/NewsCover";
import { fetchNews, useSavedNews } from "@/lib/newsClient";
import {
  categoryMeta,
  isDemoNews,
  longDate,
  paragraphs,
  readingMinutes,
  safeUrl,
  type NewsArticle,
} from "@/lib/newsData";
import {
  faArrowLeft,
  faArrowUpRightFromSquare,
  faBookmark,
  faCheck,
  faClock,
  faShareNodes,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion, useScroll, useSpring } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function HaberDetay() {
  const { id } = useParams<{ id: string }>();
  const [all, setAll] = useState<NewsArticle[] | null>(null);
  const [copied, setCopied] = useState(false);
  const { toggle, isSaved } = useSavedNews();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 180, damping: 30, mass: 0.4 });

  useEffect(() => {
    let alive = true;
    fetchNews().then((n) => alive && setAll(n));
    return () => {
      alive = false;
    };
  }, []);

  const article = all?.find((a) => a.id === id);
  const related = (all ?? [])
    .filter((a) => a.id !== id && article && a.category === article.category)
    .concat((all ?? []).filter((a) => a.id !== id && article && a.category !== article.category))
    .slice(0, 3);

  async function share() {
    if (!article) return;
    const url = location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text: article.summary, url });
        return;
      }
    } catch {
      return; // kullanıcı paylaşımı kapattı
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  if (all === null)
    return (
      <main className="px-5 pt-6">
        <div className="shimmer h-52 rounded-[28px]" />
        <div className="shimmer mt-4 h-10 rounded-2xl" />
        <div className="shimmer mt-3 h-40 rounded-[24px]" />
      </main>
    );

  if (!article)
    return (
      <main className="px-5 py-16 text-center">
        <Mascot size={96} className="mx-auto" />
        <p className="mt-2 font-display text-lg font-bold">Haber bulunamadı</p>
        <p className="text-sm text-ink/70">Kaldırılmış ya da bağlantı hatalı olabilir.</p>
        <Link href="/haberler" className="mt-4 inline-flex items-center gap-2 rounded-full bg-sea px-5 py-2.5 font-bold text-white">
          <FontAwesomeIcon icon={faArrowLeft} /> Haberlere dön
        </Link>
      </main>
    );

  const { icon } = categoryMeta(article.category);
  const source = safeUrl(article.source_url);
  const saved = isSaved(article.id);
  const [lead, ...rest] = paragraphs(article.body);

  return (
    <main className="pb-6">
      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-sun"
      />
      <div className="relative">
        <NewsCover category={article.category} seed={article.title} size="hero" className="h-56 rounded-b-[32px] md:h-72" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Link
            href="/haberler"
            aria-label="Haberlere dön"
            className="grid h-10 w-10 place-items-center rounded-full bg-deep/55 text-white backdrop-blur transition active:scale-90"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggle(article.id)}
              aria-pressed={saved}
              aria-label={saved ? "Kaydedilenlerden çıkar" : "Haberi kaydet"}
              className={`grid h-10 w-10 place-items-center rounded-full backdrop-blur transition active:scale-90 ${saved ? "bg-sun text-deep" : "bg-deep/55 text-white"}`}
            >
              <FontAwesomeIcon icon={faBookmark} />
            </button>
            <button
              type="button"
              onClick={() => void share()}
              aria-label="Haberi paylaş"
              className="grid h-10 w-10 place-items-center rounded-full bg-deep/55 text-white backdrop-blur transition active:scale-90"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faShareNodes} />
            </button>
          </span>
        </div>
      </div>

      <article className="px-5 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-tide/20 px-3 py-1 text-xs font-extrabold">
            <FontAwesomeIcon icon={icon} />
            {article.category}
          </span>
          {isDemoNews(article) && (
            <span className="rounded-full bg-coral/20 px-3 py-1 text-xs font-extrabold">Örnek haber · temsilidir</span>
          )}
        </div>
        <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight md:text-4xl">{article.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/65">
          <span>{longDate(article.published_at)}</span>
          <span>
            <FontAwesomeIcon icon={faClock} className="mr-1" />
            {readingMinutes(article)} dk okuma
          </span>
          {article.author_name && (
            <span>
              <FontAwesomeIcon icon={faUser} className="mr-1" />
              {article.author_name}
            </span>
          )}
        </div>

        <p className="mt-5 border-l-4 border-sun pl-4 font-display text-lg font-bold leading-snug text-ink/90">
          {article.summary}
        </p>
        <div className="mt-5 grid gap-4 text-[17px] leading-relaxed text-ink/85">
          {lead && <p className="news-dropcap">{lead}</p>}
          {rest.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {(article.source_name || source) && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-sm">
            <span className="text-sm text-ink/70">
              Kaynak: <b className="text-ink">{article.source_name ?? "Dış kaynak"}</b>
            </span>
            {source && (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2 text-sm font-bold text-white"
              >
                Kaynağa git <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </a>
            )}
          </div>
        )}
      </article>

      {related.length > 0 && (
        <section className="px-5 pt-8" aria-label="Diğer haberler">
          <h2 className="font-display text-xl font-extrabold">Bunlar da ilgini çekebilir</h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-3">
            {related.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/haberler/${a.id}`}
                  className="flex gap-3 rounded-[22px] bg-card p-3 shadow-sm transition active:scale-[0.98]"
                >
                  <NewsCover category={a.category} seed={a.title} size="thumb" className="h-16 w-16 shrink-0 rounded-xl" />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-extrabold text-ink/55">{a.category}</span>
                    <b className="line-clamp-3 font-display text-[15px] leading-tight">{a.title}</b>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
