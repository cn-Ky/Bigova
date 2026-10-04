"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_AVATAR, type AvatarConfig } from "./items";

type Entry = { avatar: AvatarConfig; at: number };
const cache = new Map<string, Entry>();
const FRESH_MS = 10_000; // bundan eskiyse yeniden çekilir
const POLL_MS = 30_000;

async function fetchAvatars(ids: string[]) {
  const sb = supabaseBrowser();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await sb.rpc("get_avatars", { p_ids: ids.slice(i, i + 100) });
    if (error) return;
    for (const row of (data as { id: string; avatar: Partial<AvatarConfig> }[]) ?? [])
      cache.set(row.id, { avatar: { ...DEFAULT_AVATAR, ...row.avatar }, at: Date.now() });
  }
}

/**
 * Kullanıcıların güncel avatarlarını getirir. Önbellek yalnızca anında göstermek içindir:
 * her açılışta, sekmeye dönünce ve 30 sn'de bir sunucudan yenilenir (avatar değişince herkes görür).
 */
export function useAvatars(ids: string[]): Record<string, AvatarConfig> {
  const [, bump] = useState(0);
  const key = useMemo(() => Array.from(new Set(ids)).sort().join(","), [ids]);

  useEffect(() => {
    const list = key.split(",").filter(Boolean);
    if (!list.length) return;
    let alive = true;
    const refresh = async (force: boolean) => {
      const stale = list.filter((id) => force || !cache.has(id) || Date.now() - cache.get(id)!.at > FRESH_MS);
      if (!stale.length) return;
      try {
        await fetchAvatars(stale);
      } catch {
        /* avatar yoksa baş harf gösterilir */
      }
      if (alive) bump((n) => n + 1);
    };
    void refresh(false);
    const timer = setInterval(() => !document.hidden && void refresh(true), POLL_MS);
    const onVisible = () => !document.hidden && void refresh(false);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key]);

  const out: Record<string, AvatarConfig> = {};
  for (const id of key.split(",")) {
    const e = cache.get(id);
    if (id && e) out[id] = e.avatar;
  }
  return out;
}

export function rememberAvatar(id: string, avatar: AvatarConfig) {
  cache.set(id, { avatar, at: Date.now() });
}
