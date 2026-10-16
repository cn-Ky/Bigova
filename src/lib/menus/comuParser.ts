import { classifyDish, cleanDishName, norm, sumKcal, weekdayOf, ymd, type DayMenu, type MenuItem, type MenuVariant } from "./types";

/**
 * ÇOMÜ SKS aylık yemek menüsü PDF'i → günlük menüler. SAF fonksiyonlar (ağ yok; test edilebilir).
 *
 * Neden konumsal ayrıştırma? PDF bir takvim ızgarasıdır (hafta satırları × gün sütunları). Düz metin olarak
 * çıkarıldığında komşu hücreler iç içe geçer. Bu yüzden her metin parçasının (x, y) konumu kullanılır:
 *   1) "12.10.2026" gibi tarih başlıkları bulunur; haftanın gününe göre sütun merkezleri belirlenir.
 *   2) "Ezogelin Çorba (230)" gibi her yemek (kcal parantezli), konumuna göre en yakın sütuna ve o sütundaki
 *      uygun tarih başlığına bağlanır.
 *   3) Başlığın hücrenin ÜSTÜNDE mi ALTINDA mı olduğu bilinmediğinden iki strateji de denenir; doğrulaması
 *      (kaç gün ≥3 yemekle doldu) daha iyi olan seçilir.
 *   4) Şablondan kalan eski tarihler (örn. Ekim PDF'inde 31.08 / 01.09) geometriye katılır ama o aya ait
 *      olmadıkları için sonuçtan atılır; böylece altlarındaki hücreler yanlış güne yazılmaz.
 */

export type TextItem = { str: string; x: number; y: number; w: number };

export type ParseResult = {
  year: number;
  month: number; // 1–12
  variant: MenuVariant;
  days: DayMenu[];
  strategy: "above" | "below";
  warnings: string[];
};

const MONTHS = ["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"];

type Ch = { c: string; x: number; brk: boolean };
type Tok =
  | { k: "date"; date: string; y: number; xc: number }
  | { k: "dish"; name: string; kcal: number; y: number; xc: number }
  | { k: "text"; text: string; y: number; xc: number };

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

/** Metin parçalarını satırlara böler ve her satırı karakter-konum dizisine çevirir. */
function toLines(items: TextItem[]): { y: number; chars: Ch[] }[] {
  const list = items.filter((i) => i.str.trim() !== "" || i.str.length > 0).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; its: TextItem[] }[] = [];
  for (const it of list) {
    const ln = lines.find((l) => Math.abs(l.y - it.y) <= 3);
    if (ln) ln.its.push(it);
    else lines.push({ y: it.y, its: [it] });
  }
  return lines.map((l) => {
    const its = l.its.sort((a, b) => a.x - b.x);
    const chars: Ch[] = [];
    let prevEnd = -Infinity;
    let prevCw = 5;
    for (const it of its) {
      const text = it.str.replace(/\u00a0/g, " ");
      if (!text) continue;
      const cw = it.w > 0 ? it.w / text.length : prevCw;
      const gap = it.x - prevEnd;
      // Büyük boşluk = başka hücre. Küçük boşluk = aynı satırdaki sözcükler arası.
      const brk = chars.length > 0 && gap > Math.max(10, 2.2 * prevCw);
      if (chars.length && !brk && gap > prevCw * 0.3 && !/\s$/.test(chars[chars.length - 1].c) && !/^\s/.test(text)) {
        chars.push({ c: " ", x: it.x - cw, brk: false });
      }
      for (let i = 0; i < text.length; i++) chars.push({ c: text[i], x: it.x + i * cw, brk: brk && i === 0 });
      prevEnd = it.x + (it.w > 0 ? it.w : text.length * cw);
      prevCw = cw;
    }
    return { y: l.y, chars };
  });
}

const centerOf = (chars: Ch[], from: number, to: number) => {
  const seg = chars.slice(from, to).filter((c) => c.c.trim() !== "");
  if (!seg.length) return 0;
  const cw = chars.length > 1 ? Math.max(3, (chars[chars.length - 1].x - chars[0].x) / Math.max(1, chars.length - 1)) : 5;
  return (seg[0].x + seg[seg.length - 1].x + cw) / 2;
};

