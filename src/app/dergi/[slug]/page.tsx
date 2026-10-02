"use client";
import Mascot from "@/components/Mascot";
import { pdfReaderHref } from "@/lib/pdfReader";
import {
    faArrowRight,
    faBookOpen,
    faChevronLeft,
    faFilePdf,
    faRotate,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Issue = { id: string; title: string; series: string; pdfUrl?: string };

export default function MagazineIssues({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { title?: string };
}) {
  const title = searchParams.title || "Dergi";
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [error, setError] = useState(false);

  async function loadIssues() {
    setError(false);
    try {
      const response = await fetch(`/api/magazines/${params.slug}`);
      if (!response.ok) throw new Error("Sayılar yüklenemedi.");
      const data = await response.json();
      setIssues(Array.isArray(data.issues) ? data.issues : []);
    } catch {
      setError(true);
      setIssues([]);
    }
  }

  useEffect(() => {
    void loadIssues();
  }, [params.slug]);

  const series = useMemo(() => {
    const groups = new Map<string, Issue[]>();
    for (const issue of issues ?? []) {
      const group = groups.get(issue.series) ?? [];
      group.push(issue);
      groups.set(issue.series, group);
    }
    return [...groups.entries()];
  }, [issues]);

  return (
    <main className="pb-10">
      <header className="rounded-b-[28px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <Link
          href="/dergi"
          aria-label="Dergilere dön"
          className="inline-grid h-10 w-10 place-items-center rounded-full bg-white/15"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </Link>
        <h1 className="mt-3 break-words font-display text-2xl font-extrabold">
          {title}
        </h1>
        <p className="mt-1 text-sm text-white/75">Yıl, cilt ve sayı arşivi</p>
      </header>

      {issues === null ? (
        <ul className="grid gap-3 px-5 pt-5 md:grid-cols-2">
          {[0, 1, 2].map((item) => (
            <li key={item} className="shimmer h-24 rounded-2xl" />
          ))}
        </ul>
      ) : error ? (
        <div className="px-5 py-12 text-center">
          <p role="alert" className="font-bold">
            Arşiv alınamadı.
          </p>
          <button
            onClick={() => void loadIssues()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2.5 text-sm font-bold text-white"
          >
            <FontAwesomeIcon icon={faRotate} /> Yeniden dene
          </button>
        </div>
      ) : issues.length ? (
        <div className="space-y-6 px-5 pt-5">
          {series.map(([name, entries]) => (
            <section key={name} aria-labelledby={`series-${name}`}>
              <h2
                id={`series-${name}`}
                className="mb-3 font-display text-lg font-extrabold"
              >
                {name}
              </h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {entries.map((issue) => (
                  <li
                    key={issue.id}
                    className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tide/20 text-sea">
                      <FontAwesomeIcon
                        icon={issue.pdfUrl ? faFilePdf : faBookOpen}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-bold">{issue.title}</h3>
                      <p className="mt-1 text-xs text-ink/60">
                        {issue.pdfUrl ? "Tam sayı PDF" : "Makale listesi"}
                      </p>
                    </div>
                    <Link
                      aria-label={`${issue.title} aç`}
                      href={
                        issue.pdfUrl
                          ? pdfReaderHref(
                              issue.pdfUrl,
                              `${title} · ${issue.title}`,
                            )
                          : `/dergi/${params.slug}/${issue.id}?title=${encodeURIComponent(`${title} · ${issue.title}`)}`
                      }
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sea text-white"
                    >
                      <FontAwesomeIcon
                        icon={issue.pdfUrl ? faFilePdf : faArrowRight}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="px-5 py-12 text-center">
          <Mascot size={96} className="mx-auto" />
          <p className="mt-2 font-display text-lg font-bold">
            Arşivde sayı bulunamadı.
          </p>
        </div>
      )}
    </main>
  );
}
