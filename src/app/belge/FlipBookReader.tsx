"use client";
import { openPdf, PageRenderer, PdfOpenError, type OpenedPdf } from "@/lib/pdfBook";
import { takePendingPdfUrl } from "@/lib/pdfReader";
import { faArrowUpRightFromSquare, faBookOpen, faRotate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BookReader from "./BookReader";
import "./flipbook.css";

type LoadState =
  | { status: "loading"; loaded: number; total: number | null }
  | { status: "error"; message: string }
  | { status: "ready"; doc: OpenedPdf };

/** Son okunan sayfa için anahtar: imzalı bağlantılarda her seferinde değişen sorgu parametreleri atılır. */
function docKey(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    const src = parsed.searchParams.get("src");
    return `bigova-book-page:${src ?? parsed.origin + parsed.pathname}`.slice(0, 300);
  } catch {
    return `bigova-book-page:${url.slice(0, 200)}`;
  }
}

function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}

export default function FlipBookReader({
  initialUrl,
  title,
}: {
  initialUrl: string | null;
  title: string;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [checked, setChecked] = useState(!!initialUrl);
  const pendingTaken = useRef(false);

  // /belge?title=... ile açılan (adres çubuğunda url olmayan) imzalı bağlantılar sessionStorage'dan alınır.
  // React Strict Mode efekti iki kez çalıştırır; ikinci çağrı bağlantıyı boşa çıkarmasın diye bir kez okunur.
  useEffect(() => {
    if (initialUrl || pendingTaken.current) return;
    pendingTaken.current = true;
    const taken = takePendingPdfUrl();
    if (taken) setUrl(taken);
    setChecked(true);
  }, [initialUrl]);

  const [state, setState] = useState<LoadState>({ status: "loading", loaded: 0, total: null });
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [resumed, setResumed] = useState<number | null>(null);
  const [immersive, setImmersive] = useState(false);

  // PDF'i indir ve aç
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let opened: OpenedPdf | null = null;
    setState({ status: "loading", loaded: 0, total: null });
    openPdf(
      url,
      (loaded, total) => setState({ status: "loading", loaded, total }),
      controller.signal,
    )
      .then((doc) => {
        if (controller.signal.aborted) {
          void doc.pdf.destroy();
          return;
        }
        opened = doc;
        let start = 0;
        try {
          const saved = Number(localStorage.getItem(docKey(url)));
          if (Number.isInteger(saved) && saved > 0 && saved < doc.numPages - 1) start = saved;
        } catch {}
        setIndex(start);
        setResumed(start > 0 ? start : null);
        setState({ status: "ready", doc });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof PdfOpenError
            ? error.kind === "format"
              ? error.message
              : "Belge şu anda açılamıyor. Bağlantınızı kontrol edip yeniden deneyin."
            : "Belge açılamadı.";
        setState({ status: "error", message });
      });
    return () => controller.abort();
  }, [url, attempt]);

  const doc = state.status === "ready" ? state.doc : null;
  const renderer = useMemo(() => (doc ? new PageRenderer(doc.pdf) : null), [doc]);
  useEffect(() => () => renderer?.destroy(), [renderer]);

  // Kaldığın yeri hatırla
  const onIndex = useCallback(
    (value: number) => {
      setIndex(value);
      if (!url) return;
      try {
        localStorage.setItem(docKey(url), String(value));
      } catch {}
    },
    [url],
  );

  // "Kaldığın yerden devam" bilgisi birkaç saniye sonra kaybolur
  useEffect(() => {
    if (resumed === null) return;
    const timer = window.setTimeout(() => setResumed(null), 4000);
    return () => window.clearTimeout(timer);
  }, [resumed]);

  // Tam ekran: tarayıcı tam ekranı varsa onu da kullan; yoksa (iOS) sayfayı kaplayan örtü yeterli
  const toggleImmersive = useCallback(() => {
    const next = !immersive;
    setImmersive(next);
    try {
      if (next) void document.documentElement.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    } catch {}
  }, [immersive]);

  useEffect(() => {
    if (!immersive) return;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setImmersive(false); // kullanıcı Esc ile çıktı
    };
    const onKey = (event: KeyboardEvent) => {
      // Yakınlaştırma açıkken Esc yalnızca onu kapatır
      if (event.key === "Escape" && !document.querySelector(".fb-zoom")) setImmersive(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = overflow;
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [immersive]);

  if (checked && !url)
    return (
      <div className="grid min-h-[70dvh] flex-1 place-items-center rounded-xl bg-card px-6 text-center text-sm text-ink/70">
        Belge açılamadı. Geri dönüp yeniden deneyin.
      </div>
    );

  if (state.status === "error")
    return (
      <div className="fb-state" role="alert">
        <FontAwesomeIcon icon={faBookOpen} className="text-3xl text-ink/40" />
        <p className="max-w-xs font-bold">{state.message}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2.5 text-sm font-bold text-white"
          >
            <FontAwesomeIcon icon={faRotate} /> Yeniden dene
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-tide/20 px-4 py-2.5 text-sm font-bold text-ink"
            >
              PDF olarak aç <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </a>
          )}
        </div>
      </div>
    );

  if (state.status === "loading" || !doc || !renderer || !url) {
    const loaded = state.status === "loading" ? state.loaded : 0;
    const total = state.status === "loading" ? state.total : null;
    const percent = total ? Math.min(100, Math.round((loaded / total) * 100)) : null;
    return (
      <div className="fb-state" role="status" aria-live="polite">
        <div className="fb-closed-book" aria-hidden>
          <span />
        </div>
        <p className="font-display text-lg font-extrabold">Kitap hazırlanıyor…</p>
        <div className="fb-progress" aria-hidden>
          <i style={percent === null ? undefined : { width: `${percent}%` }} data-indeterminate={percent === null ? "1" : "0"} />
        </div>
        <p className="text-xs text-ink/60">
          {percent !== null ? `%${percent} · ${formatMb(loaded)}` : loaded > 0 ? formatMb(loaded) : "Dosya indiriliyor"}
        </p>
      </div>
    );
  }

  const reader = (
    <div className={immersive ? "fb-immersive" : "fb-inline"}>
      <BookReader
        key={immersive ? "immersive" : "inline"}
        title={title}
        originalUrl={url}
        renderer={renderer}
        numPages={doc.numPages}
        aspect={doc.aspect}
        index={index}
        onIndex={onIndex}
        immersive={immersive}
        onToggleImmersive={toggleImmersive}
      />
      {resumed !== null && (
        <p className="fb-toast" role="status">
          Sayfa {resumed + 1}’den devam ediyorsun
        </p>
      )}
    </div>
  );

  // Tam ekranda okuyucu <body>'ye taşınır: sayfa kabuğunun (.shell) yerleşimi ve alt menü üstünü örtmez.
  return immersive ? createPortal(reader, document.body) : reader;
}
