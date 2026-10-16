-- ============================================================================
-- Bigova Topluluğu → sosyal akış (X / Threads tarzı)
--   * Yeniden paylaş (repost) ve alıntı gönderi
--   * Yanıt zincirleri (yorumlara yanıt)
--   * Kaydedilenler (yer imi)
--   * Akışta arama / #etiket, bir kullanıcının gönderileri (profil sayfası)
-- Supabase > SQL Editor'de çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: community_upgrade.sql
--
-- GÜVENLİK MODELİ community_upgrade.sql ile aynı: tablolara istemci doğrudan erişemez, her şey
-- kuralları sunucuda uygulayan public.community_* fonksiyonlarından geçer.
--  * Yeniden paylaşım ve alıntı, ORİJİNAL gönderinin topluluğuna yazılır (üyelik gerekir).
--    Orijinalin metni kopyalanmaz; her okuyucu için görünürlük (özel grup, gizli, engelli, silinmiş)
--    akış sorgusunda yeniden denetlenir. Özel gruptaki bir gönderi dışarıdan alıntılansa bile
--    grup dışındakiler "Bu gönderi kullanılamıyor" görür.
--  * Düz yeniden paylaşım (metinsiz) akışta orijinal gönderi olarak, "… yeniden paylaştı" etiketiyle görünür.
--  * Yeniden paylaşım ve alıntılar gönderi hız sınırına (saatte 10) dahildir.
-- ============================================================================

do $$ begin
  if to_regclass('public.community_posts') is null or to_regprocedure('private.can_read_community(uuid)') is null then
    raise exception 'Önce supabase/community_upgrade.sql dosyasını çalıştır.';
  end if;
end $$;

-- 1) SÜTUNLAR VE TABLO -----------------------------------------------------------------------------

alter table public.community_comments
  add column if not exists parent_id uuid references public.community_comments(id) on delete set null;
create index if not exists community_comments_parent_idx on public.community_comments (parent_id) where parent_id is not null;

alter table public.community_posts
  add column if not exists quoted_post_id uuid references public.community_posts(id) on delete set null;
alter table public.community_posts
  add column if not exists repost_count integer not null default 0 check (repost_count >= 0);
create index if not exists community_posts_quoted_idx on public.community_posts (quoted_post_id) where quoted_post_id is not null;

-- "Gönderi boş olamaz" kuralı: yeniden paylaşım metinsiz olabilir
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
     where conrelid = 'public.community_posts'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%char_length(body) >= 1%'
  loop
    execute format('alter table public.community_posts drop constraint %I', r.conname);
  end loop;
  alter table public.community_posts add constraint community_posts_content_chk
    check (deleted_at is not null or char_length(body) >= 1 or cardinality(images) > 0 or quoted_post_id is not null);
end $$;

create table if not exists public.community_bookmarks (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists community_bookmarks_user_idx on public.community_bookmarks (user_id, created_at desc);
alter table public.community_bookmarks enable row level security;
revoke all on public.community_bookmarks from anon, authenticated;

-- 2) TETİKLEYİCİ: yeniden paylaşım sayacı ---------------------------------------------------------------
create or replace function private.trg_repost_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.quoted_post_id is not null and new.deleted_at is null then
      update public.community_posts set repost_count = repost_count + 1 where id = new.quoted_post_id;
    end if;
  elsif old.deleted_at is null and new.deleted_at is not null and old.quoted_post_id is not null then
    update public.community_posts set repost_count = greatest(repost_count - 1, 0) where id = old.quoted_post_id;
  end if;
  return null;
end $$;
drop trigger if exists community_posts_repost_count on public.community_posts;
create trigger community_posts_repost_count after insert or update of deleted_at on public.community_posts
  for each row execute function private.trg_repost_count();

-- Arama için Türkçe harf duyarsız düzleştirme. (public.tr_norm'daki harf dizisi bir karakter fazla olduğu için
-- büyük Ü/Ş/Ö/Ç yanlış eşlenir; arama bu yüzden kendi düzleştiricisini kullanır.)
create or replace function private.search_norm(t text) returns text
language sql immutable as $$
  select lower(translate(coalesce(t, ''), 'İIıĞğÜüŞşÖöÇç', 'iiigguussoocc'))
$$;

