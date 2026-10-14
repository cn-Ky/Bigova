import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { CUSTOM_PLACES } from "@/lib/customPlaces";
import {
  OVERPASS_ENDPOINTS,
  buildOverpassQuery,
  dedupePlaces,
  elementToPlaces,
  kindFromBusinessCategory,
  type MapPlace,
  type OverpassElement,
} from "@/lib/mapPlaces";

// Build sırasında statik üretilmesin; önbelleği Cache-Control ile yönetiyoruz.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FRESH_MS = 6 * 60 * 60 * 1000;
/** Tüm Overpass denemeleri için toplam süre bütçesi (maxDuration'ın altında kalmalı). */
const OSM_BUDGET_MS = 48_000;
let lastGood: { at: number; places: MapPlace[] } | null = null;
// Önbellek soğukken eşzamanlı istekler her biri Overpass'a gitmesin (hem yavaş hem Overpass'ı kızdırır).
let inflight: Promise<MapPlace[]> | null = null;
const fetchOsmShared = () => {
  inflight ??= fetchOsm().finally(() => {
    inflight = null;
  });
  return inflight;
};

async function fetchOsm(): Promise<MapPlace[]> {
  const body = `data=${encodeURIComponent(buildOverpassQuery())}`;
  const deadline = Date.now() + OSM_BUDGET_MS;
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const left = deadline - Date.now();
    if (left < 4000) break;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "Bigova/1.0 (https://bigova.vercel.app)",
          Accept: "application/json",
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(Math.min(left, 26_000)),
      });
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      const data = (await response.json()) as { elements?: OverpassElement[] };
      const seen = new Set<string>();
      const places: MapPlace[] = [];
      for (const element of data.elements ?? []) {
        for (const place of elementToPlaces(element)) {
          if (seen.has(place.id)) continue;
          seen.add(place.id);
          places.push(place);
        }
      }
      if (places.length) return dedupePlaces(places);
      throw new Error("Overpass boş yanıt döndü");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Overpass erişilemiyor");
}

/** Canlı OSM alınamazsa, `npm run map:snapshot` ile üretilen kayıtlı noktaları kullan. */
async function fetchSnapshot(origin: string): Promise<MapPlace[]> {
  try {
    const response = await fetch(`${origin}/data/biga-places.json`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { places?: MapPlace[] };
    return Array.isArray(data.places) ? data.places : [];
  } catch {
    return [];
  }
}

async function fetchBigovaBusinesses(): Promise<MapPlace[]> {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
      return [];
    const { data, error } = await supabasePublic()
      .from("businesses")
      .select("*")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(2000);
    if (error || !data) return [];
    return data.flatMap((b): MapPlace[] => {
      if (typeof b.lat !== "number" || typeof b.lng !== "number") return [];
      const hours =
        b.opens_at && b.closes_at ? `${b.opens_at} – ${b.closes_at}` : undefined;
      return [
        {
          id: `bigova-${b.id}`,
          name: String(b.name),
          category: "business",
          kind: kindFromBusinessCategory(String(b.category ?? "")),
          detail: String(b.category ?? "İşletme"),
          lat: b.lat,
          lon: b.lng,
          routeEligible: true,
          source: "bigova",
          hours,
          phone: b.phone ?? undefined,
          address: b.address ?? undefined,
          price: b.price_info ?? undefined,
          toilet: typeof b.has_toilet === "boolean" ? b.has_toilet : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const [osm, own] = await Promise.all([
    fetchOsmShared().then(
      (places) => ({ places, ok: true as const }),
      () => ({ places: [] as MapPlace[], ok: false as const }),
    ),
    fetchBigovaBusinesses(),
  ]);

  let osmPlaces = osm.places;
  let stale = false;
  if (!osm.ok) {
    stale = true;
    if (lastGood) osmPlaces = lastGood.places;
    else osmPlaces = await fetchSnapshot(new URL(request.url).origin);
  } else {
    lastGood = { at: Date.now(), places: osm.places };
  }

  // Bigova'da kayıtlı / elle eklenen yer, aynı isimdeki OSM noktasının yerini alır.
  const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
  const ours = [...own, ...CUSTOM_PLACES];
  const ownNames = new Set(ours.map((p) => norm(p.name)));
  const places = [
    ...ours,
    ...osmPlaces.filter((p) => !ownNames.has(norm(p.name))),
  ];

  if (!places.length) {
    return NextResponse.json(
      { error: "Harita noktaları şu an alınamadı." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const fresh = osm.ok || (lastGood && Date.now() - lastGood.at < FRESH_MS);
  return NextResponse.json(
    { places, stale },
    {
      headers: {
        "Cache-Control": fresh
          ? "public, s-maxage=21600, stale-while-revalidate=86400"
          : "no-store",
      },
    },
  );
}
