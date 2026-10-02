"use client";

import {
    faBus,
    faLandmark,
    faMagnifyingGlass,
    faMapLocationDot,
    faMoneyBillWave,
    faStore,
    faTree,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="biga-map-loading">Biga haritası hazırlanıyor...</div>
  ),
});

export type PlaceCategory = "landmark" | "park" | "business" | "bus" | "atm";
export type PlaceKind =
  | "school"
  | "municipality"
  | "fuel"
  | "cafe"
  | "restaurant"
  | "market"
  | "pharmacy"
  | "ziraat"
  | "garanti"
  | "isbank"
  | "vakifbank"
  | "bank"
  | "atm"
  | "bus"
  | "park"
  | "culture"
  | "business";

export type MapPlace = {
  id: string;
  name: string;
  category: PlaceCategory;
  kind: PlaceKind;
  detail: string;
  lat: number;
  lon: number;
  routeEligible: boolean;
};

type OverpassElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = { elements?: OverpassElement[] };
type RouteResult = {
  routes?: {
    distance: number;
    geometry: { coordinates: [number, number][] };
  }[];
};

const filters: {
  id: PlaceCategory | "all";
  label: string;
  icon: typeof faBus;
}[] = [
  { id: "all", label: "Tümü", icon: faMapLocationDot },
  { id: "landmark", label: "Kültür", icon: faLandmark },
  { id: "park", label: "Parklar", icon: faTree },
  { id: "business", label: "İşletmeler", icon: faStore },
  { id: "bus", label: "Duraklar", icon: faBus },
  { id: "atm", label: "ATM", icon: faMoneyBillWave },
];

