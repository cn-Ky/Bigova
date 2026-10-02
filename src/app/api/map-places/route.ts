import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  OVERPASS_ENDPOINTS,
  buildOverpassQuery,
  elementToPlace,
  kindFromBusinessCategory,
  type MapPlace,
  type OverpassElement,
} from "@/lib/mapPlaces";

// Build sırasında statik üretilmesin; önbelleği Cache-Control ile yönetiyoruz.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FRESH_MS = 6 * 60 * 60 * 1000;
let lastGood: { at: number; places: MapPlace[] } | null = null;

async function fetchOsm(): Promise<MapPlace[]> {
  const body = `data=${encodeURIComponent(buildOverpassQuery())}`;
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
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
        signal: AbortSignal.timeout(14000),
      });
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      const data = (await response.json()) as { elements?: OverpassElement[] };
      const seen = new Set<string>();
      const places: MapPlace[] = [];
      for (const element of data.elements ?? []) {
        const place = elementToPlace(element);
        if (!place || seen.has(place.id)) continue;
        seen.add(place.id);
        places.push(place);
      }
      if (places.length) return places;
      throw new Error("Overpass boş yanıt döndü");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Overpass erişilemiyor");
}

async function fetchBigovaBusinesses(): Promise<MapPlace[]> {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
      return [];
    const { data, error } = await supabaseServer()
      .from("businesses")
      .select("*")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(500);
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

export async function GET() {
  const [osm, own] = await Promise.all([
    fetchOsm().then(
      (places) => ({ places, ok: true as const }),
      () => ({ places: [] as MapPlace[], ok: false as const }),
    ),
    fetchBigovaBusinesses(),
  ]);

  let osmPlaces = osm.places;
  let stale = false;
  if (!osm.ok) {
    if (lastGood) {
      osmPlaces = lastGood.places;
      stale = true;
    }
  } else {
    lastGood = { at: Date.now(), places: osm.places };
  }

  // Bigova'da kayıtlı işletme, aynı isimdeki OSM noktasının yerini alır.
  const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
  const ownNames = new Set(own.map((p) => norm(p.name)));
  const places = [
    ...own,
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
