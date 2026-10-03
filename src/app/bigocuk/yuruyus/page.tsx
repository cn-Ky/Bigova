"use client";
import Coin from "@/components/bigocuk/Coin";
import { errMsg, useBigocuk } from "@/lib/bigocuk/api";
import { COIN_NAME, DAILY_STEP_CAP, MAX_STEPS_PER_SYNC, STEPS_PER_COIN, SYNC_INTERVAL_MS } from "@/lib/bigocuk/config";
import { useStepSensor, type SensorStatus } from "@/lib/bigocuk/useStepSensor";
import { faArrowLeft, faPersonWalking, faPlay, faStop } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const fmt = (n: number) => n.toLocaleString("tr-TR");
const TICKS = Array.from({ length: STEPS_PER_COIN }, (_, i) => {
  const a = (i / STEPS_PER_COIN) * Math.PI * 2 - Math.PI / 2;
  return { x1: 140 + Math.cos(a) * 104, y1: 140 + Math.sin(a) * 104, x2: 140 + Math.cos(a) * 126, y2: 140 + Math.sin(a) * 126 };
});
const SENSOR_HELP: Partial<Record<SensorStatus, string>> = {
  denied: "Hareket sensörü izni verilmedi. Tarayıcı ayarlarından “Hareket ve Yönelim” erişimini açıp tekrar dene.",
  unsupported: "Bu tarayıcı hareket sensörünü desteklemiyor. Bigova'yı telefonundan aç.",
  nosensor: "Bu cihazdan sensör verisi gelmiyor. Bilgisayarda adım sayılamaz; telefonundan dene.",
};

