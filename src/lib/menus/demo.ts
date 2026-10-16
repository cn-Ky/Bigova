import { addDays, addMonths, COMU_SCOPE, KYK_SCOPE, monthKey, monthRange, sumKcal, weekdayOf, type DayMenu, type MenuItem, type MenuRow } from "./types";

/**
 * ÖRNEK veri (gerçek menü DEĞİLDİR). Yalnızca geliştirmede ya da NEXT_PUBLIC_MENU_DEMO=1 iken `?demo=1` ile
 * görünür; arayüz bunu "Örnek veri" şeridiyle açıkça belirtir. Tasarımı veri olmadan denemek içindir.
 */
const I = (name: string, kcal: number, cat: MenuItem["cat"], extra: Partial<MenuItem> = {}): MenuItem => ({ name, kcal, cat, ...extra });

const CORBA = [I("Mercimek Çorbası", 180, "corba"), I("Ezogelin Çorbası", 210, "corba"), I("Domates Çorbası", 150, "corba"), I("Yayla Çorbası", 190, "corba"), I("Tarhana Çorbası", 170, "corba")];
const ANA = [I("Tavuk Sote", 320, "ana"), I("Etli Kuru Fasulye", 380, "ana"), I("Izgara Köfte", 410, "ana"), I("Orman Kebabı", 400, "ana"), I("Tavuk Şinitzel", 420, "ana")];
const PILAV = [I("Bulgur Pilavı", 260, "pilav"), I("Domates Soslu Makarna", 300, "pilav"), I("Pirinç Pilavı", 280, "pilav"), I("Peynirli Börek", 430, "pilav"), I("Şehriyeli Kuskus", 330, "pilav")];
const YAN = [I("Karışık Salata", 70, "yan"), I("Cacık", 110, "yan"), I("Revani", 420, "tatli"), I("Ayran", 74, "icecek"), I("Sütlaç", 250, "tatli")];

const dinner = (i: number): DayMenu["items"] => {
  const items = [CORBA[i % 5], ANA[(i * 2) % 5], PILAV[(i * 3) % 5], YAN[i % 5]];
  if (i % 3 === 0) items.push(YAN[(i + 2) % 5]);
  if (i % 4 === 1) items.splice(2, 0, { ...ANA[(i + 3) % 5], alt: true });
  return items;
};
const breakfast = (i: number): MenuItem[] => [
  I(["Haşlanmış Yumurta", "Peynirli Omlet", "Menemen", "Sucuklu Yumurta"][i % 4], 120, "kahvalti"),
  I("Beyaz Peynir", 90, "kahvalti"),
  I("Siyah/Yeşil Zeytin", 60, "kahvalti"),
  I(["Patates Kızartması", "Karışık Kızartma", "Pankek + Bal"][i % 3], 260, "kahvalti"),
  I("Çay", 5, "icecek"),
];

export function buildDemoRows(today: string): MenuRow[] {
  const rows: MenuRow[] = [];
  const cur = monthKey(today);
  for (const key of [addMonths(cur, -1), cur, addMonths(cur, 1)]) {
    const { start, end } = monthRange(key);
    for (let d = start, i = 0; d <= end; d = addDays(d, 1), i++) {
      const wd = weekdayOf(d);
      const mk = (source: MenuRow["source"], scope: string, meal: MenuRow["meal"], items: MenuItem[], variant: MenuRow["variant"] = "normal"): MenuRow => ({
        source, scope, variant, date: d, meal, status: "open", items, totalKcal: sumKcal(items),
      });
      rows.push(mk("kyk", KYK_SCOPE, "breakfast", breakfast(i)), mk("kyk", KYK_SCOPE, "dinner", dinner(i)));
      if (wd < 5) {
        rows.push(mk("comu", COMU_SCOPE, "daily", dinner(i + 1)));
        rows.push(mk("comu", COMU_SCOPE, "daily", dinner(i + 1).filter((x) => x.cat !== "ana").concat(I("Nohut Yemeği", 340, "ana", { vegan: true })).map((x) => ({ ...x, vegan: x.cat === "ana" ? true : x.vegan })), "vegan"));
      }
    }
  }
  return rows;
}
