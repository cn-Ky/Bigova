/**
 * pdf.js'i kendi alan adımızdan (public/pdfjs) yükler.
 * Neden betik etiketi: paketleyiciye (webpack) pdf.js'in Node'a özel `canvas` bağımlılığını çözdürmek gerekmez,
 * ana paket küçük kalır ve sıkı CSP (script-src 'self', worker-src 'self') aynen geçerli olur.
 */
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

export type PdfJs = {
  getDocument: (src: Record<string, unknown>) => {
    promise: Promise<PDFDocumentProxy>;
    destroy: () => Promise<void>;
  };
  GlobalWorkerOptions: { workerSrc: string };
};

export const PDFJS_BASE = "/pdfjs";
let loading: Promise<PdfJs> | null = null;

export function loadPdfJs(): Promise<PdfJs> {
  if (loading) return loading;
  loading = new Promise<PdfJs>((resolve, reject) => {
    const w = window as unknown as Record<string, PdfJs | undefined>;
    const ready = () => w["pdfjs-dist/build/pdf"] ?? w.pdfjsLib;
    const existing = ready();
    if (existing) return resolve(existing);
    const script = document.createElement("script");
    script.src = `${PDFJS_BASE}/pdf.min.js`;
    script.async = true;
    script.onload = () => {
      const lib = ready();
      if (!lib) return reject(new Error("pdf.js yüklenemedi"));
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.js`;
      resolve(lib);
    };
    script.onerror = () => reject(new Error("pdf.js yüklenemedi"));
    document.head.appendChild(script);
  }).catch((error) => {
    loading = null; // yeniden denemeye izin ver
    throw error;
  });
  return loading;
}
