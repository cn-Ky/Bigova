"use client";

import WildAnimal from "@/components/bigocuk/WildAnimal";
import { BIGA_CENTER } from "@/lib/mapPlaces";
import { RARITY, fmtCountdown, type Hotspot, type Spawn } from "@/lib/bigocuk/safari";
import L from "leaflet";
import { memo, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Circle, MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";

export type MapSpawn = Spawn & { dist: number };
export type Me = { lat: number; lng: number; acc: number };

const PIN = { yaygin: 54, nadir: 58, epik: 64, efsanevi: 76 } as const;

/** Leaflet işaretçisinin içeriğini React ile çizmek için: DivIcon'a gerçek bir DOM elemanı verip içine portal açarız. */
function useDivIcon(size: number, anchor: [number, number]) {
  const el = useMemo(() => {
    const d = document.createElement("div");
    d.style.width = "100%";
    d.style.height = "100%";
    return d;
  }, []);
  const icon = useMemo(
    () => L.divIcon({ html: el, className: "sf-marker", iconSize: [size, size], iconAnchor: anchor }),
    [el, size, anchor],
  );
  return { el, icon };
}

const SpawnMarker = memo(function SpawnMarker({
  spawn,
  selected,
  inRange,
  onSelect,
}: {
  spawn: MapSpawn;
  selected: boolean;
  inRange: boolean;
  onSelect: (key: string) => void;
}) {
  const S = PIN[spawn.rarity];
  const anchor = useMemo<[number, number]>(() => [S / 2, S - 4], [S]);
  const { el, icon } = useDivIcon(S, anchor);
  const r = RARITY[spawn.rarity];
  return (
    <>
      <Marker
        position={[spawn.lat, spawn.lng]}
        icon={icon}
        zIndexOffset={(selected ? 2000 : 0) + (spawn.rarity === "efsanevi" ? 1000 : spawn.rarity === "epik" ? 500 : 0)}
        eventHandlers={{ click: () => onSelect(spawn.key) }}
        keyboard
        title={`${r.label} hayvan`}
      />
      {createPortal(
        <div className="sf-pin relative h-full w-full" style={{ cursor: "pointer" }}>
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 50% 55%, ${r.glow}, transparent 70%)`,
              boxShadow: selected ? `0 0 0 3px ${r.color}, 0 0 18px ${r.glow}` : inRange ? `0 0 0 2px ${r.color}` : "none",
              transition: "box-shadow .2s",
            }}
          />
          <span className="absolute inset-0 grid place-items-center" style={{ opacity: inRange || selected ? 1 : 0.88 }}>
            <WildAnimal species={spawn.species} variant={spawn.variant} size={S - 6} view="bust" />
          </span>
          {spawn.rarity === "efsanevi" && (
            <span className="sf-spark absolute -right-1 -top-1 text-[15px] leading-none" aria-hidden="true">
              ✨
            </span>
          )}
        </div>,
        el,
      )}
    </>
  );
},
(a, b) => a.spawn.key === b.spawn.key && a.selected === b.selected && a.inRange === b.inRange && a.onSelect === b.onSelect);

/** h.endsIn / h.startsIn sayfa tarafından saniye saniye güncel tutulur. */
function HotspotMarker({ h }: { h: Hotspot }) {
  const anchor = useMemo<[number, number]>(() => [28, 28], []);
  const { el, icon } = useDivIcon(56, anchor);
  const live = h.active;
  const left = live ? h.endsIn : h.startsIn;
  return (
    <>
      <Marker position={[h.lat, h.lng]} icon={icon} zIndexOffset={-500} interactive={false} />
      {createPortal(
        <div className="relative h-full w-full">
          <span
            className={live ? "sf-hot absolute inset-0 rounded-full" : "absolute inset-0 rounded-full"}
            style={{
              background: live ? "radial-gradient(circle, rgba(242,168,29,.55), rgba(242,168,29,.08) 70%)" : "radial-gradient(circle, rgba(120,130,140,.35), transparent 70%)",
              border: `2px dashed ${live ? "#F2A81D" : "#8A97A3"}`,
            }}
          />
          <svg viewBox="0 0 24 24" className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            <path
              d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6z"
              fill={live ? "#F2A81D" : "#8A97A3"}
              stroke="#fff"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="absolute left-1/2 top-[58px] -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow"
            style={{ background: "rgba(255,255,255,.92)", color: "#1C2A3A" }}
          >
            {h.name} · {live ? `${fmtCountdown(left)} kaldı` : h.caught ? "yakaladın" : `${fmtCountdown(left)} sonra`}
          </span>
        </div>,
        el,
      )}
    </>
  );
}

function MeMarker({ me }: { me: Me }) {
  const anchor = useMemo<[number, number]>(() => [14, 14], []);
  const { el, icon } = useDivIcon(28, anchor);
  return (
    <>
      <Marker position={[me.lat, me.lng]} icon={icon} zIndexOffset={3000} interactive={false} />
      {createPortal(
        <div className="relative h-full w-full">
          <span className="sf-me-pulse absolute inset-0 rounded-full" style={{ background: "rgba(47,127,214,.35)" }} />
          <span
            className="absolute left-1/2 top-1/2 h-[16px] w-[16px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "#2F7FD6", border: "3px solid #fff", boxShadow: "0 1px 6px rgba(0,0,0,.4)" }}
          />
        </div>,
        el,
      )}
    </>
  );
}

/** İlk konum gelince ve "konumuma git" düğmesine basılınca haritayı oyuncuya götürür. */
function Follow({ me, nonce }: { me: Me | null; nonce: number }) {
  const map = useMap();
  const first = useRef(true);
  const lastNonce = useRef(nonce);
  useEffect(() => {
    if (!me) return;
    if (first.current) {
      first.current = false;
      map.setView([me.lat, me.lng], Math.max(map.getZoom(), 17), { animate: false });
    } else if (lastNonce.current !== nonce) {
      map.flyTo([me.lat, me.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
    }
    lastNonce.current = nonce;
  }, [me, nonce, map]);
  return null;
}

/** Listeden bir hayvan seçilince haritayı ona kaydırır. */
function PanTo({ focus }: { focus: { lat: number; lng: number; nonce: number } | null }) {
  const map = useMap();
  const last = useRef(0);
  useEffect(() => {
    if (!focus || focus.nonce === last.current) return;
    last.current = focus.nonce;
    map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 18), { duration: 0.5 });
  }, [focus, map]);
  return null;
}

function ClickCatcher({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function SafariMap({
  me,
  spawns,
  hotspots,
  selectedKey,
  recenterNonce,
  focus,
  onSelect,
  onMapClick,
}: {
  me: Me | null;
  spawns: MapSpawn[];
  hotspots: Hotspot[];
  selectedKey: string | null;
  recenterNonce: number;
  focus: { lat: number; lng: number; nonce: number } | null;
  onSelect: (key: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={me ? [me.lat, me.lng] : BIGA_CENTER}
      zoom={17}
      minZoom={13}
      maxZoom={19}
      zoomControl={false}
      className="biga-leaflet"
      style={{ cursor: onMapClick ? "crosshair" : undefined }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxNativeZoom={19}
        maxZoom={19}
        keepBuffer={3}
      />
      <ZoomControl position="bottomright" zoomInTitle="Yakınlaştır" zoomOutTitle="Uzaklaştır" />
      <Follow me={me} nonce={recenterNonce} />
      <PanTo focus={focus} />
      <ClickCatcher onClick={onMapClick} />

      {hotspots.map((h) => (
        <HotspotMarker key={h.id} h={h} />
      ))}

      {me && me.acc > 12 && (
        <Circle center={[me.lat, me.lng]} radius={Math.min(me.acc, 120)} pathOptions={{ color: "#2F7FD6", weight: 1, opacity: 0.35, fillOpacity: 0.07 }} />
      )}
      {me && <Circle center={[me.lat, me.lng]} radius={40} pathOptions={{ color: "#FFB84D", weight: 2, dashArray: "4 6", fillOpacity: 0.06 }} />}

      {spawns.map((s) => (
        <SpawnMarker
          key={s.key}
          spawn={s}
          selected={s.key === selectedKey}
          inRange={me ? s.dist <= s.radius + Math.min(me.acc, 25) : false}
          onSelect={onSelect}
        />
      ))}

      {me && <MeMarker me={me} />}
    </MapContainer>
  );
}
