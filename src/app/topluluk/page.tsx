"use client";
import CommunityHeader, { NeedLogin, Notice, Skeleton } from "@/components/community/CommunityHeader";
import ComposeSheet from "@/components/community/ComposeSheet";
import FeedList from "@/components/community/FeedList";
import InlineComposer from "@/components/community/InlineComposer";
import OnboardingCard from "@/components/community/OnboardingCard";
import PhotoShareSheet from "@/components/community/PhotoShareSheet";
import StoryTray from "@/components/community/StoryTray";
import SuggestedPeople from "@/components/community/SuggestedPeople";
import { Fab, PrimaryButton, TabChips } from "@/components/community/ui";
import Mascot from "@/components/Mascot";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { GRADE_LABELS, useCommunityProfile, useFeed, useMyCommunities } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faCamera, faMagnifyingGlass, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type Scope = "mine" | "following" | "all" | "saved";
const SCOPES = [
  { id: "mine", label: "Topluluklarım" },
  { id: "following", label: "Takip" },
  { id: "all", label: "Herkes" },
  { id: "saved", label: "Kaydedilenler" },
] as const;

/** Arama kutusu: metin veya #etiket. Sonuç adres çubuğundaki ?q= ile paylaşılabilir. */
function SearchBar({ q, onSearch }: { q: string; onSearch: (v: string) => void }) {
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(text.trim());
      }}
      className="flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-sm transition-shadow focus-within:shadow-lg focus-within:ring-2 focus-within:ring-sun"
    >
      <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm text-ink/45" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={80}
        enterKeyHint="search"
        placeholder="Gönderilerde ara veya #etiket yaz"
        aria-label="Gönderilerde ara"
        className="min-w-0 flex-1 bg-transparent py-1 text-base outline-none placeholder:text-ink/45"
      />
      {text && (
        <motion.button whileTap={{ scale: 0.85 }} type="button" aria-label="Aramayı temizle" onClick={() => { setText(""); onSearch(""); }} className="grid h-6 w-6 place-items-center rounded-full bg-foam text-[10px]">
          <FontAwesomeIcon icon={faXmark} />
        </motion.button>
      )}
    </form>
  );
}

function ToplulukAkis() {
  const { user, fullName } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const enabled = !!user;
  const [scope, setScope] = useState<Scope>("mine");
  const [composing, setComposing] = useState(false);
  const [sharingPhoto, setSharingPhoto] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const profile = useCommunityProfile(enabled);
  const mine = useMyCommunities(enabled);
  // Aramada tüm okunabilir topluluklar taranır
  const feed = useFeed({ scope: q ? "all" : scope, q: q || undefined }, enabled);
  const meIds = useMemo(() => (user ? [user.id] : []), [user]);
  const me = useAvatars(meIds);

  const search = (v: string) => router.replace(v ? `/topluluk?q=${encodeURIComponent(v)}` : "/topluluk");

  if (user === undefined) return <main className="p-5"><Skeleton n={2} /></main>;
  if (!user) return <NeedLogin />;
  const needsProfile = profile.loaded && !profile.department;
  const name = fullName || "Sen";
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
        {!q && <StoryTray userId={user.id} name={name} enabled={enabled} />}
        {mine.list !== null && <InlineComposer communities={mine.list} avatar={me[user.id]} name={name} onPosted={feed.refresh} />}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <SearchBar q={q} onSearch={search} />
          </div>
          <motion.button whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.05 }} type="button" onClick={() => setSharingPhoto(true)} aria-label="Fotoğraf paylaş" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sea text-white shadow-sm">
            <FontAwesomeIcon icon={faCamera} />
          </motion.button>
        </div>
        {q ? (
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-bold">
              <span className="text-ink/60">Arama:</span> {q}
            </p>
            <motion.button whileTap={{ scale: 0.92 }} type="button" onClick={() => search("")} className="rounded-full bg-card px-3 py-1.5 text-xs font-bold shadow-sm">
              Temizle
            </motion.button>
          </div>
        ) : (
          <div className="sticky top-0 z-10 -mx-5 bg-foam/90 px-5 py-2 backdrop-blur">
            <TabChips label="Akış türü" value={scope} onChange={setScope} items={SCOPES} />
          </div>
        )}
        <FeedList
          feed={feed}
          empty={
            q ? (
              <>
                <Mascot size={96} className="mx-auto" />
                <p className="font-display text-lg font-extrabold">Sonuç bulunamadı</p>
                <p className="mt-1 text-sm text-ink/70">“{q}” ile eşleşen gönderi yok. Başka bir kelime dene.</p>
              </>
            ) : scope === "following" ? (
              <>
                <Mascot size={96} className="mx-auto" />
                <p className="font-display text-lg font-extrabold">Takip akışın boş</p>
                <p className="mt-1 text-sm text-ink/70">Takip ettiğin kişilerin gönderileri burada görünür. Profillerinden takip etmeye başla.</p>
                <motion.div whileTap={{ scale: 0.92 }} className="mt-3 inline-block">
                  <Link href="/topluluk/kesfet" className="block rounded-full bg-sea px-4 py-2 text-sm font-bold text-white">Keşfet&apos;e göz at</Link>
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
                <p className="mt-1 text-sm text-ink/70">İlk gönderiyi sen paylaş ya da yeni topluluklara katıl.</p>
                <div className="mt-3 flex justify-center gap-2">
                  <PrimaryButton type="button" onClick={() => setComposing(true)}>Paylaş</PrimaryButton>
                  <motion.div whileTap={{ scale: 0.92 }}>
                    <Link href="/topluluk/topluluklar" className="block rounded-full bg-foam px-4 py-2 text-sm font-bold transition-colors hover:bg-tide/15">Toplulukları gör</Link>
                  </motion.div>
                </div>
              </>
            )
          }
        />
      </div>
      <Fab onClick={() => setComposing(true)} label="Yeni gönderi">
        <FontAwesomeIcon icon={faPlus} />
      </Fab>
      <AnimatePresence>
        {sharingPhoto && <PhotoShareSheet communities={mine.list ?? []} onClose={() => setSharingPhoto(false)} onPosted={feed.refresh} />}
        {composing && <ComposeSheet communities={mine.list ?? []} onClose={() => setComposing(false)} onPosted={feed.refresh} />}
      </AnimatePresence>
    </main>
  );
}

export default function ToplulukSayfasi() {
  // useSearchParams (?q=) için Suspense sınırı gerekir
  return (
    <Suspense fallback={<main className="p-5"><Skeleton n={2} /></main>}>
      <ToplulukAkis />
    </Suspense>
  );
}