export default function BigaMapPage() {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<(typeof filters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MapPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [route, setRoute] = useState<{
    coordinates: [number, number][];
    distance: number;
    minutes: number;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const [south, west, north, east] = [40.12, 27.12, 40.34, 27.39];
    const area = `(${south},${west},${north},${east})`;
    const query = `[out:json][timeout:25];(nwr["amenity"~"atm|bank|bus_station|cafe|restaurant|fast_food|fuel|pharmacy|school|university|college|library|place_of_worship|community_centre|post_office|townhall"]${area};nwr["office"="government"]${area};nwr["shop"]${area};nwr["leisure"~"park|garden|playground"]${area};nwr["historic"]${area};nwr["tourism"~"museum|attraction"]${area};nwr["highway"="bus_stop"]${area};nwr["public_transport"="platform"]${area};);out center 220;`;
    fetchOverpass(query, controller.signal)
      .then((data) => {
        const mapped = (data.elements ?? []).flatMap((element): MapPlace[] => {
          const tags = element.tags ?? {};
          const lat = element.lat ?? element.center?.lat;
          const lon = element.lon ?? element.center?.lon;
          if (typeof lat !== "number" || typeof lon !== "number") return [];
          const category = classify(tags);
          const kind = classifyKind(tags);
          const detail =
            tags.amenity ??
            tags.shop ??
            tags.leisure ??
            tags.historic ??
            tags.tourism ??
            tags.highway ??
            "Biga";
          const name =
            tags.name ??
            tags["name:tr"] ??
            tags.brand ??
            tags.operator ??
            humanize(detail);
          return [
            {
              id: `${element.type}-${element.id}`,
              name,
              category,
              kind,
              detail: humanize(detail),
              lat,
              lon,
              routeEligible: Boolean(tags.name || tags["name:tr"] || tags.ref),
            },
          ];
        });
        setPlaces(mapped);
        setLoading(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setLoading(false);
          setLoadError(true);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (places.length < 2 || originId || destinationId) return;
    const terminal = places.find((place) =>
      /otogar|terminal/i.test(place.name),
    );
    const campus = places.find((place) =>
      /üniversite|kampüs|university/i.test(place.name),
    );
    const first = terminal ?? places[0];
    const second =
      campus && campus.id !== first.id
        ? campus
        : places.find((place) => place.id !== first.id);
    setOriginId(first.id);
    if (second) setDestinationId(second.id);
  }, [destinationId, originId, places]);

  const visiblePlaces = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr");
    return places.filter((place) => {
      const matchesFilter =
        activeFilter === "all" || place.category === activeFilter;
      const matchesQuery =
        !normalized ||
        `${place.name} ${place.detail}`
          .toLocaleLowerCase("tr")
          .includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, places, query]);

  const routePlaces = useMemo(() => {
    const namedPlaces = places.filter((place) => place.routeEligible);
    return [...(namedPlaces.length > 1 ? namedPlaces : places)].sort((a, b) =>
      a.name.localeCompare(b.name, "tr"),
    );
  }, [places]);

  async function showRoute() {
    const origin = places.find((place) => place.id === originId);
    const destination = places.find((place) => place.id === destinationId);
    if (!origin || !destination || origin.id === destination.id) {
      setRouteError("Farklı başlangıç ve varış noktaları seç.");
      return;
    }
    setRouteLoading(true);
    setRouteError("");
    setRoute(null);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&steps=false`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Rota servisi yanıt vermedi");
      const data = (await response.json()) as RouteResult;
      const result = data.routes?.[0];
      if (!result?.geometry.coordinates.length)
        throw new Error("Rota bulunamadı");
      const kilometres = result.distance / 1000;
      setRoute({
        coordinates: result.geometry.coordinates.map(([lon, lat]) => [
          lat,
          lon,
        ]),
        distance: result.distance,
        minutes: Math.max(3, Math.ceil((kilometres / 22) * 60) + 2),
      });
      setSelected(null);
    } catch {
      setRouteError("Bu iki nokta arasında şu an rota oluşturulamadı.");
    } finally {
      setRouteLoading(false);
    }
  }

  return (
    <main className="biga-map-page">
      <header className="biga-map-header">
        <div className="biga-map-heading">
          <span className="biga-map-kicker">BİGA · ÇANAKKALE</span>
          <h1 className="font-display">Şehri keşfet</h1>
          <p>Yakınındaki yerleri haritada bul.</p>
        </div>
        <label className="biga-map-search">
          <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Yer veya kategori ara"
            aria-label="Haritada yer ara"
          />
          {query && (
            <button
              type="button"
              aria-label="Aramayı temizle"
              onClick={() => setQuery("")}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </label>
        <div
          className="biga-map-filters"
          role="group"
          aria-label="Harita kategorileri"
        >
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={activeFilter === filter.id}
              className={activeFilter === filter.id ? "is-active" : ""}
              onClick={() => setActiveFilter(filter.id)}
            >
              <FontAwesomeIcon icon={filter.icon} /> {filter.label}
            </button>
          ))}
        </div>
      </header>

      <section
        className="biga-route-planner"
        aria-label="Otobüs güzergâhı planla"
      >
        <div className="biga-route-heading">
          <span className="biga-route-icon">
            <FontAwesomeIcon icon={faBus} />
          </span>
          <div>
            <h2>Otobüs güzergâhı</h2>
            <p>Duraklar arasındaki yol ve tahmini varış süresi</p>
          </div>
        </div>
        <div className="biga-route-fields">
          <label>
            <span>Nereden</span>
            <select
              value={originId}
              onChange={(event) => {
                setOriginId(event.target.value);
                setRoute(null);
              }}
            >
              <option value="">Başlangıç noktası seç</option>
              {routePlaces.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name} · {categoryName(place.category)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Nereye</span>
            <select
              value={destinationId}
              onChange={(event) => {
                setDestinationId(event.target.value);
                setRoute(null);
              }}
            >
              <option value="">Varış noktası seç</option>
              {routePlaces.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name} · {categoryName(place.category)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="biga-route-submit"
            onClick={showRoute}
            disabled={routeLoading || places.length < 2}
          >
            <FontAwesomeIcon icon={faBus} />{" "}
            {routeLoading ? "Rota çiziliyor" : "Yolu göster"}
          </button>
        </div>
        {route && (
          <div className="biga-route-result" role="status">
            <strong>Yaklaşık {route.minutes} dk</strong>
            <span>{(route.distance / 1000).toFixed(1)} km</span>
            <small>
              Yol uzunluğu ve şehir içi ortalama otobüs hızına göre tahmin;
              canlı sefer bilgisi değildir.
            </small>
          </div>
        )}
        {routeError && (
          <p className="biga-route-error" role="alert">
            {routeError}
          </p>
        )}
      </section>

      <section
        className="biga-map-frame"
        aria-label="Biga etkileşimli haritası"
      >
        <MapCanvas
          places={visiblePlaces}
          selected={selected}
          onSelect={setSelected}
          route={route?.coordinates ?? null}
        />
        <AnimatePresence>
          {selected && (
            <motion.aside
              className="biga-map-place"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              aria-label="Seçilen yer"
            >
              <button
                type="button"
                className="biga-map-place-close"
                aria-label="Yer kartını kapat"
                onClick={() => setSelected(null)}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
              <span>{categoryName(selected.category)}</span>
              <h2>{selected.name}</h2>
              <p>{selected.detail}</p>
              <a
                href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lon}#map=18/${selected.lat}/${selected.lon}`}
                target="_blank"
                rel="noreferrer"
              >
                OpenStreetMap&apos;te aç <span aria-hidden="true">↗</span>
              </a>
            </motion.aside>
          )}
        </AnimatePresence>
      </section>

      <div className="sr-only" role="status" aria-live="polite">
        {loading
          ? "Harita noktaları yükleniyor"
          : loadError
            ? "Harita noktaları şu an alınamadı"
            : "Harita hazır"}
      </div>
    </main>
  );
}

