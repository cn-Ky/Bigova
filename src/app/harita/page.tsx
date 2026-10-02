"use client";

import {
  categoryName,
  type MapPlace,
  type PlaceCategory,
} from "@/lib/mapPlaces";
import {
  faArrowRightArrowLeft,
  faBus,
  faClock,
  faGlobe,
  faLandmark,
  faLocationDot,
  faMagnifyingGlass,
  faMapLocationDot,
  faMoneyBillWave,
  faPersonWalking,
  faPhone,
  faRestroom,
  faRotateRight,
  faStore,
  faTag,
  faTree,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapFocus } from "./MapCanvas";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="biga-map-loading">Biga haritası hazırlanıyor...</div>
  ),
});

type Status = "loading" | "ready" | "error";
type Mode = "bus" | "walk";
type PointId = "" | "me" | string;

type RouteState = {
  coordinates: [number, number][];
  distance: number;
  minutes: number;
  approximate: boolean;
  mode: Mode;
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

const groupOrder: PlaceCategory[] = ["bus", "landmark", "park", "business", "atm"];
const trCollator = new Intl.Collator("tr");

export default function BigaMapPage() {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [stale, setStale] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [activeFilter, setActiveFilter] =
    useState<(typeof filters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<MapPlace | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  const [originId, setOriginId] = useState<PointId>("");
  const [destinationId, setDestinationId] = useState<PointId>("");
  const [mode, setMode] = useState<Mode>("bus");
  const [route, setRoute] = useState<RouteState | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const nonce = useRef(0);
  const routeRequest = useRef(0);

  // --- Yerleri sunucu API'sinden yükle (Overpass + Bigova işletmeleri) ---
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetch("/api/map-places", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as { places?: MapPlace[]; stale?: boolean };
      })
      .then((data) => {
        if (!data.places?.length) throw new Error("empty");
        setPlaces(data.places);
        setStale(Boolean(data.stale));
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [reloadKey]);

  // Otogar -> kampüs gibi mantıklı bir varsayılan rota öner (bulunursa).
  useEffect(() => {
    if (!places.length || originId || destinationId) return;
    const named = places.filter((place) => place.routeEligible);
    const terminal = named.find((place) => /otogar|terminal/i.test(place.name));
    const campus = named.find((place) =>
      /üniversite|kampüs|i̇i̇bf|iibf|myo|university/i.test(place.name),
    );
    if (terminal && campus && terminal.id !== campus.id) {
      setOriginId(terminal.id);
      setDestinationId(campus.id);
    }
  }, [destinationId, originId, places]);

  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: places.length };
    for (const place of places)
      result[place.category] = (result[place.category] ?? 0) + 1;
    return result;
  }, [places]);

  const visiblePlaces = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr");
    return places.filter((place) => {
      const matchesFilter =
        activeFilter === "all" || place.category === activeFilter;
      const matchesQuery =
        !normalized ||
        `${place.name} ${place.detail} ${categoryName(place.category)}`
          .toLocaleLowerCase("tr")
          .includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, places, query]);

  const searchResults = useMemo(
    () => (query.trim() ? visiblePlaces.slice(0, 7) : []),
    [query, visiblePlaces],
  );

  const routeGroups = useMemo(() => {
    const eligible = places.filter((place) => place.routeEligible);
    return groupOrder
      .map((category) => ({
        category,
        items: eligible
          .filter((place) => place.category === category)
          .sort((a, b) => trCollator.compare(a.name, b.name)),
      }))
      .filter((group) => group.items.length);
  }, [places]);

  const focusOn = useCallback((lat: number, lon: number, zoom = 16) => {
    nonce.current += 1;
    setFocus({ lat, lon, zoom, nonce: nonce.current });
  }, []);

  const selectPlace = useCallback(
    (place: MapPlace, fly = true) => {
      setSelected(place);
      if (fly) focusOn(place.lat, place.lon, 16);
    },
    [focusOn],
  );

  const locate = useCallback((): Promise<[number, number] | null> => {
    if (!navigator.geolocation) {
      setLocateError("Tarayıcın konum özelliğini desteklemiyor.");
      return Promise.resolve(null);
    }
    setLocating(true);
    setLocateError("");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const position: [number, number] = [coords.latitude, coords.longitude];
          setUserPosition(position);
          setLocating(false);
          focusOn(position[0], position[1], 16);
          resolve(position);
        },
        () => {
          setLocating(false);
          setLocateError(
            "Konuma erişilemedi. Tarayıcı ayarlarından konum iznini kontrol et.",
          );
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    });
  }, [focusOn]);

  // Esc ile yer kartını kapat
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const resolvePoint = useCallback(
    async (id: PointId) => {
      if (id === "me") {
        const position = userPosition ?? (await locate());
        return position
          ? { name: "Konumun", lat: position[0], lon: position[1], place: null }
          : null;
      }
      const place = byId.get(id);
      return place
        ? { name: place.name, lat: place.lat, lon: place.lon, place }
        : null;
    },
    [byId, locate, userPosition],
  );

  const showRoute = useCallback(
    async (fromId: PointId = originId, toId: PointId = destinationId) => {
      if (!fromId || !toId) {
        setRouteError("Başlangıç ve varış noktasını seç.");
        return;
      }
      if (fromId === toId) {
        setRouteError("Başlangıç ve varış noktası farklı olmalı.");
        return;
      }
      const request = ++routeRequest.current;
      setRouteLoading(true);
      setRouteError("");
      setRoute(null);
      try {
        const [from, to] = await Promise.all([resolvePoint(fromId), resolvePoint(toId)]);
        if (!from || !to) {
          setRouteError(
            from && to ? "Noktalar bulunamadı." : "Konumun alınamadığı için rota çizilemedi.",
          );
          return;
        }
        const result = await fetchRoute(from, to, mode);
        if (request !== routeRequest.current) return;
        setRoute(result);
        setSelected(null);
      } catch {
        if (request === routeRequest.current)
          setRouteError("Bu iki nokta arasında şu an rota oluşturulamadı.");
      } finally {
        if (request === routeRequest.current) setRouteLoading(false);
      }
    },
    [destinationId, mode, originId, resolvePoint],
  );

  function clearRoute() {
    routeRequest.current++;
    setRoute(null);
    setRouteError("");
    setRouteLoading(false);
  }

  function swapPoints() {
    setOriginId(destinationId);
    setDestinationId(originId);
    clearRoute();
  }

  function assignPoint(kind: "origin" | "destination", place: MapPlace) {
    const nextOrigin = kind === "origin" ? place.id : originId;
    const nextDestination = kind === "destination" ? place.id : destinationId;
    if (kind === "origin") setOriginId(place.id);
    else setDestinationId(place.id);
    if (nextOrigin && nextDestination && nextOrigin !== nextDestination)
      void showRoute(nextOrigin, nextDestination);
    else clearRoute();
  }

  const routeEnds = useMemo(
    () => ({
      origin: originId === "me" ? null : (byId.get(originId) ?? null),
      destination: destinationId === "me" ? null : (byId.get(destinationId) ?? null),
    }),
    [byId, destinationId, originId],
  );

  const selectsDisabled = status !== "ready";
  const placeholderFrom =
    status === "loading"
      ? "Yerler yükleniyor…"
      : status === "error"
        ? "Yerler yüklenemedi"
        : "Başlangıç noktası seç";
  const placeholderTo =
    status === "loading"
      ? "Yerler yükleniyor…"
      : status === "error"
        ? "Yerler yüklenemedi"
        : "Varış noktası seç";

  return (
    <main className="biga-map-page">
      <header className="biga-map-header">
        <div className="biga-map-heading">
          <span className="biga-map-kicker">BİGA · ÇANAKKALE</span>
          <h1 className="font-display">Şehri keşfet</h1>
          <p>Yakınındaki yerleri haritada bul.</p>
        </div>
        <span className="biga-map-count" aria-live="polite">
          <FontAwesomeIcon icon={faLocationDot} aria-hidden="true" />
          {status === "loading"
            ? "Yükleniyor…"
            : status === "error"
              ? "Yüklenemedi"
              : `${visiblePlaces.length} yer`}
        </span>
        <div className="biga-map-search-wrap">
          <label className="biga-map-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  selectPlace(searchResults[0]);
                  setSearchOpen(false);
                }
              }}
              placeholder="Yer veya kategori ara"
              aria-label="Haritada yer ara"
              autoComplete="off"
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                aria-label="Aramayı temizle"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setQuery("")}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </label>
          {searchOpen && query.trim() && (
            <ul className="biga-map-suggest" role="listbox" aria-label="Arama sonuçları">
              {searchResults.length ? (
                searchResults.map((place) => (
                  <li key={place.id} role="option" aria-selected={selected?.id === place.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        selectPlace(place);
                        setSearchOpen(false);
                      }}
                    >
                      <strong>{place.name}</strong>
                      <span>{place.detail}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="biga-map-suggest-empty">Sonuç bulunamadı</li>
              )}
            </ul>
          )}
        </div>
        <div className="biga-map-filters" role="group" aria-label="Harita kategorileri">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={activeFilter === filter.id}
              className={activeFilter === filter.id ? "is-active" : ""}
              onClick={() => setActiveFilter(filter.id)}
            >
              <FontAwesomeIcon icon={filter.icon} /> {filter.label}
              {status === "ready" && (
                <em className="biga-map-filter-count">{counts[filter.id] ?? 0}</em>
              )}
            </button>
          ))}
        </div>
      </header>

      <section className="biga-route-planner" aria-label="Güzergâh planla">
        <div className="biga-route-heading">
          <span className="biga-route-icon">
            <FontAwesomeIcon icon={mode === "bus" ? faBus : faPersonWalking} />
          </span>
          <div>
            <h2>Otobüs güzergâhı</h2>
            <p>Duraklar arasındaki yol ve tahmini varış süresi</p>
            <div className="biga-route-modes" role="group" aria-label="Ulaşım şekli">
              <button
                type="button"
                aria-pressed={mode === "bus"}
                className={mode === "bus" ? "is-active" : ""}
                onClick={() => {
                  setMode("bus");
                  clearRoute();
                }}
              >
                <FontAwesomeIcon icon={faBus} /> Araçla
              </button>
              <button
                type="button"
                aria-pressed={mode === "walk"}
                className={mode === "walk" ? "is-active" : ""}
                onClick={() => {
                  setMode("walk");
                  clearRoute();
                }}
              >
                <FontAwesomeIcon icon={faPersonWalking} /> Yürüyerek
              </button>
            </div>
          </div>
        </div>
        <div className="biga-route-fields">
          <label>
            <span>Nereden</span>
            <select
              value={originId}
              disabled={selectsDisabled}
              onChange={(event) => {
                setOriginId(event.target.value);
                clearRoute();
              }}
            >
              <option value="">{placeholderFrom}</option>
              {status === "ready" && <option value="me">📍 Konumum</option>}
              {routeGroups.map((group) => (
                <optgroup key={group.category} label={categoryName(group.category)}>
                  {group.items.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="biga-route-swap"
            onClick={swapPoints}
            disabled={selectsDisabled || (!originId && !destinationId)}
            aria-label="Başlangıç ve varışı değiştir"
            title="Başlangıç ve varışı değiştir"
          >
            <FontAwesomeIcon icon={faArrowRightArrowLeft} />
          </button>
          <label>
            <span>Nereye</span>
            <select
              value={destinationId}
              disabled={selectsDisabled}
              onChange={(event) => {
                setDestinationId(event.target.value);
                clearRoute();
              }}
            >
              <option value="">{placeholderTo}</option>
              {status === "ready" && <option value="me">📍 Konumum</option>}
              {routeGroups.map((group) => (
                <optgroup key={group.category} label={categoryName(group.category)}>
                  {group.items.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          {status === "error" ? (
            <button
              type="button"
              className="biga-route-submit"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              <FontAwesomeIcon icon={faRotateRight} /> Tekrar dene
            </button>
          ) : (
            <button
              type="button"
              className="biga-route-submit"
              onClick={() => void showRoute()}
              disabled={routeLoading || status !== "ready" || !originId || !destinationId}
            >
              <FontAwesomeIcon icon={mode === "bus" ? faBus : faPersonWalking} />{" "}
              {routeLoading ? "Rota çiziliyor" : "Yolu göster"}
            </button>
          )}
        </div>
        {route && (
          <div className="biga-route-result" role="status">
            <strong>Yaklaşık {route.minutes} dk</strong>
            <span>{(route.distance / 1000).toFixed(1)} km</span>
            <button type="button" className="biga-route-clear" onClick={clearRoute}>
              <FontAwesomeIcon icon={faXmark} /> Rotayı temizle
            </button>
            <small>
              {route.approximate
                ? "Yol servisine ulaşılamadı; kuş uçuşu mesafe gösteriliyor. "
                : ""}
              {route.mode === "walk"
                ? "Süre yürüyüş hızına (≈5 km/sa) göre tahmindir."
                : "Yol uzunluğu ve şehir içi ortalama otobüs hızına göre tahmin; canlı sefer bilgisi değildir."}
            </small>
          </div>
        )}
        {routeError && (
          <p className="biga-route-error" role="alert">
            {routeError}
          </p>
        )}
      </section>

      <section className="biga-map-frame" aria-label="Biga etkileşimli haritası">
        <MapCanvas
          places={visiblePlaces}
          selected={selected}
          onSelect={(place) => selectPlace(place)}
          route={route?.coordinates ?? null}
          routeApprox={route?.approximate ?? false}
          routeEnds={routeEnds}
          userPosition={userPosition}
          focus={focus}
          showAll={activeFilter !== "all" || query.trim() !== ""}
        />

        <button
          type="button"
          className="biga-map-locate"
          title="Konumuma git"
          aria-label="Konumuma git"
          disabled={locating}
          onClick={() => void locate()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={locating ? "is-spinning" : ""}>
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
        </button>

        {status === "loading" && (
          <div className="biga-map-status" role="status">
            <span className="biga-map-spinner" aria-hidden="true" /> Yerler yükleniyor…
          </div>
        )}
        {status === "ready" && stale && (
          <div className="biga-map-status" role="status">
            Veriler güncellenemedi, son kayıtlı noktalar gösteriliyor.
          </div>
        )}
        {locateError && (
          <div className="biga-map-status biga-map-status--warn" role="alert">
            {locateError}
            <button type="button" aria-label="Kapat" onClick={() => setLocateError("")}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}
        {status === "error" && (
          <div className="biga-map-overlay" role="alert">
            <strong>Harita noktaları yüklenemedi</strong>
            <p>
              Harita veri servisine şu an ulaşılamıyor. Haritayı kullanmaya devam
              edebilirsin; noktaları tekrar yüklemeyi deneyebilirsin.
            </p>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
              <FontAwesomeIcon icon={faRotateRight} /> Tekrar dene
            </button>
          </div>
        )}
        {status === "ready" && visiblePlaces.length === 0 && (
          <div className="biga-map-overlay biga-map-overlay--compact" role="status">
            <strong>Sonuç bulunamadı</strong>
            <p>Aramayı veya kategoriyi değiştirmeyi dene.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveFilter("all");
              }}
            >
              Filtreleri temizle
            </button>
          </div>
        )}

        <AnimatePresence>
          {selected && (
            <motion.aside
              key={selected.id}
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
              <ul className="biga-map-place-info">
                {selected.address && (
                  <li>
                    <FontAwesomeIcon icon={faLocationDot} aria-hidden="true" /> {selected.address}
                  </li>
                )}
                {selected.hours && (
                  <li>
                    <FontAwesomeIcon icon={faClock} aria-hidden="true" /> {selected.hours}
                  </li>
                )}
                {selected.phone && (
                  <li>
                    <FontAwesomeIcon icon={faPhone} aria-hidden="true" />{" "}
                    <a href={`tel:${selected.phone.replace(/[^+\d]/g, "")}`}>{selected.phone}</a>
                  </li>
                )}
                {selected.price && (
                  <li>
                    <FontAwesomeIcon icon={faTag} aria-hidden="true" /> {selected.price}
                  </li>
                )}
                {typeof selected.toilet === "boolean" && (
                  <li>
                    <FontAwesomeIcon icon={faRestroom} aria-hidden="true" />{" "}
                    {selected.toilet ? "Tuvalet var" : "Tuvalet yok"}
                  </li>
                )}
                {selected.website && (
                  <li>
                    <FontAwesomeIcon icon={faGlobe} aria-hidden="true" />{" "}
                    <a href={selected.website} target="_blank" rel="noreferrer noopener">
                      Web sitesi
                    </a>
                  </li>
                )}
              </ul>
              <div className="biga-map-place-actions">
                <button type="button" onClick={() => assignPoint("origin", selected)}>
                  Buradan başla
                </button>
                <button type="button" onClick={() => assignPoint("destination", selected)}>
                  Buraya git
                </button>
              </div>
              <a
                href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lon}#map=18/${selected.lat}/${selected.lon}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                OpenStreetMap&apos;te aç <span aria-hidden="true">↗</span>
              </a>
            </motion.aside>
          )}
        </AnimatePresence>
      </section>

      <div className="sr-only" role="status" aria-live="polite">
        {status === "loading"
          ? "Harita noktaları yükleniyor"
          : status === "error"
            ? "Harita noktaları şu an alınamadı"
            : "Harita hazır"}
      </div>
    </main>
  );
}

type Point = { lat: number; lon: number };

const ROUTE_ENDPOINTS: Record<Mode, string[]> = {
  bus: [
    "https://routing.openstreetmap.de/routed-car/route/v1/driving",
    "https://router.project-osrm.org/route/v1/driving",
  ],
  walk: [
    "https://routing.openstreetmap.de/routed-foot/route/v1/driving",
  ],
};

async function fetchRoute(from: Point, to: Point, mode: Mode): Promise<RouteState> {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  for (const base of ROUTE_ENDPOINTS[mode]) {
    try {
      const response = await fetch(
        `${base}/${coords}?overview=full&geometries=geojson&steps=false`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) continue;
      const data = (await response.json()) as {
        routes?: { distance: number; geometry: { coordinates: [number, number][] } }[];
      };
      const best = data.routes?.[0];
      if (!best?.geometry.coordinates.length) continue;
      return buildRoute(
        best.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]),
        best.distance,
        mode,
        false,
      );
    } catch {
      // sıradaki servisi dene
    }
  }
  // Tüm servisler başarısızsa kuş uçuşu çizgi göster.
  return buildRoute(
    [
      [from.lat, from.lon],
      [to.lat, to.lon],
    ],
    haversine(from, to),
    mode,
    true,
  );
}

function buildRoute(
  coordinates: [number, number][],
  distance: number,
  mode: Mode,
  approximate: boolean,
): RouteState {
  const km = distance / 1000;
  const minutes =
    mode === "walk"
      ? Math.max(1, Math.round((km / 5) * 60))
      : Math.max(3, Math.ceil((km / 22) * 60) + 2);
  return { coordinates, distance, minutes, approximate, mode };
}

function haversine(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
