"use client";
import Mascot from "@/components/Mascot";
import Weather from "@/components/Weather";
import { useUser } from "@/lib/useUser";
import {
  faArrowRight,
  faCalendarDays,
  faLocationDot,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const tiles = [
  {
    kind: "business",
    t: "İşletmeler",
    d: "Fiyat, saat, tuvalet",
    href: "/isletmeler",
    c: "bg-tide text-deep",
  },
  {
    kind: "transport",
    t: "Ulaşım",
    d: "Otobüs ve servis",
    href: "/ulasim",
    c: "bg-sun text-deep",
  },
  {
    kind: "map",
    t: "Biga Haritası",
    d: "Şehri keşfet, yakınını bul",
    href: "/harita",
    c: "bg-sky text-deep",
  },
  {
    kind: "notes",
    t: "Notlar",
    d: "Ders notu, PDF",
    href: "/notlar",
    c: "bg-sea text-white",
  },
  {
    kind: "market",
    t: "Kitap pazarı",
    d: "İkinci el kitap",
    href: "/kitap-pazari",
    c: "bg-coral text-deep",
  },
  {
    kind: "jobs",
    t: "İş İlanları",
    d: "İş, staj ve iletişim bilgileri",
    href: "/is-ilanlari",
    c: "bg-tide text-deep",
  },
  {
    kind: "friends",
    t: "Arkadaşlar",
    d: "Arkadaş ekle, bire bir sohbet",
    href: "/arkadaslar",
    c: "bg-sky text-deep",
  },
  {
    kind: "magazine",
    t: "Dergi",
    d: "Okulun dergisi",
    href: "/dergi",
    c: "bg-card text-ink",
  },
  {
    kind: "schedule",
    t: "Ders Programı",
    d: "Bölümüne göre haftalık çizelge",
    href: "/ders-programi",
    c: "bg-sky text-deep",
  },
  {
    kind: "poll",
    t: "Anketler",
    d: "Haftanın sorusuna oy ver",
    href: "/anketler",
    c: "bg-sun text-deep",
  },
  {
    kind: "about",
    t: "Hakkımızda",
    d: "Misyon, ekip ve kulübümüz",
    href: "/hakkimizda",
    c: "bg-coral text-deep",
  },
  {
    kind: "ataturk",
    t: "Atatürk Köşesi",
    d: "Gençliğe Hitabe, Nutuk ve marşlar",
    href: "/ataturk",
    c: "bg-tide text-deep",
  },
  {
    kind: "ubys",
    t: "ÜBYS",
    d: "ÇOMÜ öğrenci bilgi sistemi",
    href: "https://ubys.comu.edu.tr/",
    c: "bg-card text-ink",
    external: true,
  },
];
const words = ["Kafe", "Kırtasiye", "Eczane", "Çamaşırhane", "Market"];
const list = {
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 28, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
  },
};

