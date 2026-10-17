/**
 * Kitap okuyucusunun PDF katmanı: dosyayı indirir (ilerleme bildirir), pdf.js ile açar ve sayfaları
 * görsele (blob URL) çevirir. Arayüzden bağımsızdır; React burada kullanılmaz.
 */
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { loadPdfJs, PDFJS_BASE } from "./pdfjsLoader";

const MAX_BYTES = 80 * 1024 * 1024; // /api/pdf zaten 60 MB ile sınırlı; Supabase dosyaları için ek güvenlik
const MAX_SIDE_PX = 2600; // tek bir sayfa görselinin en uzun kenarı (bellek koruması)
const CONCURRENCY = 2;

export type OpenedPdf = {
  pdf: PDFDocumentProxy;
  numPages: number;
  /** İlk sayfanın genişlik / yükseklik oranı (kitabın sayfa oranı) */
  aspect: number;
};

export class PdfOpenError extends Error {
  constructor(
    message: string,
    readonly kind: "network" | "format" | "aborted",
  ) {
    super(message);
  }
}

async function fetchBytes(
  url: string,
  onProgress: (loaded: number, total: number | null) => void,
  signal: AbortSignal,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(url, { signal, credentials: "same-origin" });
  } catch (error) {
    if (signal.aborted) throw new PdfOpenError("İptal edildi", "aborted");
    throw new PdfOpenError("Dosyaya ulaşılamadı", "network");
  }
  if (!response.ok) throw new PdfOpenError(`Dosya alınamadı (${response.status})`, "network");

  const declared = Number(response.headers.get("content-length")) || 0;
  if (declared > MAX_BYTES) throw new PdfOpenError("Dosya çok büyük", "format");
  const total = declared > 0 ? declared : null;

  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    onProgress(buffer.length, buffer.length);
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (loaded > MAX_BYTES) {
        await reader.cancel();
        throw new PdfOpenError("Dosya çok büyük", "format");
      }
      onProgress(loaded, total);
    }
  } catch (error) {
    if (error instanceof PdfOpenError) throw error;
    if (signal.aborted) throw new PdfOpenError("İptal edildi", "aborted");
    throw new PdfOpenError("İndirme yarıda kesildi", "network");
  }

  const data = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  return data;
}

export async function openPdf(
  url: string,
  onProgress: (loaded: number, total: number | null) => void,
  signal: AbortSignal,
): Promise<OpenedPdf> {
  const [lib, data] = await Promise.all([loadPdfJs(), fetchBytes(url, onProgress, signal)]);
  // %PDF- imzası: sunucu hata sayfası (HTML) döndürdüyse anlaşılır hata ver
  const head = String.fromCharCode(...data.subarray(0, 1024));
  if (!head.includes("%PDF-")) throw new PdfOpenError("Dosya bir PDF değil", "format");

  try {
    const pdf = await lib.getDocument({
      data,
      isEvalSupported: false, // CSP: 'unsafe-eval' yok
      standardFontDataUrl: `${PDFJS_BASE}/standard_fonts/`,
    }).promise;
    const first = await pdf.getPage(1);
    const view = first.getViewport({ scale: 1 });
    first.cleanup();
    return { pdf, numPages: pdf.numPages, aspect: view.width / view.height };
  } catch (error) {
    if (signal.aborted) throw new PdfOpenError("İptal edildi", "aborted");
    const name = (error as { name?: string })?.name;
    if (name === "PasswordException") throw new PdfOpenError("Dosya parola korumalı", "format");
    throw new PdfOpenError("PDF okunamadı", "format");
  }
}

type Cached = { url: string; w: number; h: number };

/** Sayfaları önbellekli ve sınırlı eşzamanlılıkla görsele çevirir. */
export class PageRenderer {
  private cache = new Map<number, Cached>();
  private inflight = new Map<number, Promise<string | null>>();
  private wanted = new Set<number>();
  private queue: Array<() => void> = [];
  private running = 0;
  private destroyed = false;

  constructor(private readonly pdf: PDFDocumentProxy) {}