function classify(tags: Record<string, string>): PlaceCategory {
  if (tags.amenity === "atm" || tags.amenity === "bank") return "atm";
  if (
    tags.amenity === "bus_station" ||
    tags.highway === "bus_stop" ||
    tags.public_transport === "platform"
  )
    return "bus";
  if (tags.leisure) return "park";
  if (
    tags.historic ||
    tags.tourism ||
    tags.office === "government" ||
    [
      "school",
      "university",
      "library",
      "place_of_worship",
      "community_centre",
      "townhall",
    ].includes(tags.amenity)
  )
    return "landmark";
  return "business";
}

function classifyKind(tags: Record<string, string>): PlaceKind {
  const name =
    `${tags.brand ?? ""} ${tags.operator ?? ""} ${tags.name ?? ""}`.toLocaleLowerCase(
      "tr",
    );
  if (/ziraat/.test(name)) return "ziraat";
  if (/garanti/.test(name)) return "garanti";
  if (/iş bank|isbank|işbank/.test(name)) return "isbank";
  if (/vakıfbank|vakifbank/.test(name)) return "vakifbank";
  if (
    /belediye|townhall/.test(name) ||
    tags.amenity === "townhall" ||
    tags.office === "government"
  )
    return "municipality";
  if (
    tags.amenity === "school" ||
    tags.amenity === "university" ||
    tags.amenity === "college"
  )
    return "school";
  if (tags.amenity === "fuel") return "fuel";
  if (tags.amenity === "cafe") return "cafe";
  if (["restaurant", "fast_food", "food_court"].includes(tags.amenity))
    return "restaurant";
  if (tags.amenity === "pharmacy") return "pharmacy";
  if (
    ["community_centre", "library", "place_of_worship"].includes(
      tags.amenity,
    ) ||
    tags.historic ||
    tags.tourism
  )
    return "culture";
  if (tags.amenity === "bank") return "bank";
  if (tags.amenity === "atm") return "atm";
  if (
    tags.amenity === "bus_station" ||
    tags.highway === "bus_stop" ||
    tags.public_transport === "platform"
  )
    return "bus";
  if (tags.leisure) return "park";
  if (tags.historic || tags.tourism) return "culture";
  if (tags.shop) return "market";
  return "business";
}

function categoryName(category: PlaceCategory) {
  return {
    landmark: "Kültür & önemli yer",
    park: "Park & açık alan",
    business: "İşletme",
    bus: "Otobüs durağı",
    atm: "Banka & ATM",
  }[category];
}

async function fetchOverpass(
  query: string,
  signal: AbortSignal,
): Promise<OverpassResponse> {
  let lastError: unknown;
  for (const endpoint of [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ]) {
    if (signal.aborted) throw new DOMException("Request aborted", "AbortError");
    const requestController = new AbortController();
    const abortRequest = () => requestController.abort();
    const timeout = setTimeout(abortRequest, 12000);
    signal.addEventListener("abort", abortRequest, { once: true });
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: requestController.signal,
      });
      if (!response.ok)
        throw new Error(`Overpass request failed: ${response.status}`);
      return (await response.json()) as OverpassResponse;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abortRequest);
    }
  }
  throw lastError ?? new Error("Overpass endpoints unavailable");
}

function humanize(value: string) {
  const translations: Record<string, string> = {
    atm: "ATM",
    bank: "Banka",
    bus_station: "Otogar",
    bus_stop: "Otobüs durağı",
    cafe: "Kafe",
    restaurant: "Restoran",
    fast_food: "Hızlı yemek",
    pharmacy: "Eczane",
    school: "Okul",
    university: "Üniversite",
    library: "Kütüphane",
    place_of_worship: "İbadethane",
    community_centre: "Kültür merkezi",
    post_office: "Postane",
    supermarket: "Süpermarket",
    convenience: "Market",
    bakery: "Fırın",
    clothes: "Giyim mağazası",
    park: "Park",
    garden: "Bahçe",
    playground: "Oyun alanı",
    museum: "Müze",
    attraction: "Gezi noktası",
  };
  return (
    translations[value] ??
    value
      .replaceAll("_", " ")
      .replace(/^./, (letter) => letter.toLocaleUpperCase("tr"))
  );
}
