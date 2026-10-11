"use client";
import Coin from "@/components/bigocuk/Coin";
import { errMsg, useBigocuk } from "@/lib/bigocuk/api";
import {
  applyTheme,
  loadThemeFonts,
  PREMIUM_THEMES,
  THEME_KEY,
  THEME_PREVIEW_ATTR,
  type PremiumTheme,
} from "@/lib/themes";
import { faCheck, faEye, faLock, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/**
 * Canlı mini önizleme. Gerçek uygulamadaki sohbet/başlık/kart sınıflarını kullanır;
 * böylece temanın CSS'i (src/styles/themes/*.css) önizlemeyi de aynen biçimlendirir.
 */
function ThemePreview({ t }: { t: PremiumTheme }) {
  return (
    <div data-tp={t.id} aria-hidden="true" className="overflow-hidden">
      <div className="tp-screen">
        <div className="tp-head">
          <h3>Arkadaşlar</h3>
          <p>Bire bir sohbet</p>
        </div>
        <ol className="chat-stage flex flex-col pb-1 pt-2">
          <li className="chat-day-row my-2 flex justify-center">
            <span className="chat-day rounded-full bg-card/80 px-3 py-1 text-[11px] font-extrabold">Bugün</span>
          </li>
          <li className="chat-row chat-row--theirs is-first is-last mt-3 flex items-end justify-start gap-2">
            <div className="chat-col flex min-w-0 max-w-[80%] flex-col items-start">
              <div data-from="Ece" className="chat-bubble chat-bubble--theirs is-first is-last rounded-[20px] bg-card px-3.5 py-2 text-ink shadow-sm">
                <p className="chat-text text-[15px] leading-snug">Vize notlarını attın mı?</p>
                <span className="chat-meta mt-1 flex items-center justify-end gap-1.5 text-[10px] text-ink/50">
                  <time>14:02</time>
                </span>
              </div>
            </div>
          </li>
          <li className="chat-row chat-row--mine is-first is-last mt-3 flex items-end justify-end gap-2">
            <div className="chat-col flex min-w-0 max-w-[80%] flex-col items-end">
              <div data-from="Sen" className="chat-bubble chat-bubble--mine is-first is-last rounded-[20px] bg-sea px-3.5 py-2 text-white shadow-sm">
                <p className="chat-text text-[15px] leading-snug">Az önce yükledim!</p>
                <span className="chat-meta mt-1 flex items-center justify-end gap-1.5 text-[10px] text-white/70">
                  <time>14:03</time>
                  <FontAwesomeIcon icon={faCheck} />
                </span>
              </div>
            </div>
          </li>
        </ol>
        <div className="chat-composer border-t border-ink/5 bg-foam/95 px-3 pb-3 pt-2">
          <div className="chat-form flex items-end gap-2 rounded-[26px] bg-card p-1.5 shadow-sm ring-1 ring-ink/5">
            <span className="chat-input flex-1 px-3.5 py-2.5 text-base leading-snug text-ink/45">Mesaj yaz…</span>
            <span className="chat-send is-ready grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sea text-white">
              <FontAwesomeIcon icon={faPaperPlane} />
            </span>
          </div>
        </div>
        <div className="tp-card rounded-[22px]">
          <i />
          <div className="leading-tight">
            <b className="block">İşletmeler</b>
            <span className="text-xs opacity-70">Fiyat, saat, tuvalet</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThemeShop({ current, onApply }: { current: string; onApply: (id: string) => void }) {
  const { status, state, buy } = useBigocuk();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  // Önizleme kartlarının yazı tipleri
  useEffect(() => {
    PREMIUM_THEMES.forEach((t) => loadThemeFonts(t.id));
  }, []);

  const restore = useCallback(() => {
    let saved = "sabah";
    try {
      saved = localStorage.getItem(THEME_KEY) || saved;
    } catch {}
    applyTheme(saved);
  }, []);
  // Sayfadan çıkarken yarım kalan önizlemeyi kapat
  useEffect(
    () => () => {
      if (document.documentElement.dataset[THEME_PREVIEW_ATTR]) restore();
    },
    [restore],
  );
  // Ücretsiz tema seçilince ya da bir tema uygulanınca önizleme biter
  useEffect(() => {
    setPreviewId(null);
  }, [current]);

  const owned = new Set(state?.owned ?? []);
  const coins = state?.coins ?? 0;

  const startPreview = (t: PremiumTheme) => {
    applyTheme(t.id, false);
    setPreviewId(t.id);
  };
  const stopPreview = () => {
    restore();
    setPreviewId(null);
  };
  const apply = (t: PremiumTheme) => {
    setPreviewId(null);
    onApply(t.id);
  };
  const purchase = async (t: PremiumTheme) => {
    setBusyId(t.id);
    setMsg(null);
    try {
      await buy(t.itemId);
      setConfirmId(null);
      setPreviewId(null);
      onApply(t.id);
      setMsg({ id: t.id, ok: true, text: `${t.name} senin! Hemen uygulandı.` });
    } catch (e) {
      setMsg({ id: t.id, ok: false, text: errMsg(e) });
    } finally {
      setBusyId(null);
    }
  };

  const previewTheme = PREMIUM_THEMES.find((t) => t.id === previewId);

  /** Bir temanın ana eylemi: uygula / satın al / giriş yap. */
  const action = (t: PremiumTheme) => {
    const isOwned = owned.has(t.itemId);
    if (status === "guest")
      return (
        <Link href="/giris" className="inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2.5 text-sm font-extrabold text-white">
          <FontAwesomeIcon icon={faLock} /> Satın almak için giriş yap
        </Link>
      );
    if (status !== "ready")
      return <span className="text-sm opacity-60">{status === "loading" ? "Yükleniyor…" : "Mağazaya şu an ulaşılamıyor."}</span>;
    if (isOwned) {
      return current === t.id ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-tide/20 px-4 py-2.5 text-sm font-extrabold">
          <FontAwesomeIcon icon={faCheck} /> Kullanılıyor
        </span>
      ) : (
        <button type="button" onClick={() => apply(t)} className="rounded-full bg-sea px-5 py-2.5 text-sm font-extrabold text-white active:scale-95">
          Uygula
        </button>
      );
    }
    if (coins < t.price)
      return (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-4 py-2.5 font-extrabold opacity-80">
            <Coin size={18} /> {t.price - coins} Bigcoin eksik
          </span>
          <Link href="/bigocuk" className="font-bold text-sea underline underline-offset-2">
            Bigcoin kazan
          </Link>
        </span>
      );
    if (confirmId === t.id)
      return (
        <span className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busyId === t.id}
            onClick={() => void purchase(t)}
            className="inline-flex items-center gap-2 rounded-full bg-sea px-5 py-2.5 text-sm font-extrabold text-white active:scale-95 disabled:opacity-60"
          >
            <Coin size={18} /> {busyId === t.id ? "Alınıyor…" : `${t.price} Bigcoin öde`}
          </button>
          <button type="button" onClick={() => setConfirmId(null)} className="rounded-full px-3 py-2.5 text-sm font-bold opacity-70">
            Vazgeç
          </button>
        </span>
      );
    return (
      <button
        type="button"
        onClick={() => {
          setMsg(null);
          setConfirmId(t.id);
        }}
        className="inline-flex items-center gap-2 rounded-full bg-sea px-5 py-2.5 text-sm font-extrabold text-white active:scale-95"
      >
        <Coin size={18} /> {t.price} Bigcoin
      </button>
    );
  };

  return (
    <section aria-labelledby="ozel-temalar" className="mt-9">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="ozel-temalar" className="font-display text-xl font-bold">
            Özel temalar
          </h2>
          <p className="mt-1 max-w-md text-sm opacity-70">
            Sadece renk değil: sohbet, başlıklar, kartlar ve menüler baştan tasarlanır. Bigcoin ile bir kez al, hesabında kalsın.
          </p>
        </div>
        {status === "ready" && (
          <Link href="/bigocuk" className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-sm font-extrabold shadow-sm">
            <Coin size={20} /> {coins} Bigcoin
          </Link>
        )}
      </div>

      {status === "setup" && (
        <p role="status" className="mt-3 rounded-xl bg-sun/25 px-3 py-2 text-sm font-bold">
          Tema mağazası henüz kurulmadı. Supabase&apos;de supabase/themes_upgrade.sql dosyasını çalıştır.
        </p>
      )}

      <ul className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        {PREMIUM_THEMES.map((t) => {
          const isOwned = owned.has(t.itemId);
          const previewing = previewId === t.id;
          return (
            <li key={t.id} className="overflow-hidden rounded-[22px] bg-card shadow-sm ring-1 ring-ink/10">
              <ThemePreview t={t} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-extrabold leading-tight">{t.name}</h3>
                  {isOwned && (
                    <span className="shrink-0 rounded-full bg-tide/20 px-2.5 py-1 text-xs font-extrabold">Senin</span>
                  )}
                </div>
                <p className="mt-1 text-sm opacity-75">{t.tagline}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {t.changes.map((c) => (
                    <li key={c} className="rounded-full bg-foam px-2.5 py-1 text-[11px] font-bold opacity-85">
                      {c}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {action(t)}
                  <button
                    type="button"
                    onClick={() => (previewing ? stopPreview() : startPreview(t))}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-bold underline-offset-2 hover:underline"
                  >
                    <FontAwesomeIcon icon={faEye} /> {previewing ? "Önizlemeyi kapat" : "Tüm uygulamada dene"}
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {msg?.id === t.id && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role={msg.ok ? "status" : "alert"}
                      className={`mt-3 text-sm font-bold ${msg.ok ? "text-tide" : "text-coral"}`}
                    >
                      {msg.text}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Önizleme çubuğu: tema tüm uygulamada denenirken ekranın altında durur */}
      <AnimatePresence>
        {previewTheme && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            role="region"
            aria-label="Tema önizlemesi"
            className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[80] mx-auto flex max-w-md flex-wrap items-center gap-x-3 gap-y-2 rounded-[22px] bg-card p-3 pl-4 text-ink shadow-[0_12px_40px_rgba(0,0,0,.4)] ring-1 ring-ink/15 lg:bottom-6 lg:left-[calc(264px+1.5rem)] lg:mx-0"
          >
            <span className="min-w-0 flex-1 text-sm leading-tight">
              <b className="block font-display text-base">{previewTheme.name}</b>
              <span className="opacity-70">Önizleme · kaydedilmedi</span>
            </span>
            {owned.has(previewTheme.itemId) ? (
              <button type="button" onClick={() => apply(previewTheme)} className="rounded-full bg-sea px-4 py-2 text-sm font-extrabold text-white">
                Uygula
              </button>
            ) : status === "ready" && coins >= previewTheme.price ? (
              <button
                type="button"
                disabled={busyId === previewTheme.id}
                onClick={() => void purchase(previewTheme)}
                className="inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
              >
                <Coin size={16} /> {previewTheme.price} ile al
              </button>
            ) : null}
            <button type="button" onClick={stopPreview} className="rounded-full px-3 py-2 text-sm font-bold opacity-80">
              Kapat
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
