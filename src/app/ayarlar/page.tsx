"use client";
import AccountSettings from "@/components/AccountSettings";
import {
    CLICK_SOUND_ENABLED_KEY,
    CLICK_SOUND_STYLE_KEY,
    CLICK_SOUNDS,
} from "@/lib/clickSound";
import {
    applyNavigationLayout,
    DESKTOP_NAV_KEY,
    DESKTOP_NAVS,
    MOBILE_NAV_KEY,
    MOBILE_NAVS,
} from "@/lib/navigationLayouts";
import { applyTheme, THEMES } from "@/lib/themes";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/** CSS'teki lg kırılımıyla (1024px) aynı: true = geniş ekran/masaüstü. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return desktop;
}

export default function Ayarlar() {
  const isDesktop = useIsDesktop();
  const [cur, setCur] = useState("sabah");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundStyle, setSoundStyle] = useState("soft");
  const [mobileNav, setMobileNav] = useState("bottom");
  const [desktopNav, setDesktopNav] = useState("sidebar");
  useEffect(() => {
    setCur(document.documentElement.dataset.theme || "sabah");
    setSoundEnabled(localStorage.getItem(CLICK_SOUND_ENABLED_KEY) !== "false");
    setSoundStyle(localStorage.getItem(CLICK_SOUND_STYLE_KEY) || "soft");
    setMobileNav(localStorage.getItem(MOBILE_NAV_KEY) || "bottom");
    setDesktopNav(localStorage.getItem(DESKTOP_NAV_KEY) || "sidebar");
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
  const pickNavigation = (device: "mobile" | "desktop", id: string) => {
    const nextMobile = device === "mobile" ? id : mobileNav;
    const nextDesktop = device === "desktop" ? id : desktopNav;
    if (device === "mobile") setMobileNav(id);
    else setDesktopNav(id);
    localStorage.setItem(MOBILE_NAV_KEY, nextMobile);
    localStorage.setItem(DESKTOP_NAV_KEY, nextDesktop);
    applyNavigationLayout(nextMobile, nextDesktop);
  };
  return (
    <main>
      <header className="rounded-b-[28px] bg-gradient-to-b from-sea to-sea2 px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
        <h1 className="font-display text-2xl font-extrabold">Ayarlar</h1>
        <p className="text-sm text-white/75">Uygulamayı sana göre ayarla.</p>
      </header>
      <section className="px-5 pt-6">
        <AccountSettings />
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
        {isDesktop === false && (
        <section className="mt-7 border-b border-ink/10 pb-6">
          <h2 className="font-display text-xl font-bold">Mobil gezinme</h2>
          <p className="mt-1 text-sm opacity-70">
            Telefon ve dar ekranlarda kullanılacak düzen.
          </p>
          <ul
            role="radiogroup"
            aria-label="Mobil gezinme düzeni"
            className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {MOBILE_NAVS.map((layout) => (
              <li key={layout.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mobileNav === layout.id}
                  onClick={() => pickNavigation("mobile", layout.id)}
                  className={`layout-choice ${mobileNav === layout.id ? "is-selected" : ""}`}
                >
                  <span
                    className={`layout-preview layout-preview--${layout.id}`}
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="layout-choice-copy">
                    <b>{layout.name}</b>
                    <small>{layout.detail}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        )}
        {isDesktop === true && (
        <section className="mt-7 border-b border-ink/10 pb-6">
          <h2 className="font-display text-xl font-bold">
            Geniş ekran gezinme
          </h2>
          <p className="mt-1 text-sm opacity-70">
            Tablet ve masaüstündeki düzen.
          </p>
          <ul
            role="radiogroup"
            aria-label="Geniş ekran gezinme düzeni"
            className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {DESKTOP_NAVS.map((layout) => (
              <li key={layout.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={desktopNav === layout.id}
                  onClick={() => pickNavigation("desktop", layout.id)}
                  className={`layout-choice ${desktopNav === layout.id ? "is-selected" : ""}`}
                >
                  <span
                    className={`layout-preview layout-preview--${layout.id}`}
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="layout-choice-copy">
                    <b>{layout.name}</b>
                    <small>{layout.detail}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        )}
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
