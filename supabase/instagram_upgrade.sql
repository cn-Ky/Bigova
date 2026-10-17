-- ============================================================================
-- Bigova Topluluğu → Instagram tarzı sosyal ağ (Faz 1: altyapı)
--   * Takip sistemi (tek yönlü takip; gizli profillerde istek + onay)
--   * Bildirimler (beğeni, yorum, yanıt, yeniden paylaşım, alıntı, takip)
--   * Akışa "following" (takip ettiklerim) kapsamı ve "yalnızca fotoğraflı" süzgeci
-- Supabase > SQL Editor'de çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: community_upgrade.sql, social_feed_upgrade.sql, chat_safety_upgrade.sql (engelleme, arkadaşlık)
--
-- GÜVENLİK MODELİ community_upgrade.sql ile aynı: tablolara istemci doğrudan erişemez (RLS açık, hak yok);
-- her şey kuralları sunucuda uygulayan public.community_* fonksiyonlarından geçer.
--  * Engellenen kullanıcılar birbirini takip edemez, bildirim gönderemez, listelerde görünmez.
--  * Profili "yalnızca arkadaşlar" olanı takip etmek istek olarak başlar; arkadaşlar anında kabul edilir.
--  * Bildirimler yalnızca alıcıya görünür; silinmiş, gizlenmiş veya erişilemeyen içerikler listelenmez.
--  * Takip hız sınırı: saatte 60.
-- ============================================================================

do $$ begin
  if to_regclass('public.community_posts') is null
     or to_regprocedure('private.can_read_community(uuid)') is null
     or (to_regprocedure('public.community_feed(text,uuid,text,text,timestamptz,integer,uuid,uuid,text)') is null
         and to_regprocedure('public.community_feed(text,uuid,text,text,timestamptz,integer,uuid,uuid,text,boolean)') is null) then
    raise exception 'Önce community_upgrade.sql ve social_feed_upgrade.sql dosyalarını çalıştır.';
  end if;
  if to_regprocedure('private.are_friends(uuid,uuid)') is null or to_regprocedure('private.is_blocked_between(uuid,uuid)') is null then
    raise exception 'Önce chat_safety_upgrade.sql (veya security_hardening.sql) dosyasını çalıştır.';
  end if;
end $$;

alter table public.profiles add column if not exists privacy text not null default 'everyone';

-- 1) TABLOLAR ----------------------------------------------------------------------------------------------
create table if not exists public.community_follows (
  follower uuid not null references public.profiles(id) on delete cascade,
  followee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('accepted', 'pending')),
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create index if not exists community_follows_followee_idx on public.community_follows (followee, status, created_at desc);
create index if not exists community_follows_follower_idx on public.community_follows (follower, status, created_at desc);
alter table public.community_follows enable row level security;
revoke all on public.community_follows from anon, authenticated;

create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'reply', 'repost', 'quote', 'follow', 'follow_request', 'follow_accept')),
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists community_notifications_user_idx on public.community_notifications (user_id, created_at desc);
create index if not exists community_notifications_unread_idx on public.community_notifications (user_id) where read_at is null;
-- Aynı kişi aynı gönderiyi tekrar beğenince / aynı kişiyi tekrar takip edince yeni bildirim üretilmez.
create unique index if not exists community_notifications_once_idx
  on public.community_notifications (user_id, actor_id, type, coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where type in ('like', 'repost', 'follow', 'follow_request', 'follow_accept');
alter table public.community_notifications enable row level security;
revoke all on public.community_notifications from anon, authenticated;

-- 2) YARDIMCILAR -------------------------------------------------------------------------------------------
-- Bu profilin içeriğini (avatar, gönderiler) görebilir miyim? (kendim, herkese açık ya da arkadaş)
create or replace function private.profile_visible(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles p
     where p.id = p_id and (p.privacy = 'everyone' or p.id = auth.uid() or private.are_friends(p.id, auth.uid())))
$$;

-- Bildirim ekler (kendine, engelli kişiye ve yinelenen beğeni/takibe bildirim yok).
create or replace function private.notify(p_user uuid, p_actor uuid, p_type text, p_post uuid default null, p_comment uuid default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_actor is null or p_user = p_actor then return; end if;
  if private.is_blocked_between(p_user, p_actor) then return; end if;
  insert into public.community_notifications (user_id, actor_id, type, post_id, comment_id)
  values (p_user, p_actor, p_type, p_post, p_comment)
  on conflict do nothing;
end $$;

-- 3) TETİKLEYİCİLER: bildirimleri üretir -------------------------------------------------------------------
create or replace function private.trg_notify_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select author_id into v_author from public.community_posts where id = new.post_id and deleted_at is null;
  perform private.notify(v_author, new.user_id, 'like', new.post_id);
  return null;
