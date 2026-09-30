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
  const no = user?.email?.split("@")[0];
  const name = (user?.user_metadata?.name as string | undefined)?.split(" ")[0] || no;
  return { user, name, no, signOut };
}
