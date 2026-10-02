"use client";

import {
    faBus,
    faLandmark,
    faMagnifyingGlass,
    faMapLocationDot,
    faMoneyBillWave,
    faStore,
    faTree,
    faXmark
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

export type MapPlace = {
  id: string;
  name: string;
  category: PlaceCategory;
  detail: string;
  lat: number;
  lon: number;
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

  useEffect(() => {
    const controller = new AbortController();
    const [south, west, north, east] = [40.12, 27.12, 40.34, 27.39];
    const area = `(${south},${west},${north},${east})`;
    const query = `[out:json][timeout:25];(nwr["amenity"~"atm|bank|bus_station|cafe|restaurant|fast_food|pharmacy|school|university|library|place_of_worship|community_centre|post_office"]${area};nwr["shop"]${area};nwr["leisure"~"park|garden|playground"]${area};nwr["historic"]${area};nwr["tourism"~"museum|attraction"]${area};nwr["highway"="bus_stop"]${area};nwr["public_transport"="platform"]${area};);out center 220;`;
    fetchOverpass(query, controller.signal)
      .then((data) => {
        const mapped = (data.elements ?? []).flatMap((element): MapPlace[] => {
          const tags = element.tags ?? {};
          const lat = element.lat ?? element.center?.lat;
          const lon = element.lon ?? element.center?.lon;
          if (typeof lat !== "number" || typeof lon !== "number") return [];
          const category = classify(tags);
          const detail =
            tags.amenity ??
            tags.shop ??
            tags.leisure ??
            tags.historic ??
            tags.tourism ??
            tags.highway ??
            "Biga";
          const name = tags.name ?? tags["name:tr"] ?? humanize(detail);
          return [
            {
              id: `${element.type}-${element.id}`,
              name,
              category,
              detail: humanize(detail),
              lat,
              lon,
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

  return (
    <main className="biga-map-page">
      <header className="biga-map-header">
        <div className="biga-map-heading">
          <span className="biga-map-kicker">BİGA · ÇANAKKALE</span>
          <h1 className="font-display">Şehri keşfet</h1>
          <p>Yakınındaki yerleri haritada bul.</p>
        </div>
        <span className="biga-map-count" aria-live="polite">
          <FontAwesomeIcon icon={faMapLocationDot} /> {visiblePlaces.length}{" "}
          nokta
        </span>
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
        className="biga-map-frame"
        aria-label="Biga etkileşimli haritası"
      >
        <MapCanvas
          places={visiblePlaces}
          selected={selected}
          onSelect={setSelected}
        />
        <div className="biga-map-attribution">
          Harita verisi © OpenStreetMap katkıcıları
        </div>
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

      <div className="biga-map-status" role="status">
        {loading
          ? "Biga çevresindeki noktalar yükleniyor..."
          : loadError
            ? "Harita noktaları şu an alınamadı. Biraz sonra yeniden deneyebilirsin."
            : `${places.length} harita noktası OpenStreetMap'ten yüklendi.`}
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
    [
      "school",
      "university",
      "library",
      "place_of_worship",
      "community_centre",
    ].includes(tags.amenity)
  )
    return "landmark";
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
