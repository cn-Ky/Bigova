"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  applyTheme,
  isPremiumTheme,
  premiumTheme,
  THEME_KEY,
  THEME_PREVIEW_ATTR,
} from "@/lib/themes";
import { useEffect } from "react";

const DEFAULT_THEME = "sabah";

/**
 * Özel (Bigcoin ile satın alınan) tema seçiliyken sahipliği doğrular.
 * localStorage elle değiştirilse ya da başka hesapla girilse bile, satın alınmamış tema kapatılır.
 * Yalnızca özel tema aktifken bir kez sunucuya sorar; ücretsiz temalarda hiçbir istek yapılmaz.
 * Ağ hatasında temayı bozmaz (çevrimdışı kullanım).
 */
export default function ThemeGuard() {
  useEffect(() => {
    let alive = true;
    const revert = () => {
      if (!alive) return;
      try {
        localStorage.setItem(THEME_KEY, DEFAULT_THEME);
      } catch {}
      applyTheme(DEFAULT_THEME);
    };
    const check = async () => {
      const root = document.documentElement;
      const id = root.dataset.theme;
      if (!isPremiumTheme(id) || root.dataset[THEME_PREVIEW_ATTR]) return;
      const item = premiumTheme(id)!.itemId;
      try {
        const sb = supabaseBrowser();
        const { data: auth } = await sb.auth.getUser();
        if (!auth.user) return revert();
        const { data, error } = await sb.rpc("bigocuk_state");
        if (error) {
          const code = (error as { code?: string }).code;
          // SQL kurulmamışsa satın alma da yoktur → temayı kapat. Diğer hatalar geçici sayılır.
          if (code === "PGRST202" || code === "42883") revert();
          return;
        }
        const owned: unknown = (data as { owned?: unknown } | null)?.owned;
        if (!Array.isArray(owned) || !owned.includes(item)) revert();
      } catch {
        /* çevrimdışı: temaya dokunma */
      }
    };
    void check();
    return () => {
      alive = false;
    };
  }, []);
  return null;
}
