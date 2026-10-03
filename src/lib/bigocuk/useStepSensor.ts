"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { StepDetector } from "./stepDetector";

/**
 * idle: kapalı · running: sayıyor · denied: izin verilmedi
 * unsupported: tarayıcıda hareket sensörü yok · nosensor: sensör var ama veri gelmiyor (örn. bilgisayar)
 */
export type SensorStatus = "idle" | "running" | "denied" | "unsupported" | "nosensor";

type MotionCtor = { requestPermission?: () => Promise<"granted" | "denied"> };

export function useStepSensor(onSteps: (n: number) => void) {
  const [status, setStatus] = useState<SensorStatus>("idle");
  const detector = useRef(new StepDetector());
  const listener = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);
  const gotData = useRef(false);
  const cb = useRef(onSteps);
  cb.current = onSteps;

  const holdScreen = useCallback(async () => {
    try {
      wake.current = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      wake.current = null; // desteklenmiyorsa sorun değil
    }
  }, []);

  const stop = useCallback(() => {
    if (listener.current) window.removeEventListener("devicemotion", listener.current);
    listener.current = null;
    wake.current?.release().catch(() => {});
    wake.current = null;
    setStatus((s) => (s === "running" ? "idle" : s));
  }, []);

  /** Mutlaka bir dokunma/tıklama olayından çağır: iOS izni yalnızca kullanıcı hareketiyle sorar. */
  const start = useCallback(async () => {
    if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") {
      setStatus("unsupported");
      return;
    }
    const ctor = DeviceMotionEvent as unknown as MotionCtor;
    if (typeof ctor.requestPermission === "function") {
      let answer: string;
      try {
        answer = await ctor.requestPermission();
      } catch {
        answer = "denied";
      }
      if (answer !== "granted") {
        setStatus("denied");
        return;
      }
    }
    detector.current.reset();
    gotData.current = false;
    const h = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity ?? e.acceleration;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      gotData.current = true;
      const n = detector.current.push(a.x, a.y, a.z, e.timeStamp || performance.now());
      if (n > 0) cb.current(n);
    };
    listener.current = h;
    window.addEventListener("devicemotion", h);
    setStatus("running");
    void holdScreen();
    // 3 sn içinde hiç veri gelmediyse bu cihazda sensör yok demektir
    setTimeout(() => {
      if (listener.current === h && !gotData.current) {
        stop();
        setStatus("nosensor");
      }
    }, 3000);
  }, [holdScreen, stop]);

  // Sekme tekrar görünür olunca ekran kilidini yeniden al (tarayıcı gizlenince bırakır)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && listener.current) void holdScreen();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [holdScreen]);

  useEffect(() => stop, [stop]);

  return { status, start, stop };
}
