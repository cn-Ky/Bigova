"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { addMonths, istanbulToday, monthKey, monthRange, type MealKind, type MenuItem, type MenuRow, type MenuSource, type MenuVariant, type Takeaway } from "./types";
import { buildDemoRows } from "./demo";

type DbRow = {
  source: MenuSource;
  scope: string;
  variant: MenuVariant;
  menu_date: string;
  meal: MealKind;
  status: "open" | "closed";
  note: string | null;
  items: MenuItem[] | null;
  takeaways: Takeaway[] | null;
  total_kcal: number | null;
  fetched_at: string;
};

export type MenuData = {
  rows: MenuRow[];
  /** Kaynak başına son güncelleme zamanı (ISO) */
  updated: Partial<Record<MenuSource, string>>;
  demo: boolean;
};

const demoAllowed = () => process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_MENU_DEMO === "1";

/**
 * Bu ay ± 1 ay menüleri (anon + RLS ile herkese açık). Tablo yoksa ya da veri yoksa boş döner;
 * UYDURMA menü gösterilmez. Örnek veri yalnızca geliştirmede / açıkça izin verilen ortamda `?demo=1` ile gelir.
 */
export async function fetchMenus(wantDemo: boolean): Promise<MenuData> {
  const today = istanbulToday();
  if (wantDemo && demoAllowed()) return { rows: buildDemoRows(today), updated: {}, demo: true };
  const cur = monthKey(today);
  const from = monthRange(addMonths(cur, -1)).start;
  const to = monthRange(addMonths(cur, 1)).end;
  try {
    const { data, error } = await supabaseBrowser()
      .from("meal_menus")
      .select("source,scope,variant,menu_date,meal,status,note,items,takeaways,total_kcal,fetched_at")
      .gte("menu_date", from)
      .lte("menu_date", to)
      .order("menu_date", { ascending: true })
      .limit(1000);
    if (error || !data) return { rows: [], updated: {}, demo: false };
    const updated: MenuData["updated"] = {};
    const rows = (data as DbRow[]).map<MenuRow>((r) => {
      if (!updated[r.source] || r.fetched_at > updated[r.source]!) updated[r.source] = r.fetched_at;
      return {
        source: r.source,
        scope: r.scope,
        variant: r.variant,
        date: r.menu_date,
        meal: r.meal,
        status: r.status,
        note: r.note ?? undefined,
        items: r.items ?? [],
        takeaways: r.takeaways ?? undefined,
        totalKcal: r.total_kcal,
        fetchedAt: r.fetched_at,
      };
    });
    return { rows, updated, demo: false };
  } catch {
    return { rows: [], updated: {}, demo: false };
  }
}

export function useMenus(wantDemo: boolean | null) {
  const [data, setData] = useState<MenuData | null>(null);
  useEffect(() => {
    if (wantDemo === null) return; // ?demo bilgisi (tarayıcı) henüz okunmadı
    let live = true;
    fetchMenus(wantDemo).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [wantDemo]);
  return data;
}