/** Hücreler arası büyük boşlukta bölerek parçaları döndürür. */
function pieces(chars: Ch[], from: number, to: number): { text: string; xc: number }[] {
  const out: { text: string; xc: number }[] = [];
  let start = from;
  for (let i = from + 1; i <= to; i++) {
    if (i === to || chars[i].brk) {
      const text = chars.slice(start, i).map((c) => c.c).join("").replace(/\s+/g, " ").trim();
      if (text) out.push({ text, xc: centerOf(chars, start, i) });
      start = i;
    }
  }
  return out;
}

function tokenize(items: TextItem[]): Tok[] {
  const toks: Tok[] = [];
  for (const ln of toLines(items)) {
    const s = ln.chars.map((c) => c.c).join("");
    const re = /(\d{2}\.\d{2}\.\d{4})|\((\d{1,4})\)/g;
    let pos = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      if (m[1]) {
        for (const p of pieces(ln.chars, pos, m.index)) toks.push({ k: "text", text: p.text, y: ln.y, xc: p.xc });
        const [d, mo, y] = m[1].split(".").map(Number);
        toks.push({ k: "date", date: ymd(y, mo, d), y: ln.y, xc: centerOf(ln.chars, m.index, m.index + m[1].length) });
      } else {
        const ps = pieces(ln.chars, pos, m.index);
        // Parantezden hemen önceki parça yemek adıdır; ondan önceki parçalar (varsa) not adayıdır.
        ps.forEach((p, i) => {
          if (i === ps.length - 1) {
            const name = cleanDishName(p.text);
            if (/[A-Za-zÇĞİÖŞÜçğıöşü]{2}/.test(name)) toks.push({ k: "dish", name, kcal: Number(m![2]), y: ln.y, xc: p.xc });
          } else toks.push({ k: "text", text: p.text, y: ln.y, xc: p.xc });
        });
      }
      pos = m.index + m[0].length;
    }
    for (const p of pieces(ln.chars, pos, ln.chars.length)) toks.push({ k: "text", text: p.text, y: ln.y, xc: p.xc });
  }
  return toks;
}

/** "EKİM 2026 YEMEK MENÜSÜ" → { year, month } */
export function detectMonth(items: TextItem[]): { year: number; month: number } | null {
  const text = norm(items.map((i) => i.str).join(" "));
  const m = text.match(new RegExp(`\\b(${MONTHS.join("|")})\\s+(20\\d{2})\\b`));
  return m ? { month: MONTHS.indexOf(m[1]) + 1, year: Number(m[2]) } : null;
}

export const detectVariant = (items: TextItem[]): MenuVariant => (/\bvegan\b/.test(norm(items.map((i) => i.str).join(" "))) ? "vegan" : "normal");

const NOTE_RE = /^[^a-zçğıöşü]*[A-ZÇĞİÖŞÜ][^a-zçğıöşü]*$/; // yalnızca BÜYÜK harf (tatil notları)
const NOT_NOTE = /(SAAT|YEMEKHANE|FAKÜLTE|ÖĞLE|AKŞAM|MENÜ|ÖSEM|HİZMET)/i;

type Acc = { dishes: { name: string; kcal: number; y: number }[]; notes: { text: string; y: number; xc: number }[] };

function assign(toks: Tok[], strategy: "above" | "below") {
  const headers = toks.filter((t): t is Extract<Tok, { k: "date" }> => t.k === "date");
  const warn: string[] = [];
  const byWd = new Map<number, typeof headers>();
  for (const h of headers) {
    const wd = weekdayOf(h.date);
    byWd.set(wd, [...(byWd.get(wd) ?? []), h]);
  }
  const centers = [...byWd.entries()].map(([wd, hs]) => ({ wd, xc: median(hs.map((h) => h.xc)) })).sort((a, b) => a.xc - b.xc);
  if (centers.length < 2) return { acc: new Map<string, Acc>(), warn: ["Tarih başlıkları (sütunlar) tespit edilemedi."] };
  const pitchX = median(centers.slice(1).map((c, i) => c.xc - centers[i].xc));
  const rowYs = [...new Set(headers.map((h) => Math.round(h.y / 4)))].sort((a, b) => a - b).map((v) => v * 4);
  const pitchY = rowYs.length > 1 ? median(rowYs.slice(1).map((y, i) => y - rowYs[i])) : Infinity;

  const acc = new Map<string, Acc>();
  const slot = (d: string) => acc.get(d) ?? acc.set(d, { dishes: [], notes: [] }).get(d)!;
  for (const t of toks) {
    if (t.k === "date") continue;
    const col = centers.reduce((b, c) => (Math.abs(c.xc - t.xc) < Math.abs(b.xc - t.xc) ? c : b));
    if (Math.abs(col.xc - t.xc) > pitchX * 0.75) continue; // ızgara dışı (alt bilgi vb.)
    const cands = (byWd.get(col.wd) ?? []).filter((h) => (strategy === "above" ? h.y >= t.y - 2 : h.y <= t.y + 2));
    if (!cands.length) continue;
    const h = cands.reduce((b, c) => (Math.abs(c.y - t.y) < Math.abs(b.y - t.y) ? c : b));
    if (Math.abs(h.y - t.y) > pitchY * 1.15) continue;
    const a = slot(h.date);
    if (t.k === "dish") a.dishes.push({ name: t.name, kcal: t.kcal, y: t.y });
    else a.notes.push({ text: t.text, y: t.y, xc: t.xc });
  }
  return { acc, warn };
}

