"use client";
import CommunityHeader, { NeedLogin, Skeleton } from "@/components/community/CommunityHeader";
import ComposeSheet from "@/components/community/ComposeSheet";
import FeedList from "@/components/community/FeedList";
import Mascot from "@/components/Mascot";
import { Fab, PrimaryButton, TabChips } from "@/components/community/ui";
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
      <div className="grid gap-4 px-5 pt-5">
        <TabChips label="Soru filtresi" items={FILTERS} value={status} onChange={setStatus} />
        <FeedList
          feed={feed}
          empty={
            <>
              <Mascot size={96} className="mx-auto" />
              <p className="font-display text-lg font-extrabold">{status === "solved" ? "Henüz çözülen soru yok" : "Henüz soru yok"}</p>
              <p className="mt-1 text-sm text-ink/70">Aklına takılan bir şey varsa ilk soruyu sen sor.</p>
              <PrimaryButton type="button" onClick={() => setComposing(true)} className="mt-3">Soru sor</PrimaryButton>
            </>
          }
        />
      </div>
      <Fab wide onClick={() => setComposing(true)} label="Soru sor">
        <FontAwesomeIcon icon={faPlus} /> Soru sor
      </Fab>
      <AnimatePresence>
        {composing && <ComposeSheet communities={mine.list ?? []} defaultKind="question" lockKind onClose={() => setComposing(false)} onPosted={feed.refresh} />}
      </AnimatePresence>
    </main>
  );
}
