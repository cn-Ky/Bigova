"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { demoNews, type NewsArticle } from "@/lib/newsData";

const byDate = (a: NewsArticle, b: NewsArticle) =>
  new Date(b.published_at).getTime() - new Date(a.published_at).getTime();

/** Yayındaki gerçek haberler + örnek haberler (en yeni üstte). Tablo yoksa yalnızca örnekler döner. */
export async function fetchNews(): Promise<NewsArticle[]> {
  let remote: NewsArticle[] = [];
  try {
    const { data, error } = await supabaseBrowser()
      .from("news_articles")
      .select("id,title,summary,body,category,author_name,source_name,source_url,featured,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(100);
    if (!error && data) remote = data as NewsArticle[];
  } catch {}
  return [...remote, ...demoNews].sort(byDate);
}

const SAVED_KEY = "bigova-news-saved";

/** Kaydedilen haberler yalnızca bu tarayıcıda (localStorage) tutulur. */
export function useSavedNews() {
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
      if (Array.isArray(raw)) setSaved(raw.filter((x) => typeof x === "string"));
    } catch {}
  }, []);
  const toggle = useCallback((id: string) => {
    setSaved((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  return { saved, toggle, isSaved: (id: string) => saved.includes(id) };
}
