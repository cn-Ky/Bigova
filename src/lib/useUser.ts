"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Oturum durumunu dinler. undefined = yükleniyor, null = giriş yok. */
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    try {
      const sb = supabaseBrowser();
      sb.auth.getUser().then(({ data }) => setUser(data.user ?? null));
      const { data } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
      return () => data.subscription.unsubscribe();
    } catch { setUser(null); }
  }, []);
  const signOut = async () => { try { await supabaseBrowser().auth.signOut(); } catch {} setUser(null); };
  const meta = (user?.user_metadata ?? {}) as { first_name?: string; last_name?: string; name?: string };
  const email = user?.email ?? undefined;
  const fullName = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || meta.name || email?.split("@")[0];
  const name = meta.first_name || meta.name?.split(" ")[0] || email?.split("@")[0];
  return { user, name, fullName, email, signOut };
}
