"use client";
import { useEffect, useRef, useState } from "react";

/** Sayıyı bir değerden diğerine yumuşakça sayar (ease-out). "Hareketi azalt" ayarında doğrudan hedefe atlar. */
export function useTween(target: number, ms = 900): number {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      setV(target);
      return;
    }
    const a = from.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = a + (target - a) * e;
      from.current = cur;
      setV(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
