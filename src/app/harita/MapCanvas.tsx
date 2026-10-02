"use client";

import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { BIGA_CENTER, kindTier, type MapPlace, type PlaceKind } from "@/lib/mapPlaces";

export type MapFocus = {
  lat: number;
  lon: number;
  /** En az bu zoom seviyesine yaklaş (mevcut zoom daha yakınsa korunur) */
  zoom?: number;
  nonce: number;
};

const TILE_SOURCES = [
  {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    nativeZoom: 19,
  },
  {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    nativeZoom: 19,
  },
] as const;

const MAX_MARKERS = 350;

export default function MapCanvas({
  places,
  selected,
  onSelect,
  route,
  routeApprox,
  routeEnds,
  userPosition,
  focus,
  showAll,
}: {
  places: MapPlace[];
  selected: MapPlace | null;
  onSelect: (place: MapPlace) => void;
  route: [number, number][] | null;
  /** Yol servisi yoksa kuş uçuşu (kesikli) çizgi */
  routeApprox: boolean;
  routeEnds: { origin: MapPlace | null; destination: MapPlace | null };
  userPosition: [number, number] | null;
  focus: MapFocus | null;
  /** Filtre/arama aktifken zoom'a göre gizlemeyi kapatır */
  showAll: boolean;
}) {
  const [tileIndex, setTileIndex] = useState(0);
  const tileErrors = useRef(0);
  const tile = TILE_SOURCES[tileIndex];

  // Tile sunucusu arka arkaya hata verirse yedek sağlayıcıya geç.
  const onTileError = useCallback(() => {
    tileErrors.current += 1;
    if (tileErrors.current >= 8 && tileIndex < TILE_SOURCES.length - 1) {
      tileErrors.current = 0;
      setTileIndex((index) => index + 1);
    }
  }, [tileIndex]);

  return (
    <MapContainer
      center={BIGA_CENTER}
      zoom={14}
      minZoom={11}
      maxZoom={20}
      scrollWheelZoom
      zoomControl={false}
      className="biga-leaflet"
    >
      <TileLayer
        key={tile.url}
        attribution={tile.attribution}
        url={tile.url}
        maxNativeZoom={tile.nativeZoom}
        maxZoom={20}
        keepBuffer={4}
        updateWhenZooming={false}
        eventHandlers={{ tileerror: onTileError }}
      />
      <ZoomControl position="bottomright" zoomInTitle="Yakınlaştır" zoomOutTitle="Uzaklaştır" />
      <MapController focus={focus} route={route} />
      {route && (
        <>
          <Polyline
            positions={route}
            pathOptions={{ color: "#ffffff", weight: 10, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
          />
          <Polyline
            positions={route}
            pathOptions={{
              color: "#f06455",
              weight: 6,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
              dashArray: routeApprox ? "2 12" : undefined,
            }}
          />
        </>
      )}
      <ViewportMarkers
        places={places}
        selected={selected}
        onSelect={onSelect}
        showAll={showAll}
      />
      {route && routeEnds.origin && (
        <Marker
          position={[routeEnds.origin.lat, routeEnds.origin.lon]}
          icon={endIcon("A")}
          zIndexOffset={900}
          interactive={false}
        />
      )}
      {route && routeEnds.destination && (
        <Marker
          position={[routeEnds.destination.lat, routeEnds.destination.lon]}
          icon={endIcon("B")}
          zIndexOffset={900}
          interactive={false}
        />
      )}
      {userPosition && (
        <Marker position={userPosition} icon={userIcon} title="Konumun" zIndexOffset={800} />
      )}
    </MapContainer>
  );
}

/** Harita hareketi (odaklanma / rotaya sığdırma) — sadece ilgili veri değişince çalışır. */
function MapController({
  focus,
  route,
}: {
  focus: MapFocus | null;
  route: [number, number][] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.lat, focus.lon], Math.max(map.getZoom(), focus.zoom ?? 16), {
      duration: 0.7,
    });
    // Sadece nonce değişince hareket et
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus?.nonce]);

  useEffect(() => {
    if (route && route.length > 1)
      map.fitBounds(L.latLngBounds(route), { padding: [56, 56], maxZoom: 17, animate: true });
  }, [map, route]);

  // Sayfa düzeni değişince (kenar çubuğu açılıp kapanınca) Leaflet boyutu tazelensin.
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

type View = { bounds: L.LatLngBounds; zoom: number };

/**
 * Yalnızca görünen alandaki noktaları çizer; uzaklaştıkça önemsiz noktaları gizler.
 * Binlerce DOM marker'ı yerine en fazla MAX_MARKERS tane çizilir.
 */
