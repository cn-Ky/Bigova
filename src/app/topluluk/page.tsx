"use client";
import CommunityHeader, { NeedLogin, Notice, Skeleton } from "@/components/community/CommunityHeader";
import ComposeSheet from "@/components/community/ComposeSheet";
import FeedList from "@/components/community/FeedList";
import OnboardingCard from "@/components/community/OnboardingCard";
import { Fab, PrimaryButton, TabChips } from "@/components/community/ui";
import { GRADE_LABELS, useCommunityProfile, useFeed, useMyCommunities } from "@/lib/community";
import Mascot from "@/components/Mascot";
import { useUser } from "@/lib/useUser";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

export default function ToplulukAkis() {
  const { user } = useUser();
  const enabled = !!user;
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [composing, setComposing] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const profile = useCommunityProfile(enabled);
  const mine = useMyCommunities(enabled);
  const feed = useFeed({ scope }, enabled);

  if (user === undefined) return <main className="p-5"><Skeleton n={2} /></main>;
  if (!user) return <NeedLogin />;
  const needsProfile = profile.loaded && !profile.department;
  return (
    <main className="pb-28">
      <CommunityHeader active="akis">
        {profile.department && (
          <p className="mt-3 text-xs font-bold text-white/85">
            {profile.department} · {GRADE_LABELS[profile.grade ?? 0]}{" "}
            <button type="button" onClick={() => setEditProfile((v) => !v)} className="ml-1 underline">
              değiştir
            </button>
          </p>
        )}
      </CommunityHeader>
      <div className="grid gap-4 px-5 pt-5">
        {mine.error && <Notice text={mine.error} />}
        {(needsProfile || editProfile) && (
          <OnboardingCard
            initialDepartment={profile.department}
            initialGrade={profile.grade}
            compact={editProfile}
            onDone={async () => {
              setEditProfile(false);
              await Promise.all([profile.reload(), mine.refresh()]);
              feed.refresh();
            }}
          />
        )}
        <TabChips
          label="Akış türü"
          fill
          value={scope}
          onChange={setScope}
          items={[{ id: "mine", label: "Topluluklarım" }, { id: "all", label: "Keşfet" }] as const}
        />
        <FeedList
          feed={feed}
          empty={
            <>
              <Mascot size={96} className="mx-auto" />
              <p className="font-display text-lg font-extrabold">{scope === "mine" ? "Akışın henüz boş" : "Henüz paylaşım yok"}</p>
              <p className="mt-1 text-sm text-ink/70">İlk gönderiyi sen paylaş ya da yeni topluluklara katıl.</p>
              <div className="mt-3 flex justify-center gap-2">
                <PrimaryButton type="button" onClick={() => setComposing(true)}>Paylaş</PrimaryButton>
                <motion.div whileTap={{ scale: 0.92 }}>
                  <Link href="/topluluk/topluluklar" className="block rounded-full bg-foam px-4 py-2 text-sm font-bold transition-colors hover:bg-tide/15">Toplulukları gör</Link>
                </motion.div>
              </div>
            </>
          }
        />
      </div>
      <Fab onClick={() => setComposing(true)} label="Yeni gönderi">
        <FontAwesomeIcon icon={faPlus} />
      </Fab>
      <AnimatePresence>
        {composing && <ComposeSheet communities={mine.list ?? []} onClose={() => setComposing(false)} onPosted={feed.refresh} />}
      </AnimatePresence>
    </main>
  );
}
