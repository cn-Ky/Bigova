/**
 * Keşfet'teki genel arama: tüm bölümlerde (sayfalar, işletmeler, haberler, iş ilanları, ustalar, kitaplar,
 * notlar, Bigola gönderi/kişi/#etiket, rehber, Biga notları, harita…) tek kutudan arama.
 * Bu dosya saf yardımcıları ve ağ gerektirmeyen (statik) arama dizinini içerir.
 */
import { GUIDE, BIGA_NOTES } from "@/lib/bigaInfo";
import { OZEL_GUNLER } from "@/lib/kulturData";
import { CATEGORIES } from "@/lib/menuData";
import { sideTabs, tabs } from "@/components/tabs";

export type SearchKind =
  | "page"
  | "business"
  | "news"
  | "job"
  | "usta"
  | "book"
  | "note"
  | "post"
  | "person"
  | "tag"
  | "place"
  | "guide"
  | "culture";

export type SearchHit = {
  /** Benzersiz anahtar (tür + kimlik) */
  key: string;
  kind: SearchKind;
  title: string;
  /** İkinci satır: kategori, konum, kısa özet vb. */
  sub?: string;
  href: string;
  /** Örnek/temsili içerik mi? */
  demo?: boolean;
  /** Sıralama puanı (yüksek = üstte) */
  score: number;
};

export type KindMeta = { label: string; plural: string; seeAll?: (q: string) => string };

const enc = encodeURIComponent;

/** Bölüm adları, tüm sonuçları gör bağlantıları ve filtre çipleri için. */
export const KIND_META: Record<SearchKind, KindMeta> = {
  page: { label: "Sayfa", plural: "Sayfalar" },
  business: { label: "İşletme", plural: "İşletmeler", seeAll: (q) => `/isletmeler?q=${enc(q)}` },
  news: { label: "Haber", plural: "Biga Gündemi", seeAll: (q) => `/haberler?q=${enc(q)}` },
  job: { label: "İş ilanı", plural: "İş ilanları", seeAll: (q) => `/is-ilanlari?q=${enc(q)}` },
  usta: { label: "Usta", plural: "Ustalar", seeAll: (q) => `/ustalar?q=${enc(q)}` },
  book: { label: "Kitap", plural: "Kitap pazarı", seeAll: (q) => `/kitap-pazari?q=${enc(q)}` },
  note: { label: "Not", plural: "Notlar", seeAll: (q) => `/notlar?q=${enc(q)}` },
  post: { label: "Gönderi", plural: "Bigola gönderileri", seeAll: (q) => `/bigola/kesfet?q=${enc(q)}` },
  person: { label: "Kişi", plural: "Kişiler", seeAll: (q) => `/bigola/kesfet?q=${enc(q)}` },
  tag: { label: "Etiket", plural: "Etiketler", seeAll: (q) => `/bigola/kesfet?q=${enc(q)}` },
  place: { label: "Harita", plural: "Haritada", seeAll: (q) => `/harita?q=${enc(q)}` },
  guide: { label: "Rehber", plural: "Öğrenci rehberi" },
  culture: { label: "Kültür", plural: "Kültür & Biga" },
};

/** Gösterim sırası */
export const KIND_ORDER: SearchKind[] = [
  "page",
  "business",
  "news",
  "post",
  "tag",
  "person",
  "job",
  "usta",
  "book",
  "note",
  "place",
  "guide",
  "culture",
];

/* ───────── Metin yardımcıları ───────── */

const TR: Record<string, string> = { İ: "i", I: "i", ı: "i", Ğ: "g", ğ: "g", Ü: "u", ü: "u", Ş: "s", ş: "s", Ö: "o", ö: "o", Ç: "c", ç: "c", Â: "a", â: "a", Î: "i", î: "i", Û: "u", û: "u" };
/** Türkçe karakter, büyük/küçük harf ve aksan duyarsız karşılaştırma için sadeleştirir (1:1 harf eşlemesi). */
export const norm = (s: string | null | undefined) =>
  (s ?? "").replace(/[İIıĞğÜüŞşÖöÇçÂâÎîÛû]/g, (c) => TR[c]).toLowerCase();

