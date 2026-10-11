"use client";
import Coin from "@/components/bigocuk/Coin";
import WildAnimal, { speciesName } from "@/components/bigocuk/WildAnimal";
import { errMsg, isMissing, useBigocuk } from "@/lib/bigocuk/api";
import { COIN_NAME } from "@/lib/bigocuk/config";
import {
  ALL_SAFARI_SPECIES,
  RARITY,
  RARITY_ORDER,
  REFETCH_DISTANCE_M,
  REFETCH_INTERVAL_MS,
  SAFARI_DAILY_COIN_CAP,
  SAFARI_SPECIES,
  VISIBLE_RADIUS_M,
  distM,
  fmtCountdown,
  fmtDist,
  reachOf,
  type Hotspot,
  type Nearby,
  type SafariStats,
  type Spawn,
} from "@/lib/bigocuk/safari";
import { BIGA_CENTER } from "@/lib/mapPlaces";
import {
  faArrowLeft,
  faArrowRight,
  faBinoculars,
  faBookOpen,
  faCamera,
  faCircleInfo,
  faLocationCrosshairs,
  faLocationDot,
  faMapLocationDot,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CatchScreen from "./CatchScreen";
import type { MapSpawn, Me } from "./SafariMap";

const SafariMap = dynamic(() => import("./SafariMap"), {
  ssr: false,
  loading: () => <div className="biga-map-loading">Harita hazırlanıyor…</div>,
});

/** NEXT_PUBLIC_SAFARI_DEBUG=1 ile açılır: konumu haritaya dokunarak değiştirmeye izin verir (yalnızca geliştirme için). */
const DEBUG = process.env.NEXT_PUBLIC_SAFARI_DEBUG === "1";

type Geo = "asking" | "ok" | "denied" | "unsupported" | "error";
type Tab = "map" | "dex";

export default function Safari() {
  const { status, state, commit, safariNearby, safariStats, safariThrow } = useBigocuk();
  const live = status === "ready" && !!state;

  const [tab, setTab] = useState<Tab>("map");
  const [real, setReal] = useState<Me | null>(null);
  const [fake, setFake] = useState<Me | null>(null);
  const me = DEBUG && fake ? fake : real;
  const meRef = useRef<Me | null>(null);
  meRef.current = me;
  const [geo, setGeo] = useState<Geo>("asking");
  const [geoNonce, setGeoNonce] = useState(0);

  const [nearby, setNearby] = useState<Nearby | null>(null);
  const [offset, setOffset] = useState(0); // sunucu saati − cihaz saati (sn)
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);
  const [stats, setStats] = useState<SafariStats | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [catching, setCatching] = useState<Spawn | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [focus, setFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const [tick, setTick] = useState(0);

  // api fonksiyonları her render'da yeniden oluşur; efektlerin bağımlılığı olmasın diye ref'te tut
  const api = useRef({ safariNearby, safariStats, safariThrow, commit });
  api.current = { safariNearby, safariStats, safariThrow, commit };

  /* ───────── 1 sn'lik saat (geri sayımlar, süresi dolan hayvanlar) ───────── */
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ───────── GPS ───────── */
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeo("unsupported");
      return;
    }
    setGeo("asking");
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setReal({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy || 50 });
        setGeo("ok");
      },
      (err) => setGeo(err.code === 1 ? "denied" : "error"),
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [geoNonce]);

  /* ───────── Sunucudan hayvanları al ───────── */
  const lastFetch = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const fetching = useRef(false);
  const load = useCallback(async (pos: { lat: number; lng: number }) => {
    if (fetching.current) return;
    fetching.current = true;
    lastFetch.current = { lat: pos.lat, lng: pos.lng, at: Date.now() }; // hata olsa da sık sık tekrar denemesin
    try {
      const n = await api.current.safariNearby(pos.lat, pos.lng);
      setNearby(n);
      setOffset(n.now - Date.now() / 1000);
      setLoadErr(null);
      setSetup(false);
    } catch (e) {
      if (isMissing(e)) setSetup(true);
      else setLoadErr(errMsg(e));
    } finally {
      fetching.current = false;
    }
  }, []);

  const serverNow = Date.now() / 1000 + offset; // tick her saniye yeniden hesaplatır
  void tick;

  // yeterince yürüdün, süre doldu ya da bir hayvan / nokta durumu değiştiyse yenile
  useEffect(() => {
    if (!me || setup) return;
    const lf = lastFetch.current;
    if (!lf) return void load(me);
    const age = Date.now() - lf.at;
    const moved = distM(lf.lat, lf.lng, me.lat, me.lng) > REFETCH_DISTANCE_M;
    const stale = age > REFETCH_INTERVAL_MS;
    let changed = false;
    if (nearby && age > 5000) {
      const el = serverNow - nearby.now;
      changed =
        nearby.spawns.some((s) => s.end < serverNow) ||
        nearby.hotspots.some((h) => (h.active ? h.endsIn : h.startsIn) - el <= 0);
    }
    if ((moved && age > 2000) || stale || changed) void load(me);
  }, [me, tick, nearby, serverNow, setup, load]);

  // sekme tekrar görünür olunca hemen yenile
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && meRef.current) void load(meRef.current);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  /* ───────── Defter (yalnızca giriş yapmış kullanıcı) ───────── */
  useEffect(() => {
    if (status !== "ready") return;
    api.current.safariStats().then(setStats, (e) => isMissing(e) && setSetup(true));
  }, [status]);

  /* ───────── Türetilmiş veriler ───────── */
  const visible: MapSpawn[] = useMemo(() => {
    if (!nearby || !me) return [];
    return nearby.spawns
      .filter((s) => s.end > serverNow)
      .map((s) => ({ ...s, dist: distM(me.lat, me.lng, s.lat, s.lng) }))
      .filter((s) => s.dist <= VISIBLE_RADIUS_M)
      .sort((a, b) => a.dist - b.dist);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearby, me, Math.floor(serverNow / 2)]);

  const hotspots: (Hotspot & { dist: number })[] = useMemo(() => {
    if (!nearby) return [];
    const el = serverNow - nearby.now;
    return nearby.hotspots
      .map((h) => ({
        ...h,
        endsIn: Math.max(0, h.endsIn - el),
        startsIn: Math.max(0, h.startsIn - el),
        dist: me ? distM(me.lat, me.lng, h.lat, h.lng) : 0,
      }))
      .sort((a, b) => a.dist - b.dist);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearby, me, Math.floor(serverNow)]);

  const sel = visible.find((s) => s.key === selected) ?? null;
  const inRange = (s: MapSpawn) => !!me && s.dist <= reachOf(s, me.acc);
  const onSelect = useCallback((key: string) => setSelected(key), []);

  const caughtSet = useMemo(() => new Set((stats?.dex ?? []).map((d) => d.species)), [stats]);

  /* ───────── Yakalama ───────── */
  const closeCatch = () => {
    setCatching(null);
    setSelected(null);
    if (meRef.current) void load(meRef.current); // yakalanan / kaçan hayvan listeden çıksın
  };
  const throwAt = (spawn: Spawn) => async (bonus: number) => {
    const pos = meRef.current;
    if (!pos) throw new Error("Konum alınamadı.");
    const res = await api.current.safariThrow(spawn.key, pos.lat, pos.lng, pos.acc, bonus);
    api.current.commit(res.next);
    setStats(res.stats);
    return res;
  };

  const pickFromList = (s: MapSpawn) => {
    setSelected(s.key);
    setFocus({ lat: s.lat, lng: s.lng, nonce: Date.now() });
  };

  const nearbyHeld = me ? visible.length : 0;

  return (
    <main className="pb-10">
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <Link href="/bigocuk" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-white/75">
          <FontAwesomeIcon icon={faArrowLeft} /> Bigocuk
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <FontAwesomeIcon icon={faBinoculars} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold">Biga Safari</h1>
            <p className="text-sm text-white/75">Dolaş, bul, kameranla yakala</p>
          </div>
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-display text-lg font-extrabold">
              <Coin size={22} /> {state!.coins.toLocaleString("tr-TR")}
            </span>
          )}
        </div>
      </header>

      <section className="px-5 pt-4">
        {/* sekmeler */}
        <div role="tablist" className="grid grid-cols-2 gap-2 rounded-2xl bg-card p-1.5 shadow-sm">
          {(
            [
              ["map", "Harita", faMapLocationDot],
              ["dex", "Hayvan Defteri", faBookOpen],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${tab === id ? "bg-sea text-white" : "text-ink/70"}`}
            >
              <FontAwesomeIcon icon={icon} /> {label}
              {id === "dex" && stats && (
                <span className={`rounded-full px-2 text-xs ${tab === id ? "bg-white/20" : "bg-ink/10"}`}>
                  {caughtSet.size}/{ALL_SAFARI_SPECIES.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {setup && (
          <p className="mt-3 rounded-2xl bg-coral/15 p-4 text-sm font-bold text-coral">
            Kurulum eksik: Supabase SQL Editor&apos;de <code>supabase/safari_upgrade.sql</code> dosyasını çalıştır.
          </p>
        )}
        {loadErr && !setup && <p className="mt-3 rounded-2xl bg-coral/15 p-3 text-sm font-bold text-coral">Hayvanlar yüklenemedi: {loadErr}</p>}

        {tab === "map" ? (
          <>
            <GeoNotice geo={geo} acc={me?.acc} onRetry={() => setGeoNonce((n) => n + 1)} debug={DEBUG && !!fake} />

            {/* harita */}
            <div className="relative isolate mt-3 h-[56dvh] min-h-[340px] max-h-[560px] overflow-hidden rounded-[24px] shadow-sm" style={{ minHeight: 340 }}>
              <SafariMap
                me={me}
                spawns={visible}
                hotspots={hotspots}
                selectedKey={sel?.key ?? null}
                recenterNonce={recenter}
                focus={focus}
                onSelect={onSelect}
                onMapClick={DEBUG && fake ? (lat, lng) => setFake({ lat, lng, acc: 5 }) : undefined}
              />
              <div className="pointer-events-none absolute left-3 top-3 z-[800] flex flex-col gap-2">
                <span className="rounded-full bg-card/90 px-3 py-1.5 text-xs font-extrabold shadow backdrop-blur">
                  <FontAwesomeIcon icon={faBinoculars} className="mr-1.5 text-sea" />
                  {me ? `${nearbyHeld} hayvan yakında` : "Konum bekleniyor"}
                </span>
                {DEBUG && fake && <span className="rounded-full bg-coral px-3 py-1 text-[11px] font-extrabold text-white shadow">TEST MODU · haritaya dokun</span>}
              </div>
              <div className="absolute right-3 top-3 z-[800] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setRecenter((n) => n + 1)}
                  disabled={!me}
                  aria-label="Konumuma git"
                  className="grid h-11 w-11 place-items-center rounded-full bg-card text-lg text-sea shadow-lg disabled:opacity-40"
                >
                  <FontAwesomeIcon icon={faLocationCrosshairs} />
                </button>
                {DEBUG && (
                  <button
                    type="button"
                    onClick={() => {
                      setFake({ lat: BIGA_CENTER[0], lng: BIGA_CENTER[1], acc: 5 });
                      setRecenter((n) => n + 1);
                    }}
                    aria-label="Test: Biga merkezine git"
                    className="grid h-11 w-11 place-items-center rounded-full bg-coral text-base text-white shadow-lg"
                  >
                    <FontAwesomeIcon icon={faLocationDot} />
                  </button>
                )}
              </div>
            </div>

            {/* seçili hayvan */}
            {sel ? (
              <SelectedCard
                spawn={sel}
                me={me}
                serverNow={serverNow}
                guest={status === "guest"}
                ready={live}
                onCatch={() => setCatching(sel)}
              />
            ) : (
              <p className="mt-3 rounded-2xl bg-card p-4 text-center text-sm text-ink/70 shadow-sm">
                {me ? (
                  visible.length ? (
                    <>Haritadan ya da listeden bir hayvana dokun. Yakalamak için <b>{`40 m`}</b> yakınına gitmen gerekiyor.</>
                  ) : (
                    "Çevrende şu an hayvan yok. Biraz yürü, her 15 dakikada yenileri çıkıyor."
                  )
                ) : (
                  "Hayvanları görmek için konumunu paylaş."
                )}
              </p>
            )}

            {/* yakındakiler */}
            {visible.length > 0 && (
              <>
                <h2 className="mt-6 font-display text-xl font-extrabold">Yakındakiler</h2>
                <ul className="mt-2 grid gap-2">
                  {visible.slice(0, 8).map((s) => (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => pickFromList(s)}
                        className={`flex w-full items-center gap-3 rounded-2xl bg-card p-2.5 text-left shadow-sm transition ${s.key === sel?.key ? "ring-2 ring-sea" : ""}`}
                      >
                        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl" style={{ background: `radial-gradient(circle, ${RARITY[s.rarity].glow}, transparent 75%)` }}>
                          <WildAnimal species={s.species} variant={s.variant} size={52} view="bust" />
                        </span>
                        <span className="min-w-0 flex-1 leading-tight">
                          <b className="block font-display text-base">{speciesName(s.species)}</b>
                          <span className="text-xs font-extrabold" style={{ color: RARITY[s.rarity].color }}>
                            {RARITY[s.rarity].label}
                          </span>
                          {s.hotspot && <span className="ml-2 text-xs text-ink/55">· {s.hotspot}</span>}
                        </span>
                        <span className={`shrink-0 text-sm font-extrabold ${inRange(s) ? "text-tide" : "text-ink/55"}`}>{inRange(s) ? "Yakalanabilir" : fmtDist(s.dist)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* efsane noktaları */}
            <h2 className="mt-6 font-display text-xl font-extrabold">Efsane noktaları</h2>
            <p className="text-sm text-ink/65">Efsanevi hayvanlar yalnızca bu noktalarda, belirli saatlerde ortaya çıkar.</p>
            {hotspots.length ? (
              <ul className="mt-2 grid gap-2">
                {hotspots.slice(0, 5).map((h) => (
                  <li key={h.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg" style={{ background: h.active ? RARITY.efsanevi.color : "rgb(var(--ink) / .12)", color: h.active ? "#1C2A3A" : "rgb(var(--ink) / .5)" }}>
                      <FontAwesomeIcon icon={faStar} />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <b className="block font-display text-base">{h.name}</b>
                      <span className="text-xs text-ink/65">
                        {h.active ? `Efsanevi hayvan şu an orada · ${fmtCountdown(h.endsIn)} kaldı` : h.caught ? "Bu turdaki efsaneyi yakaladın / kaçırdın" : `Sonraki efsane ${fmtCountdown(h.startsIn)} sonra`}
                      </span>
                    </span>
                    {me && <span className="shrink-0 text-sm font-extrabold text-ink/55">{fmtDist(h.dist)}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-2xl bg-card p-4 text-center text-sm text-ink/60 shadow-sm">Yakınında efsane noktası yok. Efsane noktaları Biga&apos;daki önemli yerlerde bulunur.</p>
            )}

            <HowTo />
          </>
        ) : (
          <Dex stats={stats} guest={status === "guest"} ready={live} />
        )}
      </section>

      {catching && <CatchScreen key={catching.key} spawn={catching} onThrow={throwAt(catching)} onClose={closeCatch} />}
    </main>
  );
}

/* ───────────────────────── Parçalar ───────────────────────── */

function GeoNotice({ geo, acc, onRetry, debug }: { geo: Geo; acc?: number; onRetry: () => void; debug: boolean }) {
  if (debug) return null;
  if (geo === "ok" && (acc ?? 0) <= 100) return null;
  const text =
    geo === "asking"
      ? "Konumun alınıyor… Tarayıcı izin isterse “İzin ver” de."
      : geo === "denied"
        ? "Konum izni verilmedi. Hayvanları bulmak için tarayıcı ayarlarından Bigova'ya konum izni ver."
        : geo === "unsupported"
          ? "Bu tarayıcı konumu desteklemiyor. Bigova'yı telefonundan aç."
          : geo === "error"
            ? "Konumun alınamadı. Açık bir alanda olduğundan ve GPS'in açık olduğundan emin ol."
            : `GPS sinyalin zayıf (±${Math.round(acc ?? 0)} m). Yakalamak için sinyalin netleşmesini bekle.`;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-sun/25 p-3 text-sm font-bold">
      <FontAwesomeIcon icon={faLocationDot} className="shrink-0" />
      <span className="flex-1">{text}</span>
      {(geo === "denied" || geo === "error") && (
        <button onClick={onRetry} className="shrink-0 rounded-xl bg-sea px-3 py-1.5 text-xs font-extrabold text-white">
          Tekrar dene
        </button>
      )}
    </div>
  );
}

function SelectedCard({
  spawn,
  me,
  serverNow,
  guest,
  ready,
  onCatch,
}: {
  spawn: MapSpawn;
  me: Me | null;
  serverNow: number;
  guest: boolean;
  ready: boolean;
  onCatch: () => void;
}) {
  const r = RARITY[spawn.rarity];
  const reach = me ? reachOf(spawn, me.acc) : spawn.radius;
  const ok = !!me && spawn.dist <= reach;
  const left = Math.max(0, spawn.end - serverNow);
  return (
    <div className="mt-3 overflow-hidden rounded-[24px] bg-card shadow-sm" style={{ boxShadow: `0 0 0 2px ${r.color}` }}>
      <div className="flex items-center gap-4 p-4" style={{ background: `radial-gradient(circle at 18% 50%, ${r.glow}, transparent 60%)` }}>
        <WildAnimal species={spawn.species} variant={spawn.variant} size={84} view="bust" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-display text-xl font-extrabold">{speciesName(spawn.species)}</p>
          <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-black" style={{ background: r.color }}>
            {r.label}
          </span>
          <p className="mt-1.5 text-xs text-ink/65">
            {fmtDist(spawn.dist)} uzakta · {fmtCountdown(left)} kaldı
            {spawn.hotspot ? ` · ${spawn.hotspot}` : ""}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-extrabold">
            <Coin size={14} /> {r.coins} {COIN_NAME} · ilk yakalamada +{r.firstBonus}
          </p>
        </div>
      </div>
      <div className="px-4 pb-4">
        {guest ? (
          <Link href="/giris" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sea px-4 py-3 font-display text-lg font-extrabold text-white">
            Yakalamak için giriş yap <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onCatch}
            disabled={!ok || !ready}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coral px-4 py-3 font-display text-lg font-extrabold text-white transition enabled:active:scale-[0.98] disabled:bg-ink/15 disabled:text-ink/50"
          >
            <FontAwesomeIcon icon={faCamera} />
            {ok ? "Kamerayı aç ve yakala" : `${Math.max(1, Math.ceil(spawn.dist - reach))} m daha yaklaş`}
          </button>
        )}
      </div>
    </div>
  );
}

function Dex({ stats, guest, ready }: { stats: SafariStats | null; guest: boolean; ready: boolean }) {
  const byId = new Map((stats?.dex ?? []).map((d) => [d.species, d]));
  const have = byId.size;
  const total = ALL_SAFARI_SPECIES.length;
  return (
    <>
      {guest ? (
        <div className="mt-3 rounded-2xl bg-card p-4 text-center shadow-sm">
          <p className="font-display text-lg font-extrabold">Defterin için giriş yap</p>
          <p className="text-sm text-ink/65">Yakaladığın hayvanlar burada birikir.</p>
          <Link href="/giris" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sea px-3.5 py-2 text-sm font-bold text-white">
            Giriş yap <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-end justify-between">
            <p className="font-display text-2xl font-extrabold">
              {have}/{total} <span className="text-base font-bold text-ink/60">tür</span>
            </p>
            <p className="text-xs text-ink/60">{stats ? `${stats.total} yakalama · bugün ${stats.catchesToday}` : ready ? "Yükleniyor…" : ""}</p>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={have} aria-valuemin={0} aria-valuemax={total}>
            <div className="h-full rounded-full bg-sun transition-all" style={{ width: `${(have / total) * 100}%` }} />
          </div>
          {stats && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-ink/70">
              <Coin size={14} /> Bugün {stats.earnedToday}/{stats.cap || SAFARI_DAILY_COIN_CAP} {COIN_NAME} kazandın
            </p>
          )}
        </div>
      )}

      {RARITY_ORDER.map((rar) => (
        <div key={rar} className="mt-5">
          <h2 className="flex flex-wrap items-baseline gap-x-2 font-display text-lg font-extrabold">
            <span className="h-3 w-3 self-center rounded-full" style={{ background: RARITY[rar].color }} />
            {RARITY[rar].label}
            <span className="text-xs font-bold text-ink/55">
              {RARITY[rar].coins} {COIN_NAME} · ilk yakalamada +{RARITY[rar].firstBonus}
            </span>
          </h2>
          <ul className="mt-2 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {SAFARI_SPECIES[rar].map((id) => {
              const d = byId.get(id);
              return (
                <li key={id} className="relative rounded-2xl bg-card p-2 text-center shadow-sm" style={d ? { boxShadow: `0 0 0 2px ${RARITY[rar].color}` } : undefined}>
                  <div className="mx-auto grid aspect-square w-full place-items-center overflow-hidden rounded-xl" style={d ? { background: `radial-gradient(circle, ${RARITY[rar].glow}, transparent 75%)` } : undefined}>
                    <WildAnimal species={id} size={72} view="bust" silhouette={!d} />
                  </div>
                  <p className="mt-1 truncate text-xs font-extrabold">{d ? speciesName(id) : "???"}</p>
                  {d && <span className="absolute right-1.5 top-1.5 rounded-full bg-sea px-1.5 text-[10px] font-extrabold text-white">×{d.count}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

function HowTo() {
  return (
    <details className="group mt-6 rounded-2xl bg-card p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-lg font-extrabold">
        <FontAwesomeIcon icon={faCircleInfo} className="text-sea" /> Nasıl oynanır?
      </summary>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink/75">
        <li>Konum iznini ver ve Biga&apos;da yürümeye başla. Haritada çevrendeki hayvanlar görünür.</li>
        <li>
          Bir hayvana <b>40 metre</b> yaklaş, ona dokun ve <b>Kamerayı aç ve yakala</b>&apos;ya bas.
        </li>
        <li>Topu yukarı fırlat. Halka küçükken bırakırsan yakalama şansın artar.</li>
        <li>Hayvanlar 15 dakika sonra kaybolur. Yaygın, Nadir ve Epik her yerde çıkar; Efsanevi yalnızca efsane noktalarında.</li>
        <li>
          Her yakalama {COIN_NAME} kazandırır. Yeni bir tür yakalarsan bonus alırsın. Günlük sınır: {SAFARI_DAILY_COIN_CAP} {COIN_NAME}.
        </li>
      </ol>
      <p className="mt-3 text-xs text-ink/55">Safari yürüyerek oynanır: konumun kısa sürede çok uzağa taşınırsa yakalama geçici olarak durur. Oynarken etrafına dikkat et, trafikte ve yolda telefona bakma.</p>
    </details>
  );
}
