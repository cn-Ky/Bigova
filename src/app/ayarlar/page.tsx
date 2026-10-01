"use client";
import {
    CLICK_SOUND_ENABLED_KEY,
    CLICK_SOUND_STYLE_KEY,
    CLICK_SOUNDS,
} from "@/lib/clickSound";
import { applyTheme, THEMES } from "@/lib/themes";
import {
    faCheck,
    faChevronRight,
    faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Ayarlar() {
  const [cur, setCur] = useState("sabah");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundStyle, setSoundStyle] = useState("soft");
  useEffect(() => {
    setCur(document.documentElement.dataset.theme || "sabah");
    setSoundEnabled(localStorage.getItem(CLICK_SOUND_ENABLED_KEY) !== "false");
    setSoundStyle(localStorage.getItem(CLICK_SOUND_STYLE_KEY) || "soft");
  }, []);
  const pick = (id: string) => {
    setCur(id);
    applyTheme(id);
  };
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem(CLICK_SOUND_ENABLED_KEY, String(next));
  };
  const pickSound = (id: string) => {
    setSoundStyle(id);
    localStorage.setItem(CLICK_SOUND_STYLE_KEY, id);
  };
  return (
    <main>
      <header className="rounded-b-[28px] bg-gradient-to-b from-sea to-sea2 px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
        <h1 className="font-display text-2xl font-extrabold">Ayarlar</h1>
        <p className="text-sm text-white/75">Uygulamayı sana göre ayarla.</p>
      </header>
      <section className="px-5 pt-6">
        <Link
          href="/giris"
          className="flex items-center gap-3 rounded-[22px] bg-card p-4 shadow-sm transition active:scale-[.97]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-sea text-white">
            <FontAwesomeIcon icon={faUser} />
          </span>
          <span className="flex-1">
            <b className="block">Hesap</b>
            <span className="text-sm opacity-70">Giriş yap veya kayıt ol</span>
          </span>
          <FontAwesomeIcon icon={faChevronRight} className="opacity-40" />
        </Link>
        <section className="mt-7 border-b border-ink/10 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold">Tıklama sesi</h2>
              <p className="mt-1 text-sm opacity-70">
                Düğme ve bağlantılarda kısa ses çal.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              aria-label="Tıklama sesini aç veya kapat"
              onClick={toggleSound}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${soundEnabled ? "bg-tide" : "bg-ink/25"}`}
            >
              <span
                className={`absolute top-1 grid h-6 w-6 place-items-center rounded-full bg-white shadow transition-transform ${soundEnabled ? "translate-x-7" : "translate-x-1"}`}
              />
            </button>
          </div>
          <div
            className="mt-4 grid grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Tıklama sesi seçimi"
          >
            {CLICK_SOUNDS.map((sound) => (
              <button
                key={sound.id}
                type="button"
                role="radio"
                aria-checked={soundStyle === sound.id}
                data-click-sound={sound.id}
                onClick={() => pickSound(sound.id)}
                className={`rounded-xl border px-2 py-3 text-center transition-colors ${soundStyle === sound.id ? "border-sea bg-sea/10 text-ink" : "border-ink/10 bg-card text-ink/75"}`}
              >
                <b className="block text-sm">{sound.label}</b>
                <span className="mt-1 block text-[11px] opacity-70">
                  {sound.hint}
                </span>
              </button>
            ))}
          </div>
        </section>
        <h2 className="mb-1 mt-7 font-display text-xl font-bold">Tema</h2>
        <p className="mb-3 text-sm opacity-70">
          Seçimin bu cihazda kayıtlı kalır.
        </p>
        <ul
          role="radiogroup"
          aria-label="Tema"
          className="grid grid-cols-2 gap-3 md:grid-cols-3"
        >
          {THEMES.map((t) => {
            const on = cur === t.id;
            return (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: THEMES.indexOf(t) * 0.05 }}
              >
                <button
                  role="radio"
                  aria-checked={on}
                  onClick={() => pick(t.id)}
                  className="relative w-full rounded-[22px] bg-card p-2 text-left shadow-sm active:scale-[.97]"
                >
                  {on && (
                    <motion.span
                      layoutId="ring"
                      className="absolute inset-0 rounded-[22px] ring-[3px] ring-sun"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                    />
                  )}
                  <div
                    className="rounded-2xl p-3"
                    style={{ background: t.foam }}
                  >
                    <div
                      className="h-3 w-2/3 rounded-full"
                      style={{ background: t.sea }}
                    />
                    <div
                      className="mt-2 h-6 rounded-lg"
                      style={{ background: t.card }}
                    />
                    <div className="mt-2 flex gap-1.5">
                      {[t.sea, t.tide, t.sun].map((c) => (
                        <span
                          key={c}
                          className="h-4 w-4 rounded-full"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2 pb-1 pt-2 text-sm font-bold">
                    {t.name}
                    {on && (
                      <FontAwesomeIcon icon={faCheck} className="text-tide" />
                    )}
                  </div>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
