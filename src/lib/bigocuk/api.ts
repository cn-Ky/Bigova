"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_AVATAR, type AvatarConfig } from "./items";
import { rememberAvatar } from "./useAvatars";

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
  const uid = user?.id; // oturum nesnesi her token yenilemede değişir; yenilemeyi kimliğe bağla
  const sb = useMemo(() => {
    try {
      return supabaseBrowser();
    } catch {
      return null;
    }
  }, []);
  const [state, setState] = useState<BigocukState | null>(null);
  const [status, setStatus] = useState<BigocukStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  // Her yazma (kaydet/satın al/adım) sürüm numarasını artırır. Daha eski bir okuma geç dönerse
  // yeni durumu eski veriyle ezmesin (avatar "kaydedildi" deyip eskiye dönme hatasının nedeni).
  const version = useRef(0);

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
    if (!uid || !sb) {
      setState(null);
      setStatus("guest");
      return;
    }
    const mine = ++version.current;
    try {
      const next = normalize(await rpc("bigocuk_state"));
      if (mine !== version.current) return; // arada bir yazma oldu; bu yanıt bayat
      setState(next);
      setLoadError(null);
      setStatus("ready");
    } catch (e) {
      if (mine !== version.current) return;
      setLoadError(errMsg(e));
      setStatus(isMissing(e) ? "setup" : "error");
    }
  }, [user, uid, sb, rpc]);
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, sb, user === undefined]);

  /** Adımları gönderir. Durumu kendisi değiştirmez; çağıran `commit` ile uygular (tek seferde render için). */
  const addSteps = async (n: number) => {
    const raw = await rpc("bigocuk_add_steps", { p_steps: n });
    return { accepted: Number(raw?.accepted) || 0, earned: Number(raw?.earned) || 0, next: normalize(raw) };
  };
  const commit = (next: BigocukState) => {
    version.current++;
    setState(next);
  };
  const buy = async (itemId: string) => {
    version.current++;
    const next = normalize(await rpc("bigocuk_buy", { p_item_id: itemId }));
    version.current++;
    setState(next);
  };
  const saveAvatar = async (cfg: AvatarConfig) => {
    version.current++;
    const next = normalize(await rpc("bigocuk_save_avatar", { p_avatar: cfg }));
    version.current++;
    // Sunucu çağrıyı kabul etti ama dönen avatar gönderdiğimizden farklıysa kayıt gerçekten yazılmamıştır
    // (eski/yarım kurulmuş SQL fonksiyonu). Sessizce başarılı göstermek yerine açıkça söyle.
    const keys = Object.keys(cfg) as (keyof AvatarConfig)[];
    const lost = keys.filter((k) => next.avatar[k] !== cfg[k]);
    if (lost.length) {
      setState(next);
      throw new Error(
        "Sunucu avatarı eksik kaydetti (" + lost.join(", ") + "). Supabase'de supabase/bigova_v3_upgrade.sql dosyasını çalıştırman gerekiyor.",
      );
    }
    setState(next);
    if (uid) rememberAvatar(uid, next.avatar); // arkadaş listesi hemen güncel görsün
  };

  return { user, status, state, loadError, refresh, addSteps, commit, buy, saveAvatar };
}
