"use client";
import Avatar from "@/components/bigocuk/Avatar";
import Coin from "@/components/bigocuk/Coin";
import { useBigocuk } from "@/lib/bigocuk/api";
import { COIN_NAME } from "@/lib/bigocuk/config";
import { GAMES } from "@/lib/bigocuk/games";
import { DEFAULT_AVATAR } from "@/lib/bigocuk/items";
import { faArrowRight, faGamepad, faPaw } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import Link from "next/link";

const fmt = (n: number) => n.toLocaleString("tr-TR");

export default function Bigocuk() {
  const { status, state } = useBigocuk();
  const live = status === "ready" && !!state;
  return (
    <main className="pb-10">
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <FontAwesomeIcon icon={faGamepad} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">Bigocuk</h1>
            <p className="text-sm text-white/75">Oyna, {COIN_NAME} kazan, hayvan dostunu giydir</p>
          </div>
        </div>
      </header>

      <section className="px-5 pt-5">
        {/* Cüzdan + avatar */}
        <div className="flex items-center gap-4 rounded-[24px] bg-card p-4 shadow-sm">
          <div className="h-[116px] w-[100px] shrink-0 overflow-hidden rounded-2xl">
            <Avatar config={live ? state!.avatar : DEFAULT_AVATAR} size="fluid" view="bust" label="Senin hayvan avatarın" />
          </div>
          <div className="min-w-0 flex-1">
            {live ? (
              <>
                <p className="text-xs font-bold text-ink/60">Cüzdanın</p>
                <p className="flex items-center gap-2 font-display text-4xl font-extrabold leading-tight">
                  <Coin size={32} /> {fmt(state!.coins)}
                </p>
                <p className="text-xs text-ink/60">
                  Bugün {fmt(state!.todaySteps)} adım · toplam {fmt(state!.totalSteps)}
                </p>
              </>
            ) : status === "guest" ? (
              <>
                <p className="font-display text-lg font-extrabold leading-tight">{COIN_NAME} kazanmak için giriş yap</p>
                <p className="mt-1 text-xs text-ink/60">Oyunları gezebilir, avatarı deneyebilirsin.</p>
              </>
            ) : status === "setup" ? (
              <p className="text-sm font-bold text-coral">
                Kurulum eksik: <code>supabase/bigocuk_upgrade.sql</code> dosyasını çalıştır.
              </p>
            ) : status === "error" ? (
              <p className="text-sm font-bold text-coral">Bilgilerin yüklenemedi. Sayfayı yenile.</p>
            ) : (
              <p className="text-sm text-ink/60">Yükleniyor…</p>
            )}
            {status === "guest" ? (
              <Link href="/giris" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sea px-3.5 py-2 text-sm font-bold text-white">
                Giriş yap <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            ) : (
              <Link href="/bigocuk/avatar" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sea px-3.5 py-2 text-sm font-bold text-white">
                <FontAwesomeIcon icon={faPaw} /> Hayvanımı giydir
              </Link>
            )}
          </div>
        </div>

        {/* Oyun kataloğu */}
        <h2 className="mt-7 font-display text-xl font-extrabold">Oyunlar</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {GAMES.map((g) => (
            <li key={g.id}>
              <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
                <Link href={g.href} className="group flex items-center gap-4 rounded-[22px] bg-card p-4 shadow-sm">
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl ${g.tone}`}>
                    <FontAwesomeIcon icon={g.icon} />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block font-display text-lg">{g.title}</b>
                    <span className="block text-sm text-ink/70">{g.blurb}</span>
                    <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-sun/25 px-2.5 py-0.5 text-xs font-extrabold">
                      <Coin size={14} /> {g.reward}
                    </span>
                  </span>
                  <FontAwesomeIcon icon={faArrowRight} className="text-ink/40 transition group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </li>
          ))}
          <li className="grid place-items-center rounded-[22px] border-2 border-dashed border-ink/15 p-5 text-center text-sm text-ink/55">
            Yeni oyunlar yolda. Eklendikçe burada görünecek.
          </li>
        </ul>
      </section>
    </main>
  );
}
