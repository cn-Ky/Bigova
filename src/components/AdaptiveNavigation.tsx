"use client";
import BottomNav from "@/components/BottomNav";
import Mascot from "@/components/Mascot";
import SideNav from "@/components/SideNav";
import { isOn, settingsTab, sideTabs, type SideTab } from "@/components/tabs";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [...sideTabs, settingsTab as SideTab];

function TopLink({
  item,
  active,
  labeled,
  onNavigate,
}: {
  item: SideTab;
  active: boolean;
  labeled: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noopener noreferrer" : undefined}
      onClick={onNavigate}
      aria-label={item.l}
      title={item.l}
      aria-current={active ? "page" : undefined}
      className={`adaptive-top-link ${labeled ? "is-labeled" : "is-icon-only"} ${active ? "is-active" : ""}`}
    >
      <span className="adaptive-top-icon">
        <FontAwesomeIcon icon={item.i} />
      </span>
      {labeled && <span className="adaptive-top-label">{item.l}</span>}
    </Link>
  );
}

export default function AdaptiveNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);
  return (
    <>
      <SideNav />
      <BottomNav />
      <nav
        aria-label="Üst ana menü"
        className="adaptive-topbar adaptive-mobile-topbar"
      >
        <Link
          href="/"
          aria-label="Bigova ana sayfa"
          className="adaptive-top-brand"
        >
          <Mascot size={34} />
        </Link>
        <div className="adaptive-top-items">
          {links.map((item) => (
            <TopLink
              key={item.href}
              item={item}
              active={isOn(pathname, item.href)}
              labeled={false}
            />
          ))}
        </div>
      </nav>
      <nav
        aria-label="Üst ana menü"
        className="adaptive-topbar adaptive-desktop-topbar"
      >
        <Link href="/" className="adaptive-top-brand">
          <Mascot size={38} />
          <b className="font-display text-xl">Bigova</b>
        </Link>
        <div className="adaptive-top-items">
          {links.map((item) => (
            <TopLink
              key={item.href}
              item={item}
              active={isOn(pathname, item.href)}
              labeled
            />
          ))}
        </div>
      </nav>
      <div className="adaptive-drawer-layout">
        <header className="adaptive-drawer-bar">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Mascot size={34} />
            <b className="font-display text-lg">Bigova</b>
          </Link>
          <button
            type="button"
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-sea text-white"
          >
            <FontAwesomeIcon icon={open ? faXmark : faBars} />
          </button>
        </header>
        <AnimatePresence>
          {open && (
            <motion.div
              className="adaptive-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            >
              <motion.aside
                aria-label="Ana menü"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                onClick={(event) => event.stopPropagation()}
                className="adaptive-drawer-panel"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-xl font-extrabold">Menü</h2>
                  <button
                    type="button"
                    aria-label="Menüyü kapat"
                    onClick={() => setOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
                <div className="grid gap-1">
                  {links.map((item) => (
                    <TopLink
                      key={item.href}
                      item={item}
                      active={isOn(pathname, item.href)}
                      labeled
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
