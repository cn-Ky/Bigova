"use client";
import { useCallback, useEffect, useState } from "react";
import type { CategoryId } from "./menuData";

/** Hangi kategorilerin açık olduğunu hatırlar (localStorage). `alwaysOpen` verilen kategori her zaman açılır. */
export function useOpenCats(storageKey: string, defaults: CategoryId[], alwaysOpen?: CategoryId | null) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaults));
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setOpen(new Set(JSON.parse(raw) as string[]));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  useEffect(() => {
    if (alwaysOpen) setOpen((cur) => (cur.has(alwaysOpen) ? cur : new Set(cur).add(alwaysOpen)));
  }, [alwaysOpen]);
  const save = (next: Set<string>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {}
  };
  const toggle = useCallback(
    (id: string) =>
      setOpen((cur) => {
        const next = new Set(cur);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        save(next);
        return next;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey],
  );
  const setAll = useCallback(
    (ids: string[]) => {
      const next = new Set(ids);
      setOpen(next);
      save(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey],
  );
  return { open, toggle, setAll };
}
