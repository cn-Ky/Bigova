-- ============================================================================
-- Bigova Topluluğu → Instagram tarzı sosyal ağ (Faz 4-5: keşfet, arama, öneriler, hikayeler)
--   * community_explore            : fotoğraflı gönderilerden popülerlik + yenilik sıralı keşfet ızgarası
--   * community_trending_tags      : son günlerin gündem etiketleri
--   * community_search_people      : kişi arama (Türkçe harf duyarsız), ilişki bilgisiyle
--   * community_suggested_people   : "Tanıyor olabilirsin" önerileri (aynı bölüm, ortak takip, aktiflik)
--   * Hikayeler (24 saat): oluştur, sil, halka şeridi, görüntüle, görenler, süresi dolanları topla
-- Supabase > SQL Editor'de çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: instagram_upgrade.sql (ve ondan öncekiler).
--
-- GÜVENLİK MODELİ aynı: tablolara istemci doğrudan erişemez; kurallar sunucuda uygulanır.
--  * Keşfet yalnızca okuyabildiğin topluluklardaki, gizlenmemiş, profili görünür kişilerin gönderilerini gösterir;
--    engellediğin / seni engelleyen kişiler çıkmaz, kendi gönderilerin çıkmaz.
--  * Öneriler yalnızca profili herkese açık kişileri içerir (gizli profillere istek yağmasın).
--  * Hikayeleri yalnızca sahibi, onu takip edenler ve arkadaşları görür; engelli kişiler göremez.
--  * Görenler listesini yalnızca hikaye sahibi görür. Aktif hikaye sınırı: 20.
-- ============================================================================

do $$ begin
  if to_regclass('public.community_follows') is null or to_regprocedure('private.profile_visible(uuid)') is null then
    raise exception 'Önce instagram_upgrade.sql dosyasını çalıştır.';
  end if;
  if to_regprocedure('public.tr_norm(text)') is null then
    raise exception 'public.tr_norm bulunamadı: önce friends_upgrade.sql / chat_safety_upgrade.sql dosyalarını çalıştır.';
  end if;
end $$;

-- 1) KEŞFET ------------------------------------------------------------------------------------------------
-- Son 30 günün fotoğraflı gönderileri; puan = (beğeni + 2·yorum + 1) / (yaş_saat + 2)^1.3 (taze ve etkileşimli üstte).
drop function if exists public.community_explore(integer, integer);
create or replace function public.community_explore(p_limit integer default 24, p_offset integer default 0)
returns table (id uuid, image text, image_count integer, like_count integer, comment_count integer)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  return query
  with recent as (
    select p.* from public.community_posts p
     where p.deleted_at is null and p.hidden = false and cardinality(p.images) > 0
       and p.author_id <> v_uid and p.created_at > now() - interval '30 days'
     order by p.created_at desc
     limit 600
  )
  select r.id, r.images[1], cardinality(r.images), r.like_count, r.comment_count
    from recent r
   where private.can_read_community(r.community_id)
     and private.profile_visible(r.author_id)
     and not private.is_blocked_between(v_uid, r.author_id)
   order by (r.like_count + 2 * r.comment_count + 1)::float8
            / power(extract(epoch from (now() - r.created_at)) / 3600.0 + 2, 1.3) desc,
            r.created_at desc
   offset greatest(coalesce(p_offset, 0), 0)
   limit least(greatest(coalesce(p_limit, 24), 1), 48);
end $$;

-- Gündem etiketleri: son p_days günde okunabilir gönderilerde en çok geçenler (bir gönderide tekrarlar tek sayılır).
drop function if exists public.community_trending_tags(integer, integer);
create or replace function public.community_trending_tags(p_limit integer default 12, p_days integer default 7)
returns table (tag text, uses integer)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  return query
  with recent as (
    select p.id, p.community_id, lower(coalesce(p.title, '') || ' ' || p.body) as t
      from public.community_posts p
     where p.deleted_at is null and p.hidden = false
       and p.created_at > now() - make_interval(days => least(greatest(coalesce(p_days, 7), 1), 60))
     order by p.created_at desc
     limit 2000
  ), found as (
    select distinct r.id, m[1] as tag
      from recent r, lateral regexp_matches(r.t, '(#[[:alnum:]_çğıöşüâîû]{2,40})', 'g') as m
     where private.can_read_community(r.community_id)
  )
  select f.tag, count(*)::integer
    from found f
   group by f.tag
   order by count(*) desc, f.tag
   limit least(greatest(coalesce(p_limit, 12), 1), 30);
end $$;

