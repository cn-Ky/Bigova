-- Yemekhane (KYK yurtları + ÇOMÜ Ağaköy yemekhanesi). Supabase SQL Editor'de çalıştırın; tekrar çalıştırmak güvenlidir.
--
-- Herkes menüleri okur. Yazma YALNIZCA sunucudaki yenileme rotası (service role anahtarı) tarafından yapılır:
--   /api/menus/refresh  (Vercel Cron, günlük)   ve   /api/menus/import (elle yükleme, CRON_SECRET gerekir)
-- İstemciden (anon/authenticated) ekleme-güncelleme-silme için politika YOKTUR; RLS bunları reddeder.
--
-- scope: menünün geçerli olduğu yer. KYK menüleri il bazındadır ("kyk-canakkale"); Biga'daki tüm KYK yurtları
--        bu kapsamı kullanır. ÇOMÜ için "comu-biga-agakoy".
create table if not exists public.meal_menus (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('kyk', 'comu')),
  scope text not null check (char_length(scope) between 3 and 60),
  variant text not null default 'normal' check (variant in ('normal', 'vegan')),
  menu_date date not null,
  meal text not null check (meal in ('breakfast', 'dinner', 'daily')),
  status text not null default 'open' check (status in ('open', 'closed')),
  note text check (note is null or char_length(note) <= 120),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 40),
  takeaways jsonb check (takeaways is null or (jsonb_typeof(takeaways) = 'array' and jsonb_array_length(takeaways) <= 12)),
  total_kcal int check (total_kcal is null or total_kcal between 0 and 10000),
  source_url text check (source_url is null or source_url ~* '^https?://\S+$'),
  -- Kaynağın içerik özeti: değişmeyen PDF/veri tekrar işlenmez, kaldırılan günler temizlenir.
  source_hash text,
  fetched_at timestamptz not null default now(),
  unique (scope, variant, menu_date, meal)
);

create index if not exists meal_menus_lookup_idx on public.meal_menus (scope, menu_date);

alter table public.meal_menus enable row level security;
drop policy if exists "menus herkes okur" on public.meal_menus;
create policy "menus herkes okur" on public.meal_menus for select using (true);

-- İstemci rollerinin yazma yetkisini açıkça kaldır (RLS'e ek, savunma derinliği).
revoke insert, update, delete, truncate on public.meal_menus from anon, authenticated;
grant select on public.meal_menus to anon, authenticated;
