import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Yalnızca oturum çerezlerini yeniler.
 * Performans: oturum çerezi (sb-*-auth-token) yoksa Supabase'e hiç gitmez (anonim ziyaretçilerde her sayfa
 * geçişinde yapılan ağ çağrısı kalktı); link önceden-yüklemeleri (prefetch) de atlanır.
 */
const hasAuthCookie = (req: NextRequest) =>
  req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res; // env eksikse siteyi çökertme
  if (!hasAuthCookie(req)) return res;
  if (req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch") return res;

  const s = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  try {
    // Ağ çağrısının asılı kalıp tüm siteyi (MIDDLEWARE_INVOCATION_TIMEOUT) yavaşlatmasını önler.
    await Promise.race([s.auth.getUser(), new Promise((resolve) => setTimeout(resolve, 3000))]);
  } catch {} // oturumu yeniler
  return res;
}

// Oturum gerektirmeyen herkese açık uçlar ve statik dosyalar middleware'den muaf.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/pdf|api/sample-notes|api/magazines|api/push/send|api/push/notify|api/weather|api/map-places|sw\\.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|ico|svg|webp|css|js|woff2?)$).*)",
  ],
};