/** Arama metnini kelimelere ayırır; "#" ve fazla boşluk atılır. */
export const tokens = (q: string) =>
  norm(q)
    .replace(/[#]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

/**
 * Bir kaydı sorguya göre puanlar. Her kelime bulunmalıdır (VE mantığı); başlıkta başta eşleşme > başlıkta eşleşme >
 * ikincil alanlarda eşleşme. Eşleşme yoksa 0 döner.
 */
export function scoreOf(q: string, title: string, ...rest: (string | null | undefined)[]): number {
  const ts = tokens(q);
  if (!ts.length) return 0;
  const t = norm(title);
  const extra = norm(rest.filter(Boolean).join(" "));
  let total = 0;
  for (const w of ts) {
    if (t === w) total += 100;
    else if (t.startsWith(w)) total += 70;
    else if (t.includes(" " + w)) total += 55;
    else if (t.includes(w)) total += 40;
    else if (extra.includes(w)) total += 15;
    else return 0;
  }
  // Tam ifade başlıkta geçiyorsa küçük bonus
  const whole = ts.join(" ");
  if (ts.length > 1 && t.includes(whole)) total += 25;
  return total;
}

export const clip = (s: string | null | undefined, n = 90) => {
  const x = (s ?? "").replace(/\s+/g, " ").trim();
  return x.length > n ? `${x.slice(0, n - 1).trimEnd()}…` : x;
};

/** İçerikten, eşleşen kelimenin çevresinden kısa bir alıntı çıkarır. */
export function snippet(q: string, text: string | null | undefined, n = 90): string {
  const x = (text ?? "").replace(/\s+/g, " ").trim();
  if (!x) return "";
  const ts = tokens(q);
  const nx = norm(x);
  const at = ts.map((w) => nx.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (at === undefined || at < n / 2) return clip(x, n);
  const from = Math.max(0, at - 20);
  return `…${x.slice(from, from + n).trim()}…`;
}

/* ───────── Statik dizin (ağ gerektirmez, anında) ───────── */

type StaticItem = { kind: SearchKind; key: string; title: string; sub?: string; href: string; hay: string };

/** Sayfalar için ek arama sözcükleri (başlıkta geçmeyen ama insanların yazacağı kelimeler). */
const PAGE_KEYWORDS: Record<string, string> = {
  "/": "keşfet ana sayfa",
  "/haberler": "haber duyuru gündem biga son dakika",
  "/isletmeler": "kafe restoran market eczane kırtasiye çamaşırhane fiyat tuvalet saat menü",
  "/ulasim": "otobüs servis minibüs dolmuş sefer saat durak hat otogar",
  "/harita": "harita konum atm banka eczane durak yakın rota yol tarifi",
  "/is-ilanlari": "iş staj part time yarı zamanlı ek gelir çalışma eleman",
  "/ustalar": "tesisatçı elektrikçi çilingir boyacı nakliyat tamir klima kombi usta",
  "/notlar": "ders notu pdf özet vize final sınav çalışma",
  "/ders-programi": "ders program çizelge haftalık bölüm sınıf iibf myo",
  "/pomodoro": "odak zamanlayıcı çalışma mola ders çalış",
  "/kitap-pazari": "kitap ikinci el ders kitabı satış alış",
  "/dergi": "dergi okul yayın makale sayı",
  "/yemekhane": "yemek menü kyk yurt ağaköy kahvaltı akşam yemeği öğle",
  "https://ubys.comu.edu.tr/": "ubys not transkript ders kayıt öğrenci bilgi sistemi",
  "/arkadaslar": "arkadaş mesaj sohbet dm ekle",
  "/bigola": "topluluk gönderi paylaş sosyal ağ hashtag etiket twitter",
  "/bigocuk": "oyun anket bigcoin safari avatar yürüyüş",
  "/hakkimizda": "misyon ekip kulüp iletişim biz kimiz",
  "/ataturk": "atatürk nutuk gençliğe hitabe marş istiklal",
  "/kultur": "özel gün tatil takvim ajanda resmi tatil sınav takvimi kültür",
  "/ayarlar": "tema hesap bildirim profil şifre gizlilik görünüm çıkış",
  "/bigola/kesfet": "bigola keşfet hashtag etiket ara kişi",
  "/bigola/bildirimler": "bildirim bigola beğeni yorum takip",
};

let cache: StaticItem[] | null = null;

function buildStatic(): StaticItem[] {
  const out: StaticItem[] = [];

  // Sayfalar (menü kategorileriyle birlikte)
  const seen = new Set<string>();
  const catOf = new Map<string, string>();
  for (const c of CATEGORIES) for (const h of c.hrefs) catOf.set(h, c.label);
  for (const t of [...tabs, ...sideTabs]) {
    if (seen.has(t.href)) continue;
    seen.add(t.href);
    out.push({
      kind: "page",
      key: `page:${t.href}`,
      title: t.l,
      sub: t.hint ?? catOf.get(t.href),
      href: t.href,
      hay: `${PAGE_KEYWORDS[t.href] ?? ""} ${catOf.get(t.href) ?? ""} ${t.hint ?? ""}`,
    });
  }
  for (const [href, kw] of Object.entries(PAGE_KEYWORDS)) {
    if (seen.has(href)) continue;
    seen.add(href);
    const title = href === "/bigola/kesfet" ? "Bigola Keşfet" : href === "/bigola/bildirimler" ? "Bigola Bildirimler" : href;
    out.push({ kind: "page", key: `page:${href}`, title, sub: "Bigola", href, hay: kw });
  }

  // Öğrenci rehberi ipuçları
  for (const sec of GUIDE) {
    sec.tips.forEach((tip, i) => {
      out.push({
        kind: "guide",
        key: `guide:${sec.id}:${i}`,
        title: tip.title,
        sub: sec.title,
        href: tip.href ?? "/",
        hay: `${tip.text} ${sec.title}`,
      });
    });
  }

  // Biga notları (tarih, doğa, lezzet, gezi…)
  BIGA_NOTES.forEach((n, i) => {
    out.push({
      kind: "culture",
      key: `note:${i}`,
      title: n.title,
      sub: n.tag,
      href: "/kultur",
      hay: `${n.text} ${n.tag}`,
    });
  });

  // Özel günler / tatiller
  OZEL_GUNLER.forEach((d, i) => {
    const month = new Date(2000, d.month - 1, 1).toLocaleDateString("tr-TR", { month: "long" });
    out.push({
      kind: "culture",
      key: `gun:${i}`,
      title: d.title,
      sub: `${d.day} ${month}${d.holiday ? " · Resmî tatil" : ""}`,
      href: "/kultur",
      hay: `${d.text} ${month}`,
    });
  });

  return out;
}

/** Statik içerikte arar (sayfalar, rehber, Biga notları, özel günler). */
export function searchStatic(q: string, limitPerKind = 6): SearchHit[] {
  if (!tokens(q).length) return [];
  cache ??= buildStatic();
  const per: Record<string, number> = {};
  const hits: SearchHit[] = [];
  for (const it of cache) {
    const s = scoreOf(q, it.title, it.sub, it.hay);
    if (!s) continue;
    hits.push({ key: it.key, kind: it.kind, title: it.title, sub: it.sub ? clip(it.sub, 70) : snippet(q, it.hay), href: it.href, score: s + (it.kind === "page" ? 20 : 0) });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.filter((h) => ((per[h.kind] = (per[h.kind] ?? 0) + 1) <= limitPerKind));
}

/** Sorgudaki "#etiket" bölümünü sade metne çevirir (ilike için). */
export const sqlSafe = (q: string) => q.replace(/[%_\\,()*"']/g, " ").replace(/^#/, "").replace(/\s+/g, " ").trim().slice(0, 60);
