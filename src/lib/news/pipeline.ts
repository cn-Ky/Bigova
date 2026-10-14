/**
 * Biga Gündemi otomatik haber hattı: SAF fonksiyonlar (ağ/veritabanı yok, test edilebilir).
 *
 * Akış: ham kayıtlar → Biga ile ilgili mi? → aynı olayı anlatanları kümele → kaç bağımsız kaynak
 * doğruluyor? → kategori + hassas içerik işareti.
 *
 * Telif: yayıncıların haber METNİ hiçbir aşamada okunmaz/saklanmaz. Yalnızca başlık, (varsa) besleme
 * özeti, kaynak adı ve bağlantı kullanılır; Bigova'nın yayımladığı metin kendi yazdığı özettir.
 */

export type RawItem = {
  title: string;
  url: string;
  /** Yayıncının alan adı (www'suz, küçük harf) */
  domain: string;
  sourceName: string;
  publishedAt: string; // ISO
  snippet?: string;
  origin: "gdelt" | "rss" | "gnews";
};

export type Verification = "official" | "verified" | "single";

export type Story = {
  /** Tarihe göre artan; resmî kaynak varsa birincil kayıt başa alınır */
  items: RawItem[];
  domains: string[];
  verification: Verification;
  category: string;
  sensitive: boolean;
  publishedAt: string;
  headline: string;
};

/* ───────── Metin yardımcıları ───────── */

/** Türkçe küçük harf + aksan/ayraç temizliği: "Biga'da ÇOMÜ" → "biga da comu" */
export const norm = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const STOP = new Set([
  "ve", "ile", "icin", "bir", "bu", "da", "de", "mi", "gibi", "daha", "en", "cok", "son", "dakika",
  "haber", "haberi", "video", "foto", "galeri", "flas",
  // Her başlıkta geçtiği için ayırt edici değil (benzerliği yapay şişirir)
  "biga", "bigada", "karabiga",
]);

/** Türkçe eklemeli bir dil: kelimeleri ilk 5 harfe indirip karşılaştırmak ("bigada", "bigadaki" → "bigad"). */
const stems = (title: string) =>
  new Set(
    norm(title)
      .split(" ")
      .filter((t) => t.length > 2 && !STOP.has(t))
      .map((t) => t.slice(0, 5)),
  );

/** "Başlık - Site Adı" biçimindeki yayıncı ekini atar. */
export function cleanTitle(title: string, sourceName: string): string {
  const t = title.replace(/\s+/g, " ").trim();
  const m = t.match(/^(.*\S)\s+[-–—|]\s+([^-–—|]{2,40})$/);
  if (!m) return t;
  const tail = norm(m[2]);
  const src = norm(sourceName);
  return src && (src.includes(tail) || tail.includes(src)) ? m[1] : t;
}

export const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

/* ───────── İlgililik ───────── */

/** Biga ile ilgili mi? (Bigadiç gibi benzer adlar \b sınırı sayesinde eşleşmez.) */
export function isRelevant(it: Pick<RawItem, "title" | "snippet">, extraTerms: string[] = []): boolean {
  const t = norm(`${it.title} ${it.snippet ?? ""}`);
  const hit =
    /\b(biga|karabiga|bigaspor|bigali|bigalilar)\b/.test(t) || extraTerms.some((e) => e && t.includes(norm(e)));
  if (!hit) return false;
  // İtalyan "biga" (ekmek mayası) vb. yanlış eşleşmeler
  if (/\b(pizza|hamur\w*|italyan\w*|fermantasyon)\b/.test(t) && !/\b(canakkale|belediye|ilce|kaymakam)\b/.test(t)) return false;
  return true;
}

/* ───────── Kümeleme ───────── */

const HOURS = 3600_000;

function similar(a: Set<string>, b: Set<string>): boolean {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  if (inter < 2) return false;
  const union = a.size + b.size - inter;
  // 2 ortak kelime ancak başlıklar kısa/örtüşmesi yüksekse yeter; 3+ ortak kelimede biraz daha esnek
  return inter / union >= 0.5 || (inter >= 3 && inter / Math.min(a.size, b.size) >= 0.6);
}

/** Aynı olayı anlatan kayıtları gruplar (başlık benzerliği + 72 saat yakınlığı). */
export function clusterItems(items: RawItem[]): RawItem[][] {
  const list = [...items].sort((x, y) => +new Date(x.publishedAt) - +new Date(y.publishedAt));
  const st = list.map((i) => stems(i.title));
  const parent = list.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      if (+new Date(list[j].publishedAt) - +new Date(list[i].publishedAt) > 72 * HOURS) break;
      if (similar(st[i], st[j])) parent[find(j)] = find(i);
    }
  const groups = new Map<number, RawItem[]>();
  list.forEach((it, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), it]);
  });
  return [...groups.values()];
}

/* ───────── Doğrulama, kategori, hassasiyet ───────── */

/** Resmî kurum alan adları: belediye, kamu, üniversite. */
export const isOfficialDomain = (d: string) => /(^|\.)(gov|bel|edu)\.tr$/.test(d);

