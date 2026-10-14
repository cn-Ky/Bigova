"use client";
import { NeedLogin, Skeleton } from "@/components/community/CommunityHeader";
import { useUser } from "@/lib/useUser";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Giriş (hesap) gerektiren bölümler.
 * Yeni bir bölümü korumaya almak için buraya bir satır eklemek yeterli:
 *  - prefix: yol öneki (alt sayfalar da dahildir, örn. /bigocuk/safari)
 *  - what:   "Giriş yapman gerekiyor" ekranında "… için Bigova hesabınla giriş yap." cümlesine girer
 */
export const PROTECTED_ROUTES: { prefix: string; what: string }[] = [
  // Sosyal & Eğlence
  { prefix: "/arkadaslar", what: "Arkadaş eklemek ve mesajlaşmak" },
  { prefix: "/topluluk", what: "Topluluğu kullanmak" },
  { prefix: "/bigocuk", what: "Bigocuk'u oynamak" },
  { prefix: "/anketler", what: "Anketlere katılmak" },
  // Diğer hesap gerektiren sayfalar
  { prefix: "/profil", what: "Profilleri görmek" },
];

const match = (pathname: string) =>
  PROTECTED_ROUTES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));

/**
 * Korumalı bir sayfada oturum yoksa sayfa yerine "Giriş yapman gerekiyor" ekranını gösterir.
 * Oturum durumu (useUser) çözülene kadar korumalı içerik hiç çizilmez; böylece misafirde
 * sayfa bir an görünüp kaybolmaz ve sayfanın veri istekleri boşuna başlamaz.
 * Not: Bu yalnızca arayüz kapısıdır; asıl yetkilendirme Supabase RLS ile sunucuda yapılır.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const rule = match(pathname ?? "");

  if (!rule) return <>{children}</>;
  if (user === undefined)
    return (
      <main className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Skeleton n={3} />
      </main>
    );
  if (user === null) return <NeedLogin what={rule.what} />;
  return <>{children}</>;
}
