/**
 * Biga Safari: ortak sabitler, tipler ve yardımcılar.
 * NOT: Şans, ödül ve hak değerleri supabase/safari_upgrade.sql içindeki fonksiyonlarla aynı olmalı.
 * Burası yalnızca ekranda gösterim içindir; gerçek hesabı sunucu yapar.
 */

export type Rarity = "yaygin" | "nadir" | "epik" | "efsanevi";

export const RARITY_ORDER: Rarity[] = ["yaygin", "nadir", "epik", "efsanevi"];

export const RARITY: Record<
  Rarity,
  { label: string; color: string; glow: string; coins: number; firstBonus: number; maxTries: number; blurb: string }
> = {
  yaygin: { label: "Yaygın", color: "#5BB37F", glow: "rgba(91,179,127,.55)", coins: 1, firstBonus: 4, maxTries: 5, blurb: "Her yerde dolaşır." },
  nadir: { label: "Nadir", color: "#3F8FD8", glow: "rgba(63,143,216,.6)", coins: 3, firstBonus: 7, maxTries: 4, blurb: "Biraz daha az görülür." },
  epik: { label: "Epik", color: "#9B5DE5", glow: "rgba(155,93,229,.65)", coins: 8, firstBonus: 12, maxTries: 3, blurb: "Görürsen şanslısın!" },
  efsanevi: { label: "Efsanevi", color: "#F2A81D", glow: "rgba(242,168,29,.75)", coins: 25, firstBonus: 25, maxTries: 3, blurb: "Yalnızca efsane noktalarında, belirli saatlerde." },
};

/** Her nadirlikte çıkabilecek türler (id: species.tsx içindeki id, "sp-" öneki olmadan). */
export const SAFARI_SPECIES: Record<Rarity, string[]> = {
  yaygin: ["marti", "kedi", "kopek", "tavsan"],
  nadir: ["tilki", "panda", "penguen", "kaplumbaga"],
  epik: ["baykus", "aslan", "ahtapot"],
  efsanevi: ["ejderha", "anka", "unicorn"],
};
export const ALL_SAFARI_SPECIES: string[] = RARITY_ORDER.flatMap((r) => SAFARI_SPECIES[r]);
export const SPECIES_RARITY: Record<string, Rarity> = Object.fromEntries(
  RARITY_ORDER.flatMap((r) => SAFARI_SPECIES[r].map((s) => [s, r] as const)),
);

export const CATCH_RADIUS_M = 40; // sıradan hayvanı yakalamak için gereken yakınlık
export const GPS_SLACK_M = 25; // GPS oynaması için tanınan en fazla pay (sunucuyla aynı)
export const MAX_GPS_ACCURACY_M = 100; // bundan kötü GPS ile atış yapılamaz
export const VISIBLE_RADIUS_M = 450; // haritada gösterilen en uzak hayvan
export const SAFARI_DAILY_COIN_CAP = 80;
export const REFETCH_DISTANCE_M = 50; // bu kadar yürüyünce hayvanları yenile
export const REFETCH_INTERVAL_MS = 45_000;

/* ───────── Sunucu yanıt tipleri ───────── */
export type Spawn = {
  key: string;
  species: string; // "tilki", "ejderha"…
  rarity: Rarity;
  variant: number; // 1-8: renk
  lat: number;
  lng: number;
  start: number; // epoch sn
  end: number; // epoch sn
  radius: number; // yakalama yarıçapı (m)
  hotspot: string | null; // efsane noktasının adı
};
export type Hotspot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  active: boolean;
  caught: boolean; // bu penceredeki efsaneyi zaten yakaladın / kaçırdın
  endsIn: number; // sn
  startsIn: number; // sn
};
export type Nearby = { now: number; spawns: Spawn[]; hotspots: Hotspot[] };

export type DexEntry = { species: string; count: number; first: string; rarity: Rarity };
export type SafariStats = { dex: DexEntry[]; total: number; catchesToday: number; earnedToday: number; cap: number };

export type ThrowStatus = "caught" | "broke" | "fled" | "too_far" | "bad_gps" | "too_fast" | "expired" | "already" | "slow";

/* ───────── Dönüştürücüler (sunucudan gelen veriye güvenme) ───────── */
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const isRarity = (v: unknown): v is Rarity => typeof v === "string" && (RARITY_ORDER as string[]).includes(v);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeNearby(raw: any): Nearby {
  const spawns: Spawn[] = (Array.isArray(raw?.spawns) ? raw.spawns : [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((s: any) => s && typeof s.key === "string" && isRarity(s.rarity) && typeof s.species === "string")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => ({
      key: s.key,
      species: s.species,
      rarity: s.rarity as Rarity,
      variant: Math.min(8, Math.max(1, num(s.variant, 1))),
      lat: num(s.lat),
      lng: num(s.lng),
      start: num(s.start),
      end: num(s.end),
      radius: num(s.radius, CATCH_RADIUS_M),
      hotspot: typeof s.hotspot === "string" ? s.hotspot : null,
    }));
  const hotspots: Hotspot[] = (Array.isArray(raw?.hotspots) ? raw.hotspots : []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (h: any): Hotspot => ({
      id: String(h.id),
      name: String(h.name),
      lat: num(h.lat),
      lng: num(h.lng),
      radius: num(h.radius, 60),
      active: !!h.active,
      caught: !!h.caught,
      endsIn: num(h.endsIn),
      startsIn: num(h.startsIn),
    }),
  );
  return { now: num(raw?.now, Date.now() / 1000), spawns, hotspots };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeStats(raw: any): SafariStats {
  return {
    dex: (Array.isArray(raw?.dex) ? raw.dex : [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((d: any) => d && typeof d.species === "string")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((d: any): DexEntry => ({
        species: d.species,
        count: num(d.count, 1),
        first: String(d.first ?? ""),
        rarity: isRarity(d.rarity) ? d.rarity : SPECIES_RARITY[d.species] ?? "yaygin",
      })),
    total: num(raw?.total),
    catchesToday: num(raw?.catchesToday),
    earnedToday: num(raw?.earnedToday),
    cap: num(raw?.cap, SAFARI_DAILY_COIN_CAP),
  };
}

/* ───────── Coğrafya ───────── */
/** İki nokta arası metre (Haversine) — sunucudaki safari_dist ile aynı formül. */
export function distM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Hayvanı yakalamak için gereken en yakın mesafe: yarıçap + (en çok 25 m) GPS payı. */
export const reachOf = (s: Pick<Spawn, "radius">, accuracy: number) => s.radius + Math.min(Math.max(accuracy, 0), GPS_SLACK_M);

export function fmtDist(m: number): string {
  if (m < 1000) return `${Math.max(1, Math.round(m / 5) * 5)} m`;
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}
export function fmtCountdown(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  if (s >= 3600) return `${Math.floor(s / 3600)} sa ${Math.floor((s % 3600) / 60)} dk`;
  if (s >= 60) return `${Math.floor(s / 60)} dk`;
  return `${s} sn`;
}
