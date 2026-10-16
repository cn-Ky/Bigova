import type { DishCategory } from "@/lib/menus/types";

/** Her yemek kategorisi için küçük, tema renginde (currentColor) çizim. Buhar/parıltı CSS ile hareket eder (yemekhane.css). */
export default function DishArt({ cat, size = 40, className = "" }: { cat: DishCategory; size?: number; className?: string }) {
  const p = { viewBox: "0 0 48 48", width: size, height: size, "aria-hidden": true as const, className: `dish-art ${className}` };
  switch (cat) {
    case "corba":
      return (
        <svg {...p}>
          <g className="dish-steam" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity=".55">
            <path d="M16 15c-3-3 3-5 0-9" />
            <path d="M24 15c-3-3 3-5 0-9" style={{ animationDelay: ".4s" }} />
            <path d="M32 15c-3-3 3-5 0-9" style={{ animationDelay: ".8s" }} />
          </g>
          <path d="M6 22h36c0 10-7 17-18 17S6 32 6 22z" fill="currentColor" opacity=".9" />
          <path d="M6 22h36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M16 42h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".5" />
          <ellipse cx="24" cy="23" rx="15" ry="2.2" fill="#fff" opacity=".35" />
        </svg>
      );
    case "ana":
      return (
        <svg {...p}>
          <ellipse cx="24" cy="30" rx="19" ry="12" fill="currentColor" opacity=".16" />
          <ellipse cx="24" cy="30" rx="19" ry="12" fill="none" stroke="currentColor" strokeWidth="2.6" />
          <path d="M16 28c0-6 6-10 12-8 5 2 6 8 2 11-4 3-14 3-14-3z" fill="currentColor" opacity=".9" />
          <path d="M30 22l7-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="38.5" cy="13.5" r="2.6" fill="currentColor" />
          <circle cx="35" cy="17" r="2.4" fill="currentColor" />
          <path d="M20 27c2-2 5-2.5 7-1.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".45" />
        </svg>
      );
    case "pilav":
      return (
        <svg {...p}>
          <path d="M6 30c0-12 8-20 18-20s18 8 18 20z" fill="currentColor" opacity=".9" />
          <path d="M4 32h40c0 6-8 10-20 10S4 38 4 32z" fill="currentColor" opacity=".35" />
          <g fill="#fff" opacity=".7">
            <ellipse cx="17" cy="22" rx="2.4" ry="1.2" transform="rotate(-30 17 22)" />
            <ellipse cx="26" cy="17" rx="2.4" ry="1.2" transform="rotate(20 26 17)" />
            <ellipse cx="31" cy="25" rx="2.4" ry="1.2" transform="rotate(-10 31 25)" />
            <ellipse cx="22" cy="27" rx="2.4" ry="1.2" transform="rotate(40 22 27)" />
          </g>
        </svg>
      );
    case "yan":
      return (
        <svg {...p}>
          <path d="M5 26h38c0 10-8 16-19 16S5 36 5 26z" fill="currentColor" opacity=".35" />
          <g className="dish-sway" style={{ transformOrigin: "24px 26px" }}>
            <path d="M12 26c-3-8 2-14 9-15 1 8-2 13-9 15z" fill="currentColor" opacity=".9" />
            <path d="M22 26c-1-9 4-15 11-14 0 8-4 13-11 14z" fill="currentColor" opacity=".7" />
            <path d="M30 26c2-6 6-9 11-8-1 6-5 9-11 8z" fill="currentColor" opacity=".9" />
          </g>
          <circle cx="19" cy="31" r="2.6" fill="#fff" opacity=".6" />
          <circle cx="29" cy="33" r="2.2" fill="#fff" opacity=".6" />
        </svg>
      );
    case "tatli":
      return (
        <svg {...p}>
          <path d="M6 36 40 24v14a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" fill="currentColor" opacity=".9" />
          <path d="M6 36 40 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M8 31l30-11" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
          <path d="M7 41h33" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".35" />
          <g className="dish-pop" style={{ transformOrigin: "30px 16px" }}>
            <circle cx="30" cy="16" r="4.4" fill="currentColor" />
            <path d="M30 12c1-4 4-6 7-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      );
    case "icecek":
      return (
        <svg {...p}>
          <path d="M14 14h20l-3 26a3 3 0 0 1-3 2.6H20a3 3 0 0 1-3-2.6z" fill="currentColor" opacity=".3" />
          <path d="M14 14h20l-3 26a3 3 0 0 1-3 2.6H20a3 3 0 0 1-3-2.6z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M16 24h16l-1.7 16a2 2 0 0 1-2 1.8h-8.6a2 2 0 0 1-2-1.8z" fill="currentColor" opacity=".9" />
          <path d="M28 14 33 4h5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <circle className="dish-bubble" cx="21" cy="30" r="1.6" fill="#fff" opacity=".7" />
          <circle className="dish-bubble" cx="26" cy="34" r="1.3" fill="#fff" opacity=".7" style={{ animationDelay: ".6s" }} />
        </svg>
      );
    case "kahvalti":
    default:
      return (
        <svg {...p}>
          <path d="M9 24c-2-9 6-16 14-15 9-1 18 4 16 14-1 6 2 10-4 14-6 4-10-1-15 1-7 2-11-4-11-14z" fill="currentColor" opacity=".25" />
          <path d="M9 24c-2-9 6-16 14-15 9-1 18 4 16 14-1 6 2 10-4 14-6 4-10-1-15 1-7 2-11-4-11-14z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
          <circle className="dish-pop" cx="24" cy="24" r="7.5" fill="currentColor" style={{ transformOrigin: "24px 24px" }} />
          <circle cx="21.5" cy="21.5" r="2.2" fill="#fff" opacity=".6" />
        </svg>
      );
  }
}
