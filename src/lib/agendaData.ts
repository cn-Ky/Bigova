import type { Exam } from "@/lib/studentHome";
import { OZEL_GUNLER } from "@/lib/kulturData";

/**
 * Kültür Ajandası verisi (/kultur).
 *
 * Kaynaklar
 * - Sabit tarihli resmî tatil ve anma günleri: src/lib/kulturData.ts → OZEL_GUNLER (her yıl için üretilir).
 * - Dinî bayramlar yıldan yıla değişir; BAYRAMLAR tablosuna yıl yıl elle eklenir (Diyanet takvimi).
 * - Akademik takvim: ÇOMÜ 2026-2027 genel akademik takvimi (AKADEMIK_TAKVIM_URL).
 *   Lisansüstü Eğitim Enstitüsü, Tıp, Diş Hekimliği, Turizm Fakültesi, Yabancı Diller YO ve Gökçeada UBYO
 *   kendi takvimini kullanır; bu yüzden genel tarihler ajandada "Genel takvim" olarak belirtilir.
 *   Yeni akademik yıl için yalnızca AKADEMIK_2026_2027 benzeri yeni bir dizi eklemek yeterlidir.
 * - Kişisel sınavlar: öğrencinin kendi "Sınavlarım" kayıtları (useStudentData).
 *
 * Tüm tarihler yerel takvim günüdür: "YYYY-MM-DD" (başlangıç ve bitiş DAHİL).
 */

export const AKADEMIK_TAKVIM_URL = "https://cdn.comu.edu.tr/cms/ogrenciisleri/files/852-genel-2026-2027-comu-akademik-takvimi.pdf";
/** Ajandada akademik verinin kapsadığı dönem (arayüzde bilgi notu için). */
export const AKADEMIK_DONEM = "2026-2027";

export type AgendaKind = "tatil" | "ozel" | "sinav" | "akademik" | "kisisel";

export type AgendaEvent = {
  id: string;
  kind: AgendaKind;
  title: string;
  text?: string;
  start: string;
  end: string;
  /** Yarım gün (arife gibi) */
  half?: boolean;
  time?: string | null;
  place?: string | null;
};

/** Aynı günde birden çok kayıt varsa sahnede ve renkte hangisi öne çıkar (soldaki önce). */
export const KIND_PRIORITY: AgendaKind[] = ["kisisel", "sinav", "tatil", "ozel", "akademik"];

export const KIND_META: Record<AgendaKind, { label: string; chip: string; desc: string }> = {
  tatil: { label: "Tatiller", chip: "Tatil", desc: "Resmî tatiller ve bayramlar" },
  ozel: { label: "Özel günler", chip: "Özel gün", desc: "Anma ve kutlama günleri" },
  sinav: { label: "Sınavlar", chip: "Sınav", desc: "Vize, final, bütünleme" },
  akademik: { label: "Akademik", chip: "Akademik", desc: "Kayıt, ders başlangıcı ve bitişi" },
  kisisel: { label: "Sınavlarım", chip: "Sınavım", desc: "Senin eklediğin sınavlar" },
};

/* ───────── Tarih yardımcıları ───────── */
const p2 = (n: number) => String(n).padStart(2, "0");
export const ymd = (y: number, m0: number, d: number) => `${y}-${p2(m0 + 1)}-${p2(d)}`;
export const keyOf = (d: Date) => ymd(d.getFullYear(), d.getMonth(), d.getDate());
export const dateOf = (key: string) => new Date(`${key}T12:00:00`);
export const todayKey = () => keyOf(new Date());
export const daysBetween = (a: string, b: string) => Math.round((+dateOf(b) - +dateOf(a)) / 86_400_000);
export const addDays = (key: string, n: number) => {
  const d = dateOf(key);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
export const monthStart = (y: number, m0: number) => ymd(y, m0, 1);
export const monthEnd = (y: number, m0: number) => ymd(y, m0, new Date(y, m0 + 1, 0).getDate());

export const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const WEEKDAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export type Cell = { key: string; day: number; inMonth: boolean; col: number; row: number; weekend: boolean };

/** Pazartesi ile başlayan 6×7 ay ızgarası (42 hücre). */
export function monthCells(y: number, m0: number): Cell[] {
  const first = new Date(y, m0, 1);
  const lead = (first.getDay() + 6) % 7; // Pzt=0
  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m0, 1 - lead + i);
    cells.push({ key: keyOf(d), day: d.getDate(), inMonth: d.getMonth() === m0, col: i % 7, row: Math.floor(i / 7), weekend: i % 7 >= 5 });
  }
  return cells;
}

