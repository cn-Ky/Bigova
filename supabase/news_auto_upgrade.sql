-- Biga Gündemi: otomatik haber derleme. Supabase SQL Editor'de çalıştırın; tekrar çalıştırmak güvenlidir.
-- Önce supabase/news_upgrade.sql çalışmış olmalı.
-- Otomatik kayıtlar sunucudan (service role) yazılır; RLS politikaları aynen kalır:
-- herkes yalnızca status='published' haberleri okur, taslakları yalnızca admin görür.
alter table public.news_articles
  add column if not exists is_auto boolean not null default false,
  add column if not exists verification text check (verification is null or verification in ('official','verified','single')),
  add column if not exists source_count int not null default 1,
  add column if not exists sources jsonb not null default '[]'::jsonb,
  add column if not exists cluster_key text,
  add column if not exists image_url text check (image_url is null or image_url ~* '^https://\S+$'),
  add column if not exists image_credit text check (image_credit is null or char_length(image_credit) <= 200),
  add column if not exists image_link text check (image_link is null or image_link ~* '^https://\S+$');

create unique index if not exists news_articles_cluster_key_idx
  on public.news_articles (cluster_key) where cluster_key is not null;
create index if not exists news_articles_auto_idx
  on public.news_articles (published_at desc) where is_auto;

-- Otomatik haberler yönetici onayı olmadan da yayınlanır; yanlışlık görürseniz kaydı silin ya da taslağa alın:
--   update public.news_articles set status = 'draft' where id = '...';
