/**
 * Yemekhane hattı kendi kendine sınaması. Kullanım:
 *   npx --yes tsx scripts/menus-selftest.ts                      → yalnızca birim testleri
 *   npx --yes tsx scripts/menus-selftest.ts ekim.pdf [dogru.json]  → gerçek bir PDF'i ayrıştırıp raporlar
 *
 * İkinci biçim, ÇOMÜ'nün yayınladığı PDF'in beklediğin gibi çözülüp çözülmediğini yayına almadan önce görmek içindir.
 */
import { readFileSync } from "node:fs";
import { extractTextItems } from "../src/lib/menus/comuSource";
import { parseComuPages, expectedWeekdays, type TextItem } from "../src/lib/menus/comuParser";
import { classifyDish, cleanDishName } from "../src/lib/menus/types";
import { mapKepceMenus } from "../src/lib/menus/kykSource";

let fails = 0;
const ok = (cond: unknown, msg: string) => {
  if (!cond) {
    fails++;
    console.error("  ✗", msg);
  } else console.log("  ✓", msg);
};

/* ── 1) Ad temizleme + sınıflandırma ── */
console.log("Ad temizleme / sınıflandırma");
ok(cleanDishName("Tavuk.Hünkarbeğendi") === "Tavuk Hünkarbeğendi", "nokta ile yapışık ad");
ok(cleanDishName("PeynirliErişte") === "Peynirli Erişte", "bitişik ad");
ok(cleanDishName("Dom. Sos. Makarna") === "Domates Soslu Makarna", "Dom. Sos. açılımı");
ok(cleanDishName("Tel Şeh.Pirinç Pilavı") === "Tel Şehriyeli Pirinç Pilavı", "Şeh. açılımı");
ok(cleanDishName("Kre. Mantar Çorba") === "Kremalı Mantar Çorba", "Kre. açılımı");
const cls: [string, string][] = [
  ["Ezogelin Çorba", "corba"], ["Ayran", "icecek"], ["Cevizli Baklava", "tatli"], ["Muz", "tatli"],
  ["Yoğurt", "yan"], ["Yoğurtlu Mantı", "pilav"], ["Karışık Salata", "yan"], ["Yoğurtlu Köz Patlıcan", "yan"],
  ["Bahar Pilavı", "pilav"], ["Tavuk Şinitzel", "ana"], ["Su Böreği", "pilav"], ["Islak Kek", "tatli"], ["Peynir Tatlısı", "tatli"],
  ["Meyve Suyu", "icecek"], ["Patlıcan Musakka", "ana"], ["Haydari", "yan"],
];
for (const [n, c] of cls) ok(classifyDish(n) === c, `${n} → ${c} (gelen: ${classifyDish(n)})`);

/* ── 2) İki hücrenin tek metin parçasına birleştiği zor durum + stale başlık + bayram ── */
console.log("Birleşik metin parçaları");
const mk = (str: string, x: number, y: number, w = str.length * 4): TextItem => ({ str, x, y, w });
const items: TextItem[] = [
  mk("EKİM 2026 YEMEK MENÜSÜ", 200, 560),
  // 1. satır: Pzt–Çrş eski şablon başlıkları (eylülden kalma), Per/Cum güncel
  mk("31.08.2026", 40, 520), mk("01.09.2026", 180, 520), mk("02.09.2026", 320, 520), mk("01.10.2026", 460, 520), mk("02.10.2026", 600, 520),
  // Per/Cum hücreleri tek satırda birleşik gelir
  mk("Tavuksuyu Çorba (198)        Ezogelin Çorba (230)", 460, 500, 300),
  mk("Orman Kebabı (402)      Tavuk Hünkarbeğendi (440)", 460, 490, 300),
  mk("Sebzeli Bulgur Pilavı (288)   Dom. Sos. Makarna (317)", 460, 480, 300),
  mk("Bademli Keşkül (247)    Yoğurtlu Köz Patlıcan (147)", 460, 470, 300),
  // 2. satır
  mk("05.10.2026", 40, 420), mk("06.10.2026", 180, 420), mk("07.10.2026", 320, 420), mk("08.10.2026", 460, 420), mk("09.10.2026", 600, 420),
  mk("Buğday Çorba (164)", 40, 400), mk("İnegöl Köfte (388)", 40, 390), mk("Haşlanmış Sebze (18)", 40, 380), mk("Peynirli Kuskus (343)", 40, 370), mk("Ayran (74)", 40, 360),
  mk("Mercimek Çorba (233)", 180, 400), mk("Tas Kebabı (374)", 180, 390), mk("Su Böreği (430)", 180, 380), mk("Karışık Salata (70)", 180, 370),
  // Alt bilgi (ızgara dışı)
  mk("Öğle Yemeği Saatleri: 11:30 –14:00", 40, 60), mk("ÖSEM Öğrenci Yemekhanesi", 40, 40),
];
{
  const r = parseComuPages([items]);
  const by = Object.fromEntries(r.days.map((d) => [d.date, d]));
  ok(r.month === 10 && r.year === 2026, "başlıktan ay/yıl");
  ok(!r.days.some((d) => d.date < "2026-10-01"), "eski şablon tarihleri (31.08/01.09/02.09) atıldı");
  ok(by["2026-10-01"]?.items.length === 4 && by["2026-10-02"]?.items.length === 4, "birleşik satırdan 2 hücre ayrıştı (4+4)");
  ok(by["2026-10-01"]?.items[0].name === "Tavuksuyu Çorba" && by["2026-10-02"]?.items[0].name === "Ezogelin Çorba", "Per/Cum doğru sütuna düştü");
  ok(by["2026-10-02"]?.items[1].name === "Tavuk Hünkarbeğendi", "ad temizlendi");
  ok(by["2026-10-05"]?.items.length === 5 && by["2026-10-06"]?.items.length === 4, "5 ve 4 yemekli hücreler");
  ok(!by["2026-10-05"]?.items.some((i) => /Saat|Yemekhane/.test(i.name)), "alt bilgi yemeğe karışmadı");
}