export const eventsOn = (events: AgendaEvent[], key: string) => events.filter((e) => e.start <= key && key <= e.end);
export const sortByPriority = (list: AgendaEvent[]) =>
  [...list].sort((a, b) => KIND_PRIORITY.indexOf(a.kind) - KIND_PRIORITY.indexOf(b.kind) || a.start.localeCompare(b.start));

export function fmtDay(key: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", weekday: "long" }) {
  return dateOf(key).toLocaleDateString("tr-TR", opts);
}
export function fmtRange(start: string, end: string) {
  if (start === end) return fmtDay(start, { day: "numeric", month: "long" });
  const a = dateOf(start);
  const b = dateOf(end);
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const mon = (d: Date) => d.toLocaleDateString("tr-TR", { month: "long" });
  return sameMonth ? `${a.getDate()}–${b.getDate()} ${mon(b)}` : `${a.getDate()} ${mon(a)} – ${b.getDate()} ${mon(b)}`;
}
export function inLabel(n: number) {
  return n === 0 ? "Bugün" : n === 1 ? "Yarın" : n === -1 ? "Dün" : n > 0 ? `${n} gün kaldı` : `${-n} gün önce`;
}

/* ───────── Sabit tarihli günler ───────── */
function fixedForYear(y: number): AgendaEvent[] {
  return OZEL_GUNLER.map((g) => {
    const key = ymd(y, g.month - 1, g.day);
    return {
      id: `fx-${key}`,
      kind: g.holiday ? "tatil" : "ozel",
      title: g.title,
      text: g.text,
      start: key,
      end: key,
      half: g.half,
    } satisfies AgendaEvent;
  });
}

/* ───────── Dinî bayramlar (Diyanet) ───────── */
type Bayram = { year: number; name: string; arife: string; start: string; end: string };
const BAYRAMLAR: Bayram[] = [
  { year: 2026, name: "Ramazan Bayramı", arife: "2026-03-19", start: "2026-03-20", end: "2026-03-22" },
  { year: 2026, name: "Kurban Bayramı", arife: "2026-05-26", start: "2026-05-27", end: "2026-05-30" },
  { year: 2027, name: "Ramazan Bayramı", arife: "2027-03-08", start: "2027-03-09", end: "2027-03-11" },
  { year: 2027, name: "Kurban Bayramı", arife: "2027-05-15", start: "2027-05-16", end: "2027-05-19" },
];
function bayramEvents(): AgendaEvent[] {
  return BAYRAMLAR.flatMap((b) => [
    { id: `by-${b.arife}`, kind: "tatil" as const, title: `${b.name} Arifesi`, text: "Öğleden sonra yarım gün tatil.", start: b.arife, end: b.arife, half: true },
    {
      id: `by-${b.start}`,
      kind: "tatil" as const,
      title: b.name,
      text: `${fmtRange(b.start, b.end)} tarihleri arasında resmî tatil. Tarihler her yıl değişir (Diyanet takvimi).`,
      start: b.start,
      end: b.end,
    },
  ]);
}

/* ───────── ÇOMÜ 2026-2027 genel akademik takvimi ───────── */
const A = (id: string, kind: "sinav" | "akademik", title: string, start: string, end: string = start, text?: string): AgendaEvent => ({
  id: `ak-${id}`,
  kind,
  title,
  start,
  end,
  text: text ?? "ÇOMÜ genel akademik takvimi. Bölümünün sınav programı farklı olabilir; kendi programını kontrol et.",
});

