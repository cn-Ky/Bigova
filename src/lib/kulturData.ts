import { BIGA_NOTES, type BigaNote } from "@/lib/bigaInfo";

/**
 * Kültür Rehberi içeriği.
 * - Keşfet kartları, hava panelindeki "Günün Biga'sı" ile AYNI kaynaktan (src/lib/bigaInfo.ts → BIGA_NOTES) gelir:
 *   orada not eklemek/düzeltmek burayı da günceller. Kampüs ve Hava notları kültür rehberine girmez.
 * - Özel günler yalnızca TARİHİ SABİT resmî gün ve anma günlerini içerir (`holiday: true` olanlar resmî tatildir).
 *   Dinî bayramların tarihi her yıl değiştiği için burada yoktur; yıla özel olanlar src/lib/agendaData.ts içindedir.
 * - Kültür Ajandası (/kultur) bu listeyi agendaData.ts üzerinden okur.
 */

export const KULTUR_TAGS = ["Tarih", "Gezi", "Doğa", "Lezzet"] as const;
export type KulturTag = (typeof KULTUR_TAGS)[number];

export const KULTUR_NOTES: BigaNote[] = BIGA_NOTES.filter((n) => (KULTUR_TAGS as readonly string[]).includes(n.tag));

export type OzelGun = { month: number; day: number; title: string; text: string; /** Resmî tatil mi? */ holiday?: boolean; /** Yarım gün (öğleden sonra) mü? */ half?: boolean };

/** month: 1–12 */
export const OZEL_GUNLER: OzelGun[] = [
  { month: 1, day: 1, title: "Yılbaşı", text: "Yeni yılın ilk günü; resmî tatildir.", holiday: true },
  { month: 3, day: 12, title: "İstiklal Marşı'nın Kabulü", text: "1921'de TBMM, Mehmet Âkif Ersoy'un yazdığı İstiklal Marşı'nı millî marş olarak kabul etti." },
  { month: 3, day: 18, title: "Çanakkale Zaferi ve Şehitleri Anma Günü", text: "1915 Çanakkale Deniz Zaferi'nin yıldönümü. Üniversitemiz de adını bu günden alır; Çanakkale'de anma törenleri düzenlenir." },
  { month: 4, day: 23, title: "Ulusal Egemenlik ve Çocuk Bayramı", text: "TBMM'nin 1920'de Ankara'da açılışının yıldönümü; Atatürk'ün dünya çocuklarına armağan ettiği bayram.", holiday: true },
  { month: 5, day: 1, title: "Emek ve Dayanışma Günü", text: "Emekçilerin hakları ve dayanışmanın anıldığı gün; Türkiye'de resmî tatildir.", holiday: true },
  { month: 5, day: 19, title: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", text: "Atatürk'ün 1919'da Samsun'a çıkışıyla Millî Mücadele'nin başlangıcı; gençliğe armağan edilen bayram.", holiday: true },
  { month: 7, day: 15, title: "Demokrasi ve Millî Birlik Günü", text: "15 Temmuz 2016 darbe girişiminde hayatını kaybedenlerin anıldığı gün.", holiday: true },
  { month: 8, day: 30, title: "Zafer Bayramı", text: "1922'de Büyük Taarruz'un zaferle sonuçlanan Başkomutanlık Meydan Muharebesi'nin yıldönümü.", holiday: true },
  { month: 10, day: 29, title: "Cumhuriyet Bayramı", text: "Türkiye Cumhuriyeti'nin 1923'te ilan edilişinin yıldönümü.", holiday: true },
  { month: 10, day: 28, title: "Cumhuriyet Bayramı Arifesi", text: "Öğleden sonra yarım gün tatil; ertesi gün Cumhuriyet Bayramı.", holiday: true, half: true },
  { month: 11, day: 10, title: "Atatürk'ü Anma Günü", text: "Atatürk'ün 1938'deki vefatı anılır; saat 09.05'te saygı duruşu yapılır." },
  { month: 11, day: 24, title: "Öğretmenler Günü", text: "Öğretmenlerin emeğinin anıldığı gün." },
];

const DAY = 86_400_000;
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Her özel gün için bir sonraki tarihe kalan gün sayısı (bugün = 0), en yakın olan başta. */
export function upcomingDays(now: Date): (OzelGun & { in: number; date: Date })[] {
  const today = midnight(now);
  return OZEL_GUNLER.map((g) => {
    let date = new Date(today.getFullYear(), g.month - 1, g.day);
    if (date < today) date = new Date(today.getFullYear() + 1, g.month - 1, g.day);
    return { ...g, date, in: Math.round((+date - +today) / DAY) };
  }).sort((a, b) => a.in - b.in);
}

/** Günün notu: tarihe göre döner (aynı gün herkes aynı notu görür). */
export function noteOfTheDay(now: Date): BigaNote | null {
  if (!KULTUR_NOTES.length) return null;
  const dayNo = Math.floor(+midnight(now) / DAY);
  return KULTUR_NOTES[dayNo % KULTUR_NOTES.length];
}
