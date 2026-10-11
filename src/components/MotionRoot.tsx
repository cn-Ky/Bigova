"use client";
import { MotionConfig } from "framer-motion";
/** "Hareketi azalt" tercihine uygulama genelinde saygı duyar (eskiden template.tsx içindeydi). */
export default function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
