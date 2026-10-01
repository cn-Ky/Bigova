"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStore, faBookOpen, faBus, faUserGroup, faNewspaper, faBook, faMagnifyingGlass, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import Mascot from "@/components/Mascot";
import { useUser } from "@/lib/useUser";

const tiles = [
  { icon: faStore, t: "İşletmeler", d: "Fiyat, saat, tuvalet", href: "/isletmeler", c: "bg-tide text-deep" },
  { icon: faBus, t: "Ulaşım", d: "Otobüs ve servis", href: "/ulasim", c: "bg-sun text-deep" },
  { icon: faBookOpen, t: "Notlar", d: "Ders notu, PDF", href: "/yakinda/notlar", c: "bg-sea text-white", soon: 1 },
  { icon: faBook, t: "Kitap pazarı", d: "İkinci el kitap", href: "/yakinda/kitap", c: "bg-coral text-deep", soon: 1 },
  { icon: faUserGroup, t: "Arkadaşlar", d: "Mesaj, konum", href: "/yakinda/arkadaslar", c: "bg-sky text-deep", soon: 1 },
  { icon: faNewspaper, t: "Dergi", d: "Okulun dergisi", href: "/yakinda/dergi", c: "bg-card text-ink", soon: 1 },
];
const words = ["Kafe", "Kırtasiye", "Eczane", "Çamaşırhane", "Market"];
const list = { show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 28, scale: 0.92 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 20 } } };

function Tile({ x }: { x: (typeof tiles)[number] }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const move = (e: React.MouseEvent) => {
    const el = ref.current!, b = el.getBoundingClientRect(), px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
    ry.set((px - 0.5) * 16); rx.set(-(py - 0.5) * 16);
    el.style.setProperty("--gx", `${px * 100}%`); el.style.setProperty("--gy", `${py * 100}%`);
  };
  const leave = () => { rx.set(0); ry.set(0); };
  const [rip, setRip] = useState<{ id: number; x: number; y: number }[]>([]);
  const press = (e: React.PointerEvent) => {
    const b = ref.current!.getBoundingClientRect(), id = Date.now();
    setRip((r) => [...r, { id, x: e.clientX - b.left, y: e.clientY - b.top }]);
    setTimeout(() => setRip((r) => r.filter((z) => z.id !== id)), 650);
    try { navigator.vibrate?.(8); } catch {}
  };
  return (
    <motion.li variants={item}>
      <motion.div style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }} whileHover={{ y: -8, scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
        <Link ref={ref} href={x.href} onMouseMove={move} onMouseLeave={leave} onPointerDown={press} className={`group relative flex h-36 flex-col justify-between overflow-hidden rounded-[26px] p-4 shadow-sm transition-shadow hover:shadow-[0_18px_40px_rgba(14,58,91,.28)] lg:h-44 ${x.c}`}>
          <span className="tile-glare pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {rip.map((r) => <span key={r.id} className="ripple" style={{ left: r.x - 120, top: r.y - 120, width: 240, height: 240 }} />)}
          <FontAwesomeIcon icon={x.icon} className="ico self-start text-2xl" />
          <FontAwesomeIcon icon={faArrowRight} className="absolute bottom-4 right-4 -translate-x-3 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-80" />
          <span><b className="block font-display text-lg leading-tight">{x.t}</b><span className="text-[13px] opacity-75">{x.d}</span></span>
          {x.soon && <span className="absolute right-3 top-3 rounded-full bg-card/70 px-2 py-0.5 text-[10px] font-bold text-ink">Yakında</span>}
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
  const [q, setQ] = useState(""); const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((n) => (n + 1) % words.length), 2200); return () => clearInterval(t); }, []);
  const go = (e: React.FormEvent) => { e.preventDefault(); router.push(q.trim() ? `/isletmeler?q=${encodeURIComponent(q.trim())}` : "/isletmeler"); };
  return (
    <main>
      <header className="relative overflow-hidden rounded-b-[36px] bg-gradient-to-b from-sea to-sea2 px-5 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))] text-white">
        <span className="cloud left-0 top-8 h-5 w-24" /><span className="cloud left-0 top-20 h-4 w-16 [animation-delay:-16s]" />
        <div className="relative flex items-end justify-between">
          <motion.div style={{ y: hy }} className="relative z-10">
            <motion.p initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-sky">Merhaba{user && name ? `, ${name}` : ""} <span className="inline-block origin-[70%_70%] animate-[wig_2.4s_ease_infinite]">👋</span></motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="mt-1 font-display text-[28px] font-extrabold leading-tight lg:text-5xl">Bugün Biga'da<br />ne yapıyoruz?</motion.h1>
          </motion.div>
          <div className="shrink-0 lg:origin-bottom lg:scale-150"><motion.div style={{ y: my }} whileHover={{ rotate: -6, scale: 1.08 }} whileTap={{ rotate: [0, -14, 10, 0], y: -14 }}><Mascot size={104} className="-mb-2" /></motion.div></div>
        </div>
      </header>

      <motion.form onSubmit={go} whileHover={{ scale: 1.01 }} whileFocus={{ scale: 1.02 }} className="relative z-10 mx-5 -mt-7 flex items-center gap-3 rounded-full bg-card px-5 py-4 text-ink shadow-[0_10px_30px_rgba(14,58,91,.16)] transition-shadow focus-within:shadow-[0_14px_40px_rgba(44,196,181,.45)] focus-within:ring-2 focus-within:ring-tide">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-ink/60" />
        <div className="relative flex-1">
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="İşletme ara" className="w-full bg-transparent outline-none" />
          {!q && <span className="pointer-events-none absolute inset-0 flex items-center gap-1 text-ink/60">
            <AnimatePresence mode="wait"><motion.b key={i} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.25 }} className="font-semibold">{words[i]}</motion.b></AnimatePresence> ara…</span>}
        </div>
        <motion.button whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.1 }} aria-label="Ara" className="grid h-9 w-9 place-items-center rounded-full bg-sea text-white"><FontAwesomeIcon icon={faArrowRight} /></motion.button>
      </motion.form>

      <motion.ul variants={list} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} className="mt-6 grid grid-cols-2 gap-3 px-5 md:grid-cols-3 lg:gap-4">
        {tiles.map((x) => <Tile key={x.t} x={x} />)}
      </motion.ul>

      {user === null && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} whileHover={{ y: -4 }}>
          <Link href="/giris" className="group mx-5 mt-5 flex items-center gap-3 rounded-[26px] bg-card p-4 shadow-sm transition-shadow hover:shadow-lg">
            <Mascot size={44} />
            <span className="flex-1 text-sm"><b className="block font-display text-base">Okul mailinle giriş yap</b>Notlar, arkadaşlar ve mesajlar seni bekliyor.</span>
            <FontAwesomeIcon icon={faArrowRight} className="mr-2 transition group-hover:translate-x-1.5" />
          </Link>
        </motion.div>
      )}
    </main>
  );
}
