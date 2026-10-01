"use client";
import { iibfPrograms, scheduleSources } from "@/lib/scheduleData";
import {
    faArrowUpRightFromSquare,
    faCalendarWeek,
    faClock,
    faGraduationCap,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";

const years = ["1. sınıf", "2. sınıf", "3. sınıf", "4. sınıf"];

export default function DersProgrami() {
  const [school, setSchool] = useState<"iibf" | "myo">("iibf");
  const [program, setProgram] = useState(iibfPrograms[0]);
  const [year, setYear] = useState(years[0]);
  const yearIndex = years.indexOf(year);
  const scheduleUrl =
    scheduleSources.iibf.programs[program]?.[yearIndex] ??
    scheduleSources.iibf.href;
  const additionalSchedules = scheduleSources.iibf.additional.filter(
    (item) => item.program === program && item.yearIndex === yearIndex,
  );
  return (
    <main className="pb-10">
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <FontAwesomeIcon icon={faCalendarWeek} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">
              Ders Programı
            </h1>
            <p className="text-sm text-white/75">
              Biga İİBF ve Biga MYO haftalık çizelgeleri
            </p>
          </div>
        </div>
        <div
          className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-black/10 p-1"
          role="tablist"
          aria-label="Okul seçimi"
        >
          <button
            role="tab"
            aria-selected={school === "iibf"}
            onClick={() => setSchool("iibf")}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${school === "iibf" ? "bg-card text-ink" : "text-white/75"}`}
          >
            Biga İİBF
          </button>
          <button
            role="tab"
            aria-selected={school === "myo"}
            onClick={() => setSchool("myo")}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${school === "myo" ? "bg-card text-ink" : "text-white/75"}`}
          >
            Biga MYO
          </button>
        </div>
      </header>

      {school === "iibf" ? (
        <section className="px-5 pt-5">
          <p className="text-sm text-ink/65">
            Bölümünü ve sınıfını seç; güncel dönem çizelgesi fakültenin resmî
            duyuru arşivinde açılır.
          </p>
          <label className="mt-4 block text-sm font-bold">
            Bölüm
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="mt-2 w-full rounded-xl bg-card px-4 py-3 font-normal shadow-sm outline-none focus:ring-2 focus:ring-tide"
            >
              {iibfPrograms.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {years.map((grade) => (
              <button
                key={grade}
                onClick={() => setYear(grade)}
                aria-pressed={year === grade}
                className={`rounded-xl px-3 py-3 text-sm font-bold ${year === grade ? "bg-sea text-white" : "bg-card text-ink"}`}
              >
                {grade}
              </button>
            ))}
          </div>
          <article className="mt-5 overflow-hidden rounded-[20px] bg-card shadow-sm">
            <div className="grid min-h-32 grid-cols-[1fr_96px] items-center gap-3 bg-tide/15 px-4 py-4 sm:grid-cols-[1fr_130px]">
              <div>
                <span className="text-xs font-bold uppercase text-sea">
                  2026–2027 güz dönemi
                </span>
                <h2 className="mt-1 font-display text-lg font-extrabold leading-tight">
                  {program}
                </h2>
                <p className="mt-1 text-sm text-ink/65">
                  {year} · haftalık ders çizelgesi
                </p>
              </div>
              <svg
                viewBox="0 0 120 100"
                className="h-24 w-24 text-sea sm:h-28 sm:w-32"
                aria-hidden="true"
              >
                <rect
                  x="17"
                  y="18"
                  width="86"
                  height="65"
                  rx="8"
                  fill="currentColor"
                  opacity=".13"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  d="M17 37h86M37 12v13m46-13v13M34 51h11m14 0h11m14 0h11M34 67h11m14 0h11"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M28 89h64"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <span className="text-xs text-ink/60">
                <FontAwesomeIcon icon={faClock} className="mr-1.5" />
                Resmî kaynak güncellemesi: {scheduleSources.iibf.updated}
              </span>
              <div className="flex flex-wrap gap-2">
                <a
                  href={scheduleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2.5 text-sm font-bold text-white"
                >
                  Çizelge PDF'si{" "}
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </a>
                {additionalSchedules.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-tide/20 px-4 py-2.5 text-sm font-bold text-ink"
                  >
                    {item.label}{" "}
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                  </a>
                ))}
              </div>
            </div>
          </article>
          <p className="mt-3 text-xs leading-relaxed text-ink/55">
            Kaynak:{" "}
            <a
              className="font-bold underline"
              href={scheduleSources.iibf.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Biga İİBF resmî ders programı duyurusu
            </a>
            . PDF’ler yayımlandıkları resmî sunucuda açılır.
          </p>
        </section>
      ) : (
        <section className="px-5 pt-5">
          <div className="rounded-[20px] bg-card p-5 shadow-sm">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-sun/25 text-deep">
              <FontAwesomeIcon icon={faGraduationCap} className="text-xl" />
            </span>
            <span className="mt-4 block text-xs font-bold uppercase text-sea">
              2026–2027 güz dönemi
            </span>
            <h2 className="mt-1 font-display text-xl font-extrabold">
              Biga MYO · tüm bölümler ve sınıflar
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              Resmî haftalık çizelge, Biga MYO’nun program ve sınıflarını tek
              PDF’de toplar.
            </p>
            <p className="mt-3 text-xs text-ink/55">
              Kaynak güncellemesi: {scheduleSources.myo.updated}
            </p>
            <a
              href={scheduleSources.myo.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-sea px-4 py-3 text-sm font-bold text-white"
            >
              Tüm sınıfların PDF programını aç{" "}
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </a>
            <a
              href={scheduleSources.myo.source}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 mt-4 inline-block text-sm font-bold text-sea underline"
            >
              Duyuru kaynağı
            </a>
          </div>
          <a
            href="https://bigamyo.comu.edu.tr/bolumler-ve-programlar-r20.html"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block text-sm font-bold text-sea underline"
          >
            Biga MYO resmî bölüm ve program listesi
          </a>
        </section>
      )}
    </main>
  );
}