export default function Yuruyus() {
  const { user, status, state, addSteps, commit } = useBigocuk();
  const live = status === "ready" && !!state;

  const [session, setSession] = useState(0); // bu oturumdaki adımlar (misafir de görür)
  const [pending, setPending] = useState(0); // henüz sunucuya yazılmamış adımlar
  const [pops, setPops] = useState<{ id: number; n: number }[]>([]);
  const [note, setNote] = useState("");
  const pendingRef = useRef(0);
  const flushing = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  async function flush() {
    if (flushing.current || pendingRef.current <= 0 || !stateRef.current) return;
    flushing.current = true;
    const sent = Math.min(pendingRef.current, MAX_STEPS_PER_SYNC);
    try {
      const r = await addSteps(sent);
      pendingRef.current -= sent;
      commit(r.next); // iki güncelleme aynı anda uygulanır, sayaç zıplamaz
      setPending(pendingRef.current);
      if (r.accepted < sent && r.next.todaySteps >= DAILY_STEP_CAP) setNote("cap");
      else setNote("");
    } catch (e) {
      setNote(`Adımlar kaydedilemedi, birazdan tekrar denenecek. (${errMsg(e)})`);
    } finally {
      flushing.current = false;
      if (pendingRef.current >= STEPS_PER_COIN) void flush();
    }
  }

  const sensor = useStepSensor((n) => {
    setSession((s) => s + n);
    const st = stateRef.current;
    if (!st) return;
    const room = DAILY_STEP_CAP - (st.todaySteps + pendingRef.current);
    if (room <= 0) return setNote("cap");
    const add = Math.min(n, room);
    const before = Math.floor((st.remainder + pendingRef.current) / STEPS_PER_COIN);
    pendingRef.current += add;
    setPending(pendingRef.current);
    const gained = Math.floor((st.remainder + pendingRef.current) / STEPS_PER_COIN) - before;
    if (gained > 0) {
      const id = Date.now();
      setPops((p) => [...p, { id, n: gained }]);
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1400);
      try {
        navigator.vibrate?.(30);
      } catch {}
    }
    if (pendingRef.current >= STEPS_PER_COIN) void flush();
  });
  const running = sensor.status === "running";

  // yürürken en geç 30 sn'de bir kaydet; ekran gizlenince ve sayfadan çıkınca da kaydet
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => void flush(), SYNC_INTERVAL_MS);
    const onHide = () => document.visibilityState === "hidden" && void flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    if (running) {
      sensor.stop();
      void flush(); // 50'ye tamamlanmayan adımlar da sunucuda birikir
    } else {
      setNote("");
      void sensor.start();
    }
  }

  // ekranda gösterilen değerler (bekleyen adımlar dahil)
  const progress = live ? state!.remainder + pending : session;
  const ring = progress % STEPS_PER_COIN;
  const coins = live ? state!.coins + Math.floor(progress / STEPS_PER_COIN) : 0;
  const today = live ? state!.todaySteps + pending : session;
  const capHit = live && today >= DAILY_STEP_CAP;
  const toNext = STEPS_PER_COIN - ring;
  const tickColor = (i: number) => (i < ring ? "rgb(var(--sun))" : "rgb(var(--ink) / .13)");

  return (
    <main className="pb-10">
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <Link href="/bigocuk" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-white/75">
          <FontAwesomeIcon icon={faArrowLeft} /> Bigocuk
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <FontAwesomeIcon icon={faPersonWalking} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">Yürüyüş</h1>
            <p className="text-sm text-white/75">
              Her {STEPS_PER_COIN} adım = 1 {COIN_NAME}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-md px-5 pt-6">
        {/* Kadran */}
        <div className="relative mx-auto aspect-square w-full max-w-[300px]">
          <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <circle cx="140" cy="140" r="96" fill="rgb(var(--card))" />
            {TICKS.map((t, i) => (
              <line
                key={i}
                {...t}
                strokeWidth="5"
                strokeLinecap="round"
                style={{ stroke: tickColor(i), transition: "stroke .25s" }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <motion.b
              key={session}
              initial={{ scale: 1.12 }}
              animate={{ scale: 1 }}
              className="font-display text-6xl font-extrabold leading-none"
            >
              {fmt(session)}
            </motion.b>
            <span className="mt-1 text-xs font-bold text-ink/60">adım</span>
            <span className="mx-auto mt-3 flex items-center gap-1.5 rounded-full bg-sun/25 px-3 py-1 text-xs font-extrabold text-ink">
              <Coin size={16} /> {toNext} adım kaldı
            </span>
          </div>
          <AnimatePresence>
            {pops.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10, scale: 0.6 }}
                animate={{ opacity: 1, y: -70, scale: 1.1 }}
                exit={{ opacity: 0, y: -110 }}
                transition={{ duration: 0.9 }}
                className="pointer-events-none absolute inset-x-0 top-1/3 z-10 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-sun px-4 py-2 font-display text-lg font-extrabold text-deep shadow-lg"
              >
                <Coin size={22} /> +{p.n} {COIN_NAME}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Başlat / bitir */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={toggle}
          disabled={status === "loading" || status === "setup"}
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-display text-xl font-extrabold shadow-md disabled:opacity-45 ${
            running ? "bg-coral text-deep" : "bg-sun text-deep"
          }`}
        >
          <FontAwesomeIcon icon={running ? faStop : faPlay} />
          {running ? "Yürüyüşü bitir" : "Yürümeye başla"}
        </motion.button>
        <p role="status" aria-live="polite" className="mt-3 min-h-5 text-center text-sm font-bold text-ink/70">
          {running
            ? "Sayıyorum. Telefonu cebinde ya da elinde taşı, ekranı açık tut."
            : SENSOR_HELP[sensor.status] ?? "Telefonunu al, başlat ve yürü."}
        </p>
        {note && (
          <p role="status" className="mt-2 text-center text-sm font-bold text-coral">
            {note === "cap"
              ? `Bugünlük ${fmt(DAILY_STEP_CAP)} adım sınırına ulaştın. Yarın yeniden kazanabilirsin.`
              : note}
          </p>
        )}
        {capHit && !note && (
          <p className="mt-2 text-center text-sm font-bold text-coral">
            Bugünlük {fmt(DAILY_STEP_CAP)} adım sınırına ulaştın. Yarın yeniden kazanabilirsin.
          </p>
        )}

        {/* Özet */}
        <dl className="mt-6 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-[20px] bg-card p-4 shadow-sm">
            <dt className="text-xs font-bold text-ink/60">Bugün</dt>
            <dd className="mt-1 font-display text-2xl font-extrabold">
              {fmt(today)}
              <span className="text-sm font-bold text-ink/50"> / {fmt(DAILY_STEP_CAP)}</span>
            </dd>
          </div>
          <div className="rounded-[20px] bg-card p-4 shadow-sm">
            <dt className="text-xs font-bold text-ink/60">Cüzdanın</dt>
            <dd className="mt-1 flex items-center justify-center gap-1.5 font-display text-2xl font-extrabold">
              <Coin size={24} /> {live ? fmt(coins) : "—"}
            </dd>
          </div>
        </dl>

        {/* Durum kartları */}
        {status === "guest" && (
          <div className="mt-5 rounded-[20px] bg-card p-5 shadow-sm">
            <b className="font-display text-lg">Adımları sayabilirsin, ama coin için giriş gerek</b>
            <p className="mt-1 text-sm text-ink/70">
              Okul mailinle giriş yaparsan kazandığın {COIN_NAME} hesabına yazılır ve avatar mağazasında harcayabilirsin.
            </p>
            <Link href="/giris" className="mt-3 inline-block rounded-xl bg-sea px-4 py-2.5 text-sm font-bold text-white">
              Giriş yap / Kayıt ol
            </Link>
          </div>
        )}
        {status === "setup" && (
          <div className="mt-5 rounded-[20px] bg-card p-5 text-sm shadow-sm">
            <b className="font-display text-lg">Bigocuk veritabanı henüz kurulmamış</b>
            <p className="mt-1 text-ink/70">
              Supabase SQL Editor'de <code>supabase/bigocuk_upgrade.sql</code> dosyasını bir kez çalıştır.
            </p>
          </div>
        )}
        {status === "error" && user && (
          <p className="mt-5 text-center text-sm font-bold text-coral">
            Bigcoin bilgilerin yüklenemedi. Bağlantını kontrol edip sayfayı yenile.
          </p>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-ink/55">
          Tarayıcılar ekran kapalıyken sensörü durdurur; bu yüzden yürürken ekran açık kalır.
        </p>
      </section>
    </main>
  );
}
