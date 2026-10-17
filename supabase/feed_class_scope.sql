-- Bigola akışı: "Senin için" (scope = 'mine') artık YALNIZCA aynı bölüm + aynı sınıftaki kişilerin paylaşımlarını gösterir.
--
-- Neden gerekiyordu: tüm gönderiler "Bigova Kampüs" (genel) topluluğuna bağlanıyor ve herkes bu topluluğa üye olduğu için
-- eski 'mine' (üye olduğum topluluklar) ile 'all' (okuyabildiğim hepsi) birebir aynı sonucu veriyordu.
--
-- Yeni kural: satırı paylaşan kişinin community_profiles kaydı (department + grade) benimkiyle aynıysa göster; kendi
-- paylaşımlarım her zaman görünür. Bölüm/sınıfı seçmemişsem yalnızca kendi paylaşımlarım görünür (arayüz zaten sorar).
-- Diğer kapsamlar ('all', 'following', 'saved', 'user', 'community') değişmedi.
--
-- Önkoşul: community_upgrade.sql + instagram_upgrade.sql. Güvenle tekrar çalıştırılabilir.

create index if not exists community_profiles_class_idx on public.community_profiles (department, grade);

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
  v_dept text;
  v_grade smallint;
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
  -- Benim bölümüm ve sınıfım ('mine' kapsamı için)
  select cp.department, cp.grade into v_dept, v_grade from public.community_profiles cp where cp.user_id = v_uid;
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
     -- SENİN İÇİN: kendi paylaşımlarım + aynı bölüm ve aynı sınıftaki kişilerin paylaşımları
     and (p_scope <> 'mine' or r.author_id = v_uid or (
            v_dept is not null and exists (
              select 1 from public.community_profiles ap
               where ap.user_id = r.author_id and ap.department = v_dept and ap.grade = v_grade)))
     and (c.visibility = 'public' or exists (
            select 1 from public.community_members m where m.community_id = p.community_id and m.user_id = v_uid))
     and (p.hidden = false or p.author_id = v_uid or private.can_moderate(p.community_id))
     and (p.author_id = v_uid or not private.is_blocked_between(v_uid, p.author_id))
     and (r.author_id = v_uid or not private.is_blocked_between(v_uid, r.author_id))
     and (v_like is null or private.search_norm(coalesce(p.title, '') || ' ' || p.body) like v_like)
   order by r.created_at desc
   limit v_limit;
end $$;

grant execute on function public.community_feed(text, uuid, text, text, timestamptz, integer, uuid, uuid, text, boolean) to authenticated;
