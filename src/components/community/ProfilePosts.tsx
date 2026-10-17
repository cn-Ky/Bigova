"use client";
import { useFeed } from "@/lib/community";
import { useState } from "react";
import FeedList from "./FeedList";
import PhotoGrid from "./PhotoGrid";
import { TabChips } from "./ui";

type Tab = "grid" | "all" | "saved";

/**
 * Profilin gönderi bölümü: Fotoğraflar (ızgara) · Gönderiler (tüm yazı ve fotoğraflar) · Kaydedilenler (yalnızca kendi profilinde).
 * Her sekme yalnızca açıldığında yüklenir.
 */
export default function ProfilePosts({ userId, isSelf, firstName, enabled }: { userId: string; isSelf: boolean; firstName: string; enabled: boolean }) {
  const [tab, setTab] = useState<Tab>("grid");
  const grid = useFeed({ scope: "user", author: userId, media: true }, enabled && tab === "grid");
  const all = useFeed({ scope: "user", author: userId }, enabled && tab === "all");
  const saved = useFeed({ scope: "saved" }, enabled && isSelf && tab === "saved");

  const items: { id: Tab; label: string }[] = [
    { id: "grid", label: "Fotoğraflar" },
    { id: "all", label: "Gönderiler" },
    ...(isSelf ? [{ id: "saved" as const, label: "Kaydedilenler" }] : []),
  ];
  const none = (text: string) => <p className="text-sm text-ink/70">{text}</p>;
  return (
    <section aria-label="Paylaşımlar" className="grid gap-3">
      <TabChips label="Profil sekmeleri" value={tab} onChange={setTab} items={items} />
      {tab === "grid" && <PhotoGrid feed={grid} ownerId={userId} empty={none(isSelf ? "Henüz fotoğraf paylaşmadın. Bigola akışındaki paylaşım kutusundan ilk fotoğrafını paylaş." : `${firstName} henüz fotoğraf paylaşmamış.`)} />}
      {tab === "all" && <FeedList feed={all} empty={none(isSelf ? "Henüz bir gönderi paylaşmadın." : `${firstName} henüz gönderi paylaşmamış.`)} />}
      {tab === "saved" && isSelf && <FeedList feed={saved} empty={none("Kaydettiğin gönderiler burada görünür. Bir gönderideki yer imi simgesine dokunarak kaydedebilirsin.")} />}
    </section>
  );
}
