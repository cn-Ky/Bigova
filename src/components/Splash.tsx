"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Mascot from "./Mascot";

export default function Splash() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    let seen = false;
    try { seen = !!sessionStorage.getItem("splash"); sessionStorage.setItem("splash", "1"); } catch {}
    if (seen) return setShow(false);
    const t = setTimeout(() => setShow(false), 2100);
    return () => clearTimeout(t);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="splash" exit={{ opacity: 0, scale: 1.06 }} transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 grid place-items-center bg-gradient-to-b from-sea to-deep">
          <div className="text-center">
            <div className="fly-in mx-auto w-fit"><Mascot size={150} /></div>
            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5 }}
              className="mt-2 font-display text-5xl font-extrabold text-white">Bigova</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="mt-1 text-sky">Biga'da öğrenci olmak kolay</motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
