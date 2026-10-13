"use client";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

/** Mobilde alttan, geniş ekranda ortada açılan pencere. Esc veya dışına dokunmak kapatır. */
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-deep/60 backdrop-blur-sm md:items-center md:p-6"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-2xl md:rounded-[24px]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          <motion.button whileTap={{ scale: 0.88 }} whileHover={{ rotate: 90 }} type="button" onClick={onClose} aria-label="Kapat" className="grid h-9 w-9 place-items-center rounded-full bg-foam">
            <FontAwesomeIcon icon={faXmark} />
          </motion.button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export const fieldClass =
  "w-full rounded-xl bg-foam px-4 py-3 text-base text-ink placeholder:text-ink/45 field-ring";
