"use client";
import { useImageUrls } from "@/lib/community";
import { faChevronLeft, faChevronRight, faHeart, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { SPRING } from "./ui";

/** Tam ekran fotoğraf görüntüleyici: ok tuşları, Esc ve noktalarla gezinme. */
function Lightbox({ paths, urls, start, onClose }: { paths: string[]; urls: Record<string, string>; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => (x + 1) % paths.length);
      if (e.key === "ArrowLeft") setI((x) => (x - 1 + paths.length) % paths.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paths.length, onClose]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Fotoğraf" className="fixed inset-0 z-[90] grid place-items-center bg-deep/90 p-4 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <motion.button whileTap={{ scale: 0.88 }} type="button" aria-label="Kapat" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white" onClick={onClose}>
        <FontAwesomeIcon icon={faXmark} />
      </motion.button>
      {urls[paths[i]] && (
        // eslint-disable-next-line @next/next/no-img-element
        <motion.img key={i} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING} src={urls[paths[i]]} alt={`Gönderi fotoğrafı ${i + 1} / ${paths.length}`} className="max-h-full max-w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
      )}
      {paths.length > 1 && (
        <div className="absolute bottom-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {paths.map((p, k) => (
            <button key={p} type="button" aria-label={`Fotoğraf ${k + 1}`} onClick={() => setI(k)} className={`h-2.5 w-2.5 rounded-full ${k === i ? "bg-white" : "bg-white/40"}`} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Instagram tarzı fotoğraf galerisi: yatay kaydırmalı, noktalı, "1/3" sayaçlı.
 * Çift dokunma / çift tıklama `onDoubleTap` ile beğeniyi tetikler ve kalp animasyonu gösterir;
 * tek dokunuş fotoğrafı tam ekran açar. Tüm kareler aynı oranda (telefonda 4:5, geniş ekranda 4:3; en çok 34rem yüksekliğinde) kırpılır; tam ekranda kırpılmadan görünür.
 */
export default function Carousel({ paths, onDoubleTap, className = "" }: { paths: string[]; onDoubleTap?: () => void; className?: string }) {
  const urls = useImageUrls(paths);
  const [idx, setIdx] = useState(0);
  const [burst, setBurst] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const scroller = useRef<HTMLUListElement>(null);
  const lastTap = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const raf = useRef(0);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      cancelAnimationFrame(raf.current);
    },
    [],
  );

  const onScroll = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = scroller.current;
      if (el && el.clientWidth) setIdx(Math.round(el.scrollLeft / el.clientWidth));
    });
  };
  const go = useCallback((i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: Math.max(0, Math.min(i, paths.length - 1)) * el.clientWidth, behavior: "smooth" });
  }, [paths.length]);

  const tap = (i: number) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      window.clearTimeout(timer.current);
      lastTap.current = 0;
      setBurst((b) => b + 1);
      onDoubleTap?.();
    } else {
      lastTap.current = now;
      timer.current = window.setTimeout(() => setOpen(i), 300);
    }
  };

  if (!paths.length) return null;
  const many = paths.length > 1;
  return (
    <div className={`group/car relative overflow-hidden bg-foam ${className}`} onClick={(e) => e.stopPropagation()}>
      <ul
        ref={scroller}
        onScroll={onScroll}
        tabIndex={many ? 0 : -1}
        aria-label={many ? "Fotoğraflar, yana kaydır" : undefined}
        onKeyDown={(e) => {
          if (!many) return;
          if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
        }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {paths.map((p, i) => (
          <li key={p} className="w-full shrink-0 snap-center">
            <button type="button" onClick={() => tap(i)} aria-label={`Fotoğraf ${i + 1} / ${paths.length}, büyütmek için dokun, beğenmek için çift dokun`} className="block aspect-[4/5] max-h-[min(72dvh,34rem)] w-full select-none sm:aspect-[4/3]">
              {urls[p] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[p]} alt="Gönderi fotoğrafı" draggable={false} loading={i === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" />
              ) : (
                <span className="shimmer block h-full w-full" />
              )}
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {burst > 0 && (
          <motion.span
            key={burst}
            aria-hidden
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.25, 1, 1.1] }}
            transition={{ duration: 0.8, times: [0, 0.25, 0.7, 1] }}
            className="pointer-events-none absolute inset-0 grid place-items-center text-7xl text-white drop-shadow-[0_4px_16px_rgba(0,0,0,.45)]"
          >
            <FontAwesomeIcon icon={faHeart} />
          </motion.span>
        )}
      </AnimatePresence>

      {many && (
        <>
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-deep/65 px-2.5 py-1 text-[11px] font-extrabold tabular-nums text-white" aria-hidden>
            {idx + 1}/{paths.length}
          </span>
          {idx > 0 && (
            <button type="button" aria-label="Önceki fotoğraf" onClick={() => go(idx - 1)} className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-sm text-ink opacity-0 shadow-md transition-opacity group-hover/car:opacity-100 md:grid">
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
          )}
          {idx < paths.length - 1 && (
            <button type="button" aria-label="Sonraki fotoğraf" onClick={() => go(idx + 1)} className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-sm text-ink opacity-0 shadow-md transition-opacity group-hover/car:opacity-100 md:grid">
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5" aria-hidden>
            {paths.map((p, i) => (
              <span key={p} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/55"} shadow-[0_0_3px_rgba(0,0,0,.4)]`} />
            ))}
          </div>
        </>
      )}

      <AnimatePresence>{open !== null && <Lightbox paths={paths} urls={urls} start={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  );
}
