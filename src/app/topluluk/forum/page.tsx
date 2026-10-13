"use client";
import CommunityHeader, { NeedLogin, Notice, Skeleton } from "@/components/community/CommunityHeader";
import { errText, rpc, timeAgo, useMyCommunities, type Channel, type Community } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import {
  faBriefcase,
  faBus,
  faCalendarDays,
  faComments,
  faFutbol,
  faGraduationCap,
  faHashtag,
  faHouse,
  faLaptopCode,
  faMusic,
  faSchool,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import Link from "next/link";
import { CARD_CLASS, EmptyState, SPRING } from "@/components/community/ui";
import { useEffect, useState } from "react";

const ICONS: Record<string, IconDefinition> = {
  genel: faComments,
  ders: faGraduationCap,
  kampus: faSchool,
  barinma: faHouse,
  ulasim: faBus,
  kariyer: faBriefcase,
  etkinlik: faCalendarDays,
  spor: faFutbol,
  teknoloji: faLaptopCode,
  eglence: faMusic,
};

type Group = { key: string; name: string; icon: IconDefinition; href?: string; channels: Channel[] };

function ChannelRow({ c }: { c: Channel }) {
  return (
    <motion.li whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
      <Link href={`/topluluk/forum/${c.id}`} className="group flex items-center gap-3 rounded-2xl bg-foam px-3 py-2.5 transition-colors hover:bg-tide/15">
        <FontAwesomeIcon icon={faHashtag} className="ico w-4 text-sea" />
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-sm">{c.name}</b>
          {c.description && <span className="block truncate text-xs text-ink/60">{c.description}</span>}
        </span>
        <span className="shrink-0 text-[11px] font-bold text-ink/50">{c.last_at ? timeAgo(c.last_at) : "yeni"}</span>
      </Link>
    </motion.li>
  );
}

export default function Forum() {
  const { user } = useUser();
  const mine = useMyCommunities(!!user);
  const [global, setGlobal] = useState<Channel[] | null>(null);
  const [own, setOwn] = useState<{ community: Community; channels: Channel[] }[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    rpc<Channel[]>("community_channels", {})
      .then((r) => setGlobal(r ?? []))
      .catch((e) => {
        setError(errText(e));
        setGlobal([]);
      });
  }, [user]);

  useEffect(() => {
    if (!mine.list) return;
    let off = false;
    // Üye olduğun toplulukların sohbet kanalları (çalışma grupları, sınıf, bölüm); en çok 12 topluluk
    Promise.all(
      mine.list
        .filter((c) => c.kind !== "general")
        .slice(0, 12)
        .map(async (c) => ({ community: c, channels: (await rpc<Channel[]>("community_channels", { p_community: c.id }).catch(() => [])) ?? [] })),
    ).then((r) => !off && setOwn(r.filter((x) => x.channels.length)));
    return () => {
      off = true;
    };
  }, [mine.list]);

  if (user === undefined) return <main className="p-5"><Skeleton n={2} /></main>;
  if (!user) return <NeedLogin what="Forumu kullanmak" />;

  const groups: Group[] = [];
  for (const c of global ?? []) {
    const key = c.category ?? "diger";
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, name: c.category_name ?? "Diğer", icon: ICONS[key] ?? faComments, channels: [] }));
    g.channels.push(c);
  }
  return (
    <main className="pb-28">
      <CommunityHeader active="forum" subtitle="Konulara göre grup sohbetleri. İstediğin kanala gir, yaz." />
      <div className="grid gap-5 px-5 pt-5">
        {(error || mine.error) && <Notice text={error || mine.error || ""} />}
        {own && own.length > 0 && (
          <section aria-label="Topluluk sohbetlerim">
            <h2 className="mb-2 font-display text-lg font-extrabold">Topluluk sohbetlerim</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {own.map(({ community, channels }) => (
                <motion.div key={community.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className={`${CARD_CLASS} p-4`}>
                  <Link href={`/topluluk/t/${community.slug}`} className="mb-2 block truncate font-display text-base font-extrabold transition-colors hover:text-sea">{community.name}</Link>
                  <ul className="grid gap-1.5">{channels.map((c) => <ChannelRow key={c.id} c={c} />)}</ul>
                </motion.div>
              ))}
            </div>
          </section>
        )}
        <section aria-label="Forum kategorileri">
          <h2 className="mb-2 font-display text-lg font-extrabold">Forum kategorileri</h2>
          {global === null ? <Skeleton h="h-40" /> : groups.length === 0 ? (
            <EmptyState><p className="text-sm text-ink/70">Henüz forum kanalı yok.</p></EmptyState>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {groups.map((g) => (
                <motion.div key={g.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className={`${CARD_CLASS} p-4`}>
                  <div className="group mb-2 flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-sky text-deep"><FontAwesomeIcon icon={g.icon} className="ico" /></span>
                    <h3 className="font-display text-base font-extrabold">{g.name}</h3>
                  </div>
                  <ul className="grid gap-1.5">{g.channels.map((c) => <ChannelRow key={c.id} c={c} />)}</ul>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
