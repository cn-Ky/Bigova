"use client";
import type { PageRenderer } from "@/lib/pdfBook";
import {
  faChevronLeft,
  faChevronRight,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

const LEVELS = [1, 1.6, 2.4, 3.6];

type Props = {
  renderer: PageRenderer;
  numPages: number;
  aspect: number;
  startPage: number;
  title: string;
  onClose: (page: number) => void;
};

/** Tek sayfayı yüksek çözünürlükte, kaydırılabilir ve yakınlaştırılabilir biçimde gösterir. */
export default function ZoomView({ renderer, numPages, aspect, startPage, title, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState(startPage);
  const [level, setLevel] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const ownedUrl = useRef<string | null>(null);

  // Görünüm alanı ölçüsü
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Odak yönetimi + sayfa kaydırmayı kilitle
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  // Sayfa sığdırma genişliği (CSS px): sayfanın tamamı görünür
  const fitW = size.w && size.h ? Math.max(120, Math.min(size.w - 24, (size.h - 24) * aspect)) : 0;
  const cssW = fitW * LEVELS[level];

  // Seçilen yakınlaştırma için yüksek çözünürlüklü görseli çiz
  useEffect(() => {
    if (!cssW) return;
    let cancelled = false;
    setBusy(true);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const timer = window.setTimeout(() => {
      void renderer.renderOnce(page, cssW * dpr, (cssW / aspect) * dpr).then((fresh) => {
        if (cancelled) {
          if (fresh) URL.revokeObjectURL(fresh);
          return;
        }
        if (fresh) {
          const old = ownedUrl.current;
          ownedUrl.current = fresh;
          setUrl(fresh);
          if (old) window.setTimeout(() => URL.revokeObjectURL(old), 400);
        }
        setBusy(false);
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [renderer, page, cssW, aspect]);

  useEffect(
    () => () => {
      if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    },
    [],
  );

  const go = useCallback(
    (delta: number) => {
      setPage((current) => {
        const target = Math.min(Math.max(current + delta, 1), numPages);
        if (target !== current) {
          setBusy(true);
          scrollRef.current?.scrollTo({ left: 0, top: 0 });
        }
        return target;
      });
    },
    [numPages],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(page);
      else if (event.key === "ArrowRight" || event.key === "PageDown") go(1);
      else if (event.key === "ArrowLeft" || event.key === "PageUp") go(-1);
      else if (event.key === "+" || event.key === "=") setLevel((l) => Math.min(l + 1, LEVELS.length - 1));
      else if (event.key === "-") setLevel((l) => Math.max(l - 1, 0));
      else if (event.key === "Tab") {
        // Odağı iletişim kutusunun içinde tut
        const focusable = scrollRef.current?.parentElement?.querySelectorAll<HTMLElement>("button");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          last.focus();
          event.preventDefault();
        } else if (!event.shiftKey && document.activeElement === last) {
          first.focus();
          event.preventDefault();
        }
        return;
      } else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, page]);

  // Fare ile sürükleyerek gezinme (dokunmatikte yerel kaydırma kullanılır)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const shown = url ?? renderer.peek(page);

  const round =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-95 disabled:opacity-35";

  return createPortal(
    <div className="fb-zoom" role="dialog" aria-modal="true" aria-label={`${title} · sayfa ${page} yakınlaştırma`}>
      <div className="fb-zoom-top">
        <button ref={closeRef} type="button" onClick={() => onClose(page)} aria-label="Yakınlaştırmayı kapat" className={round}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-bold text-white">
          {title} · {page}/{numPages}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setLevel((l) => Math.max(l - 1, 0))}
            disabled={level === 0}
            aria-label="Uzaklaştır"
            className={round}
          >
            <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
          </button>
          <button
            type="button"
            onClick={() => setLevel((l) => Math.min(l + 1, LEVELS.length - 1))}
            disabled={level === LEVELS.length - 1}
            aria-label="Yakınlaştır"
            className={round}
          >
            <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="fb-zoom-scroll"
        onPointerDown={(event) => {
          const el = scrollRef.current;
          if (!el || event.pointerType !== "mouse" || level === 0) return;
          drag.current = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop };
          el.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const el = scrollRef.current;
          if (!el || !drag.current) return;
          el.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
          el.scrollTop = drag.current.top - (event.clientY - drag.current.y);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={() => setLevel((l) => (l === 0 ? 2 : 0))}
        data-grab={level > 0 ? "1" : "0"}
      >
        {cssW > 0 && (
          <div className="fb-zoom-sheet" style={{ width: cssW, minHeight: cssW / aspect }}>
            {shown && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt={`${title}, sayfa ${page}`} draggable={false} style={{ width: "100%", display: "block" }} />
            )}
            {busy && <span className="fb-zoom-busy" aria-hidden />}
          </div>
        )}
      </div>

      <div className="fb-zoom-nav">
        <button type="button" onClick={() => go(-1)} disabled={page <= 1} aria-label="Önceki sayfa" className={round}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <span className="text-xs font-bold text-white/70">{Math.round(LEVELS[level] * 100)}%</span>
        <button type="button" onClick={() => go(1)} disabled={page >= numPages} aria-label="Sonraki sayfa" className={round}>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