function TileArt({ kind }: { kind: string }) {
  const shared = {
    className: `tile-art tile-art--${kind}`,
    viewBox: "0 0 112 84",
    "aria-hidden": true as const,
  };
  switch (kind) {
    case "business":
      return (
        <svg {...shared}>
          <path d="M25 35h62v39H25z" fill="currentColor" opacity=".14" />
          <path d="M20 35h72l-7-18H27z" fill="currentColor" opacity=".24" />
          <path
            d="M20 35h72l-7-18H27z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M25 35v39h62V35M37 35v-5a8 8 0 0 1 16 0v5m11 0v-5a8 8 0 0 1 16 0v5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M34 46h17v14H34zm34 0h11v28H68z"
            fill="currentColor"
            opacity=".3"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M18 75h78"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "transport":
      return (
        <svg {...shared}>
          <path
            d="M21 54V28q0-8 9-8h47q9 0 9 8v26"
            fill="currentColor"
            opacity=".2"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M24 30h59v25H24z"
            fill="currentColor"
            opacity=".13"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M29 34h16v13H29zm22 0h15v13H51zm21 0h7v13h-7z"
            fill="currentColor"
            opacity=".38"
          />
          <path d="M25 55h58v8H25z" fill="currentColor" opacity=".32" />
          <circle cx="36" cy="64" r="7" fill="currentColor" />
          <circle cx="73" cy="64" r="7" fill="currentColor" />
          <circle cx="36" cy="64" r="2.5" fill="rgb(var(--card))" />
          <circle cx="73" cy="64" r="2.5" fill="rgb(var(--card))" />
          <path
            d="M17 74h75"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="5 7"
          />
        </svg>
      );
    case "map":
      return (
        <svg {...shared}>
          <path
            d="m18 30 25-11 25 11 26-11v43L68 73 43 62 18 73z"
            fill="currentColor"
            opacity=".15"
          />
          <path
            d="M43 19v43m25-32v43M18 30l25-11 25 11 26-11M18 73l25-11 25 11 26-11"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M56 31c-8 0-14 6-14 14 0 11 14 25 14 25s14-14 14-25c0-8-6-14-14-14Z"
            fill="rgb(var(--coral))"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle cx="56" cy="45" r="5" fill="rgb(var(--card))" />
        </svg>
      );
    case "notes":
      return (
        <svg {...shared}>
          <path
            d="M56 27c-12-9-25-10-39-6v43c14-4 27-3 39 6 12-9 25-10 39-6V21c-14-4-27-3-39 6z"
            fill="currentColor"
            opacity=".18"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M56 27v43M27 32c8-2 15-1 22 2m-22 8c8-2 15-1 22 2m36-12c-8-2-15-1-22 2m22 8c-8-2-15-1-22 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="m77 14 3 5 6 1-4 4 1 6-6-3-5 3 1-6-4-4 6-1z"
            fill="currentColor"
          />
        </svg>
      );
    case "market":
      return (
        <svg {...shared}>
          <path
            d="M25 24q0-5 5-5h43q5 0 5 5v49q0 5-5 5H30q-5 0-5-5z"
            fill="currentColor"
            opacity=".16"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M34 29h35v4H34zm0 11h27v3H34zm0 9h31v3H34z"
            fill="currentColor"
            opacity=".55"
          />
          <path
            d="M80 43h12v27a6 6 0 0 1-12 0z"
            fill="currentColor"
            opacity=".28"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M86 48v18m-5-9h10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M20 78h74"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "jobs":
      return (
        <svg {...shared}>
          <path
            d="M22 34h68q5 0 5 5v33q0 5-5 5H22q-5 0-5-5V39q0-5 5-5z"
            fill="currentColor"
            opacity=".18"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M42 34v-7q0-5 5-5h18q5 0 5 5v7"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M17 54h78"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M50 49h12v11H50z"
            fill="currentColor"
            opacity=".55"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    case "friends":
      return (
        <svg {...shared}>
          <path
            d="M15 69c1-13 9-20 20-20s19 7 20 20"
            fill="currentColor"
            opacity=".23"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle
            cx="35"
            cy="34"
            r="12"
            fill="currentColor"
            opacity=".28"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M56 71c1-12 8-19 18-19s18 7 19 19"
            fill="currentColor"
            opacity=".18"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle
            cx="74"
            cy="38"
            r="11"
            fill="currentColor"
            opacity=".25"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M45 17h31q6 0 6 6v8q0 6-6 6H63l-8 7v-7h-3q-7 0-7-6v-8q0-6 6-6z"
            fill="rgb(var(--card))"
            opacity=".7"
          />
          <path
            d="M56 27h20"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "schedule":
      return (
        <svg {...shared}>
          <rect
            x="22"
            y="18"
            width="68"
            height="54"
            rx="7"
            fill="currentColor"
            opacity=".16"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M22 33h68M39 14v10m34-10v10M36 44h10m9 0h10m9 0h10m-38 13h10m9 0h10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M40 73h32m-25 6h18"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "poll":
      return (
        <svg {...shared}>
          <path
            d="M26 20h52q8 0 8 8v43q0 7-8 7H26q-8 0-8-7V28q0-8 8-8z"
            fill="currentColor"
            opacity=".15"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M34 35h35M34 48h27"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="38" cy="64" r="7" fill="currentColor" opacity=".4" />
          <circle cx="58" cy="64" r="7" fill="currentColor" opacity=".25" />
          <circle cx="78" cy="64" r="7" fill="currentColor" opacity=".15" />
          <path
            d="m74 18 5 5 10-11"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "about":
      return (
        <svg {...shared}>
          <circle
            cx="56"
            cy="42"
            r="28"
            fill="currentColor"
            opacity=".14"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M42 45q1-14 14-14t14 14q0 7-7 12-4 3-4 8h-7q0-9 7-14 4-3 4-6a7 7 0 0 0-14 0zm10 24h8"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="m24 18 2 5 5 2-5 2-2 5-2-5-5-2 5-2zm64 39 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"
            fill="currentColor"
          />
        </svg>
      );
    case "ataturk":
      return (
        <svg {...shared}>
          <image
            href="https://upload.wikimedia.org/wikipedia/commons/8/8e/Ataturk_imza_01_tam35blog.png"
            x="12"
            y="8"
            width="94"
            height="30"
            preserveAspectRatio="xMidYMid meet"
          />
        </svg>
      );
    case "ubys":
      return (
        <svg {...shared}>
          <rect
            x="20"
            y="20"
            width="72"
            height="48"
            rx="6"
            fill="currentColor"
            opacity=".15"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M37 79h38m-19-11v11M31 31h39M31 42h25M31 53h15"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M72 48h14m-6-6 6 6-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg {...shared}>
          <path
            d="M25 18h52q7 0 7 7v47q0 6-7 6H25z"
            fill="currentColor"
            opacity=".17"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M25 18v60q-10-3-10-11V27q0-8 10-9z"
            fill="currentColor"
            opacity=".32"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M38 33h33M38 43h27M38 53h33M38 63h22"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="m88 14 2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"
            fill="currentColor"
          />
        </svg>
      );
  }
}

function Tile({ x }: { x: (typeof tiles)[number] }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const move = (e: React.MouseEvent) => {
    const el = ref.current!,
      b = el.getBoundingClientRect(),
      px = (e.clientX - b.left) / b.width,
      py = (e.clientY - b.top) / b.height;
    ry.set((px - 0.5) * 16);
    rx.set(-(py - 0.5) * 16);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
  };
  const leave = () => {
    rx.set(0);
    ry.set(0);
  };
  const [rip, setRip] = useState<{ id: number; x: number; y: number }[]>([]);
  const press = (e: React.PointerEvent) => {
    const b = ref.current!.getBoundingClientRect(),
      id = Date.now();
    setRip((r) => [...r, { id, x: e.clientX - b.left, y: e.clientY - b.top }]);
    setTimeout(() => setRip((r) => r.filter((z) => z.id !== id)), 650);
    try {
      navigator.vibrate?.(8);
    } catch {}
  };
  return (
    <motion.li variants={item}>
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
        whileHover={{ y: -8, scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        <Link
          ref={ref}
          href={x.href}
          target={x.external ? "_blank" : undefined}
          rel={x.external ? "noopener noreferrer" : undefined}
          onMouseMove={move}
          onMouseLeave={leave}
          onPointerDown={press}
          className={`group relative flex h-36 flex-col justify-between overflow-hidden rounded-[22px] p-4 shadow-sm transition-shadow hover:shadow-[0_18px_40px_rgba(14,58,91,.28)] lg:h-44 ${x.c}`}
        >
          <span className="tile-glare pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <span className="tile-number relative z-10">
            {String(tiles.findIndex((tile) => tile.t === x.t) + 1).padStart(
              2,
              "0",
            )}
          </span>
          <TileArt kind={x.kind} />
          {rip.map((r) => (
            <span
              key={r.id}
              className="ripple"
              style={{
                left: r.x - 120,
                top: r.y - 120,
                width: 240,
                height: 240,
              }}
            />
          ))}
          <FontAwesomeIcon
            icon={faArrowRight}
            className="absolute bottom-4 right-4 -translate-x-3 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-80"
          />
          <span>
            <b className="block font-display text-lg leading-tight">{x.t}</b>
            <span className="text-[13px] opacity-75">{x.d}</span>
          </span>
        </Link>
      </motion.div>
    </motion.li>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, name } = useUser();
  const { scrollY } = useScroll();
  const my = useTransform(scrollY, [0, 300], [0, 60]);
  const hy = useTransform(scrollY, [0, 300], [0, -18]);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % words.length), 2200);
    return () => clearInterval(t);
  }, []);
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      q.trim()
        ? `/isletmeler?q=${encodeURIComponent(q.trim())}`
        : "/isletmeler",
    );
  };
  return (
    <main>
      <header className="relative overflow-hidden rounded-b-[36px] bg-gradient-to-b from-sea to-sea2 px-5 pb-16 pt-[max(4rem,calc(env(safe-area-inset-top)+3.25rem))] text-white lg:pt-6">
        <span className="cloud left-0 top-8 h-5 w-24" />
        <span className="cloud left-0 top-20 h-4 w-16 [animation-delay:-16s]" />
        <Weather />
        <div className="relative z-10 flex items-end justify-between">
          <motion.div style={{ y: hy }} className="relative z-10">
            <motion.p
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-sky"
            >
              Merhaba{user && name ? `, ${name}` : ""}{" "}
              <span className="inline-block origin-[70%_70%] animate-[wig_2.4s_ease_infinite]">
                👋
              </span>
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="mt-1 font-display text-[28px] font-extrabold leading-tight lg:text-5xl"
            >
              Bugün Biga'da
              <br />
              ne yapıyoruz?
            </motion.h1>
          </motion.div>
          <div className="shrink-0 lg:origin-bottom lg:scale-[1.25]">
            <motion.div
              style={{ y: my }}
              whileHover={{ rotate: -6, scale: 1.08 }}
              whileTap={{ rotate: [0, -14, 10, 0], y: -14 }}
            >
              <Mascot size={104} className="-mb-2" />
            </motion.div>
          </div>
        </div>
      </header>

      <motion.form
        onSubmit={go}
        whileHover={{ scale: 1.01 }}
        whileFocus={{ scale: 1.02 }}
        className="relative z-10 mx-5 -mt-7 flex items-center gap-3 rounded-full bg-card px-5 py-4 text-ink shadow-[0_10px_30px_rgba(14,58,91,.16)] transition-shadow focus-within:shadow-[0_14px_40px_rgba(44,196,181,.45)] focus-within:ring-2 focus-within:ring-tide"
      >
        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-ink/60" />
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="İşletme ara"
            className="w-full bg-transparent !outline-none"
          />
          {!q && (
            <span className="pointer-events-none absolute inset-0 flex items-center gap-1 text-ink/60">
              <AnimatePresence mode="wait">
                <motion.b
                  key={i}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="font-semibold"
                >
                  {words[i]}
                </motion.b>
              </AnimatePresence>{" "}
              ara…
            </span>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.1 }}
          aria-label="Ara"
          className="grid h-9 w-9 place-items-center rounded-full bg-sea text-white"
        >
          <FontAwesomeIcon icon={faArrowRight} />
        </motion.button>
      </motion.form>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.45 }}
        aria-labelledby="event-heading"
        className="event-banner relative mx-5 mt-5 grid min-h-40 grid-cols-[minmax(0,1fr)_92px] items-center overflow-hidden rounded-[22px] px-5 py-5 text-white shadow-[0_12px_28px_rgba(7,38,56,.2)] md:grid-cols-[minmax(0,1fr)_180px] md:px-7"
      >
        <div className="relative z-10 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-sun">
            <FontAwesomeIcon icon={faCalendarDays} /> Etkinlik duyurusu{" "}
            <span className="rounded-full bg-white/15 px-2 py-1 text-white/85">
              Örnek
            </span>
          </div>
          <h2
            id="event-heading"
            className="mt-2 max-w-2xl font-display text-xl font-extrabold leading-tight md:text-2xl"
          >
            Biga'da kampüs buluşması
          </h2>
          <p className="mt-1 max-w-xl text-sm text-white/75">
            Yeni dönem, kulüpler ve kampüs etkinlikleri için duyurular burada.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-white/85">
            <span>
              <FontAwesomeIcon
                icon={faCalendarDays}
                className="mr-1.5 text-sun"
              />
              10 Ekim · 13.00
            </span>
            <span>
              <FontAwesomeIcon
                icon={faLocationDot}
                className="mr-1.5 text-sun"
              />
              Kampüs meydanı
            </span>
          </div>
        </div>
        <svg
          className="event-art relative z-10 ml-auto h-24 w-24 md:h-32 md:w-36"
          viewBox="0 0 144 128"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M22 106h100"
            stroke="white"
            strokeOpacity=".4"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M39 101V55l34-24 34 24v46"
            fill="rgb(var(--sun))"
            fillOpacity=".9"
            stroke="white"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M53 101V70q0-7 7-7h26q7 0 7 7v31"
            fill="rgb(var(--sea))"
            stroke="white"
            strokeWidth="3"
          />
          <path
            d="M49 54h48M73 31v18"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="m110 20 3 7 7 3-7 3-3 7-3-7-7-3 7-3zM27 39l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"
            fill="white"
          />
          <path
            d="M109 75h12v26h-12z"
            fill="rgb(var(--coral))"
            stroke="white"
            strokeWidth="2"
          />
          <path
            d="M115 75V57m0 0 11 5-11 5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.section>

      <motion.ul
        variants={list}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="mt-6 grid grid-cols-2 gap-3 px-5 md:grid-cols-3 lg:gap-4"
      >
        {tiles.map((x) => (
          <Tile key={x.t} x={x} />
        ))}
      </motion.ul>

      {user === null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          whileHover={{ y: -4 }}
        >
          <Link
            href="/giris"
            className="group mx-5 mt-5 flex items-center gap-3 rounded-[26px] bg-card p-4 shadow-sm transition-shadow hover:shadow-lg"
          >
            <Mascot size={44} />
            <span className="flex-1 text-sm">
              <b className="block font-display text-base">
                Giriş yap veya kayıt ol
              </b>
              Notlar, arkadaşlar ve mesajlar seni bekliyor.
            </span>
            <FontAwesomeIcon
              icon={faArrowRight}
              className="mr-2 transition group-hover:translate-x-1.5"
            />
          </Link>
        </motion.div>
      )}
    </main>
  );
}
