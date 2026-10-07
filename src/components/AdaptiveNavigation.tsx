"use client";
import BottomNav from "@/components/BottomNav";
import Mascot from "@/components/Mascot";
import SideNav from "@/components/SideNav";
import CategoryGroup from "@/components/CategoryGroup";
import UnreadBadge from "@/components/UnreadBadge";
import { isOn, settingsTab, type SideTab } from "@/components/tabs";
import { categoryOf, flatLinks, groupedTabs, home } from "@/lib/menuData";
import { useOpenCats } from "@/lib/useOpenCats";
import { useUser } from "@/lib/useUser";
import { faBars, faRightFromBracket, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";


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
        {item.href === "/arkadaslar" && <UnreadBadge />}
      </span>
      {labeled && <span className="adaptive-top-label">{item.l}</span>}
    </Link>
  );
}

export default function AdaptiveNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, signOut } = useUser();
  const active = categoryOf(pathname);
  const { open: openCats, toggle } = useOpenCats("bigova-cats-nav", ["city"], active);
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
          {flatLinks.map(({ item, group }, i) => (
            <span key={item.href} className="contents">
              {i > 0 && flatLinks[i - 1].group !== group && <span className="adaptive-top-sep" aria-hidden="true" />}
              <TopLink item={item} active={isOn(pathname, item.href)} labeled={false} />
            </span>
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
          {flatLinks.map(({ item, group }, i) => (
            <span key={item.href} className="contents">
              {i > 0 && flatLinks[i - 1].group !== group && <span className="adaptive-top-sep" aria-hidden="true" />}
              <TopLink item={item} active={isOn(pathname, item.href)} labeled />
            </span>
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
                  <TopLink item={home} active={isOn(pathname, home.href)} labeled onNavigate={() => setOpen(false)} />
                  {groupedTabs.map(({ cat, items }) => (
                    <CategoryGroup
                      key={cat.id}
                      cat={cat}
                      open={openCats.has(cat.id)}
                      onToggle={() => toggle(cat.id)}
                      badge={cat.id === "social" ? <UnreadBadge /> : undefined}
                    >
                      <div className="grid gap-1 pb-2">
                        {items.map((item) => (
                          <TopLink
                            key={item.href}
                            item={item}
                            active={isOn(pathname, item.href)}
                            labeled
                            onNavigate={() => setOpen(false)}
                          />
                        ))}
                      </div>
                    </CategoryGroup>
                  ))}
                  <TopLink item={settingsTab as SideTab} active={isOn(pathname, settingsTab.href)} labeled onNavigate={() => setOpen(false)} />
                </div>
                {user && (
                  <button
                    type="button"
                    onClick={async () => {
                      setOpen(false);
                      await signOut();
                    }}
                    className="adaptive-top-link is-labeled mt-4 w-full"
                  >
                    <span className="adaptive-top-icon">
                      <FontAwesomeIcon icon={faRightFromBracket} />
                    </span>
                    <span className="adaptive-top-label">Çıkış yap</span>
                  </button>
                )}
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
