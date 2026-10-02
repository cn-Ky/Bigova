"use client";
import { pdfReaderHref } from "@/lib/pdfReader";
import {
    faChevronLeft,
    faFilePdf,
    faRotate,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useEffect, useState } from "react";

type Article = { id: string; title: string; pdfUrl: string };
type Contents = {
  title: string;
  series: string;
  fullIssuePdfUrl?: string;
  articles: Article[];
};

export default function MagazineIssue({
  params,
  searchParams,
}: {
  params: { slug: string; issue: string };
  searchParams: { title?: string };
}) {
  const title = searchParams.title || "Sayı";
  const [contents, setContents] = useState<Contents | null>(null);
  const [error, setError] = useState(false);

  async function loadContents() {
    setError(false);
    try {
      const response = await fetch(
        `/api/magazines/${params.slug}/${params.issue}`,
      );
      if (!response.ok) throw new Error("Sayı açılamadı.");
      setContents(await response.json());
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    void loadContents();
  }, [params.slug, params.issue]);

  return (
    <main className="pb-10">
      <header className="rounded-b-[28px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <Link
          href={`/dergi/${params.slug}?title=${encodeURIComponent(title.split(" · ")[0])}`}
          aria-label="Sayı arşivine dön"
          className="inline-grid h-10 w-10 place-items-center rounded-full bg-white/15"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </Link>
        <h1 className="mt-3 break-words font-display text-2xl font-extrabold">
          {title}
        </h1>
        {contents && (
          <p className="mt-1 text-sm text-white/75">{contents.series}</p>
        )}
      </header>

      {error ? (
        <div className="px-5 py-12 text-center">
          <p role="alert" className="font-bold">
            Sayı içeriği alınamadı.
          </p>
          <button
            onClick={() => void loadContents()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2.5 text-sm font-bold text-white"
          >
            <FontAwesomeIcon icon={faRotate} /> Yeniden dene
          </button>
        </div>
      ) : contents ? (
        <div className="px-5 pt-5">
          {contents.fullIssuePdfUrl && (
            <Link
              href={pdfReaderHref(contents.fullIssuePdfUrl, title)}
              className="mb-4 flex items-center gap-3 rounded-2xl bg-sea p-4 font-bold text-white"
            >
              <FontAwesomeIcon icon={faFilePdf} />
              <span className="flex-1">Tam sayıyı oku</span>
              <FontAwesomeIcon icon={faFilePdf} />
            </Link>
          )}
          {contents.articles.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {contents.articles.map((article, index) => (
                <li
                  key={article.id}
                  className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-tide/20 text-sea text-sm font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-bold leading-snug">
                      {article.title}
                    </h2>
                    <Link
                      href={pdfReaderHref(article.pdfUrl, article.title)}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2 text-sm font-bold text-white"
                    >
                      <FontAwesomeIcon icon={faFilePdf} /> PDF oku
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : !contents.fullIssuePdfUrl ? (
            <p className="py-10 text-center text-sm text-ink/70">
              Bu sayıda açık erişimli PDF bulunamadı.
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-3 px-5 pt-5 md:grid-cols-2">
          {[0, 1, 2].map((item) => (
            <li key={item} className="shimmer h-28 rounded-2xl" />
          ))}
        </ul>
      )}
    </main>
  );
}