const CATEGORY_RULES: [string, RegExp][] = [
  ["Spor", /\b(spor|bigaspor|mac|maci|lig|ligi|futbol|basketbol|voleybol|turnuva|sampiyon\w*|takim\w*)\b/],
  ["Kampus", /\b(comu|universite\w*|ogrenci\w*|kyk|yurt\w*|fakulte\w*|yuksekokul\w*|akademik|rektor\w*)\b/],
  ["Ulasim", /\b(otobus\w*|yol|yolu|trafik|feribot\w*|koprusu|minibus\w*|servis\w*|ulasim|seferleri|asfalt\w*)\b/],
  ["Etkinlik", /\b(festival\w*|konser\w*|etkinlik\w*|senlik\w*|sergi\w*|panel|soylesi|yarisma\w*|kermes)\b/],
  ["Kultur & Sanat", /\b(tiyatro\w*|sinema\w*|muze\w*|kultur|sanat\w*|kitap\w*|sair|yazar|resim)\b/],
  ["Duyuru", /\b(duyuru\w*|kesinti\w*|kesilecek|ilan|basvuru\w*|ihale|uyari|aciklama)\b/],
];
const CATEGORY_LABEL: Record<string, string> = {
  Spor: "Spor",
  Kampus: "Kampüs",
  Ulasim: "Ulaşım",
  Etkinlik: "Etkinlik",
  "Kultur & Sanat": "Kültür & Sanat",
  Duyuru: "Duyuru",
};
export function categorize(title: string): string {
  const t = norm(title);
  for (const [cat, re] of CATEGORY_RULES) if (re.test(t)) return CATEGORY_LABEL[cat];
  return "Şehir";
}

/**
 * Hassas konular (şiddet, cinsel suç, intihar…) otomatik YAYINLANMAZ; taslak kalır.
 * İsim/iftira riski ve mağdurları koruma amacıyla insan onayı beklenir.
 */
export const isSensitive = (text: string) =>
  /\b(cinayet\w*|intihar\w*|tecavuz\w*|taciz\w*|istismar\w*|cinsel|olduruld\w*|bicaklan\w*|ceset\w*|silahli saldiri)\b/.test(
    norm(text),
  );

export function buildStory(cluster: RawItem[], now = Date.now()): Story {
  const byDomain = new Map<string, RawItem>();
  for (const it of cluster) if (it.domain && !byDomain.has(it.domain)) byDomain.set(it.domain, it);
  const items = [...byDomain.values()].sort((a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt));
  const official = items.find((i) => isOfficialDomain(i.domain));
  const ordered = official ? [official, ...items.filter((i) => i !== official)] : items;
  const domains = ordered.map((i) => i.domain);
  const verification: Verification = official ? "official" : domains.length >= 2 ? "verified" : "single";
  const first = ordered[0];
  const text = ordered.map((i) => `${i.title} ${i.snippet ?? ""}`).join(" ");
  const earliest = Math.min(...ordered.map((i) => +new Date(i.publishedAt)));
  return {
    items: ordered,
    domains,
    verification,
    category: categorize(text),
    sensitive: isSensitive(text),
    publishedAt: new Date(Math.min(earliest, now)).toISOString(),
    headline: cleanTitle(first.title, first.sourceName),
  };
}

/** Yayınlanabilir mi? Resmî kaynak ya da ≥2 bağımsız yayıncı gerekir; hassas içerik hep taslaktır. */
export const publishable = (s: Story) => !s.sensitive && s.verification !== "single";

/* ───────── Yapay zekâsız yedek metin ───────── */

export type Copy = { title: string; summary: string; body: string };

export function fallbackCopy(s: Story): Copy {
  const names = [...new Set(s.items.map((i) => i.sourceName))].slice(0, 3).join(", ");
  const summary =
    s.verification === "official"
      ? `${s.items[0].sourceName} bu gelişmeyi duyurdu. Ayrıntılar için kaynak bağlantısına bak.`
      : `${names} bu gelişmeyi haberleştirdi. Tam metin için kaynak bağlantılarına bak.`;
  return {
    title: s.headline.slice(0, 160),
    summary: summary.slice(0, 400),
    body:
      "Bu içerik Bigova tarafından birden fazla kaynaktan otomatik derlenmiştir; haberin metni yayımlanmaz. " +
      "Ayrıntılar için aşağıdaki kaynaklara göz at.",
  };
}

/** Ardışık `n` kelimelik bir bölüm kaynak metinden birebir geçiyorsa true (telif kontrolü). */
export function hasVerbatimRun(text: string, sources: string[], n = 8): boolean {
  const w = norm(text).split(" ").filter(Boolean);
  if (w.length < n) return false;
  const hay = sources.map((s) => ` ${norm(s)} `);
  for (let i = 0; i + n <= w.length; i++) {
    const run = ` ${w.slice(i, i + n).join(" ")} `;
    if (hay.some((h) => h.includes(run))) return true;
  }
  return false;
}