const AKADEMIK_2026_2027: AgendaEvent[] = [
  // Güz yarıyılı
  A("seviye", "sinav", "Yabancı dil seviye tespit sınavı", "2026-09-07", "2026-09-07", "Hazırlık programı için zorunlu seviye tespit sınavı."),
  A("muafiyet", "sinav", "Yabancı dil yeterlik (muafiyet) sınavı", "2026-09-08", "2026-09-09", "1. aşama 8 Eylül, 2. aşama 9 Eylül (1. aşamadan yeterli puan alanlar)."),
  A("kayit-guz", "akademik", "Güz kayıt yenileme", "2026-09-07", "2026-09-11"),
  A("basla-guz", "akademik", "Güz yarıyılı dersleri başlıyor", "2026-09-14", "2026-09-14"),
  A("ekle-guz", "akademik", "Ders ekleme-bırakma ve danışman onayı", "2026-09-14", "2026-09-18", "Geç kayıtlar ve danışman onayları da bu hafta yapılır."),
  A("ydmuaf", "sinav", "Zorunlu yabancı dil dersleri muafiyet sınavı", "2026-09-25", "2026-09-25", "Yeni kayıtlı öğrenciler için Yabancı Dil I ve II muafiyet sınavı."),
  A("vize-guz", "sinav", "Güz vize sınavları", "2026-11-02", "2026-11-06", "Ara sınav haftası."),
  A("son-guz", "akademik", "Güz dersleri sona eriyor", "2026-12-25", "2026-12-25"),
  A("final-guz", "sinav", "Güz final sınavları", "2026-12-28", "2027-01-08", "Yarıyıl sonu sınavları."),
  A("not-guz", "akademik", "Güz notları için son giriş tarihi", "2027-01-15", "2027-01-15", "Öğretim elemanlarının başarı notlarını girmesi için son gün."),
  A("but-guz", "sinav", "Güz bütünleme sınavları", "2027-01-18", "2027-01-22"),
  A("butnot-guz", "akademik", "Bütünleme notları için son giriş tarihi", "2027-01-29", "2027-01-29"),
  A("tek-guz", "sinav", "Güz tek ders sınavı", "2027-02-04", "2027-02-04"),
  // Bahar yarıyılı
  A("kayit-bahar", "akademik", "Bahar kayıt yenileme", "2027-02-08", "2027-02-12"),
  A("basla-bahar", "akademik", "Bahar yarıyılı dersleri başlıyor", "2027-02-15", "2027-02-15"),
  A("ekle-bahar", "akademik", "Ders ekleme-bırakma ve danışman onayı", "2027-02-15", "2027-02-19"),
  A("vize-bahar", "sinav", "Bahar vize sınavları", "2027-04-12", "2027-04-16", "Ara sınav haftası."),
  A("son-bahar", "akademik", "Bahar dersleri sona eriyor", "2027-06-04", "2027-06-04"),
  A("final-bahar", "sinav", "Bahar final sınavları", "2027-06-07", "2027-06-18", "Yarıyıl sonu sınavları."),
  A("not-bahar", "akademik", "Bahar notları için son giriş tarihi", "2027-06-25", "2027-06-25", "Öğretim elemanlarının başarı notlarını girmesi için son gün."),
  A("but-bahar", "sinav", "Bahar bütünleme sınavları", "2027-06-28", "2027-07-02"),
  A("butnot-bahar", "akademik", "Bütünleme notları için son giriş tarihi", "2027-07-04", "2027-07-04"),
  A("tek-bahar", "sinav", "Bahar tek ders sınavı", "2027-07-07", "2027-07-07"),
  // Yaz okulu
  A("yaz-kayit", "akademik", "Yaz okulu geçici ve kesin kayıtlar", "2027-07-05", "2027-07-09", "Geçici kayıtlar 5–7 Temmuz, kesin kayıtlar 8–9 Temmuz."),
  A("yaz-basla", "akademik", "Yaz okulu dersleri başlıyor", "2027-07-12", "2027-07-12"),
  A("yaz-son", "akademik", "Yaz okulu dersleri sona eriyor", "2027-08-27", "2027-08-27"),
  A("yaz-sinav", "sinav", "Yaz okulu sonu sınavları", "2027-08-31", "2027-09-03"),
  A("yaz-not", "akademik", "Yaz okulu notları için son giriş tarihi", "2027-09-05", "2027-09-05"),
];

/* ───────── Birleştirme ───────── */
/** Ajandada gösterilecek tüm kayıtlar. `personalExams`: öğrencinin kendi sınavları (giriş yapmamışsa boş). */
export function buildAgenda(personalExams: Exam[] = []): AgendaEvent[] {
  const years = [2025, 2026, 2027, 2028];
  const personal: AgendaEvent[] = personalExams.map((x) => ({
    id: `kx-${x.id}`,
    kind: "kisisel",
    title: `${x.course} · ${x.kind}`,
    text: x.kind === "Ödev teslimi" ? "Teslim tarihi" : "Senin eklediğin sınav",
    start: x.exam_date,
    end: x.exam_date,
    time: x.exam_time,
    place: x.room,
  }));
  return [...years.flatMap(fixedForYear), ...bayramEvents(), ...AKADEMIK_2026_2027, ...personal];
}

/** `from` gününden itibaren (devam edenler dahil) ilk kayıt. */
export function nextOf(events: AgendaEvent[], kinds: AgendaKind[], from: string, opts: { skipHalf?: boolean } = {}) {
  const list = events
    .filter((e) => kinds.includes(e.kind) && e.end >= from && !(opts.skipHalf && e.half))
    .sort((a, b) => a.start.localeCompare(b.start) || KIND_PRIORITY.indexOf(a.kind) - KIND_PRIORITY.indexOf(b.kind));
  const ev = list[0];
  if (!ev) return null;
  const ongoing = ev.start <= from;
  return { ev, ongoing, in: ongoing ? 0 : daysBetween(from, ev.start) };
}
