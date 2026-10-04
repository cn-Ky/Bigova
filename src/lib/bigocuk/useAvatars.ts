"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_AVATAR, type AvatarConfig } from "./items";

type AvatarMap = Record<string, AvatarConfig>;

/** Oturum boyunca önbellek: aynı kişinin avatarı tekrar tekrar istenmez. */
const cache = new Map<string, AvatarConfig>();

/**
 * Verilen kullanıcıların avatarlarını getirir (get_avatars RPC'si).
 * SQL henüz kurulmadıysa sessizce boş döner; bileşenler baş harfe düşer.
 */
export function useAvatars(ids: string[]): AvatarMap {
  const [, bump] = useState(0);
  const key = useMemo(() => Array.from(new Set(ids)).sort().join(","), [ids]);
  const inflight = useRef(new Set<string>());

  useEffect(() => {
    const missing = key
      .split(",")
      .filter((id) => id && !cache.has(id) && !inflight.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => inflight.current.add(id));
    let alive = true;
    (async () => {
      try {
        const sb = supabaseBrowser();
        for (let i = 0; i < missing.length; i += 100) {
          const { data, error } = await sb.rpc("get_avatars", { p_ids: missing.slice(i, i + 100) });
          if (error) break;
          for (const row of (data as { id: string; avatar: Partial<AvatarConfig> }[]) ?? [])
            cache.set(row.id, { ...DEFAULT_AVATAR, ...row.avatar });
        }
      } catch {
        /* avatar yoksa baş harf gösterilir */
      } finally {
        missing.forEach((id) => inflight.current.delete(id));
        if (alive) bump((n) => n + 1);
      }
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  const out: AvatarMap = {};
  for (const id of key.split(",")) if (id && cache.has(id)) out[id] = cache.get(id)!;
  return out;
}

export function rememberAvatar(id: string, avatar: AvatarConfig) {
  cache.set(id, avatar);
}