end $$;
drop trigger if exists community_post_likes_notify on public.community_post_likes;
create trigger community_post_likes_notify after insert on public.community_post_likes
  for each row execute function private.trg_notify_like();

create or replace function private.trg_notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_post_author uuid; v_parent_author uuid;
begin
  select author_id into v_post_author from public.community_posts where id = new.post_id;
  if new.parent_id is not null then
    select author_id into v_parent_author from public.community_comments where id = new.parent_id;
    perform private.notify(v_parent_author, new.author_id, 'reply', new.post_id, new.id);
  end if;
  if v_post_author is distinct from v_parent_author then
    perform private.notify(v_post_author, new.author_id, 'comment', new.post_id, new.id);
  end if;
  return null;
end $$;
drop trigger if exists community_comments_notify on public.community_comments;
create trigger community_comments_notify after insert on public.community_comments
  for each row execute function private.trg_notify_comment();

create or replace function private.trg_notify_quote() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  if new.quoted_post_id is null or new.deleted_at is not null then return null; end if;
  select author_id into v_author from public.community_posts where id = new.quoted_post_id;
  if new.body = '' and cardinality(new.images) = 0 then
    perform private.notify(v_author, new.author_id, 'repost', new.quoted_post_id);
  else
    perform private.notify(v_author, new.author_id, 'quote', new.id);
  end if;
  return null;
end $$;
drop trigger if exists community_posts_notify on public.community_posts;
create trigger community_posts_notify after insert on public.community_posts
  for each row execute function private.trg_notify_quote();

create or replace function private.trg_notify_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(new.followee, new.follower, case when new.status = 'pending' then 'follow_request' else 'follow' end);
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    delete from public.community_notifications where user_id = new.followee and actor_id = new.follower and type = 'follow_request';
    perform private.notify(new.follower, new.followee, 'follow_accept');
    perform private.notify(new.followee, new.follower, 'follow');
  elsif tg_op = 'DELETE' and old.status = 'pending' then
    delete from public.community_notifications where user_id = old.followee and actor_id = old.follower and type = 'follow_request';
  end if;
  return null;
end $$;
drop trigger if exists community_follows_notify on public.community_follows;
create trigger community_follows_notify after insert or update of status or delete on public.community_follows
  for each row execute function private.trg_notify_follow();

