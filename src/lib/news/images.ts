/**
 * Haber görselleri — telif açısından güvenli yol.
 *
 * Yayıncıların kendi fotoğrafları (og:image / GDELT socialimage) KOPYALANMAZ ve bağlantılanmaz: haber fotoğrafları
 * telifli eserdir ve lisans izni olmadan yeniden yayımlamak FSEK kapsamında risklidir.
 *
 * Bunun yerine (NEWS_IMAGE_MODE=commons) Wikimedia Commons'ta "Biga" aramasıyla bulunan, lisansı serbest
 * (CC0, Kamu Malı, CC BY, CC BY-SA) fotoğraflar TEMSİLİ görsel olarak kullanılır; sanatçı + lisans + dosya
 * sayfası bağlantısı kredi olarak saklanır ve arayüzde gösterilir. Varsayılan (NEWS_IMAGE_MODE=cover) hiç
 * fotoğraf kullanmaz; haber mevcut NewsCover kapağını alır.
 */

export type StockImage = { url: string; credit: string; link: string };

const UA = `BigovaNewsBot/1.0 (${process.env.NEWS_BOT_CONTACT ?? "iletisim: Bigova"})`;

/** Yalnızca bu lisanslar kabul edilir (ND/NC içerenler dışarıda). */
const OK_LICENSE = /^(cc0|public domain|pd\b|cc[ -]by([ -]sa)?[ -]\d)/i;

const text = (html: unknown) =>
  typeof html === "string" ? html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";

type Meta = Record<string, { value?: string } | undefined>;

export async function loadCommonsPool(): Promise<StockImage[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: "Biga Çanakkale filetype:bitmap",
      gsrnamespace: "6",
      gsrlimit: "40",
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata",
      iiurlwidth: "900",
    });
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!r.ok) return [];
    const json = (await r.json()) as {
      query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; descriptionurl?: string; mime?: string; extmetadata?: Meta }[] }> };
    };
    const out: StockImage[] = [];
    for (const p of Object.values(json.query?.pages ?? {})) {
      const ii = p.imageinfo?.[0];
      if (!ii?.thumburl || !ii.descriptionurl || !/^image\/(jpeg|png|webp)$/.test(ii.mime ?? "")) continue;
      const m = ii.extmetadata ?? {};
      const license = text(m.LicenseShortName?.value);
      if (!OK_LICENSE.test(license)) continue;
      // Başlığında Biga geçmeyen sonuçları ele (Commons araması gevşektir)
      const desc = text(m.ImageDescription?.value) + " " + text(m.ObjectName?.value);
      if (!/biga/i.test(desc)) continue;
      const artist = text(m.Artist?.value).slice(0, 60) || "Bilinmeyen";
      out.push({
        url: ii.thumburl,
        credit: `${artist} · ${license} · Wikimedia Commons`,
        link: ii.descriptionurl,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Aynı haber her zaman aynı görseli alsın diye tohumdan deterministik seçim. */
export function pickImage(pool: StockImage[], seed: string): StockImage | null {
  if (!pool.length) return null;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