-- 2) KİŞİ ARAMA VE ÖNERİLER --------------------------------------------------------------------------------
-- Ada göre arama: ad ya da soyadın başı eşleşir; Türkçe harfler (İ/ı/ş…) fark etmez. relation: benimle ilişkisi.
drop function if exists public.community_search_people(text, integer);
create or replace function public.community_search_people(p_q text, p_limit integer default 10)
returns table (user_id uuid, name text, relation text, department text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_t text := replace(replace(replace(public.tr_norm(trim(coalesce(p_q, ''))), '\', '\\'), '%', '\%'), '_', '\_');
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if v_t = '' then return; end if;
  return query
  select u.id, u.name,
         case
           when exists (select 1 from public.community_follows f where f.follower = v_uid and f.followee = u.id and f.status = 'accepted') then 'following'
           when exists (select 1 from public.community_follows f where f.follower = v_uid and f.followee = u.id and f.status = 'pending') then 'pending'
           else 'none' end,
         cp.department
    from public.profiles u
    left join public.community_profiles cp on cp.user_id = u.id
   where u.id <> v_uid and u.name <> ''
     and not private.is_blocked_between(v_uid, u.id)
     and (public.tr_norm(u.name) like v_t || '%' escape '\' or public.tr_norm(u.name) like '% ' || v_t || '%' escape '\')
   order by (public.tr_norm(u.name) like v_t || '%' escape '\') desc, u.name
   limit least(greatest(coalesce(p_limit, 10), 1), 30);
end $$;

-- "Tanıyor olabilirsin": takip etmediğin, profili herkese açık kişiler.
-- Puan: aynı bölüm +3, aynı sınıf +1, takip ettiklerinin takip ettiği her kişi için +2, son 30 günde paylaşım (en çok +5).
-- reason: mutual (ortak takip) | department (aynı bölüm) | active (aktif).
drop function if exists public.community_suggested_people(integer);
create or replace function public.community_suggested_people(p_limit integer default 10)
returns table (user_id uuid, name text, reason text, mutual integer, department text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_dep text; v_grade smallint;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  select cp.department, cp.grade into v_dep, v_grade from public.community_profiles cp where cp.user_id = v_uid;
  return query
  with cand as (
    select u.id, u.name, u.created_at, cp.department, cp.grade,
           (select count(*)::integer from public.community_follows a
              join public.community_follows b on b.follower = a.followee and b.followee = u.id and b.status = 'accepted'
             where a.follower = v_uid and a.status = 'accepted') as mutual,
           (select least(count(*), 5)::integer from public.community_posts p
             where p.author_id = u.id and p.deleted_at is null and p.created_at > now() - interval '30 days') as recent
      from public.profiles u
      left join public.community_profiles cp on cp.user_id = u.id
     where u.id <> v_uid and u.name <> '' and u.privacy = 'everyone'
       and not private.is_blocked_between(v_uid, u.id)
       and not exists (select 1 from public.community_follows f where f.follower = v_uid and f.followee = u.id)
  )
  select c.id, c.name,
         case when c.mutual > 0 then 'mutual' when v_dep is not null and c.department = v_dep then 'department' else 'active' end,
         c.mutual, c.department
    from cand c
   order by (case when v_dep is not null and c.department = v_dep then 3 else 0 end
             + case when v_grade is not null and c.grade = v_grade then 1 else 0 end
             + c.mutual * 2 + c.recent) desc,
            c.created_at desc nulls last
   limit least(greatest(coalesce(p_limit, 10), 1), 30);
end $$;

-- 3) HİKAYELER ---------------------------------------------------------------------------------------------
create table if not exists public.community_stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  image text not null check (char_length(image) between 3 and 200),
  caption text not null default '' check (char_length(caption) <= 200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index if not exists community_stories_author_idx on public.community_stories (author_id, expires_at);
alter table public.community_stories enable row level security;
revoke all on public.community_stories from anon, authenticated;

create table if not exists public.community_story_views (
  story_id uuid not null references public.community_stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);
create index if not exists community_story_views_viewer_idx on public.community_story_views (viewer_id);
alter table public.community_story_views enable row level security;
revoke all on public.community_story_views from anon, authenticated;

-- Bu kişinin hikayelerini görebilir miyim? (kendim; ya da onu takip ediyorsam / arkadaşsak ve engel yoksa)
create or replace function private.can_see_story(p_author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    p_author = auth.uid()
    or (not private.is_blocked_between(auth.uid(), p_author)
        and (exists (select 1 from public.community_follows f where f.follower = auth.uid() and f.followee = p_author and f.status = 'accepted')
             or private.are_friends(auth.uid(), p_author))))
$$;

-- Hikaye oluştur. p_image: önceden "community" deposuna kendi klasörüne yüklenmiş fotoğrafın yolu.
create or replace function public.community_story_create(p_image text, p_caption text default '')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cap text := left(trim(coalesce(p_caption, '')), 200);
  v_id uuid;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_image is null or p_image !~ ('^' || v_uid::text || '/[A-Za-z0-9._-]{1,120}$') then raise exception 'Geçersiz fotoğraf.'; end if;
  if (select count(*) from public.community_stories where author_id = v_uid and expires_at > now()) >= 20 then
    raise exception 'En fazla 20 aktif hikayen olabilir. Birini silip tekrar dene.';
  end if;
  insert into public.community_stories (author_id, image, caption) values (v_uid, p_image, v_cap) returning id into v_id;
  return v_id;
end $$;

-- Kendi hikayeni sil; depodan da silinebilsin diye fotoğraf yolunu döndürür (yoksa null).
create or replace function public.community_story_delete(p_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare v_img text;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  delete from public.community_stories where id = p_id and author_id = auth.uid() returning image into v_img;
  return v_img;
end $$;

-- Halka şeridi: kendim + takip ettiklerim (aktif hikayesi olanlar). Önce ben, sonra izlenmemişler, sonra en yeniler.
drop function if exists public.community_stories_tray();
create or replace function public.community_stories_tray()
returns table (user_id uuid, name text, story_count integer, unseen_count integer, latest_at timestamptz, is_self boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  return query
  select s.author_id, a.name, count(*)::integer,
         (count(*) filter (where v.story_id is null))::integer,
         max(s.created_at), (s.author_id = v_uid)
    from public.community_stories s
    join public.profiles a on a.id = s.author_id
    left join public.community_story_views v on v.story_id = s.id and v.viewer_id = v_uid
   where s.expires_at > now()
     and (s.author_id = v_uid
          or (exists (select 1 from public.community_follows f where f.follower = v_uid and f.followee = s.author_id and f.status = 'accepted')
              and not private.is_blocked_between(v_uid, s.author_id)))
   group by s.author_id, a.name
   order by (s.author_id = v_uid) desc, ((count(*) filter (where v.story_id is null)) > 0) desc, max(s.created_at) desc
   limit 60;
end $$;

-- Bir kişinin aktif hikayeleri (eskiden yeniye). view_count yalnızca hikaye sahibine gerçek değer verir.
drop function if exists public.community_stories_of(uuid);
create or replace function public.community_stories_of(p_user uuid)
returns table (id uuid, image text, caption text, created_at timestamptz, expires_at timestamptz, seen boolean, view_count integer)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if not private.can_see_story(p_user) then return; end if;
  return query
  select s.id, s.image, s.caption, s.created_at, s.expires_at,
         exists (select 1 from public.community_story_views v where v.story_id = s.id and v.viewer_id = v_uid),
         case when s.author_id = v_uid then (select count(*)::integer from public.community_story_views v where v.story_id = s.id) else 0 end
    from public.community_stories s
   where s.author_id = p_user and s.expires_at > now()
   order by s.created_at;
end $$;

-- Hikayeyi gördüm olarak işaretle (kendi hikayen sayılmaz).
create or replace function public.community_story_view(p_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  select author_id into v_author from public.community_stories where id = p_id and expires_at > now();
  if v_author is null or v_author = auth.uid() or not private.can_see_story(v_author) then return false; end if;
  insert into public.community_story_views (story_id, viewer_id) values (p_id, auth.uid()) on conflict do nothing;
  return true;
end $$;

-- Hikayeni kimler görmüş (yalnızca sahibi).
drop function if exists public.community_story_viewers(uuid);
create or replace function public.community_story_viewers(p_id uuid)
returns table (user_id uuid, name text, viewed_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  if not exists (select 1 from public.community_stories where id = p_id and author_id = auth.uid()) then return; end if;
  return query
  select v.viewer_id, u.name, v.viewed_at
    from public.community_story_views v
    join public.profiles u on u.id = v.viewer_id
   where v.story_id = p_id and u.name <> '' and not private.is_blocked_between(auth.uid(), u.id)
   order by v.viewed_at desc
   limit 200;
end $$;

-- Süresi dolmuş kendi hikayelerini siler ve fotoğraf yollarını döndürür (istemci depodan da kaldırır).
create or replace function public.community_story_collect_expired()
returns text[]
language plpgsql security definer set search_path = public as $$
declare v_paths text[];
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  with d as (delete from public.community_stories where author_id = auth.uid() and expires_at <= now() returning image)
  select coalesce(array_agg(image), '{}') into v_paths from d;
  return v_paths;
end $$;

-- 4) YETKİLER ---------------------------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname ~ '^(community|channel)_'
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;
revoke all on function private.can_see_story(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