-- 4) TAKİP İŞLEMLERİ ---------------------------------------------------------------------------------------
-- Takip et. 'accepted' (takip ediyorsun) ya da 'pending' (istek gönderildi) döner.
create or replace function public.community_follow(p_user uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_user is null or p_user = v_uid then raise exception 'Kendini takip edemezsin.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Kullanıcı bulunamadı.'; end if;
  if private.is_blocked_between(v_uid, p_user) then raise exception 'Bu kullanıcı takip edilemiyor.'; end if;
  select status into v_status from public.community_follows where follower = v_uid and followee = p_user;
  if v_status is not null then return v_status; end if;
  if (select count(*) from public.community_follows where follower = v_uid and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Çok hızlı takip ediyorsun. Biraz sonra tekrar dene.';
  end if;
  v_status := case
    when exists (select 1 from public.profiles where id = p_user and privacy = 'everyone') or private.are_friends(v_uid, p_user)
    then 'accepted' else 'pending' end;
  insert into public.community_follows (follower, followee, status) values (v_uid, p_user, v_status);
  return v_status;
end $$;

-- Takibi bırak ya da gönderilmiş isteği geri çek.
create or replace function public.community_unfollow(p_user uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  delete from public.community_follows where follower = auth.uid() and followee = p_user;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- Gelen takip isteğini kabul et / reddet.
create or replace function public.community_follow_respond(p_user uuid, p_accept boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_accept then
    update public.community_follows set status = 'accepted' where follower = p_user and followee = auth.uid() and status = 'pending';
  else
    delete from public.community_follows where follower = p_user and followee = auth.uid() and status = 'pending';
  end if;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- Bir takipçini çıkar.
create or replace function public.community_remove_follower(p_user uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  delete from public.community_follows where follower = p_user and followee = auth.uid();
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- Profil sayacı ve ilişki: takipçi, takip, gönderi sayısı; benimle ilişkisi (self/following/pending/none).
drop function if exists public.community_follow_stats(uuid);
create or replace function public.community_follow_stats(p_user uuid)
returns table (followers integer, following integer, posts integer, relation text, follows_me boolean, locked boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  return query
  select
    (select count(*)::integer from public.community_follows f where f.followee = p_user and f.status = 'accepted'),
    (select count(*)::integer from public.community_follows f where f.follower = p_user and f.status = 'accepted'),
    (select count(*)::integer from public.community_posts p
       join public.communities c on c.id = p.community_id
      where p.author_id = p_user and p.deleted_at is null
        and not (p.quoted_post_id is not null and p.body = '' and cardinality(p.images) = 0)
        and (p.hidden = false or p.author_id = v_uid)
        and (c.visibility = 'public' or exists (select 1 from public.community_members m where m.community_id = p.community_id and m.user_id = v_uid))),
    case
      when p_user = v_uid then 'self'
      when exists (select 1 from public.community_follows f where f.follower = v_uid and f.followee = p_user and f.status = 'accepted') then 'following'
      when exists (select 1 from public.community_follows f where f.follower = v_uid and f.followee = p_user and f.status = 'pending') then 'pending'
      else 'none' end,
    exists (select 1 from public.community_follows f where f.follower = p_user and f.followee = v_uid and f.status = 'accepted'),
    not private.profile_visible(p_user);
end $$;

-- Takipçi listesi (p_following = false) veya takip edilenler (true). Gizli profilin listesi boş döner.
-- relation: listedeki kişiyle benim ilişkim (self/following/pending/none).
drop function if exists public.community_follow_list(uuid, boolean, timestamptz, integer);
create or replace function public.community_follow_list(p_user uuid, p_following boolean default false, p_before timestamptz default null, p_limit integer default 30)
returns table (user_id uuid, name text, relation text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 60);
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if not private.profile_visible(p_user) then return; end if;
  return query
  select u.id, u.name,
         case
           when u.id = v_uid then 'self'
           when exists (select 1 from public.community_follows x where x.follower = v_uid and x.followee = u.id and x.status = 'accepted') then 'following'
           when exists (select 1 from public.community_follows x where x.follower = v_uid and x.followee = u.id and x.status = 'pending') then 'pending'
           else 'none' end,
         f.created_at
    from public.community_follows f
    join public.profiles u on u.id = (case when p_following then f.followee else f.follower end)
   where f.status = 'accepted'
     and (case when p_following then f.follower else f.followee end) = p_user
     and u.name <> ''
     and (u.id = v_uid or not private.is_blocked_between(v_uid, u.id))
     and (p_before is null or f.created_at < p_before)
   order by f.created_at desc
   limit v_limit;
end $$;

-- Bana gelen bekleyen takip istekleri.
create or replace function public.community_follow_requests()
returns table (user_id uuid, name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  return query
  select u.id, u.name, f.created_at
    from public.community_follows f
    join public.profiles u on u.id = f.follower
   where f.followee = auth.uid() and f.status = 'pending' and u.name <> ''
     and not private.is_blocked_between(auth.uid(), u.id)
   order by f.created_at desc
   limit 100;
end $$;


-- 5) AKIŞ: 'following' kapsamı (takip ettiklerim + kendi gönderilerim) ve p_media (yalnızca fotoğraflılar) ---------
-- p_scope: 'mine' · 'all' · 'community' · 'saved' · 'user' · 'following'
-- Eski 9 parametreli sürüm kaldırılır (aynı adlı iki sürüm PostgREST'te belirsizlik hatası verir).
drop function if exists public.community_feed(text, uuid, text, text, timestamptz, integer, uuid, uuid, text);
create or replace function public.community_feed(
  p_scope text default 'mine', p_community uuid default null, p_kind text default null,
  p_status text default null, p_before timestamptz default null, p_limit integer default 15,
  p_post uuid default null, p_author uuid default null, p_q text default null,
  p_media boolean default false
) returns table (
  id uuid, feed_id uuid, community_id uuid, community_name text, community_slug text, author_id uuid, author_name text,
  kind text, title text, body text, course text, images text[], like_count integer, comment_count integer,
  repost_count integer, accepted_comment_id uuid, liked boolean, reposted boolean, bookmarked boolean,
  mine boolean, can_moderate boolean, hidden boolean, created_at timestamptz, sort_at timestamptz,
  reposted_by_id uuid, reposted_by_name text,
  quoted_id uuid, quoted_author_id uuid, quoted_author_name text, quoted_body text, quoted_images text[],
  quoted_community_name text, quoted_created_at timestamptz, quoted_unavailable boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 15), 1), 40);
  v_q text := left(nullif(trim(coalesce(p_q, '')), ''), 80);
  v_like text;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_scope not in ('mine', 'all', 'community', 'saved', 'user', 'following') then raise exception 'Geçersiz kapsam.'; end if;
  if p_kind is not null and p_kind not in ('post', 'question') then raise exception 'Geçersiz tür.'; end if;
  if p_status is not null and p_status not in ('open', 'solved') then raise exception 'Geçersiz durum.'; end if;
  if p_scope = 'community' and (p_community is null or not private.can_read_community(p_community)) then
    raise exception 'Topluluk bulunamadı.';
  end if;
  if p_scope = 'user' and p_author is null then raise exception 'Kullanıcı belirtilmedi.'; end if;
  if v_q is not null then
    v_like := '%' || replace(replace(replace(private.search_norm(v_q), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return query
  select p.id, r.id, p.community_id, c.name, c.slug, p.author_id, a.name, p.kind, p.title, p.body, p.course, p.images,
         p.like_count, p.comment_count, p.repost_count, p.accepted_comment_id,
         exists (select 1 from public.community_post_likes l where l.post_id = p.id and l.user_id = v_uid),
         exists (select 1 from public.community_posts x
                  where x.quoted_post_id = p.id and x.author_id = v_uid and x.deleted_at is null
                    and x.body = '' and cardinality(x.images) = 0),
         exists (select 1 from public.community_bookmarks b where b.post_id = p.id and b.user_id = v_uid),
         (p.author_id = v_uid), private.can_moderate(p.community_id), p.hidden, p.created_at, r.created_at,
         case when r.id <> p.id then r.author_id end, case when r.id <> p.id then ra.name end,
         q.qid, q.qauthor, q.qauthor_name, q.qbody, q.qimages, q.qcomm, q.qat,
         (p.quoted_post_id is not null and q.qid is null)
    from public.community_posts r
    join public.community_posts p
      on p.id = (case when r.quoted_post_id is not null and r.body = '' and cardinality(r.images) = 0
                      then r.quoted_post_id else r.id end)
    join public.communities c on c.id = p.community_id
    join public.profiles a on a.id = p.author_id
    join public.profiles ra on ra.id = r.author_id
    left join lateral (
      select qp.id as qid, qp.author_id as qauthor, qa.name as qauthor_name, qp.body as qbody, qp.images as qimages,
             qc.name as qcomm, qp.created_at as qat
        from public.community_posts qp
        join public.communities qc on qc.id = qp.community_id
        join public.profiles qa on qa.id = qp.author_id
       where qp.id = p.quoted_post_id and qp.deleted_at is null
         and (qc.visibility = 'public' or exists (
                select 1 from public.community_members m where m.community_id = qp.community_id and m.user_id = v_uid))
         and (qp.hidden = false or qp.author_id = v_uid or private.can_moderate(qp.community_id))
         and (qp.author_id = v_uid or not private.is_blocked_between(v_uid, qp.author_id))
    ) q on true
   where r.deleted_at is null and p.deleted_at is null
     and (p_post is null or (r.id = p_post and r.id = p.id))
     and (p_kind is null or r.id = p.id)
     and (p_kind is null or p.kind = p_kind)
     and (p_status is null or (p.kind = 'question' and ((p_status = 'solved') = (p.accepted_comment_id is not null))))
     and (p_before is null or r.created_at < p_before)
     and (p_scope <> 'community' or r.community_id = p_community)
     and (p_scope <> 'user' or r.author_id = p_author)
     and (p_scope <> 'following' or r.author_id = v_uid or exists (
            select 1 from public.community_follows f
             where f.follower = v_uid and f.followee = r.author_id and f.status = 'accepted'))
     and (not coalesce(p_media, false) or cardinality(p.images) > 0)
     and (p_scope <> 'saved' or exists (
            select 1 from public.community_bookmarks b where b.post_id = p.id and b.user_id = v_uid))
     and (p_scope <> 'mine' or exists (
            select 1 from public.community_members m where m.community_id = p.community_id and m.user_id = v_uid))
     and (c.visibility = 'public' or exists (
            select 1 from public.community_members m where m.community_id = p.community_id and m.user_id = v_uid))
     and (p.hidden = false or p.author_id = v_uid or private.can_moderate(p.community_id))
     and (p.author_id = v_uid or not private.is_blocked_between(v_uid, p.author_id))
     and (r.author_id = v_uid or not private.is_blocked_between(v_uid, r.author_id))
     and (v_like is null or private.search_norm(coalesce(p.title, '') || ' ' || p.body) like v_like)
   order by r.created_at desc
   limit v_limit;
end $$;

-- 6) BİLDİRİMLER -------------------------------------------------------------------------------------------
-- Alıcının görebileceği bildirimler: engelli kişilerinki, silinmiş/gizlenmiş/erişilemeyen içerikler hariç.
create or replace function private.my_notifications() returns setof public.community_notifications
language sql stable security definer set search_path = public as $$
  select n.* from public.community_notifications n
   where n.user_id = auth.uid()
     and not private.is_blocked_between(auth.uid(), n.actor_id)
     and (n.post_id is null or exists (
            select 1 from public.community_posts p
             where p.id = n.post_id and p.deleted_at is null and p.hidden = false and private.can_read_community(p.community_id)))
     and (n.comment_id is null or exists (
            select 1 from public.community_comments k where k.id = n.comment_id and k.deleted_at is null and k.hidden = false))
$$;

drop function if exists public.community_notifications_list(timestamptz, integer);
create or replace function public.community_notifications_list(p_before timestamptz default null, p_limit integer default 30)
returns table (
  id uuid, type text, actor_id uuid, actor_name text, post_id uuid, comment_id uuid,
  snippet text, image text, created_at timestamptz, is_read boolean, follow_state text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 50);
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  return query
  select n.id, n.type, n.actor_id, a.name, n.post_id, n.comment_id,
         left(case when n.type in ('comment', 'reply') then k.body else coalesce(nullif(p.title, ''), p.body) end, 90),
         case when p.id is not null and cardinality(p.images) > 0 then p.images[1] end,
         n.created_at, (n.read_at is not null),
         case
           when n.type not in ('follow', 'follow_request') then null
           when exists (select 1 from public.community_follows x where x.follower = v_uid and x.followee = n.actor_id and x.status = 'accepted') then 'following'
           when exists (select 1 from public.community_follows x where x.follower = v_uid and x.followee = n.actor_id and x.status = 'pending') then 'pending'
           when n.type = 'follow_request' and exists (select 1 from public.community_follows x where x.follower = n.actor_id and x.followee = v_uid and x.status = 'pending') then 'incoming'
           else 'none' end
    from private.my_notifications() n
    join public.profiles a on a.id = n.actor_id
    left join public.community_posts p on p.id = n.post_id
    left join public.community_comments k on k.id = n.comment_id
   where (p_before is null or n.created_at < p_before)
   order by n.created_at desc
   limit v_limit;
end $$;

create or replace function public.community_notifications_unread_count()
returns integer
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return 0; end if;
  return (select count(*)::integer from private.my_notifications() n where n.read_at is null);
end $$;

-- Hepsini okundu işaretle (ve 90 günden eski bildirimleri temizle). Okunan sayısını döner.
create or replace function public.community_notifications_mark_read()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  update public.community_notifications set read_at = now() where user_id = auth.uid() and read_at is null;
  get diagnostics v_n = row_count;
  delete from public.community_notifications where user_id = auth.uid() and created_at < now() - interval '90 days';
  return v_n;
end $$;

-- 7) YETKİLER ---------------------------------------------------------------------------------------------
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

-- Bu yardımcılar yalnızca yukarıdaki fonksiyonlar ve tetikleyiciler içinden çağrılır.
revoke all on function private.notify(uuid, uuid, text, uuid, uuid) from public, anon, authenticated;
revoke all on function private.my_notifications() from public, anon, authenticated;
revoke all on function private.profile_visible(uuid) from public, anon, authenticated;
revoke all on function private.trg_notify_like() from public, anon, authenticated;
revoke all on function private.trg_notify_comment() from public, anon, authenticated;
revoke all on function private.trg_notify_quote() from public, anon, authenticated;
revoke all on function private.trg_notify_follow() from public, anon, authenticated;

notify pgrst, 'reload schema';
