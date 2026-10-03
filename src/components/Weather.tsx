"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faLocationDot, faRotateRight, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { KINDS, iconOf, kindOf, label, type Kind } from "@/lib/weather";
import { BIGA, dayLabel, type WeatherData } from "@/lib/weatherData";
import FX, { TINT } from "./weather/FX";
import WeatherDetails from "./weather/WeatherDetails";
import { useTween } from "./weather/hooks";

const REFRESH_MS = 5 * 60 * 1000; // 5 dakikada bir otomatik yenile
const FOCUS_REFRESH_MS = 2 * 60 * 1000; // sekmeye dönünce veri 2 dk'dan eskiyse hemen yenile

export default function Weather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [failed, setFailed] = useState(false); // son yenileme başarısız mı
  const [spin, setSpin] = useState(false);
  const [lastOk, setLastOk] = useState(0);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [force, setForce] = useState<{ k: Kind; night: boolean } | null>(null);
  const inflight = useRef(false);
  const lastOkRef = useRef(0);

  const load = useCallback(async (manual = false) => {
    if (inflight.current) return;
    inflight.current = true;
    if (manual) setSpin(true);
    try {
      const res = await fetch("/api/weather", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error("weather");
      setData(d);
      setFailed(false);
      lastOkRef.current = Date.now();
      setLastOk(lastOkRef.current);
    } catch {
      setFailed(true);
    } finally {
      inflight.current = false;
      if (manual) setTimeout(() => setSpin(false), 700);
    }
  }, []);

  // Canlı güncelleme: açılışta, her 5 dakikada, sekmeye dönünce ve internet geri gelince.
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastOkRef.current > FOCUS_REFRESH_MS) void load();
    };
    const onOnline = () => void load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [load]);

  // Saat: açıkken her saniye, kapalıyken yarım dakikada bir.
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), open ? 1000 : 30000);
    return () => clearInterval(t);
  }, [open]);

  // Esc ile kapat
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Önizleme: /?hava=snow  (clear, partly, cloudy, fog, rain, snow, storm, night)
  useEffect(() => {
    const v = new URLSearchParams(location.search).get("hava");
    if (v === "night") setForce({ k: "clear", night: true });
    else if (v && (KINDS as string[]).includes(v)) setForce({ k: v as Kind, night: false });
  }, []);

  const c = data?.current;
  const day = force ? !force.night : c?.isDay ?? true;
  const kind: Kind | null = force ? force.k : c ? kindOf(c.code) : null;
  const shown = Math.round(useTween(c?.temp ?? 0, 1100));

  return (
    <>
      <AnimatePresence>
        {kind && (
          <motion.div key={`${kind}-${day}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            <div className={`absolute inset-0 ${day ? TINT[kind] : "bg-[#050E1F]/55"}`} />
            <FX kind={kind} day={day} />
          </motion.div>
        )}
      </AnimatePresence>

      {!data || !c || !kind ? (
        failed ? (
          <section className="wx wx-err" aria-label="Biga hava durumu">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <span>Hava durumu şu an alınamadı.</span>
            <button type="button" onClick={() => void load(true)} className="wx-btn" aria-label="Tekrar dene">
              <FontAwesomeIcon icon={faRotateRight} className={spin ? "wx-spin" : ""} />
            </button>
          </section>
        ) : (
          <section className="wx wx-skel" aria-label="Hava durumu yükleniyor" aria-busy="true" />
        )
      ) : (
        <section className={`wx ${open ? "is-open" : ""}`} data-kind={kind} data-day={day ? 1 : 0} aria-label="Biga hava durumu">
          <button type="button" className="wx-head" aria-expanded={open} aria-controls="wx-body" onClick={() => setOpen((o) => !o)}>
            <span className="wx-now">
              <span className="wx-icon" aria-hidden>
                <FontAwesomeIcon icon={iconOf(kind, day)} />
              </span>
              <span className="wx-temp">
                <b>{shown}</b>
                <sup>°C</sup>
              </span>
              <span className="wx-meta">
                <strong>{label(kind, day)}</strong>
                <small>
                  <FontAwesomeIcon icon={faLocationDot} /> {BIGA.name} · Hissedilen {c.feels}°
                </small>
                <small className="wx-live">
                  <i className={failed || data.stale ? "is-off" : ""} /> {failed || data.stale ? "Son bilinen veri" : "Canlı"}
                </small>
              </span>
            </span>
            <span className="wx-chev" aria-hidden>
              <FontAwesomeIcon icon={faChevronDown} />
            </span>
            <span className="wx-days">
              {data.days.slice(1, 4).map((d, i) => (
                <span className="wx-day" key={d.date} style={{ ["--i" as string]: i } as CSSProperties}>
                  <em>{dayLabel(d.date, i + 1)}</em>
                  <FontAwesomeIcon icon={iconOf(kindOf(d.code), true)} />
                  <span>
                    <b>{d.max}°</b> <i>{d.min}°</i>
                  </span>
                </span>
              ))}
            </span>
          </button>

          <div className="wx-collapse" id="wx-body">
            <div className="wx-collapse-in">
              <WeatherDetails data={data} open={open} now={now} spin={spin} failed={failed} lastOk={lastOk} onRefresh={() => void load(true)} onClose={() => setOpen(false)} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
