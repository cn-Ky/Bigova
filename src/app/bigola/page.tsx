"use client";
import { BigolaPage } from "@/components/community/BigolaLayout";
import { NeedLogin, Notice, Skeleton } from "@/components/community/CommunityHeader";
import ComposeSheet from "@/components/community/ComposeSheet";
import FeedList from "@/components/community/FeedList";
import InlineComposer from "@/components/community/InlineComposer";
import OnboardingCard from "@/components/community/OnboardingCard";
import StoryTray from "@/components/community/StoryTray";
import SuggestedPeople from "@/components/community/SuggestedPeople";
import { Fab, PrimaryButton, TabChips } from "@/components/community/ui";
import Mascot from "@/components/Mascot";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { GRADE_LABELS, pickPostTarget, useCommunityProfile, useFeed, useMyCommunities } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type Scope = "mine" | "following" | "all" | "saved";
const SCOPES = [
  { id: "mine", label: "Senin için" },
  { id: "following", label: "Takip" },
  { id: "all", label: "Herkes" },
  { id: "saved", label: "Kaydedilenler" },
] as const;

function BigolaAkis() {
  const { user, fullName } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const oldQuery = (params.get("q") ?? "").trim().slice(0, 80);
  const enabled = !!user;
  const [scope, setScope] = useState<Scope>("mine");
  const [composing, setComposing] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const profile = useCommunityProfile(enabled);
  const mine = useMyCommunities(enabled);
  const feed = useFeed({ scope }, enabled);
  const meIds = useMemo(() => (user ? [user.id] : []), [user]);
  const me = useAvatars(meIds);
  const target = useMemo(() => pickPostTarget(mine.list ?? []), [mine.list]);

  // Eski ?q= adresleri (paylaşılmış #etiket bağlantıları) Keşfet'e yönlenir: arama artık orada.
  useEffect(() => {
    if (oldQuery) router.replace(`/bigola/kesfet?q=${encodeURIComponent(oldQuery)}`);
  }, [oldQuery, router]);

  if (user === undefined) return <main className="p-5"><Skeleton n={2} /></main>;
  if (!user) return <NeedLogin />;
  const needsProfile = profile.loaded && !profile.department;
  const name = fullName || "Sen";
  return (
    <BigolaPage
      active="akis"
      header={
        profile.department && (
          <p className="mt-3 text-xs font-bold text-white/85">
            {profile.department} · {GRADE_LABELS[profile.grade ?? 0]}{" "}
            <button type="button" onClick={() => setEditProfile((v) => !v)} className="ml-1 underline">
              değiştir
            </button>
          </p>
        )
      }
    >
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
      <StoryTray userId={user.id} name={name} enabled={enabled} />
      {mine.list !== null && <InlineComposer communities={target} avatar={me[user.id]} name={name} onPosted={feed.refresh} />}
      <div className="bigola-sticky -mx-5 bg-foam/90 px-5 py-2 backdrop-blur">
        <TabChips label="Akış türü" value={scope} onChange={setScope} items={SCOPES} />
      </div>
      <FeedList
        feed={feed}
        empty={
          scope === "following" ? (
            <>
              <Mascot size={96} className="mx-auto" />
              <p className="font-display text-lg font-extrabold">Takip akışın boş</p>
              <p className="mt-1 text-sm text-ink/70">Takip ettiğin kişilerin gönderileri burada görünür. Keşfet&apos;ten kişi bulup takip etmeye başla.</p>
              <motion.div whileTap={{ scale: 0.92 }} className="mt-3 inline-block">
                <Link href="/bigola/kesfet" className="block rounded-full bg-sea px-4 py-2 text-sm font-bold text-white">Keşfet&apos;e göz at</Link>
              </motion.div>
              <SuggestedPeople enabled={enabled} className="mt-5 text-left" />
            </>
          ) : scope === "saved" ? (
            <>
              <Mascot size={96} className="mx-auto" />
              <p className="font-display text-lg font-extrabold">Kaydettiğin gönderi yok</p>
              <p className="mt-1 text-sm text-ink/70">Gönderilerdeki yer imi simgesine basarak sonra okumak üzere kaydedebilirsin.</p>
            </>
          ) : (
            <>
              <Mascot size={96} className="mx-auto" />
              <p className="font-display text-lg font-extrabold">{scope === "mine" ? "Akışın henüz boş" : "Henüz paylaşım yok"}</p>
              <p className="mt-1 text-sm text-ink/70">İlk gönderiyi sen paylaş ya da Keşfet&apos;ten yeni kişiler bul.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <PrimaryButton type="button" onClick={() => setComposing(true)}>Paylaş</PrimaryButton>
                <motion.div whileTap={{ scale: 0.92 }}>
                  <Link href="/bigola/kesfet" className="block rounded-full bg-foam px-4 py-2 text-sm font-bold transition-colors hover:bg-tide/15">Keşfet</Link>
                </motion.div>
              </div>
            </>
          )
        }
      />
      <Fab onClick={() => setComposing(true)} label="Yeni gönderi">
        <FontAwesomeIcon icon={faPlus} />
      </Fab>
      <AnimatePresence>{composing && <ComposeSheet communities={target} onClose={() => setComposing(false)} onPosted={feed.refresh} />}</AnimatePresence>
    </BigolaPage>
  );
}

export default function BigolaSayfasi() {
  // useSearchParams (eski ?q= adresleri için) Suspense sınırı gerektirir
  return (
    <Suspense fallback={<main className="p-5"><Skeleton n={2} /></main>}>
      <BigolaAkis />
    </Suspense>
  );
}