/* ── 3) Kepçe eşleyici (belgelenen şemaya göre) ── */
console.log("Kepçe eşleyici");
{
  const rows = mapKepceMenus(
    [
      { id: 1, serve_date: "2026-10-16", meal_type: "breakfast", status: "approved", calculated_calories: 820,
        items: [{ order_index: 0, name: "Haşlanmış Yumurta", amount: "1 adet", calories: 78, category: "Kahvaltılık Protein", is_alternative: false, master_data: { is_vegan: false, is_vegetarian: true } },
                { order_index: 1, name: "Karışık Kızartma", calories: 312, category: "Kahvaltılık Sıcak", is_alternative: false }] },
      { id: 2, serve_date: "2026-10-16", meal_type: "dinner", status: "approved",
        items: [{ order_index: 0, name: "Mercimek Çorbası", calories: 150, category: "Çorba" }, { order_index: 1, name: "Tavuk Sote", calories: 300, category: "Ana Yemek" },
                { order_index: 2, name: "Etli Nohut", calories: 280, category: "Ana Yemek", is_alternative: true }],
        takeaways: [{ name: "1. Soğuk Sandviç Paketi", items: [{ order_index: 0, name: "Kaşarlı Sandviç", calories: 320 }] }] },
      { id: 3, serve_date: "2026-10-17", meal_type: "dinner", status: "pending", items: [{ name: "Gizli", calories: 1 }] },
      { id: 4, serve_date: "bozuk", meal_type: "dinner", status: "approved", items: [] },
    ],
  );
  ok(rows.length === 2, "yalnızca onaylı + geçerli tarihli menüler alındı");
  const b = rows.find((r) => r.meal === "breakfast")!;
  const d = rows.find((r) => r.meal === "dinner")!;
  ok(b.items.length === 2 && b.items[0].cat === "kahvalti", "kahvaltı kalemleri 'kahvalti' kategorisinde");
  ok(b.items[0].vegetarian === true, "vejetaryen rozeti taşındı");
  ok(d.items.find((i) => i.name === "Mercimek Çorbası")?.cat === "corba", "kategori adı eşlendi (Çorba)");
  ok(d.items.find((i) => i.name === "Etli Nohut")?.alt === true, "alternatif işaretlendi");
  ok(d.takeaways?.[0]?.items[0]?.name === "Kaşarlı Sandviç", "Al Götür paketi taşındı");
  ok(d.totalKcal === 450, "alternatifler toplam kaloriden hariç (150+300)");
}

/* ── 4) Gerçek PDF (isteğe bağlı) ── */
const [pdfPath, truthPath] = process.argv.slice(2);
(async () => {
  if (pdfPath) {
    console.log(`PDF: ${pdfPath}`);
    const pages = await extractTextItems(new Uint8Array(readFileSync(pdfPath)));
    const r = parseComuPages(pages);
    const exp = expectedWeekdays(r.year, r.month);
    console.log(`  ay=${r.year}-${r.month} değişken=${r.variant} strateji=${r.strategy} gün=${r.days.length}/${exp.length} uyarı=${r.warnings.length}`);
    for (const w of r.warnings) console.log("  ⚠", w);
    for (const d of r.days) console.log(`  ${d.date} ${d.status === "closed" ? `KAPALI (${d.note})` : d.items.map((i) => `${i.name}(${i.kcal})`).join(" | ")}`);
    if (truthPath) {
      const truth = JSON.parse(readFileSync(truthPath, "utf8")) as Record<string, string[] | null>;
      let wrong = 0;
      for (const [date, want] of Object.entries(truth)) {
        const got = r.days.find((d) => d.date === date);
        if (want === null) {
          if (!(got && got.status === "closed")) wrong++, console.error(`  ✗ ${date}: kapalı bekleniyordu`);
          continue;
        }
        const wantNames = want.map((w) => cleanDishName(w.replace(/\s*\(\d+\)$/, "")));
        const gotNames = (got?.items ?? []).map((i) => i.name);
        if (JSON.stringify(wantNames) !== JSON.stringify(gotNames)) wrong++, console.error(`  ✗ ${date}\n     beklenen: ${wantNames.join(" | ")}\n     gelen:    ${gotNames.join(" | ")}`);
      }
      ok(wrong === 0, `PDF sonucu doğru menüyle birebir eşleşti (${Object.keys(truth).length} gün, ${wrong} hata)`);
    }
  }
  console.log(fails ? `\n${fails} test BAŞARISIZ` : "\nTüm testler geçti");
  process.exit(fails ? 1 : 0);
})();
