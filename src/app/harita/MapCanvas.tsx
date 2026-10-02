"use client";

import L from "leaflet";
import { useEffect, useState } from "react";
import {
    MapContainer,
    Marker,
    Polyline,
    TileLayer,
    useMap,
} from "react-leaflet";
import type { MapPlace, PlaceKind } from "./page";

const center: L.LatLngExpression = [40.23, 27.24];

export default function MapCanvas({
  places,
  selected,
  onSelect,
  route,
}: {
  places: MapPlace[];
  selected: MapPlace | null;
  onSelect: (place: MapPlace) => void;
  route: [number, number][] | null;
}) {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null,
  );
  return (
    <MapContainer
      center={center}
      zoom={13}
      minZoom={11}
      maxZoom={19}
      scrollWheelZoom
      zoomControl={false}
      className="biga-leaflet"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapFocus place={selected} userPosition={userPosition} route={route} />
      <LocateButton onLocated={setUserPosition} />
      {route && (
        <Polyline
          positions={route}
          pathOptions={{
            color: "#f06455",
            weight: 6,
            opacity: 0.92,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      )}
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lon]}
          icon={makeIcon(place.kind)}
          eventHandlers={{ click: () => onSelect(place) }}
          title={place.name}
          alt={place.name}
        />
      ))}
      {userPosition && (
        <Marker position={userPosition} icon={userIcon} title="Konumun" />
      )}
    </MapContainer>
  );
}

function MapFocus({
  place,
  userPosition,
  route,
}: {
  place: MapPlace | null;
  userPosition: [number, number] | null;
  route: [number, number][] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (place)
      map.flyTo([place.lat, place.lon], Math.max(map.getZoom(), 16), {
        duration: 0.8,
      });
    else if (userPosition)
      map.flyTo(userPosition, Math.max(map.getZoom(), 15), { duration: 0.8 });
    else if (route?.length)
      map.fitBounds(route, { padding: [48, 48], maxZoom: 15, duration: 0.8 });
  }, [map, place, route, userPosition]);
  return null;
}

function LocateButton({
  onLocated,
}: {
  onLocated: (position: [number, number]) => void;
}) {
  const map = useMap();
  return (
    <button
      type="button"
      className="biga-map-locate"
      title="Konumuma git"
      aria-label="Konumuma git"
      onClick={() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            const position: [number, number] = [
              coords.latitude,
              coords.longitude,
            ];
            onLocated(position);
            map.flyTo(position, 16, { duration: 0.8 });
          },
          () => undefined,
          { enableHighAccuracy: true, timeout: 8000 },
        );
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
      </svg>
    </button>
  );
}

const paths: Record<PlaceKind, string> = {
  school:
    '<path d="m3 9 9-5 9 5-9 5-9-5Zm3 2v5c4 3 8 3 12 0v-5M21 9v6"/><path d="M9 17v3h6v-3"/>',
  municipality:
    '<path d="M3 20h18M5 17h14M6 17V9m4 8V9m4 8V9m4 8V9M3 7l9-4 9 4v2H3z"/>',
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

function makeIcon(kind: PlaceKind) {
  const logos: Partial<Record<PlaceKind, string>> = {
    ziraat: "Z",
    garanti: "G",
    isbank: "İ",
    vakifbank: "V",
  };
  const logo = logos[kind]
    ? `<b class="biga-map-bank-logo">${logos[kind]}</b>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind]}</svg>`;
  const html = `<span class="biga-map-pin biga-map-pin--${kind}">${logo}</span>`;
  return L.divIcon({
    className: "biga-map-marker",
    html,
    iconSize: [38, 46],
    iconAnchor: [19, 40],
  });
}

const userIcon = L.divIcon({
  className: "biga-map-marker",
  html: '<span class="biga-map-user-pin"><i></i></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});