-- Bu kullanıcının görebildiği bir gönderinin topluluğu (göremiyorsa null)
create or replace function private.visible_post_community(p_id uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select p.community_id
    from public.community_posts p
   where p.id = p_id and p.deleted_at is null
     and private.can_read_community(p.community_id)
     and (p.hidden = false or p.author_id = auth.uid())
     and (p.author_id = auth.uid() or not private.is_blocked_between(auth.uid(), p.author_id))
$$;

-- 3) AKIŞ ------------------------------------------------------------------------------------------------
-- p_scope: 'mine' üye olduklarım · 'all' okuyabildiğim hepsi · 'community' tek topluluk
--          'saved' kaydettiklerim · 'user' p_author'ın gönderileri ve yeniden paylaşımları
-- p_q: metin / #etiket araması (Türkçe harf ve büyük-küçük harf duyarsız)
-- id = gösterilen gönderi (düz yeniden paylaşımda ORİJİNAL gönderi), feed_id = satırın kendi kimliği,
-- created_at = gösterilen gönderinin zamanı, sort_at = akıştaki sıra/sayfalama zamanı.
drop function if exists public.community_feed(text, uuid, text, text, timestamptz, integer, uuid);
create or replace function public.community_feed(
  p_scope text default 'mine', p_community uuid default null, p_kind text default null,
  p_status text default null, p_before timestamptz default null, p_limit integer default 15,
  p_post uuid default null, p_author uuid default null, p_q text default null
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
  if p_scope not in ('mine', 'all', 'community', 'saved', 'user') then raise exception 'Geçersiz kapsam.'; end if;
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

-- 4) YORUMLAR → YANIT ZİNCİRLERİ -------------------------------------------------------------------------
drop function if exists public.community_comments(uuid);
create or replace function public.community_comments(p_post uuid)
returns table (
  id uuid, post_id uuid, author_id uuid, author_name text, body text, like_count integer, liked boolean,
  mine boolean, can_moderate boolean, hidden boolean, is_accepted boolean, created_at timestamptz,
  parent_id uuid, reply_to_name text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_comm uuid;
  v_accepted uuid;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  select p.community_id, p.accepted_comment_id into v_comm, v_accepted
    from public.community_posts p where p.id = p_post and p.deleted_at is null;
  if v_comm is null or not private.can_read_community(v_comm) then raise exception 'Gönderi bulunamadı.'; end if;
  return query
  select k.id, k.post_id, k.author_id, a.name, k.body, k.like_count,
         exists (select 1 from public.community_comment_likes l where l.comment_id = k.id and l.user_id = v_uid),
         (k.author_id = v_uid), private.can_moderate(v_comm), k.hidden, (k.id = v_accepted), k.created_at,
         k.parent_id, pa.name
    from public.community_comments k
    join public.profiles a on a.id = k.author_id
    left join public.community_comments pk on pk.id = k.parent_id and pk.deleted_at is null
    left join public.profiles pa on pa.id = pk.author_id
   where k.post_id = p_post and k.deleted_at is null
     and (k.hidden = false or k.author_id = v_uid or private.can_moderate(v_comm))
     and (k.author_id = v_uid or not private.is_blocked_between(v_uid, k.author_id))
   order by k.created_at
   limit 300;
end $$;

drop function if exists public.community_add_comment(uuid, text);
create or replace function public.community_add_comment(p_post uuid, p_body text, p_parent uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_body text := trim(coalesce(p_body, ''));
  v_comm uuid;
  v_author uuid;
  v_hidden boolean;
  v_pauthor uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if v_body = '' or char_length(v_body) > 2000 then raise exception 'Yorum 1 ile 2000 karakter arasında olmalı.'; end if;
  select p.community_id, p.author_id, p.hidden into v_comm, v_author, v_hidden
    from public.community_posts p where p.id = p_post and p.deleted_at is null;
  if v_comm is null or (v_hidden and v_author <> v_uid) then raise exception 'Gönderi bulunamadı.'; end if;
  if not private.is_member(v_comm) then raise exception 'Yorum yapmak için önce topluluğa katılmalısın.'; end if;
  if v_author <> v_uid and private.is_blocked_between(v_uid, v_author) then
    raise exception 'Bu gönderiye yorum yapılamıyor.';
  end if;
  if p_parent is not null then
    select k.author_id into v_pauthor from public.community_comments k
     where k.id = p_parent and k.post_id = p_post and k.deleted_at is null and (k.hidden = false or k.author_id = v_uid);
    if v_pauthor is null then raise exception 'Yanıtlanan yorum bulunamadı.'; end if;
    if v_pauthor <> v_uid and private.is_blocked_between(v_uid, v_pauthor) then
      raise exception 'Bu yoruma yanıt verilemiyor.';
    end if;
  end if;
  if (select count(*) from public.community_comments where author_id = v_uid and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Çok hızlı yorum yapıyorsun. Biraz sonra tekrar dene.';
  end if;
  insert into public.community_comments (post_id, author_id, body, parent_id) values (p_post, v_uid, v_body, p_parent) returning id into v_id;
  return v_id;
end $$;

-- 5) YENİDEN PAYLAŞ · ALINTILA · KAYDET ------------------------------------------------------------------

-- Düz yeniden paylaşım: aç/kapat. Başka bir yeniden paylaşım hedeflenirse orijinaline çözülür.
-- { reposted, count, id } döner (id = orijinal gönderi).
create or replace function public.community_toggle_repost(p_post uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  t public.community_posts;
  v_existing uuid;
  v_on boolean;
  v_count integer;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into t from public.community_posts x where x.id = p_post and x.deleted_at is null;
  if found and t.quoted_post_id is not null and t.body = '' and cardinality(t.images) = 0 then
    select * into t from public.community_posts x where x.id = t.quoted_post_id and x.deleted_at is null;
  end if;
  if not found or private.visible_post_community(t.id) is null then raise exception 'Gönderi bulunamadı.'; end if;
  if not private.is_member(t.community_id) then raise exception 'Yeniden paylaşmak için önce topluluğa katılmalısın.'; end if;
  select x.id into v_existing from public.community_posts x
   where x.author_id = v_uid and x.quoted_post_id = t.id and x.deleted_at is null and x.body = '' and cardinality(x.images) = 0
   limit 1;
  if v_existing is not null then
    update public.community_posts set deleted_at = now() where id = v_existing;
    v_on := false;
  else
    if (select count(*) from public.community_posts where author_id = v_uid and created_at > now() - interval '1 hour') >= 10 then
      raise exception 'Çok hızlı paylaşıyorsun. Biraz sonra tekrar dene.';
    end if;
    insert into public.community_posts (community_id, author_id, kind, body, quoted_post_id)
    values (t.community_id, v_uid, 'post', '', t.id);
    v_on := true;
  end if;
  select repost_count into v_count from public.community_posts where id = t.id;
  return jsonb_build_object('reposted', v_on, 'count', v_count, 'id', t.id);
end $$;

-- Alıntı gönderi: kendi metnin (ve fotoğrafların) + alıntılanan gönderi.
create or replace function public.community_quote_post(p_post uuid, p_body text, p_images text[] default '{}')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_body text := trim(coalesce(p_body, ''));
  v_imgs text[] := coalesce(p_images, '{}');
  v_img text;
  t public.community_posts;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if char_length(v_body) > 4000 then raise exception 'Metin en fazla 4000 karakter olabilir.'; end if;
  if cardinality(v_imgs) > 4 then raise exception 'En fazla 4 fotoğraf ekleyebilirsin.'; end if;
  foreach v_img in array v_imgs loop
    if v_img !~ ('^' || v_uid::text || '/[A-Za-z0-9._-]{1,120}$') then raise exception 'Geçersiz fotoğraf.'; end if;
  end loop;
  if v_body = '' and cardinality(v_imgs) = 0 then raise exception 'Alıntıya bir şeyler yaz veya düz yeniden paylaş.'; end if;
  select * into t from public.community_posts x where x.id = p_post and x.deleted_at is null;
  if found and t.quoted_post_id is not null and t.body = '' and cardinality(t.images) = 0 then
    select * into t from public.community_posts x where x.id = t.quoted_post_id and x.deleted_at is null;
  end if;
  if not found or private.visible_post_community(t.id) is null then raise exception 'Gönderi bulunamadı.'; end if;
  if not private.is_member(t.community_id) then raise exception 'Alıntılamak için önce topluluğa katılmalısın.'; end if;
  if (select count(*) from public.community_posts where author_id = v_uid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Çok hızlı paylaşıyorsun. Biraz sonra tekrar dene.';
  end if;
  insert into public.community_posts (community_id, author_id, kind, body, images, quoted_post_id)
  values (t.community_id, v_uid, 'post', v_body, v_imgs, t.id)
  returning id into v_id;
  return v_id;
end $$;

-- Kaydet / kaydı kaldır. { bookmarked } döner.
create or replace function public.community_toggle_bookmark(p_post uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_n integer;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if private.visible_post_community(p_post) is null then raise exception 'Gönderi bulunamadı.'; end if;
  delete from public.community_bookmarks where post_id = p_post and user_id = v_uid;
  get diagnostics v_n = row_count;
  if v_n = 0 then insert into public.community_bookmarks (post_id, user_id) values (p_post, v_uid) on conflict do nothing; end if;
  return jsonb_build_object('bookmarked', v_n = 0);
end $$;

-- 6) YETKİLER ---------------------------------------------------------------------------------------------
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

grant execute on all functions in schema private to authenticated;

notify pgrst, 'reload schema';
