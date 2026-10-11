-- ============================================================================
-- Bigova OPTİMİZASYON + EK SERTLEŞTİRME (v2)
-- Supabase > SQL Editor'de, security_hardening.sql'den SONRA çalıştır. Tekrar çalıştırmak güvenlidir.
-- Mevcut verileri silmez/değiştirmez; yalnızca indeks ve (NOT VALID) kısıt ekler.
-- ============================================================================

-- 1) İndeksler -----------------------------------------------------------------
-- Not: Tablo henüz kurulmamışsa ilgili satır atlanır (to_regclass kontrolü).
do $$ begin
  -- Okunmamış mesaj özeti, sohbet listesi ve Realtime filtresi (to_id=eq.<uid>)
  if to_regclass('public.messages') is not null then
    create index if not exists messages_to_created_idx on public.messages (to_id, created_at desc);
  end if;
  -- Arkadaş listesi / bekleyen istek sorguları ve RLS (auth.uid() = alıcı/gönderen)
  if to_regclass('public.friendships') is not null then
    create index if not exists friendships_addressee_status_idx on public.friendships (addressee, status);
    create index if not exists friendships_requester_status_idx on public.friendships (requester, status);
  end if;
  -- İlan kotası tetikleyicisi (count(*) where <sahip> = ...) ve "benim ilanlarım" sorguları
  if to_regclass('public.book_listings') is not null then
    create index if not exists book_listings_seller_idx on public.book_listings (seller_id, status);
  end if;
  if to_regclass('public.job_listings') is not null then
    create index if not exists job_listings_poster_idx on public.job_listings (poster_id, status);
  end if;
  if to_regclass('public.service_providers') is not null then
    create index if not exists service_providers_poster_idx on public.service_providers (poster_id, status);
  end if;
  if to_regclass('public.notes') is not null then
    create index if not exists notes_author_idx on public.notes (author_id, created_at desc);
  end if;
  -- İşletme araması (ilike '%...%') için trigram indeksi
  begin
    create extension if not exists pg_trgm with schema extensions;
  exception when others then null;
  end;
  if to_regclass('public.businesses') is not null and exists (select 1 from pg_extension where extname = 'pg_trgm') then
    execute 'create index if not exists businesses_name_trgm_idx on public.businesses using gin (name extensions.gin_trgm_ops)';
  end if;
end $$;

-- 2) İş ilanı e-postası: biçim doğrulaması ---------------------------------------
-- Arayüz `mailto:` bağlantısı ürettiği için "a@b.com?bcc=..." gibi parametre enjeksiyonu reddedilir.
-- NOT VALID: eski kayıtlar taranmaz/bozulmaz, yeni ve güncellenen kayıtlar denetlenir.
do $$ begin
  if to_regclass('public.job_listings') is not null then
    alter table public.job_listings drop constraint if exists job_listings_email_format;
    alter table public.job_listings add constraint job_listings_email_format
      check (contact_email is null or contact_email ~* '^[^\s@?&#,;:<>()"''\\/]+@[a-z0-9.-]+\.[a-z]{2,}$') not valid;
  end if;
end $$;

-- 3) Planlayıcı istatistiklerini güncelle ----------------------------------------
analyze;

notify pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- DENETİM (isteğe bağlı): kullanılmayan indeksleri bir süre sonra bul
-- select relname, indexrelname, idx_scan from pg_stat_user_indexes
--  where schemaname = 'public' order by idx_scan asc;
-- ----------------------------------------------------------------------------