  /** Şu an istenen sayfalar. Kuyrukta bekleyen ama artık istenmeyen işler hiç başlamaz. */
  setWanted(pages: Iterable<number>) {
    this.wanted = new Set(pages);
  }

  /** İstenmeyen (uzaklaşmış) sayfaların görsellerini serbest bırakır; bırakılanların numaralarını döndürür. */
  evict(keep: Set<number>): number[] {
    const dropped: number[] = [];
    for (const [page, entry] of this.cache) {
      if (keep.has(page)) continue;
      URL.revokeObjectURL(entry.url);
      this.cache.delete(page);
      dropped.push(page);
    }
    return dropped;
  }

  /** Çözünürlüğe bakmadan, önbellekte ne varsa döndürür (yakınlaştırmada bulanık ön izleme için). */
  peek(page: number): string | null {
    return this.cache.get(page)?.url ?? null;
  }

  /** Yeterli çözünürlükte hazır görsel varsa döndürür. */
  get(page: number, w: number, h: number): string | null {
    const hit = this.cache.get(page);
    return hit && hit.w >= w * 0.85 && hit.h >= h * 0.85 ? hit.url : null;
  }

  /** Sayfayı (w×h piksellik hücreye sığacak biçimde) çizer ve önbelleğe alır. */
  request(page: number, w: number, h: number, urgent = false): Promise<string | null> {
    const ready = this.get(page, w, h);
    if (ready) return Promise.resolve(ready);
    const pending = this.inflight.get(page);
    if (pending) return pending;
    const job = this.schedule(page, () => this.wanted.has(page), w, h, urgent).then((entry) => {
      if (!entry) return null;
      const old = this.cache.get(page);
      if (old) URL.revokeObjectURL(old.url);
      // Karşılaştırma, çizilen görselin değil istenen hücrenin boyutuna göre yapılır (oranı farklı sayfalar için)
      this.cache.set(page, { url: entry.url, w, h });
      return entry.url;
    });
    this.inflight.set(page, job);
    void job.finally(() => this.inflight.delete(page));
    return job;
  }

  /** Önbelleğe girmeyen tek seferlik çizim (yakınlaştırma görünümü); URL'yi çağıran serbest bırakır. */
  async renderOnce(page: number, w: number, h: number): Promise<string | null> {
    const entry = await this.schedule(page, () => true, w, h, true);
    return entry?.url ?? null;
  }

  private schedule(
    page: number,
    stillWanted: () => boolean,
    w: number,
    h: number,
    urgent = false,
  ): Promise<{ url: string } | null> {
    return new Promise((resolve) => {
      const run = async () => {
        this.running++;
        try {
          resolve(!this.destroyed && stillWanted() ? await this.draw(page, w, h) : null);
        } catch (error) {
          console.warn("[kitap] sayfa çizilemedi:", page, error);
          resolve(null);
        } finally {
          this.running--;
          this.next();
        }
      };
      if (urgent) this.queue.unshift(run);
      else this.queue.push(run);
      this.next();
    });
  }

  private next() {
    while (this.running < CONCURRENCY && this.queue.length) this.queue.shift()?.();
  }

  private async draw(pageNumber: number, w: number, h: number): Promise<{ url: string } | null> {
    const page = await this.pdf.getPage(pageNumber);
    try {
      const base = page.getViewport({ scale: 1 });
      let scale = Math.min(w / base.width, h / base.height);
      const longest = Math.max(base.width, base.height) * scale;
      if (longest > MAX_SIDE_PX) scale *= MAX_SIDE_PX / longest;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return null;
      await page.render({
        canvasContext: context,
        viewport,
        background: "rgb(255,255,255)",
      }).promise;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      const result = blob ? { url: URL.createObjectURL(blob) } : null;
      canvas.width = canvas.height = 0; // bellek hemen boşalsın
      return result;
    } finally {
      page.cleanup();
    }
  }

  destroy() {
    this.destroyed = true;
    this.queue = [];
    for (const entry of this.cache.values()) URL.revokeObjectURL(entry.url);
    this.cache.clear();
    void this.pdf.destroy();
  }
}
