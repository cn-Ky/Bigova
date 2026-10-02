"use client";
import {
    faArrowRight,
    faBookOpen,
    faNewspaper,
    faRotate,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useEffect, useState } from "react";

type Journal = { title: string; slug: string };

export default function Dergi() {
  const [journals, setJournals] = useState<Journal[] | null>(null);
  const [error, setError] = useState(false);

  async function loadJournals() {
    setError(false);
    try {
      const response = await fetch("/api/magazines");
      if (!response.ok) throw new Error("Dergiler yüklenemedi.");
      const data = await response.json();
      setJournals(Array.isArray(data.journals) ? data.journals : []);
    } catch {
      setError(true);
      setJournals([]);
    }
  }

  useEffect(() => {
    void loadJournals();
  }, []);

  return (
    <main className="pb-10">
      <header className="rounded-b-[28px] bg-sea px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
          <FontAwesomeIcon icon={faNewspaper} />
        </span>
        <h1 className="mt-3 font-display text-2xl font-extrabold">
          Fakülte Dergileri
        </h1>
        <p className="mt-1 text-sm text-white/75">
          Biga İİBF tarafından listelenen akademik dergiler.
        </p>
      </header>

      {journals === null ? (
        <ul className="grid gap-3 px-5 pt-5 md:grid-cols-2">
          {[0, 1, 2].map((item) => (
            <li key={item} className="shimmer h-28 rounded-2xl" />
          ))}
        </ul>
      ) : error ? (
        <div className="px-5 py-12 text-center">
          <p role="alert" className="font-bold">
            Dergi listesi alınamadı.
          </p>
          <button
            onClick={() => void loadJournals()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2.5 text-sm font-bold text-white"
          >
            <FontAwesomeIcon icon={faRotate} /> Yeniden dene
          </button>
        </div>
      ) : journals.length ? (
        <ul className="grid gap-3 px-5 pt-5 md:grid-cols-2">
          {journals.map((journal) => (
            <li
              key={journal.slug}
              className="rounded-2xl bg-card p-4 shadow-sm"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-tide/20 text-sea">
                <FontAwesomeIcon icon={faBookOpen} />
              </span>
              <h2 className="mt-3 font-display text-lg font-extrabold leading-tight">
                {journal.title}
              </h2>
              <Link
                href={`/dergi/${journal.slug}?title=${encodeURIComponent(journal.title)}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2.5 text-sm font-bold text-white"
              >
                Sayıları görüntüle <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-12 text-center text-sm text-ink/70">
          Kaynak sayfada listelenen dergi bulunamadı.
        </p>
      )}

      <p className="px-5 pt-5 text-xs text-ink/55">
        Liste, Biga İİBF’nin resmi web sayfasından alınır.
      </p>
    </main>
  );
}
