"use client";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactNode } from "react";

/**
 * Ortak arama kutusu. Tüm sayfalarda aynı görünür ve aynı odak davranışına sahiptir:
 * odaklanınca kapsayıcı (pill) turuncu halka alır, içteki input çerçeve çizmez.
 */
export default function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  className = "",
  clearable = true,
  autoFocus,
  trailing,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  className?: string;
  clearable?: boolean;
  autoFocus?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <label className={`search-pill ${className}`}>
      <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      {clearable && value && (
        <button
          type="button"
          className="search-clear"
          aria-label="Aramayı temizle"
          onClick={(e) => {
            e.preventDefault();
            onChange("");
          }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
      {trailing}
    </label>
  );
}
