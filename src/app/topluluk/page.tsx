"use client";
import CommunityHeader, { NeedLogin, Notice, Skeleton } from "@/components/community/CommunityHeader";
import ComposeSheet from "@/components/community/ComposeSheet";
import FeedList from "@/components/community/FeedList";
import OnboardingCard from "@/components/community/OnboardingCard";
import { GRADE_LABELS, useCommunityProfile, useFeed, useMyCommunities } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence } from "framer-motion";
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
      <div className="grid gap-4 px-5 py-4">
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
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-card p-1 shadow-sm" role="tablist" aria-label="Akış türü">
          {([["mine", "Topluluklarım"], ["all", "Keşfet"]] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={scope === k} onClick={() => setScope(k)} className={`rounded-lg px-3 py-2 text-sm font-extrabold ${scope === k ? "bg-sea text-white" : "text-ink/65"}`}>
              {l}
            </button>
          ))}
        </div>
        <FeedList
          feed={feed}
          empty={
            <>
              <p className="font-display text-lg font-extrabold">{scope === "mine" ? "Akışın henüz boş" : "Henüz paylaşım yok"}</p>
              <p className="mt-1 text-sm text-ink/70">İlk gönderiyi sen paylaş ya da yeni topluluklara katıl.</p>
              <div className="mt-3 flex justify-center gap-2">
                <button type="button" onClick={() => setComposing(true)} className="rounded-full bg-sea px-4 py-2 text-sm font-extrabold text-white">Paylaş</button>
                <Link href="/topluluk/topluluklar" className="rounded-full bg-foam px-4 py-2 text-sm font-extrabold">Toplulukları gör</Link>
              </div>
            </>
          }
        />
      </div>
      <button
        type="button"
        onClick={() => setComposing(true)}
        aria-label="Yeni gönderi"
        className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-sea text-xl text-white shadow-xl lg:bottom-8"
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>
      <AnimatePresence>
        {composing && <ComposeSheet communities={mine.list ?? []} onClose={() => setComposing(false)} onPosted={feed.refresh} />}
      </AnimatePresence>
    </main>
  );
}
