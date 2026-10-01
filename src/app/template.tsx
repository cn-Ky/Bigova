"use client";
import { MotionConfig, motion } from "framer-motion";
// Her sayfa geçişinde içerik yumuşakça kayarak gelir; "hareketi azalt" ayarına saygı duyar.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>{children}</motion.div>
    </MotionConfig>
  );
}
