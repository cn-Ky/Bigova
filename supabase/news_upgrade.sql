-- Haberler (Biga Gündemi). Supabase SQL Editor'de çalıştırın; tekrar çalıştırmak güvenlidir.
-- Herkes yayındaki haberleri okur. Haber ekleme/düzenleme/silme yalnızca app_metadata.role = 'admin' olan
-- hesaplara açıktır (anketler ile aynı yetki modeli).
-- Yönetici yapmak için: update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = '...';
create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null default auth.uid(),
  title text not null check (char_length(title) between 5 and 160),
  summary text not null check (char_length(summary) between 10 and 400),
  body text not null check (char_length(body) between 20 and 20000),
  category text not null check (category in ('Duyuru','Kampüs','Şehir','Ulaşım','Etkinlik','Spor','Kültür & Sanat')),
  author_name text check (author_name is null or char_length(author_name) <= 80),
  source_name text check (source_name is null or char_length(source_name) <= 80),
  source_url text check (source_url is null or source_url ~* '^https?://\S+$'),
  featured boolean not null default false,
  status text not null default 'published' check (status in ('draft','published')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists news_articles_pub_idx on public.news_articles (published_at desc) where status = 'published';
alter table public.news_articles enable row level security;
drop policy if exists "news herkes okur" on public.news_articles;
drop policy if exists "news admin ekler" on public.news_articles;
drop policy if exists "news admin gunceller" on public.news_articles;
drop policy if exists "news admin siler" on public.news_articles;
create policy "news herkes okur" on public.news_articles for select
  using (status = 'published' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "news admin ekler" on public.news_articles for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "news admin gunceller" on public.news_articles for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "news admin siler" on public.news_articles for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
