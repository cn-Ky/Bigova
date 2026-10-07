"use client";
import Mascot from "@/components/Mascot";
import {
  igUrl,
  isDemo,
  menuOf,
  openState,
  telUrl,
  waUrl,
  type Business,
} from "@/lib/business";
import { demoBusinesses } from "@/lib/demoData";
import {
  faArrowLeft,
  faBagShopping,
  faCheck,
  faClock,
  faLocationDot,
  faPhone,
  faRestroom,
  faTag,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import { faInstagram, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function IsletmeDetay() {
  const { id } = useParams<{ id: string }>();
  const [b, setB] = useState<Business | null | undefined>(undefined);
  const [sec, setSec] = useState("Tümü");

  useEffect(() => {
    let alive = true;
    const demo = demoBusinesses.find((x) => x.id === id) as Business | undefined;
    if (id.startsWith("demo-")) {
      setB(demo ?? null);
      return;
    }
    fetch(`/api/businesses/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setB(d && d.id ? (d as Business) : null))
      .catch(() => alive && setB(null));
    return () => {
      alive = false;
    };
  }, [id]);

  const menu = useMemo(() => (b ? menuOf(b) : []), [b]);
  const state = b ? openState(b) : null;
  const shown = sec === "Tümü" ? menu : menu.filter((m) => m.section === sec);

  if (b === undefined)
    return (
      <main className="px-5 pt-6">
        <div className="shimmer h-40 rounded-[28px]" />
        <div className="shimmer mt-4 h-24 rounded-[24px]" />
        <div className="shimmer mt-4 h-56 rounded-[24px]" />
      </main>
    );

  if (!b)
    return (
      <main className="px-5 py-16 text-center">
        <Mascot size={96} className="mx-auto" />
        <p className="mt-2 font-display text-lg font-bold">İşletme bulunamadı</p>
        <p className="text-sm text-ink/70">Kaldırılmış ya da bağlantı hatalı olabilir.</p>
        <Link href="/isletmeler" className="mt-4 inline-flex items-center gap-2 rounded-full bg-sea px-5 py-2.5 font-bold text-white">
          <FontAwesomeIcon icon={faArrowLeft} /> İşletmelere dön
        </Link>
      </main>
    );

  const maps = b.lat != null && b.lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`
    : b.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name} ${b.address} Biga`)}`
      : null;

  const actions = [
    b.phone && { href: telUrl(b.phone), icon: faPhone, label: "Ara", primary: true },
    b.whatsapp && { href: waUrl(b.whatsapp), icon: faWhatsapp, label: "WhatsApp" },
    maps && { href: maps, icon: faLocationDot, label: "Yol tarifi" },
    b.instagram && { href: igUrl(b.instagram), icon: faInstagram, label: "Instagram" },
  ].filter(Boolean) as { href: string; icon: typeof faPhone; label: string; primary?: boolean }[];

  return (
    <main className="pb-10">
      <header className="rounded-b-[28px] bg-gradient-to-b from-sea to-sea2 px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <Link href="/isletmeler" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-white/75">
          <FontAwesomeIcon icon={faArrowLeft} /> İşletmeler
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-bold">{b.category}</span>
          {state && (
            <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${state.isOpen ? "bg-tide text-deep" : "bg-coral text-deep"}`}>
              {state.isOpen ? `Açık · ${state.until}'e kadar` : `Kapalı · ${state.until}'te açılır`}
            </span>
          )}
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight">{b.name}</h1>
        {b.description && <p className="mt-2 max-w-xl text-sm text-white/80">{b.description}</p>}
        {isDemo(b) && (
          <p className="mt-3 inline-block rounded-full bg-sun px-3 py-1 text-xs font-extrabold text-deep">
            Temsili örnek veri · gerçek işletme bilgisi değildir
          </p>
        )}
      </header>

      {actions.length > 0 && (
        <ul className="-mt-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {actions.map((a) => (
            <li key={a.label} className="shrink-0">
              <motion.a
                whileTap={{ scale: 0.93 }}
                href={a.href}
                target={a.href.startsWith("tel:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold shadow-md ${a.primary ? "bg-sun text-deep" : "bg-card text-ink"}`}
              >
                <FontAwesomeIcon icon={a.icon} /> {a.label}
              </motion.a>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-5 grid gap-3 px-5 sm:grid-cols-2">
        {(b.opens_at || b.closes_at) && (
          <Info icon={faClock} title="Çalışma saatleri">
            {b.opens_at}–{b.closes_at}
          </Info>
        )}
        <Info icon={faRestroom} title="Tuvalet">
          {b.has_toilet ? "Var" : "Yok"}
        </Info>
        {b.address && (
          <Info icon={faLocationDot} title="Adres">
            {b.address}
          </Info>
        )}
        {b.student_discount && (
          <Info icon={faTag} title="Öğrenci indirimi" accent>
            {b.student_discount}
          </Info>
        )}
      </section>

      {!!b.features?.length && (
        <section className="mt-5 px-5">
          <h2 className="font-display text-lg font-extrabold">Olanaklar</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {b.features.map((f) => (
              <li key={f} className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-bold shadow-sm">
                <FontAwesomeIcon icon={faCheck} className="text-tide" /> {f}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6" aria-labelledby="menu-title">
        <div className="flex items-center gap-2 px-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sea text-white">
            <FontAwesomeIcon icon={b.category === "Kırtasiye" || b.category === "Hizmet" ? faBagShopping : faUtensils} />
          </span>
          <h2 id="menu-title" className="font-display text-xl font-extrabold">
            Menü ve fiyatlar
          </h2>
        </div>

        {menu.length === 0 ? (
          <p className="mx-5 mt-3 rounded-2xl border-2 border-dashed border-ink/15 p-5 text-center text-sm text-ink/60">
            Bu işletme için henüz menü ya da fiyat listesi eklenmedi.
          </p>
        ) : (
          <>
            {menu.length > 1 && (
              <div role="tablist" aria-label="Menü bölümleri" className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
                {["Tümü", ...menu.map((m) => m.section)].map((name) => (
                  <motion.button
                    key={name}
                    role="tab"
                    aria-selected={sec === name}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setSec(name)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold ${sec === name ? "bg-sea text-white" : "bg-card text-ink"}`}
                  >
                    {name}
                  </motion.button>
                ))}
              </div>
            )}
            <div className="mt-3 grid gap-3 px-5 md:grid-cols-2">
              {shown.map((m) => (
                <motion.div
                  key={m.section}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[22px] bg-card p-4 shadow-sm"
                >
                  <h3 className="font-display text-base font-extrabold text-sea">{m.section}</h3>
                  <ul className="mt-2 grid gap-2.5">
                    {m.items.map((it, i) => (
                      <li key={`${it.name}-${i}`}>
                        <div className="flex items-baseline">
                          <span className="font-bold">{it.name}</span>
                          {it.price && (
                            <>
                              <span className="menu-dots" aria-hidden="true" />
                              <span className="font-display font-extrabold text-coral">{it.price}</span>
                            </>
                          )}
                        </div>
                        {it.note && <p className="text-xs text-ink/60">{it.note}</p>}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </>
        )}
        <p className="mt-4 px-5 text-xs text-ink/55">Fiyatlar değişebilir; sipariş vermeden önce işletmeden teyit et.</p>
      </section>
    </main>
  );
}

function Info({
  icon,
  title,
  children,
  accent,
}: {
  icon: typeof faClock;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-[20px] p-4 shadow-sm ${accent ? "bg-sun/25" : "bg-card"}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-tide/25">
        <FontAwesomeIcon icon={icon} />
      </span>
      <span className="min-w-0 leading-tight">
        <small className="block text-[11px] font-extrabold uppercase tracking-wide text-ink/55">{title}</small>
        <b className="block break-words">{children}</b>
      </span>
    </div>
  );
}
