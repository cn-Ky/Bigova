"use client";
import { useUser } from "@/lib/useUser";
import { useTrendingTags } from "@/lib/community";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import CommunityHeader, { type CommunityTab } from "./CommunityHeader";
import SuggestedPeople from "./SuggestedPeople";
import Trending from "./Trending";

/**
 * Bigola sayfa düzeni (tüm ekran boyları için tek kaynak):
 * - telefon/tablet: tek sütun, en çok 42.5rem, ekranın ortasında
 * - geniş masaüstü (xl): ortada akış + sağda arama/gündem/öneri yan çubuğu, ikisi birlikte ortalı
 * Çocuklar `min-w-0` kapsayıcıda durur; böylece yatay kaydırmalı şeritler (hikaye, öneri) sayfayı taşırmaz.
 */
export function BigolaPage({
  active,
  header,
  rail = true,
  railSearch = true,
  onCompose,
  children,
}: {
  active: CommunityTab;
  /** Başlığın altına eklenecek içerik (ör. bölüm/sınıf bilgisi). */
  header?: ReactNode;
  /** Geniş ekranda sağ yan çubuk. */
  rail?: boolean;
  /** Yan çubukta arama kutusu (Keşfet sayfasında zaten var, orada kapatılır). */
  railSearch?: boolean;
  /** Başlıktaki "Paylaş" düğmesi; verilmezse Akış sayfasına gidip paylaşım penceresini açar. */
  onCompose?: () => void;
  children: ReactNode;
}) {
  return (
    <main className="bigola-page pb-28 lg:pb-12" style={{ maxWidth: "66.5rem" }}>
      <CommunityHeader active={active} onCompose={onCompose}>
        {header}
      </CommunityHeader>
      <BigolaColumns rail={rail} railSearch={railSearch}>
        {children}
      </BigolaColumns>
    </main>
  );
}

/**
 * Alt sayfalar (gönderi, bildirimler…): başlık ve içerik aynı genişlikte, ekranın ortasında.
 * `header` genelde <BackHeader />'dır; `main` kendisi dar olduğu için başlık sütunla hizalanır.
 */
export function BigolaSubPage({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <main className="bigola-page pb-28 lg:pb-12" style={{ maxWidth: "45rem" }}>
      {header}
      <BigolaColumns>{children}</BigolaColumns>
    </main>
  );
}

/** Başlık dışındaki içeriği (alt sayfalar da kullanır) ortalı sütun(lar)a yerleştirir. */
export function BigolaColumns({ rail = false, railSearch = true, children }: { rail?: boolean; railSearch?: boolean; children: ReactNode }) {
  return (
    <div className={`mx-auto grid w-full max-w-[42.5rem] grid-cols-[minmax(0,1fr)] gap-4 px-5 pt-5 ${rail ? "xl:max-w-none xl:grid-cols-[minmax(0,42.5rem)_20rem] xl:justify-center xl:gap-6" : ""}`}>
      <div className="grid min-w-0 content-start gap-4">{children}</div>
      {rail && <BigolaRail search={railSearch} />}
    </div>
  );
}

/** Yan çubuktaki arama kutusu: gönderilir gönderilmez Keşfet'te sonuç açılır. */
function RailSearch() {
  const router = useRouter();
  const [text, setText] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = text.trim();
        if (q) router.push(`/bigola/kesfet?q=${encodeURIComponent(q)}`);
      }}
      className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 shadow-sm ring-1 ring-ink/[0.04] transition-shadow focus-within:shadow-lg focus-within:ring-2 focus-within:ring-sun"
    >
      <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm text-ink/45" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 80))}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Kişi veya #etiket ara"
        aria-label="Kişi veya #etiket ara"
        className="min-w-0 flex-1 bg-transparent py-0.5 text-base outline-none placeholder:text-ink/45"
      />
    </form>
  );
}

/** Masaüstü yan çubuğu (yalnızca xl ve üstü): arama, gündem etiketleri, önerilen kişiler. */
export function BigolaRail({ search = true }: { search?: boolean }) {
  const { user } = useUser();
  const enabled = !!user;
  const tags = useTrendingTags(enabled);
  return (
    <aside aria-label="Arama ve gündem" className="hidden min-w-0 xl:block">
      <div className="bigola-sticky grid gap-4">
        {search && <RailSearch />}
        <Trending tags={tags} limit={6} />
        <SuggestedPeople enabled={enabled} variant="list" limit={4} />
      </div>
    </aside>
  );
}
