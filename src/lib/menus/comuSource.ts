import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { COMU_CAMPUS, norm, type MenuVariant } from "./types";
import { parseComuPages, type ParseResult, type TextItem } from "./comuParser";

/**
 * ÇOMÜ SKS Daire Başkanlığı "Yemek Listesi" sayfası aylık PDF'leri (normal + vegan) "Ekler" bölümünde yayınlar.
 * Bağlantı adları her ay değişir (örn. 74551_ekim-2026-yemek-menusu.pdf), bu yüzden sabit adres kullanılmaz;
 * sayfa taranıp PDF bağlantıları bulunur. Ay/yıl ve vegan/normal ayrımı PDF'in KENDİ başlığından okunur.
 */

const UA = `BigovaMenuBot/1.0 (${process.env.NEWS_BOT_CONTACT ?? "iletisim: Bigova"})`;
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const ALLOWED_HOST = /(^|\.)comu\.edu\.tr$/i;

export type PdfLink = { url: string; label: string };

async function get(url: string, accept: string, timeout = 15_000): Promise<Response> {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: accept }, cache: "no-store", signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error(`${new URL(url).hostname} → HTTP ${r.status}`);
  return r;
}

/** Sayfadaki yemek menüsü PDF bağlantıları (başlığı "YEMEK MENÜSÜ" içerenler). */
export function findMenuPdfLinks(html: string, base = COMU_CAMPUS.pageUrl): PdfLink[] {
  const $ = cheerio.load(html);
  const out: PdfLink[] = [];
  const seen = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    let url: string;
    try {
      url = new URL(href, base).toString();
    } catch {
      return;
    }
    if (!/\.pdf(\?|#|$)/i.test(url) || !ALLOWED_HOST.test(new URL(url).hostname) || seen.has(url)) return;
    // Bağlantı metni "İndir" olabilir; başlık genellikle aynı bloktaki önceki kardeş/üst öğede durur.
    const ctx = `${$(el).text()} ${$(el).parent().text()} ${$(el).closest("li,tr,div,p").text()} ${decodeURIComponent(url)}`;
    if (!/yemek\s*men/i.test(norm(ctx).replace(/\s+/g, " ")) && !/yemek/i.test(norm(url))) return;
    seen.add(url);
    out.push({ url, label: ctx.replace(/\s+/g, " ").trim().slice(0, 160) });
  });
  return out;
}

export async function listMenuPdfs(): Promise<PdfLink[]> {
  const html = await (await get(COMU_CAMPUS.pageUrl, "text/html")).text();
  return findMenuPdfLinks(html);
}

export async function downloadPdf(url: string): Promise<{ bytes: Uint8Array; hash: string }> {
  if (!ALLOWED_HOST.test(new URL(url).hostname)) throw new Error("PDF yalnızca comu.edu.tr alan adlarından indirilir.");
  const r = await get(url, "application/pdf", 25_000);
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.byteLength > MAX_PDF_BYTES) throw new Error(`PDF çok büyük (${buf.byteLength} bayt).`);
  if (String.fromCharCode(...buf.slice(0, 5)) !== "%PDF-") throw new Error("İndirilen dosya PDF değil.");
  return { bytes: buf, hash: createHash("sha256").update(buf).digest("hex") };
}

/** PDF → sayfa başına konumlu metin parçaları (x, y: PDF koordinatı; y yukarı doğru artar). */
export async function extractTextItems(bytes: Uint8Array): Promise<TextItem[][]> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const pages: TextItem[][] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const items: TextItem[] = [];
    for (const it of tc.items as { str?: string; transform?: number[]; width?: number }[]) {
      if (typeof it.str !== "string" || !it.transform) continue;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width ?? 0 });
    }
    pages.push(items);
  }
  return pages;
}

export async function parsePdfBytes(bytes: Uint8Array, hint?: { variant?: MenuVariant }): Promise<ParseResult> {
  return parseComuPages(await extractTextItems(bytes), hint);
}
