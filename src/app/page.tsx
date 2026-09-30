"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStore, faBookOpen, faBus, faUserGroup, faNewspaper, faBullseye, faEye, faEnvelope, faAnchor } from "@fortawesome/free-solid-svg-icons";

const Hero3D = dynamic(() => import("@/components/Hero3D"), { ssr: false });
const features = [
  { icon: faStore, t: "İşletmeler", d: "Fiyat, telefon, tuvalet ve çalışma saatleri.", href: "/isletmeler" },
  { icon: faBookOpen, t: "Notlar", d: "Ders notu ve PDF paylaşımı." },
  { icon: faBus, t: "Ulaşım", d: "Otobüs ve servis saatleri, güzergâh, ücret." },
  { icon: faUserGroup, t: "Arkadaşlar", d: "Mesajlaşma ve konum paylaşımı." },
  { icon: faNewspaper, t: "Dergi", d: "Üniversite dergisini uygulamada oku." },
];
const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6 } };

export default function Home() {
  return (
    <main>
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 bg-sea/90 text-white backdrop-blur">
        <span className="font-display text-xl"><FontAwesomeIcon icon={faAnchor} className="mr-2 text-sun" />Bigova</span>
        <nav className="flex gap-4 text-sm"><a href="#hakkimizda">Hakkımızda</a><a href="#iletisim">İletişim</a></nav>
      </header>
      <section className="relative min-h-[100dvh] flex items-center justify-center text-center bg-gradient-to-b from-sea to-[#1f6f8b] text-white px-6">
        <Hero3D />
        <motion.div className="relative z-10 max-w-xl pointer-events-none" {...fade}>
          <h1 className="font-display text-4xl sm:text-6xl">Biga&apos;da öğrenci olmak <span className="text-sun">kolay</span></h1>
          <p className="mt-4 text-base sm:text-lg opacity-90">ÇOMÜ Biga yerleşkesi öğrencileri için tek platform.</p>
          <Link href="/isletmeler" className="pointer-events-auto inline-block mt-6 rounded-full bg-sun px-6 py-3 font-semibold text-sea">Keşfet</Link>
        </motion.div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div key={f.t} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }} className="rounded-2xl bg-white p-6 shadow-md">
            <FontAwesomeIcon icon={f.icon} className="text-2xl text-olive" />
            <h3 className="mt-3 font-display text-xl">{f.href ? <Link href={f.href}>{f.t}</Link> : f.t}</h3>
            <p className="mt-1 text-sm opacity-80">{f.d}</p>
          </motion.div>
        ))}
      </section>
      <section id="hakkimizda" className="bg-white px-4 py-16">
        <div className="mx-auto max-w-4xl grid gap-8 sm:grid-cols-2">
          <motion.div {...fade}><FontAwesomeIcon icon={faBullseye} className="text-2xl text-clay" /><h2 className="font-display text-2xl mt-2">Misyonumuz</h2><p className="mt-2 opacity-80">Öğrencilerin günlük hayatını kolaylaştıran güvenilir bir platform sunmak.</p></motion.div>
          <motion.div {...fade}><FontAwesomeIcon icon={faEye} className="text-2xl text-clay" /><h2 className="font-display text-2xl mt-2">Vizyonumuz</h2><p className="mt-2 opacity-80">Biga&apos;daki her öğrencinin ihtiyaç duyduğu bilgiye saniyeler içinde ulaştığı bir topluluk olmak.</p></motion.div>
        </div>
      </section>
      <footer id="iletisim" className="bg-sea text-white px-4 py-10 text-center">
        <FontAwesomeIcon icon={faEnvelope} className="text-sun" /> <span className="ml-2">iletisim@bigova.example</span>
      </footer>
    </main>
  );
}
