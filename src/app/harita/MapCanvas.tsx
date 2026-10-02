"use client";

import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { MapPlace, PlaceCategory } from "./page";

const center: L.LatLngExpression = [40.23, 27.24];

export default function MapCanvas({
  places,
  selected,
  onSelect,
}: {
  places: MapPlace[];
  selected: MapPlace | null;
  onSelect: (place: MapPlace) => void;
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapFocus place={selected} userPosition={userPosition} />
      <LocateButton onLocated={setUserPosition} />
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lon]}
          icon={makeIcon(place.category)}
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
}: {
  place: MapPlace | null;
  userPosition: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (place)
      map.flyTo([place.lat, place.lon], Math.max(map.getZoom(), 16), {
        duration: 0.8,
      });
    else if (userPosition)
      map.flyTo(userPosition, Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [map, place, userPosition]);
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

const paths: Record<PlaceCategory, string> = {
  landmark: '<path d="M4 20h16M6 17h12M7 17V9m5 8V9m5 8V9M4 7l8-4 8 4v2H4z"/>',
  park: '<path d="M12 21v-8m0 0c-5 0-7-3-7-6 4 0 6 2 7 5 1-5 4-7 8-7 0 5-2 8-8 8z"/>',
  business:
    '<path d="M4 20V8l8-4 8 4v12M2 20h20M8 10h2m4 0h2m-8 4h2m4 0h2m-4 6v-4h3v4"/>',
  bus: '<path d="M5 16V7c0-2 1-3 3-3h8c2 0 3 1 3 3v9M5 12h14M7 16h10M8 19h.01M16 19h.01M5 16l-1 3h3m12-3 1 3h-3"/>',
  atm: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8v4H8zm1 8h6m-6 3h4"/>',
};

function makeIcon(category: PlaceCategory) {
  const html = `<span class="biga-map-pin biga-map-pin--${category}"><svg viewBox="0 0 24 24" aria-hidden="true">${paths[category]}</svg></span>`;
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
