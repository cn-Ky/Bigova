"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { useStoryTray, type StoryTrayItem } from "@/lib/community";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import StoryComposer from "./StoryComposer";
import StoryViewer from "./StoryViewer";

/**
 * Akışın üstündeki hikaye halkaları: önce sen ("Hikayen", artı düğmesiyle ekle), sonra takip ettiklerin.
 * İzlemediğin hikayesi olanların halkası renkli, hepsini izlediklerinin soluk. Tıklayınca tam ekran açılır.
 * Hikaye altyapısı kurulmadıysa (SQL çalışmadıysa) hiçbir şey çizmez.
 */
export default function StoryTray({ userId, name, enabled }: { userId: string; name: string; enabled: boolean }) {
  const { tray, loaded, reload } = useStoryTray(enabled);
  const [viewing, setViewing] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const mine = useMemo(() => tray.find((t) => t.is_self), [tray]);
  const others = useMemo(() => tray.filter((t) => !t.is_self), [tray]);
  // Görüntüleyici sırası: benim hikayem (varsa) ve diğerleri, şeritle aynı sırada.
  const queue: StoryTrayItem[] = useMemo(() => (mine ? [mine, ...others] : others), [mine, others]);
  const avatars = useAvatars(useMemo(() => [userId, ...others.map((o) => o.user_id)], [userId, others]));

  if (!enabled || !loaded) return null;
  const open = (id: string) => setViewing(Math.max(0, queue.findIndex((q) => q.user_id === id)));
  const ring = (unseen: boolean) => (unseen ? "bg-gradient-to-tr from-sun via-coral to-sea" : "bg-ink/20");
  return (
    <section aria-label="Hikayeler">
      <ul className="-mx-5 flex gap-3.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        <li className="relative w-[4.5rem] shrink-0 text-center">
          <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={() => (mine ? open(userId) : setComposing(true))} aria-label={mine ? "Hikayeni aç" : "Hikaye ekle"} className="block w-full">
            <span className={`mx-auto block rounded-full p-[2.5px] ${mine ? ring(true) : "bg-transparent"}`}>
              <span className="block rounded-full bg-foam p-[2px]">
                <UserAvatar name={name} avatar={avatars[userId]} size={60} />
              </span>
            </span>
            <span className="mt-1 block truncate text-xs font-bold">Hikayen</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }} type="button" onClick={() => setComposing(true)} aria-label="Yeni hikaye ekle" className="absolute right-1 top-11 grid h-6 w-6 place-items-center rounded-full bg-sea text-[10px] text-white ring-2 ring-foam">
            <FontAwesomeIcon icon={faPlus} />
          </motion.button>
        </li>
        {others.map((t) => (
          <li key={t.user_id} className="w-[4.5rem] shrink-0 text-center">
            <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={() => open(t.user_id)} aria-label={`${t.name} hikayesini aç${t.unseen_count > 0 ? ", yeni" : ""}`} className="block w-full">
              <span className={`mx-auto block rounded-full p-[2.5px] ${ring(t.unseen_count > 0)}`}>
                <span className="block rounded-full bg-foam p-[2px]">
                  <UserAvatar name={t.name} avatar={avatars[t.user_id]} size={60} />
                </span>
              </span>
              <span className={`mt-1 block truncate text-xs ${t.unseen_count > 0 ? "font-extrabold" : "font-semibold text-ink/55"}`}>{t.name.split(" ")[0]}</span>
            </motion.button>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {viewing !== null && queue.length > 0 && <StoryViewer users={queue} start={viewing} selfId={userId} onClose={() => setViewing(null)} onChanged={reload} />}
        {composing && <StoryComposer onClose={() => setComposing(false)} onPosted={reload} />}
      </AnimatePresence>
    </section>
  );
}
