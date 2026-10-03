"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_AVATAR, type AvatarConfig } from "./items";

export type BigocukState = {
  coins: number;
  totalSteps: number;
  remainder: number; // henüz 50'ye tamamlanmamış adımlar
  todaySteps: number;
  owned: string[];
  avatar: AvatarConfig;
};
/** loading: oturum bekleniyor · guest: giriş yok · ready: hazır · setup: SQL kurulmamış · error: bağlantı hatası */
export type BigocukStatus = "loading" | "guest" | "ready" | "setup" | "error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalize = (raw: any): BigocukState => ({
  coins: Number(raw?.coins) || 0,
  totalSteps: Number(raw?.totalSteps) || 0,
  remainder: Number(raw?.remainder) || 0,
  todaySteps: Number(raw?.todaySteps) || 0,
  owned: Array.isArray(raw?.owned) ? raw.owned : [],
  avatar: { ...DEFAULT_AVATAR, ...(raw?.avatar ?? {}) },
});

export const errMsg = (e: unknown) =>
  (e as { message?: string })?.message || "Bir şeyler ters gitti. Tekrar dene.";
const isMissing = (e: unknown) => {
  const x = e as { code?: string; message?: string };
  return x?.code === "PGRST202" || x?.code === "42883" || /Could not find the function/i.test(x?.message ?? "");
};

/** Bigocuk cüzdanı, envanter ve avatar. Tüm değişiklikler sunucu fonksiyonlarından (RPC) geçer. */
export function useBigocuk() {
  const { user } = useUser();
  const sb = useMemo(() => {
    try {
      return supabaseBrowser();
    } catch {
      return null;
    }
  }, []);
  const [state, setState] = useState<BigocukState | null>(null);
  const [status, setStatus] = useState<BigocukStatus>("loading");

  const rpc = useCallback(
    async (fn: string, args?: Record<string, unknown>) => {
      if (!sb) throw new Error("Bağlantı kurulamadı.");
      const { data, error } = await sb.rpc(fn, args);
      if (error) throw error;
      return data;
    },
    [sb],
  );

  const refresh = useCallback(async () => {
    if (user === undefined) return;
    if (!user || !sb) {
      setState(null);
      setStatus("guest");
      return;
    }
    try {
      setState(normalize(await rpc("bigocuk_state")));
      setStatus("ready");
    } catch (e) {
      setStatus(isMissing(e) ? "setup" : "error");
    }
  }, [user, sb, rpc]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Adımları gönderir. Durumu kendisi değiştirmez; çağıran `commit` ile uygular (tek seferde render için). */
  const addSteps = async (n: number) => {
    const raw = await rpc("bigocuk_add_steps", { p_steps: n });
    return { accepted: Number(raw?.accepted) || 0, earned: Number(raw?.earned) || 0, next: normalize(raw) };
  };
  const commit = (next: BigocukState) => setState(next);
  const buy = async (itemId: string) => setState(normalize(await rpc("bigocuk_buy", { p_item_id: itemId })));
  const saveAvatar = async (cfg: AvatarConfig) =>
    setState(normalize(await rpc("bigocuk_save_avatar", { p_avatar: cfg })));

  return { user, status, state, refresh, addSteps, commit, buy, saveAvatar };
}
