/**
 * Biga haritası için OpenStreetMap anlık görüntüsü üretir: public/data/biga-places.json
 *
 * /api/map-places canlı Overpass'a ulaşamazsa bu dosyayı yedek olarak kullanır, böylece harita
 * Overpass kapalıyken de dolu açılır. Düzenli (ör. ayda bir) çalıştırıp commit'le.
 *
 *   npm run map:snapshot
 *
 * Internet gerekir (Node 18+). Çıktıdaki özet, hangi türden kaç nokta bulunduğunu gösterir.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  OVERPASS_ENDPOINTS,
  buildOverpassQuery,
  dedupePlaces,
  elementToPlaces,
  type MapPlace,
  type OverpassElement,
} from "../src/lib/mapPlaces";

const OUT = "public/data/biga-places.json";

async function fetchElements(): Promise<OverpassElement[]> {
  const body = `data=${encodeURIComponent(buildOverpassQuery())}`;
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`→ ${endpoint}`);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "Bigova-snapshot/1.0",
        },
        body,
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { elements?: OverpassElement[] };
      if (data.elements?.length) return data.elements;
      throw new Error("boş yanıt");
    } catch (error) {
      lastError = error;
      console.warn(`  başarısız: ${(error as Error).message}`);
    }
  }
  throw lastError ?? new Error("Overpass erişilemiyor");
}

const elements = await fetchElements();
const seen = new Set<string>();
const raw: MapPlace[] = [];
for (const element of elements)
  for (const place of elementToPlaces(element)) {
    if (seen.has(place.id)) continue;
    seen.add(place.id);
    raw.push(place);
  }
const places = dedupePlaces(raw);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), places }));

const byKind = new Map<string, number>();
for (const place of places) byKind.set(place.kind, (byKind.get(place.kind) ?? 0) + 1);
console.log(`\n${elements.length} OSM öğesi → ${raw.length} nokta → ${places.length} nokta (mükerrerler birleştirildi)`);
console.log(
  [...byKind.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => `${kind}: ${count}`)
    .join("  "),
);
console.log(`\nYazıldı: ${OUT}`);
