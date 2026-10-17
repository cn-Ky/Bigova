"use client";
import { CLICK_SOUND_ENABLED_KEY } from "@/lib/clickSound";
import { BOOK_SOUND_KEY, playPageTurn } from "@/lib/pageTurnSound";
import type { PageRenderer } from "@/lib/pdfBook";
import {
  faArrowUpRightFromSquare,
  faChevronLeft,
  faChevronRight,
  faCompress,
  faExpand,
  faMagnifyingGlassPlus,
  faVolumeHigh,
  faVolumeXmark,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { PageFlip } from "page-flip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./flipbook.css";
import ZoomView from "./ZoomView";

type Layout = { spread: boolean; pageW: number; pageH: number };

const PAD = 14; // sahne iç boşluğu (gölgeler için)
/** portrait modunu zorlamak için: blok genişliği < 2 × minWidth olduğunda kütüphane tek sayfa moduna geçer */
const FORCE_SINGLE = 1_000_000;
const SPREAD_MIN_W = 40;

function computeLayout(box: { w: number; h: number }, aspect: number, pages: number): Layout | null {
  const availW = box.w - PAD * 2;
  const availH = box.h - PAD * 2 - 6;
  if (availW < 80 || availH < 80) return null;

  const singleH = Math.min(availH, availW / aspect);
  const singleW = singleH * aspect;
  const spreadH = Math.min(availH, availW / (2 * aspect));
  const spreadW = spreadH * aspect;
  // Çift sayfa: dikey sayfalı belge, yeterince geniş alan ve sayfalar tek sayfa moduna göre çok küçülmüyorsa
  const spread = pages > 2 && aspect <= 1 && spreadW >= 240 && spreadW >= singleW * 0.66;
  const pageH = Math.floor(spread ? spreadH : singleH);
  const pageW = Math.floor(pageH * aspect);
  return { spread, pageW, pageH };
}

/** 0 tabanlı kitap dizininden görünen sayfalar (1 tabanlı) */
function visibleOf(index: number, spread: boolean, total: number): number[] {
  if (!spread) return [index + 1];
  if (index === 0) return [1];
  const left = index + 1;
  return left + 1 <= total ? [left, left + 1] : [left];
}

function makePage(n: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "fb-page";
  el.innerHTML =
    '<div class="fb-paper">' +
    '<img class="fb-img" alt="" draggable="false" decoding="async" />' +
    `<div class="fb-loading"><span class="fb-spin"></span><span class="fb-num">${n}</span></div>` +
    '</div><div class="fb-gloss"></div>';
  return el;
}

function setPageImage(el: HTMLElement, url: string) {
  const img = el.querySelector("img");
  if (!img || img.dataset.src === url) return;
  img.dataset.src = url;
  img.onload = () => el.classList.add("is-loaded");
  img.src = url;
}

function clearPageImage(el: HTMLElement) {
  const img = el.querySelector("img");
  if (!img) return;
  delete img.dataset.src;
  img.removeAttribute("src");
  el.classList.remove("is-loaded");
}

type Props = {
  title: string;
  originalUrl: string;
  renderer: PageRenderer;
  numPages: number;
  aspect: number;
  index: number;
  onIndex: (index: number) => void;
  immersive: boolean;
  onToggleImmersive: () => void;
};

export default function BookReader({
  title,
  originalUrl,
  renderer,
  numPages,
  aspect,
  index,
  onIndex,
  immersive,
  onToggleImmersive,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const pagesRef = useRef<HTMLElement[]>([]);
  const indexRef = useRef(index);
  const onIndexRef = useRef(onIndex);
  onIndexRef.current = onIndex;

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [dpr, setDpr] = useState(1);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(true);
  const [zoomPage, setZoomPage] = useState<number | null>(null);
  const [zoomInit, setZoomInit] = useState(1);
  const visibleRef = useRef<number[]>([1]);
  const [announce, setAnnounce] = useState("");

  // ───────── ölçü ve yerleşim ─────────
  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio || 1, 2));
    try {
      const off =
        localStorage.getItem(BOOK_SOUND_KEY) === "off" ||
        localStorage.getItem(CLICK_SOUND_ENABLED_KEY) === "false";
      setSound(!off);
      soundRef.current = !off;
    } catch {}
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let timer: number | undefined;
    let first = true;
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    const observer = new ResizeObserver(() => {
      if (first) {
        first = false;
        read();
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(read, 120);
    });
    observer.observe(el);
    read();
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const layout = useMemo(() => computeLayout(box, aspect, numPages), [box, aspect, numPages]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const ready = layout !== null;
  const cellW = layout ? Math.ceil(layout.pageW * dpr) : 0;
  const cellH = layout ? Math.ceil(layout.pageH * dpr) : 0;
  const cellRef = useRef({ w: 0, h: 0 });
  cellRef.current = { w: cellW, h: cellH };

  // ───────── sayfa görsellerini sırayla hazırla ─────────
  const ensure = useCallback(
    (center: number) => {
      const pages = pagesRef.current;
      const { w, h } = cellRef.current;
      if (!pages.length || !w) return;
      const first = center + 1;
      const wanted: number[] = [];
      for (let p = Math.max(1, first - 4); p <= Math.min(numPages, first + 7); p++) wanted.push(p);
      // Önce görünenler, sonra ileri yönde yakınlar, en son geriler
      wanted.sort((a, b) => (a >= first ? a - first : (first - a) * 1.5) - (b >= first ? b - first : (first - b) * 1.5));
      renderer.setWanted(wanted);
      const keep = new Set(wanted);
      for (const dropped of renderer.evict(keep)) {
        const el = pages[dropped - 1];
        if (el) clearPageImage(el);
      }
      for (const [position, p] of [...wanted].reverse().entries()) {
        const urgent = position >= wanted.length - 2; // görünen sayfalar kuyrukta öne geçer
        const el = pages[p - 1];
        if (!el) continue;
        const cached = renderer.get(p, w, h);
        if (cached) {
          setPageImage(el, cached);
          continue;
        }
        void renderer.request(p, w, h, urgent).then((url) => {
          if (url) setPageImage(el, url);
        });
      }
    },
    [renderer, numPages],
  );
  const ensureRef = useRef(ensure);
  ensureRef.current = ensure;

  // ───────── kitabı kur (belge başına bir kez) ─────────
  useEffect(() => {
    const host = hostRef.current;
    const initial = layoutRef.current;
    if (!host || !initial) return;

    const el = document.createElement("div");
    el.className = "fb-flip";
    host.appendChild(el);
    const pages = Array.from({ length: numPages }, (_, i) => makePage(i + 1));
    pagesRef.current = pages;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let flip: PageFlip | null = null;
    if (numPages > 1) {
      flip = new PageFlip(el, {
        width: initial.pageW,
        height: initial.pageH,
        size: "stretch",
        // Gerçek eşikler aşağıda çalışma anında ayarlanır; burada blok minimum genişliği küçük kalmalı
        minWidth: SPREAD_MIN_W,
        maxWidth: 5000,
        minHeight: 40,
        maxHeight: 5000,
        startPage: Math.min(Math.max(indexRef.current, 0), numPages - 1),
        showCover: true,
        usePortrait: true,
        drawShadow: true,
        maxShadowOpacity: 0.5,
        flippingTime: reduce ? 240 : 900,
        showPageCorners: !reduce,
        mobileScrollSupport: true,
        swipeDistance: 24,
        autoSize: true,
        clickEventForward: true,
        useMouseEvents: true,
        startZIndex: 0,
        disableFlipByClick: false,
      });
      flip.loadFromHTML(pages);
      flip.getSettings().minWidth = initial.spread ? SPREAD_MIN_W : FORCE_SINGLE;
      flip.update();
      flip.on("flip", (event) => {
        indexRef.current = event.data;
        onIndexRef.current(event.data);
        ensureRef.current(event.data);
      });
      flip.on("changeState", (event) => {
        if ((event.data === "flipping" || event.data === "user_fold") && soundRef.current) playPageTurn();
      });
    } else {
      el.classList.add("fb-static");
      el.appendChild(pages[0]);
    }
    flipRef.current = flip;
    ensureRef.current(indexRef.current);

    return () => {
      if (flip) {
        // Kütüphanenin requestAnimationFrame döngüsü durdurulamaz; yok edilen kitap için boşa çıkar.
        flip.getRender().render = () => {};
        flip.destroy();
      } else el.remove();
      flipRef.current = null;
      pagesRef.current = [];
    };
  }, [ready, numPages, renderer]);

  // Boyut / tek-çift sayfa modu değişince kitabı yeniden kurmadan güncelle
  useEffect(() => {
    const flip = flipRef.current;
    if (!flip || !layout) return;
    flip.getSettings().minWidth = layout.spread ? SPREAD_MIN_W : FORCE_SINGLE;
    flip.update();
  }, [layout]);

  // Çözünürlük değişince (yeniden boyutlandırma) görselleri tazele
  useEffect(() => {
    if (!cellW) return;
    const timer = window.setTimeout(() => ensureRef.current(indexRef.current), 140);
    return () => window.clearTimeout(timer);
  }, [cellW, cellH]);

  // ───────── görünen sayfalar, etiket ─────────
  const spread = layout?.spread ?? false;
  const visible = visibleOf(index, spread, numPages);
  const label =
    visible.length === 2 ? `Sayfa ${visible[0]}–${visible[1]} / ${numPages}` : `Sayfa ${visible[0]} / ${numPages}`;
  const atStart = index <= 0;
  const atEnd = visible.includes(numPages);
  const openState = !spread
    ? "single"
    : index === 0
      ? "cover"
      : numPages % 2 === 0 && index === numPages - 1
        ? "back"
        : "spread";

  useEffect(() => {
    setAnnounce(label);
  }, [label]);
  visibleRef.current = visible;

  const openZoom = useCallback((x: number | null, scale = 1) => {
    // Çift sayfada imlecin / parmakların olduğu yarıdaki sayfa açılır
    const list = visibleRef.current;
    const stage = stageRef.current;
    let target = list[0];
    if (x !== null && list.length === 2 && stage) {
      const rect = stage.getBoundingClientRect();
      const book = stage.querySelector(".fb-book")?.getBoundingClientRect();
      const mid = book ? book.left + book.width / 2 : rect.left + rect.width / 2;
      if (x > mid) target = list[1];
    }
    setZoomInit(scale);
    setZoomPage(target);
  }, []);

  // Kitap üzerinde iki parmakla sıkıştırma ya da Ctrl+tekerlek (dokunmatik yüzey sıkıştırması) → yakınlaştırma görünümü
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      openZoom((event.touches[0].clientX + event.touches[1].clientX) / 2, 1.8);
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      openZoom(event.clientX, 1.8);
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("wheel", onWheel);
    };
  }, [openZoom, ready]);

  const next = useCallback(() => flipRef.current?.flipNext(), []);
  const prev = useCallback(() => flipRef.current?.flipPrev(), []);
  const jump = useCallback(
    (pageIndex: number) => {
      const target = Math.min(Math.max(pageIndex, 0), numPages - 1);
      flipRef.current?.turnToPage(target);
      if (numPages === 1) return;
      indexRef.current = flipRef.current?.getCurrentPageIndex() ?? target;
      onIndexRef.current(indexRef.current);
      ensureRef.current(indexRef.current);
    },
    [numPages],
  );

  // ───────── klavye ─────────
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (zoomPage !== null || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      switch (event.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          prev();
          break;
        case "Home":
          jump(0);
          break;
        case "End":
          jump(numPages - 1);
          break;
        case "z":
        case "Z":
          openZoom(null);
          break;
        case "f":
        case "F":
          onToggleImmersive();
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomPage, next, prev, jump, numPages, onToggleImmersive, openZoom]);

  function toggleSound() {
    const value = !sound;
    setSound(value);
    soundRef.current = value;
    try {
      localStorage.setItem(BOOK_SOUND_KEY, value ? "on" : "off");
    } catch {}
    if (value) playPageTurn();
  }

  const bookW = layout ? (layout.spread ? layout.pageW * 2 : layout.pageW) : 0;
  const shift =
    layout && openState === "cover"
      ? -layout.pageW / 2
      : layout && openState === "back"
        ? layout.pageW / 2
        : 0;
  const btn =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sea text-white transition active:scale-95 disabled:opacity-35 disabled:active:scale-100";
  const tool =
    "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tide/20 text-ink transition hover:bg-tide/30 active:scale-95";

  return (
    <div className="fb-root">
      {immersive && (
        <div className="fb-titlebar">
          <h2 className="min-w-0 flex-1 truncate font-display text-base font-extrabold">{title}</h2>
          <button type="button" onClick={onToggleImmersive} aria-label="Tam ekrandan çık" className={tool}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      <div ref={stageRef} className="fb-stage">
        {layout && (
          <div className="fb-intro">
            <div
              className="fb-book"
              data-open={openState}
              style={{ width: bookW, height: layout.pageH, transform: `translateX(${shift}px)` }}
            >
              <div className="fb-stack fb-stack-l" />
              <div className="fb-stack fb-stack-r" />
              <div ref={hostRef} className="fb-host" />
            </div>
          </div>
        )}

        {numPages > 1 && layout && (
          <>
            <button
              type="button"
              onClick={prev}
              disabled={atStart}
              aria-label="Önceki sayfa"
              className="fb-edge fb-edge-prev"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <button type="button" onClick={next} disabled={atEnd} aria-label="Sonraki sayfa" className="fb-edge fb-edge-next">
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </>
        )}
      </div>

      <div className="fb-bar">
        <div className="flex items-center gap-2">
          <button type="button" onClick={prev} disabled={atStart} aria-label="Önceki sayfa" className={btn}>
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <input
            type="range"
            className="fb-range"
            min={1}
            max={Math.max(numPages, 2)}
            value={visible[0]}
            disabled={numPages < 2}
            aria-label="Sayfa seç"
            aria-valuetext={label}
            onChange={(event) => jump(Number(event.target.value) - 1)}
          />
          <button type="button" onClick={next} disabled={atEnd} aria-label="Sonraki sayfa" className={btn}>
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-sm font-bold tabular-nums text-ink/80">{label}</p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openZoom(null)}
              aria-label="Sayfayı yakınlaştır"
              title="Yakınlaştır (Z) · kitapta iki parmakla sıkıştırabilirsin"
              className={tool}
            >
              <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
            </button>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={sound}
              aria-label={sound ? "Sayfa sesini kapat" : "Sayfa sesini aç"}
              title="Sayfa sesi"
              className={tool}
            >
              <FontAwesomeIcon icon={sound ? faVolumeHigh : faVolumeXmark} />
            </button>
            <button
              type="button"
              onClick={onToggleImmersive}
              aria-pressed={immersive}
              aria-label={immersive ? "Tam ekrandan çık" : "Tam ekran"}
              title="Tam ekran (F)"
              className={tool}
            >
              <FontAwesomeIcon icon={immersive ? faCompress : faExpand} />
            </button>
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Orijinal PDF'i yeni sekmede aç"
              title="Orijinal PDF"
              className={tool}
            >
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </a>
          </div>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {zoomPage !== null && (
        <ZoomView
          renderer={renderer}
          numPages={numPages}
          aspect={aspect}
          startPage={zoomPage}
          initialScale={zoomInit}
          title={title}
          onClose={(page) => {
            setZoomPage(null);
            jump(page - 1);
          }}
        />
      )}
    </div>
  );
}
