"use client";

import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  ZoomControl,
  useMap,
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

export default function MapCanvas({
  places,
  selected,
  onSelect,
  route,
  routeApprox,
  routeEnds,
  userPosition,
  focus,
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
      <PlaceLayer places={places} selected={selected} onSelect={onSelect} />
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

/** Küçük sonuç kümelerinde (ör. ATM filtresi) kümeleme kapalı; hepsi tek tek görünür. */
const SMALL_SET = 150;
/** Bu zoom ve üstünde hiçbir nokta kümelenmez (sokak seviyesi). */
const STREET_ZOOM = 16;

function clusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? "sm" : count < 60 ? "md" : "lg";
  const px = size === "sm" ? 38 : size === "md" ? 46 : 54;
  return L.divIcon({
    html: `<span>${count}</span>`,
    className: `biga-map-cluster biga-map-cluster--${size}`,
    iconSize: L.point(px, px),
  });
}

/**
 * Tüm noktaları çizer: hiçbiri gizlenmez. Yoğun alanlarda yakın noktalar sayılı kümelere toplanır;
 * yakınlaştıkça (veya kümeye dokununca) tek tek açılır. Marker'lar yer nesnesine göre önbelleğe alınır.
 */
function PlaceLayer({
  places,
  selected,
  onSelect,
}: {
  places: MapPlace[];
  selected: MapPlace | null;
  onSelect: (place: MapPlace) => void;
}) {
  const map = useMap();
  const markers = useRef(new WeakMap<MapPlace, L.Marker>());
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef<MapPlace | null>(selected);
  const lastSelected = useRef<MapPlace | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Seçili yer filtre dışında kalsa bile haritada görünsün.
  const layerPlaces = useMemo(
    () => (selected && !places.includes(selected) ? [...places, selected] : places),
    [places, selected],
  );

  useEffect(() => {
    const small = layerPlaces.length <= SMALL_SET;
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      animateAddingMarkers: false,
      maxClusterRadius: (zoom) => (zoom >= 15 ? 36 : 54),
      disableClusteringAtZoom: small ? 12 : STREET_ZOOM,
      iconCreateFunction: clusterIcon,
    });
    const list: L.Marker[] = [];
    for (const place of layerPlaces) {
      let marker = markers.current.get(place);
      if (!marker) {
        marker = L.marker([place.lat, place.lon], {
          icon: makeIcon(place.kind, false),
          title: place.name,
          alt: place.name,
          zIndexOffset: -kindTier(place.kind) * 10,
        });
        marker.on("click", () => onSelectRef.current(place));
        markers.current.set(place, marker);
      }
      const isSelected = selectedRef.current === place;
      marker.setIcon(makeIcon(place.kind, isSelected));
      marker.setZIndexOffset(isSelected ? 1000 : -kindTier(place.kind) * 10);
      list.push(marker);
    }
    group.addLayers(list);
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      group.clearLayers();
    };
  }, [map, layerPlaces]);

  // Seçim değişince yalnızca iki marker'ın simgesini güncelle (katmanı yeniden kurma).
  useEffect(() => {
    selectedRef.current = selected;
    const previous = lastSelected.current;
    if (previous && previous !== selected) {
      const marker = markers.current.get(previous);
      marker?.setIcon(makeIcon(previous.kind, false));
      marker?.setZIndexOffset(-kindTier(previous.kind) * 10);
    }
    if (selected) {
      const marker = markers.current.get(selected);
      marker?.setIcon(makeIcon(selected.kind, true));
      marker?.setZIndexOffset(1000);
    }
    lastSelected.current = selected;
  }, [selected]);

  return null;
}

const paths: Record<PlaceKind, string> = {
  school:
    '<path d="m3 9 9-5 9 5-9 5-9-5Zm3 2v5c4 3 8 3 12 0v-5M21 9v6"/><path d="M9 17v3h6v-3"/>',
  municipality:
    '<path d="M3 20h18M5 17h14M6 17V9m4 8V9m4 8V9m4 8V9M3 7l9-4 9 4v2H3z"/>',
  health: '<path d="M12 4v16M4 12h16"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
  public: '<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  books: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h10M9 8h5"/>',
  charging: '<path d="M13 3 6 13h5l-1 8 7-10h-5l1-8Z"/>',
  parking:
    '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M10 17V8h3a3 3 0 0 1 0 6h-3"/>',
  toilet:
    '<circle cx="8" cy="5" r="1.5"/><circle cx="16" cy="5" r="1.5"/><path d="M5 20v-6l1.5-5h3L11 14v6M8 14v6M13 20v-5h-1l2-6h4l2 6h-1v5"/>',
  post: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="m3 8 9 6 9-6"/>',
  mall: '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6M9 11h6"/>',
  shop: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  hotel: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11h.01"/>',
  taxi: '<path d="M5 16v-4l2-5h10l2 5v4M3 16h18v3H3zM7 12h10M8 19v1m8-1v1M10 4h4"/>',
  sport:
    '<circle cx="12" cy="12" r="9"/><path d="M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18M3 12h18"/>',
  worship:
    '<path d="M5 21v-8a7 7 0 0 1 14 0v8M3 21h18M12 3v3M10 21v-5h4v5"/>',
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
  halkbank: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="m3 8 9-5 9 5M8 12v5m4-5v5m4-5v5"/>',
  akbank: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="m3 8 9-5 9 5M8 12v5m4-5v5m4-5v5"/>',
  yapikredi: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="m3 8 9-5 9 5M8 12v5m4-5v5m4-5v5"/>',
  denizbank: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="m3 8 9-5 9 5M8 12v5m4-5v5m4-5v5"/>',
  qnb: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="m3 8 9-5 9 5M8 12v5m4-5v5m4-5v5"/>',
  water: '<path d=\"M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z\"/>',
  office:
    '<rect x=\"3\" y=\"7\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18\"/>',
  beauty:
    '<circle cx=\"6\" cy=\"6\" r=\"3\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><path d=\"M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12\"/>',
  auto: '<path d=\"M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z\"/>',
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
  halkbank: "H",
  akbank: "A",
  yapikredi: "Y",
  denizbank: "D",
  qnb: "Q",
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
