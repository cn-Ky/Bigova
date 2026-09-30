"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStore, faBookOpen, faBus, faUserGroup, faNewspaper, faBook, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import Mascot from "@/components/Mascot";

const tiles = [
  { icon: faStore, t: "İşletmeler", d: "Fiyat, saat, tuvalet", href: "/isletmeler", c: "bg-tide" },
  { icon: faBus, t: "Ulaşım", d: "Otobüs ve servis", href: "/yakinda/ulasim", c: "bg-sun", soon: 1 },
  { icon: faBookOpen, t: "Notlar", d: "Ders notu, PDF", href: "/yakinda/notlar", c: "bg-sea text-white", soon: 1 },
  { icon: faBook, t: "Kitap pazarı", d: "İkinci el kitap", href: "/yakinda/kitap", c: "bg-coral", soon: 1 },
  { icon: faUserGroup, t: "Arkadaşlar", d: "Mesaj, konum", href: "/yakinda/arkadaslar", c: "bg-sky", soon: 1 },
  { icon: faNewspaper, t: "Dergi", d: "Okulun dergisi", href: "/yakinda/dergi", c: "bg-white", soon: 1 },
];
const list = { show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 18, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1 } };

export default function Home() {
  return (
    <main>
      <header className="relative overflow-hidden rounded-b-[36px] bg-gradient-to-b from-sea to-[#1d6a93] px-5 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))] text-white">
        <span className="cloud left-0 top-8 h-5 w-24" /><span className="cloud left-0 top-20 h-4 w-16 [animation-delay:-16s]" />
        <div className="relative flex items-end justify-between">
          <div>
            <p className="text-sm text-sky">Merhaba 👋</p>
            <h1 className="mt-1 font-display text-[28px] font-extrabold leading-tight">Bugün Biga'da<br />ne yapıyoruz?</h1>
          </div>
          <Mascot size={104} className="-mb-2 shrink-0" />
        </div>
      </header>

      <Link href="/isletmeler" className="relative z-10 mx-5 -mt-7 flex items-center gap-3 rounded-full bg-white px-5 py-4 text-sea/60 shadow-[0_10px_30px_rgba(14,58,91,.16)]">
        <FontAwesomeIcon icon={faMagnifyingGlass} /> Kafe, kırtasiye, eczane ara…
      </Link>

      <motion.ul variants={list} initial="hidden" animate="show" className="mt-6 grid grid-cols-2 gap-3 px-5">
        {tiles.map((x) => (
          <motion.li key={x.t} variants={item} whileTap={{ scale: 0.95 }}>
            <Link href={x.href} className={`relative flex h-36 flex-col justify-between rounded-[26px] p-4 shadow-sm ${x.c} ${x.c.includes("text-") ? "" : "text-sea"}`}>
              <FontAwesomeIcon icon={x.icon} className="text-2xl" />
              <span><b className="block font-display text-lg leading-tight">{x.t}</b><span className="text-[13px] opacity-75">{x.d}</span></span>
              {x.soon && <span className="absolute right-3 top-3 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-sea">Yakında</span>}
            </Link>
          </motion.li>
        ))}
      </motion.ul>

      <Link href="/giris" className="mx-5 mt-5 flex items-center gap-3 rounded-[26px] bg-white p-4 shadow-sm">
        <Mascot size={44} />
        <span className="text-sm"><b className="block font-display text-base">Okul mailinle giriş yap</b>Notlar, arkadaşlar ve mesajlar seni bekliyor.</span>
      </Link>
    </main>
  );
}
