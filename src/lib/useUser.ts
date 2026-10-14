"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Oturum durumu: uygulama genelinde TEK abonelik + TEK ilk sorgu paylaşılır.
 * Önceki sürümde useUser kullanan her bileşen (bildirim, tema, davet, ayarlar…) ayrı ayrı
 * Supabase'e `auth.getUser()` ağ çağrısı atıyordu. İlk durum yerel oturumdan (getSession) okunur;
 * yetki kararları zaten sunucuda RLS ile verilir, buradaki değer yalnızca arayüz içindir.
 */
type State = User | null | undefined; // undefined = yükleniyor, null = giriş yok
let current: State;
let started = false;
const listeners = new Set<(u: State) => void>();

const publish = (u: State) => {
  current = u;
  listeners.forEach((l) => l(u));
};

function start() {
  if (started) return;
  started = true;
  try {
    const sb = supabaseBrowser();
    sb.auth
      .getSession()
      .then(({ data }) => publish(data.session?.user ?? null))
      .catch(() => publish(null));
    sb.auth.onAuthStateChange((_e, s) => publish(s?.user ?? null));
  } catch {
    publish(null);
  }
}

/** Oturum durumunu dinler. undefined = yükleniyor, null = giriş yok. */
export function useUser() {
  const [user, setUser] = useState<State>(current);
  useEffect(() => {
    listeners.add(setUser);
    start();
    if (current !== undefined) setUser(current);
    return () => {
      listeners.delete(setUser);
    };
  }, []);
  const signOut = async () => {
    try {
      await supabaseBrowser().auth.signOut();
    } catch {}
    publish(null);
  };
  const meta = (user?.user_metadata ?? {}) as { first_name?: string; last_name?: string; name?: string };
  const email = user?.email ?? undefined;
  const fullName = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || meta.name || email?.split("@")[0];
  const name = meta.first_name || meta.name?.split(" ")[0] || email?.split("@")[0];
  return { user, name, fullName, email, signOut };
}
