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
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MIN = 1;
const MAX = 6;
/** Yüksek çözünürlüklü görselin yeniden çizildiği kademeler (yakınlaştırma sürekli, keskinlik kademeli) */
const SHARP_LEVELS = [1, 1.6, 2.6, 4, 6];

type View = { s: number; x: number; y: number };
type Pt = { x: number; y: number };

type Props = {
  renderer: PageRenderer;
  numPages: number;
  aspect: number;
  startPage: number;
  title: string;
  /** Kitaptan sıkıştırma ile açıldıysa başlangıç yakınlaştırması */
  initialScale?: number;
  onClose: (page: number) => void;
};

/**
 * Tek sayfayı serbestçe yakınlaştırıp gezdirme görünümü.
 * - İki parmakla sıkıştır / aç; tek parmak ya da fareyle sürükle
 * - Çift dokun / çift tıkla: yakınlaş ve geri dön
 * - Fare tekerleği ya da dokunmatik yüzey sıkıştırması imlecin olduğu noktaya yakınlaştırır
 * - Yakınlaşmamışken sola/sağa kaydırmak sayfa değiştirir
 */
export default function ZoomView({
  renderer,
  numPages,
  aspect,
  startPage,
  title,
  initialScale = 1,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState(startPage);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });
  const viewNow = useRef(view);
  viewNow.current = view;
  const [sharp, setSharp] = useState<{ page: number; url: string } | null>(null);
  const [busy, setBusy] = useState(true);
  const [hint, setHint] = useState(true);
  const ownedUrl = useRef<string | null>(null);

  // ───────── ölçü ─────────
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fitW = size.w && size.h ? Math.max(120, Math.min(size.w - 16, (size.h - 16) * aspect)) : 0;
  const fitH = fitW / aspect;

  // ───────── odak, kaydırma kilidi, ipucu ─────────
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const timer = window.setTimeout(() => setHint(false), 4000);
    return () => {
      document.documentElement.style.overflow = overflow;
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, []);

  // ───────── görünüm matematiği ─────────
  /** Sayfa görünüm alanından taşmayacak biçimde kaydırmayı sınırlar */
  const clamp = useCallback(
    (v: View): View => {
      const s = Math.min(MAX, Math.max(MIN, v.s));
      const mx = Math.max(0, (fitW * s - size.w) / 2);
      const my = Math.max(0, (fitH * s - size.h) / 2);
      return { s, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
    },
    [fitW, fitH, size],
  );

  /** (px, py) noktası (görünüm alanı koordinatı) yerinde kalacak biçimde ölçeği s2 yapar */
  const zoomAt = useCallback(
    (s2: number, px: number, py: number) => {
      const from = viewNow.current;
      const cx = size.w / 2;
      const cy = size.h / 2;
      const k = Math.min(MAX, Math.max(MIN, s2)) / from.s;
      setView(clamp({ s: from.s * k, x: px - cx - (px - cx - from.x) * k, y: py - cy - (py - cy - from.y) * k }));
    },
    [clamp, size],
  );

  const zoomCenter = useCallback(
    (factor: number) => zoomAt(viewNow.current.s * factor, size.w / 2, size.h / 2),
    [zoomAt, size],
  );
  const reset = useCallback(() => setView({ s: 1, x: 0, y: 0 }), []);

  // Kitaptan sıkıştırma ile açıldıysa başlangıç ölçeği
  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || !fitW) return;
    appliedInitial.current = true;
    if (initialScale > 1) setView(clamp({ s: initialScale, x: 0, y: 0 }));
  }, [fitW, initialScale, clamp]);

  // ───────── sayfa değiştirme ─────────
  const go = useCallback(
    (delta: number) => {
      setPage((current) => Math.min(Math.max(current + delta, 1), numPages));
      setView({ s: 1, x: 0, y: 0 });
    },
    [numPages],
  );

  // ───────── keskin görseli çiz (ölçek kademesi değişince) ─────────
  const level = SHARP_LEVELS.find((l) => l >= view.s) ?? MAX;
  useEffect(() => {
    if (!fitW) return;
    let cancelled = false;
    setBusy(true);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = fitW * level;
    const timer = window.setTimeout(() => {
      void renderer.renderOnce(page, cssW * dpr, (cssW / aspect) * dpr).then((fresh) => {
        if (cancelled) {
          if (fresh) URL.revokeObjectURL(fresh);
          return;
        }
        if (fresh) {
          const old = ownedUrl.current;
          ownedUrl.current = fresh;
          setSharp({ page, url: fresh });
          if (old) window.setTimeout(() => URL.revokeObjectURL(old), 400);
        }
        setBusy(false);
      });
    }, 140);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [renderer, page, level, fitW, aspect]);

  useEffect(
    () => () => {
      if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    },
    [],
  );

  // ───────── fare tekerleği / dokunmatik yüzey sıkıştırması ─────────
  useEffect(() => {
    const el = viewRef.current;
    if (!el || !fitW) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const dy = event.deltaMode === 1 ? event.deltaY * 30 : event.deltaY;
      const dx = event.deltaMode === 1 ? event.deltaX * 30 : event.deltaX;
      if (event.shiftKey && !event.ctrlKey) {
        const cur = viewNow.current;
        setView(clamp({ ...cur, x: cur.x - (dy || dx) }));
        return;
      }
      const factor = Math.exp(-dy * (event.ctrlKey ? 0.01 : 0.0018));
      zoomAt(viewNow.current.s * factor, event.clientX - rect.left, event.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [fitW, clamp, zoomAt]);

  // ───────── işaretçi hareketleri (dokunma + fare) ─────────
  const pointers = useRef(new Map<number, Pt>());
  const base = useRef({
    view: { s: 1, x: 0, y: 0 } as View,
    start: { x: 0, y: 0 } as Pt,
    dist: 1,
    mid: { x: 0, y: 0 } as Pt,
  });
  const gesture = useRef({ moved: false, t0: 0, pinched: false });
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);

  const local = (event: React.PointerEvent): Pt => {
    const rect = viewRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  /** Parmak sayısı değişince başlangıç görünümünü ve noktaları yeniden al */
  const rebase = () => {
    base.current.view = viewNow.current;
    const list = [...pointers.current.values()];
    if (list.length >= 2) {
      const [a, b] = list;
      base.current.dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      base.current.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    } else if (list.length === 1) {
      base.current.start = list[0];
    }
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest("button")) return;
    pointers.current.set(event.pointerId, local(event));
    try {
      viewRef.current?.setPointerCapture(event.pointerId);
    } catch {
      /* etkin olmayan işaretçi: yok say */
    }
    if (pointers.current.size === 1) gesture.current = { moved: false, t0: Date.now(), pinched: false };
    if (pointers.current.size === 2) gesture.current.pinched = true;
    rebase();
    setGrabbing(true);
    setHint(false);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    const p = local(event);
    pointers.current.set(event.pointerId, p);

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const from = base.current.view;
      const s2 = Math.min(MAX, Math.max(MIN, from.s * (dist / base.current.dist)));
      const k = s2 / from.s;
      const cx = size.w / 2;
      const cy = size.h / 2;
      const bm = base.current.mid;
      // Ölçek başlangıç orta noktasına göre uygulanır; kaydırma orta noktanın hareketini izler
      setView(
        clamp({
          s: s2,
          x: mid.x - cx - (bm.x - cx - from.x) * k,
          y: mid.y - cy - (bm.y - cy - from.y) * k,
        }),
      );
      gesture.current.moved = true;
      return;
    }

    const dx = p.x - base.current.start.x;
    const dy = p.y - base.current.start.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) gesture.current.moved = true;
    if (base.current.view.s > 1.001 && gesture.current.moved)
      setView(clamp({ s: base.current.view.s, x: base.current.view.x + dx, y: base.current.view.y + dy }));
  };

  const endPointer = (event: React.PointerEvent, cancelled = false) => {
    const had = pointers.current.get(event.pointerId);
    if (!had) return;
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(event.pointerId);
    try {
      viewRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      /* yok say */
    }
    if (pointers.current.size > 0) {
      rebase(); // sıkıştırma bitti; kalan parmak sürüklemeye devam eder
      return;
    }
    setGrabbing(false);
    if (cancelled || !wasSingle || gesture.current.pinched) return;

    const dx = had.x - base.current.start.x;
    const dy = had.y - base.current.start.y;
    const elapsed = Date.now() - gesture.current.t0;

    if (!gesture.current.moved && elapsed < 350) {
      // Dokunma / tıklama: iki kez art arda yapılırsa yakınlaştırır ya da geri döner
      const now = Date.now();
      const last = lastTap.current;
      if (now - last.t < 340 && Math.hypot(had.x - last.x, had.y - last.y) < 32) {
        lastTap.current = { t: 0, x: 0, y: 0 };
        if (viewNow.current.s > 1.05) reset();
        else zoomAt(2.6, had.x, had.y);
      } else lastTap.current = { t: now, x: had.x, y: had.y };
      return;
    }
    // Yakınlaşmamışken hızlı yatay kaydırma: sayfa değiştir
    if (
      base.current.view.s <= 1.001 &&
      viewNow.current.s <= 1.001 &&
      elapsed < 700 &&
      Math.abs(dx) > 55 &&
      Math.abs(dx) > Math.abs(dy) * 1.4
    )
      go(dx < 0 ? 1 : -1);
  };

  // ───────── klavye ─────────
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const step = 70;
      const cur = viewNow.current;
      const zoomed = cur.s > 1.001;
      if (event.key === "Escape") onClose(page);
      else if (event.key === "+" || event.key === "=") zoomCenter(1.35);
      else if (event.key === "-" || event.key === "_") zoomCenter(1 / 1.35);
      else if (event.key === "0") reset();
      else if (event.key === "ArrowRight") zoomed ? setView(clamp({ ...cur, x: cur.x - step })) : go(1);
      else if (event.key === "ArrowLeft") zoomed ? setView(clamp({ ...cur, x: cur.x + step })) : go(-1);
      else if (event.key === "ArrowUp" && zoomed) setView(clamp({ ...cur, y: cur.y + step }));
      else if (event.key === "ArrowDown" && zoomed) setView(clamp({ ...cur, y: cur.y - step }));
      else if (event.key === "PageDown") go(1);
      else if (event.key === "PageUp") go(-1);
      else if (event.key === "Tab") {
        const focusable = rootRef.current?.querySelectorAll<HTMLElement>("button");
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
  }, [go, onClose, page, zoomCenter, reset, clamp]);

  const shown = sharp?.page === page ? sharp.url : renderer.peek(page);
  const round =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-95 disabled:opacity-35";

  return createPortal(
    <div
      ref={rootRef}
      className="fb-zoom"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} · sayfa ${page} yakınlaştırma`}
    >
      <div className="fb-zoom-top">
        <button ref={closeRef} type="button" onClick={() => onClose(page)} aria-label="Yakınlaştırmayı kapat" className={round}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-bold text-white">
          {title} · {page}/{numPages}
        </p>
        <span className="w-10" aria-hidden />
      </div>

      <div
        ref={viewRef}
        className="fb-zoom-view"
        data-grab={grabbing ? "grabbing" : view.s > 1.001 ? "grab" : "idle"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endPointer(event)}
        onPointerCancel={(event) => endPointer(event, true)}
      >
        {fitW > 0 && (
          <div
            className="fb-zoom-sheet"
            style={{
              width: fitW,
              height: fitH,
              left: (size.w - fitW) / 2,
              top: (size.h - fitH) / 2,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
              transition: grabbing ? "none" : "transform 0.18s ease-out",
            }}
          >
            {shown && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt={`${title}, sayfa ${page}`} draggable={false} />
            )}
          </div>
        )}
        {busy && <span className="fb-zoom-busy" aria-hidden />}
        {hint && (
          <p className="fb-zoom-hint" aria-hidden>
            İki parmakla sıkıştır · sürükle · çift dokun
          </p>
        )}
      </div>

      <div className="fb-zoom-nav">
        <button type="button" onClick={() => go(-1)} disabled={page <= 1} aria-label="Önceki sayfa" className={round}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => zoomCenter(1 / 1.5)}
            disabled={view.s <= MIN + 0.001}
            aria-label="Uzaklaştır"
            className={round}
          >
            <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Sayfayı sığdır"
            title="Sığdır (0)"
            className="min-w-[3.4rem] rounded-full bg-white/15 px-3 py-2 text-xs font-bold tabular-nums text-white"
          >
            {Math.round(view.s * 100)}%
          </button>
          <button
            type="button"
            onClick={() => zoomCenter(1.5)}
            disabled={view.s >= MAX - 0.001}
            aria-label="Yakınlaştır"
            className={round}
          >
            <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
          </button>
        </div>
        <button type="button" onClick={() => go(1)} disabled={page >= numPages} aria-label="Sonraki sayfa" className={round}>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
