"use client";
import CommunityHeader, { NeedLogin, Skeleton } from "@/components/community/CommunityHeader";
import ComposeSheet from "@/components/community/ComposeSheet";
import FeedList from "@/components/community/FeedList";
import { useFeed, useMyCommunities } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence } from "framer-motion";
import { useState } from "react";

const FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "open", label: "Yanıt bekleyen" },
  { id: "solved", label: "Çözülenler" },
] as const;

export default function SoruCevap() {
  const { user } = useUser();
  const enabled = !!user;
  const [status, setStatus] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [composing, setComposing] = useState(false);
  const mine = useMyCommunities(enabled);
  const feed = useFeed({ scope: "all", kind: "question", status: status === "all" ? undefined : status }, enabled);
  if (user === undefined) return <main className="p-5"><Skeleton n={2} /></main>;
  if (!user) return <NeedLogin what="Soru sormak ve yanıtlamak" />;
  return (
    <main className="pb-28">
      <CommunityHeader active="soru" subtitle="Takıldığın yeri sor, bildiğin soruyu yanıtla. Soru sahibi doğru yanıtı işaretler." />
      <div className="grid gap-4 px-5 py-4">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Soru filtresi">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={status === f.id} onClick={() => setStatus(f.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold ${status === f.id ? "bg-sea text-white" : "bg-card shadow-sm"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <FeedList
          feed={feed}
          empty={
            <>
              <p className="font-display text-lg font-extrabold">{status === "solved" ? "Henüz çözülen soru yok" : "Henüz soru yok"}</p>
              <p className="mt-1 text-sm text-ink/70">Aklına takılan bir şey varsa ilk soruyu sen sor.</p>
              <button type="button" onClick={() => setComposing(true)} className="mt-3 rounded-full bg-sea px-4 py-2 text-sm font-extrabold text-white">Soru sor</button>
            </>
          }
        />
      </div>
      <button type="button" onClick={() => setComposing(true)} className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 items-center gap-2 rounded-full bg-sea px-5 text-sm font-extrabold text-white shadow-xl lg:bottom-8">
        <FontAwesomeIcon icon={faPlus} /> Soru sor
      </button>
      <AnimatePresence>
        {composing && <ComposeSheet communities={mine.list ?? []} defaultKind="question" lockKind onClose={() => setComposing(false)} onPosted={feed.refresh} />}
      </AnimatePresence>
    </main>
  );
}