function ViewportMarkers({
  places,
  selected,
  onSelect,
  showAll,
}: {
  places: MapPlace[];
  selected: MapPlace | null;
  onSelect: (place: MapPlace) => void;
  showAll: boolean;
}) {
  const map = useMap();
  const [view, setView] = useState<View>(() => ({
    bounds: map.getBounds(),
    zoom: map.getZoom(),
  }));
  const update = useCallback(
    () => setView({ bounds: map.getBounds(), zoom: map.getZoom() }),
    [map],
  );
  useMapEvents({ moveend: update, zoomend: update, resize: update });
  // Harita ilk yerleştiğinde gerçek sınırları al.
  useEffect(() => {
    map.whenReady(update);
  }, [map, update]);

  const visible = useMemo(() => {
    const padded = view.bounds.pad(0.25);
    const minTier = showAll || view.zoom >= 16 ? 3 : view.zoom >= 14 ? 2 : 1;
    const inView = places.filter(
      (place) =>
        padded.contains([place.lat, place.lon]) &&
        (showAll || kindTier(place.kind) <= minTier),
    );
    inView.sort((a, b) => kindTier(a.kind) - kindTier(b.kind));
    const limited = inView.slice(0, MAX_MARKERS);
    if (selected && !limited.some((place) => place.id === selected.id))
      limited.push(selected);
    return limited;
  }, [places, selected, showAll, view]);

  return (
    <>
      {visible.map((place) => {
        const isSelected = selected?.id === place.id;
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lon]}
            icon={makeIcon(place.kind, isSelected)}
            zIndexOffset={isSelected ? 1000 : -kindTier(place.kind) * 10}
            eventHandlers={{ click: () => onSelect(place) }}
            title={place.name}
            alt={place.name}
          />
        );
      })}
    </>
  );
}

const paths: Record<PlaceKind, string> = {
  school:
    '<path d="m3 9 9-5 9 5-9 5-9-5Zm3 2v5c4 3 8 3 12 0v-5M21 9v6"/><path d="M9 17v3h6v-3"/>',
  municipality:
    '<path d="M3 20h18M5 17h14M6 17V9m4 8V9m4 8V9m4 8V9M3 7l9-4 9 4v2H3z"/>',
  health: '<path d="M12 4v16M4 12h16"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
  fuel: '<path d="M5 21V4h10v17M5 9h10m4-2 2 2v8a2 2 0 0 1-4 0v-4h-2M8 6h4"/>',
  cafe: '<path d="M5 8h12v7a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8Zm12 2h2a2 2 0 1 1 0 4h-2M8 3v2m4-2v2"/>',
  restaurant:
    '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18m10-18v18m0-18c-3 3-3 8 0 9"/>',
  market: '<path d="M4 9h16l-1-5H5L4 9Zm1 0v12h14V9M9 21v-7h6v7M4 12h16"/>',
  pharmacy: '<path d="M12 4v16M4 12h16"/>',
  ziraat: '<path d="M5 18c1-7 5-11 14-12-1 8-5 12-12 13m0 0 8-9"/>',
  garanti: '<path d="m12 4 9 16H3L12 4Z"/><path d="M9 15h6"/>',
  isbank: '<path d="M4 20h16M6 17h12M7 17V9m5 8V9m5 8V9M4 7l8-4 8 4v2H4z"/>',
  vakifbank:
    '<path d="M4 20h16M6 17h12M7 17V9m5 8V9m5 8V9M4 7l8-4 8 4v2H4z"/><path d="M10 6h4"/>',
  bank: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="m3 8 9-5 9 5M8 12v5m4-5v5m4-5v5"/>',
  atm: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8v4H8zm1 8h6m-6 3h4"/>',
  bus: '<path d="M5 16V7c0-2 1-3 3-3h8c2 0 3 1 3 3v9M5 12h14M7 16h10M8 19h.01M16 19h.01"/>',
  park: '<path d="M12 21v-8m0 0c-5 0-7-3-7-6 4 0 6 2 7 5 1-5 4-7 8-7 0 5-2 8-8 8z"/>',
  culture: '<path d="M4 20h16M6 17h12M7 17V9m5 8V9m5 8V9M4 7l8-4 8 4v2H4z"/>',
  business:
    '<path d="M4 20V8l8-4 8 4v12M2 20h20M8 10h2m4 0h2m-8 4h2m4 0h2m-4 6v-4h3v4"/>',
};

const bankLogos: Partial<Record<PlaceKind, string>> = {
  ziraat: "Z",
  garanti: "G",
  isbank: "İ",
  vakifbank: "V",
};

// İkonları türe göre önbelleğe al: her render'da DOM'u yeniden kurmamak için.
const iconCache = new Map<string, L.DivIcon>();

function makeIcon(kind: PlaceKind, selected: boolean) {
  const key = `${kind}:${selected ? 1 : 0}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const logo = bankLogos[kind]
    ? `<b class="biga-map-bank-logo">${bankLogos[kind]}</b>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind]}</svg>`;
  const icon = L.divIcon({
    className: "biga-map-marker",
    html: `<span class="biga-map-pin biga-map-pin--${kind}${selected ? " is-selected" : ""}">${logo}</span>`,
    iconSize: [38, 46],
    iconAnchor: [19, 42],
  });
  iconCache.set(key, icon);
  return icon;
}

function endIcon(label: "A" | "B") {
  const key = `end:${label}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    className: "biga-map-marker",
    html: `<span class="biga-map-end biga-map-end--${label}">${label}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
  iconCache.set(key, icon);
  return icon;
}

const userIcon = L.divIcon({
  className: "biga-map-marker",
  html: '<span class="biga-map-user-pin"><i></i></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});
