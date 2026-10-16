"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";

export type BlockedUser = { id: string; name: string; blocked_at: string };

const isMissing = (e: unknown) => {
  const x = e as { code?: string; message?: string };
  return x?.code === "PGRST202" || x?.code === "42883" || x?.code === "42P01" || /Could not find the (function|table)/i.test(x?.message ?? "");
};
export const blockErrorText = (e: unknown) =>
  isMissing(e)
    ? "Engelleme şu anda kullanılamıyor. Biraz sonra tekrar dene."
    : (e as { message?: string })?.message || "İşlem yapılamadı. Tekrar dene.";

/** Engellediğin kişiler + engelle / kaldır. Tüm yazma işlemleri sunucu fonksiyonlarından (RPC) geçer. */
export function useBlocks(enabled: boolean) {
  const sb = useMemo(() => {
    try {
      return supabaseBrowser();
    } catch {
      return null;
    }
  }, []);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [setup, setSetup] = useState(false);

  const refresh = useCallback(async () => {
    if (!sb || !enabled) return;
    const { data, error } = await sb.rpc("list_blocked");
    if (error) {
      setSetup(isMissing(error));
      setBlocked([]);
    } else {
      setSetup(false);
      setBlocked((data as BlockedUser[]) ?? []);
    }
    setLoaded(true);
  }, [sb, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const block = useCallback(
    async (id: string) => {
      if (!sb) throw new Error("Bağlantı kurulamadı.");
      const { error } = await sb.rpc("block_user", { p_user: id });
      if (error) throw error;
      await refresh();
    },
    [sb, refresh],
  );
  const unblock = useCallback(
    async (id: string) => {
      if (!sb) throw new Error("Bağlantı kurulamadı.");
      const { error } = await sb.rpc("unblock_user", { p_user: id });
      if (error) throw error;
      await refresh();
    },
    [sb, refresh],
  );
  const isBlocked = useCallback((id: string) => blocked.some((b) => b.id === id), [blocked]);

  return { blocked, loaded, setup, refresh, block, unblock, isBlocked };
}
