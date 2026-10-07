"use client";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useId, type ReactNode } from "react";
import type { Category } from "@/lib/menuData";

/** Yan menü ve çekmecede kullanılan açılır/kapanır kategori grubu. */
export default function CategoryGroup({
  cat,
  open,
  onToggle,
  badge,
  children,
}: {
  cat: Category;
  open: boolean;
  onToggle: () => void;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="side-cat">
      <button
        type="button"
        className="side-cat-head cat-head"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
      >
        <FontAwesomeIcon icon={cat.icon} className="w-4 shrink-0 opacity-80" />
        <span className="min-w-0 flex-1 truncate">{cat.label}</span>
        {!open && badge}
        <FontAwesomeIcon icon={faChevronDown} className="cat-chevron shrink-0 text-[10px] opacity-70" />
      </button>
      <div id={id} className="cat-body" data-open={open} role="group" aria-label={cat.label}>
        <div className="cat-inner">{children}</div>
      </div>
    </div>
  );
}