function build(acc: Map<string, Acc>, year: number, month: number): DayMenu[] {
  const days: DayMenu[] = [];
  for (const [date, a] of acc) {
    if (!date.startsWith(`${year}-${String(month).padStart(2, "0")}-`)) continue; // şablondan kalan eski aylar
    const seen = new Set<string>();
    const items: MenuItem[] = [];
    for (const d of [...a.dishes].sort((p, q) => q.y - p.y)) {
      const key = `${d.name}|${d.kcal}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ name: d.name, kcal: d.kcal, cat: classifyDish(d.name) });
    }
    const noteText = [...a.notes]
      .filter((n) => NOTE_RE.test(n.text) && !NOT_NOTE.test(n.text) && n.text.length <= 40)
      .sort((p, q) => q.y - p.y)
      .map((n) => n.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!items.length && !noteText) continue;
    days.push({
      date,
      meal: "daily",
      status: items.length ? "open" : "closed",
      ...(noteText ? { note: noteText } : {}),
      items,
      totalKcal: items.length ? sumKcal(items) : null,
    });
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

/** Ayın hafta içi günleri (Pzt–Cum). */
export function expectedWeekdays(year: number, month: number): string[] {
  const n = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => ymd(year, month, i + 1)).filter((d) => weekdayOf(d) < 5);
}

/** Yazmadan önce kalite kapısı: eksik/bozuk ayrıştırmanın mevcut veriyi ezmesini önler. */
export function validate(days: DayMenu[], year: number, month: number): { ok: boolean; reasons: string[]; filled: number; expected: number } {
  const expected = expectedWeekdays(year, month).length;
  const open = days.filter((d) => d.status === "open");
  const filled = open.filter((d) => d.items.length >= 3).length;
  const reasons: string[] = [];
  if (days.length < expected * 0.6) reasons.push(`Yalnızca ${days.length}/${expected} gün bulundu.`);
  if (open.length && filled < open.length * 0.8) reasons.push(`${open.length} açık günün yalnızca ${filled}'inde ≥3 yemek var.`);
  if (!open.length) reasons.push("Hiç yemek bulunamadı.");
  return { ok: reasons.length === 0, reasons, filled, expected };
}

/** Bir sayfanın (ya da tüm sayfaların) metin parçalarından menü çıkarır. */
export function parseComuPages(pages: TextItem[][], hint?: { variant?: MenuVariant }): ParseResult {
  const all = pages.flat();
  const when = detectMonth(all);
  const variant = hint?.variant ?? detectVariant(all);
  if (!when) throw new Error("PDF başlığında ay/yıl bulunamadı (ör. \"EKİM 2026 YEMEK MENÜSÜ\").");

  let best: ParseResult | null = null;
  let bestScore = -1;
  for (const strategy of ["above", "below"] as const) {
    const merged = new Map<string, DayMenu>();
    const warnings: string[] = [];
    for (const page of pages) {
      const { acc, warn } = assign(tokenize(page), strategy);
      warnings.push(...warn);
      for (const d of build(acc, when.year, when.month)) merged.set(d.date, d);
    }
    const days = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
    const score = days.filter((d) => d.items.length >= 3).length;
    if (score > bestScore) {
      bestScore = score;
      best = { year: when.year, month: when.month, variant, days, strategy, warnings };
    }
  }
  const res = best!;
  const v = validate(res.days, res.year, res.month);
  if (!v.ok) res.warnings.push(...v.reasons);
  return res;
}
