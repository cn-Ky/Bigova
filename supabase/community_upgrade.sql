-- ============================================================================
-- Bigova Topluluğu: gönderi · yorum · beğeni · bölüm/sınıf toplulukları · soru-cevap ·
-- ders çalışma grupları · kategorili forum (grup sohbetleri) · şikâyet ve moderasyon
-- Supabase > SQL Editor'de TEK SEFERDE çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: schema.sql, friends_upgrade.sql (tr_norm), profiles_upgrade.sql (get_avatars),
--          chat_safety_upgrade.sql (engelleme: private.is_blocked_between).
--
-- GÜVENLİK MODELİ (sohbet/Bigocuk ile aynı)
--  * Hiçbir tabloya istemci doğrudan YAZAMAZ ve (forum mesajları hariç) doğrudan OKUYAMAZ.
--    Her okuma/yazma, kuralları sunucuda uygulayan public.community_* / channel_* fonksiyonlarından geçer.
--  * Okuma: herkese açık topluluklar tüm giriş yapmış öğrencilere; özel çalışma grupları yalnızca üyelere.
--    Yazma (gönderi/yorum/sohbet): topluluk üyeliği gerekir. Beğeni: okuyabildiğin her içerik.
--  * Engelleme iki yönde işler: engelli kişilerin gönderi/yorum/mesajları birbirine görünmez,
--    birbirlerinin içeriğine yorum yapamaz.
--  * Hız sınırları: saatte 10 gönderi, saatte 40 yorum, dakikada 20 sohbet mesajı, günde 20 şikâyet.
--  * Silme "yumuşak"tır: metin ve görsel yolları veritabanından temizlenir, yer tutucu kalır.
--    Silebilenler: içeriğin sahibi, topluluğun sahibi/moderatörü (role = owner|mod) ve uygulama yöneticisi.
--  * Şikâyet: aynı içerik 3 farklı kişi tarafından (ya da bir moderatör tarafından) bildirilirse içerik
--    herkesten gizlenir (sahibi görmeye devam eder); yönetici inceleyip kaldırır veya geri açar.
--
-- YÖNETİCİ: Supabase Dashboard > Authentication > kullanıcı > app_metadata içine {"role":"admin"} ekle
-- (anketlerdeki yetkiyle aynı; istemciden verilemez). Şikâyet kuyruğu: /topluluk/yonetim.
-- MODERATÖR ATAMA (bölüm/sınıf toplulukları için):
--   update public.community_members set role = 'mod'
--    where user_id = '<kullanıcı uuid>' and community_id = (select id from public.communities where slug = 'iktisat');
-- ============================================================================

do $$ begin
  if to_regprocedure('private.is_blocked_between(uuid,uuid)') is null then
    raise exception 'Önce supabase/chat_safety_upgrade.sql dosyasını çalıştır (engelleme altyapısı eksik).';
  end if;
  if to_regprocedure('public.tr_norm(text)') is null then
    raise exception 'Önce supabase/friends_upgrade.sql dosyasını çalıştır (tr_norm eksik).';
  end if;
end $$;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- 1) TABLOLAR -------------------------------------------------------------------

-- Öğrencinin bölümü ve sınıfı (bölüm/sınıf topluluklarına otomatik katılım için)
create table if not exists public.community_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade default auth.uid(),
  department text not null check (char_length(department) between 1 and 80),
  grade smallint not null check (grade between 1 and 5), -- 5 = lisansüstü
  updated_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,70}$'),
  kind text not null check (kind in ('general', 'department', 'class', 'study')),
  name text not null check (char_length(name) between 2 and 90),
  description text check (description is null or char_length(description) <= 500),
  department text check (department is null or char_length(department) <= 80),
  grade smallint check (grade is null or grade between 1 and 5),
  course text check (course is null or char_length(course) <= 80),
  meeting_info text check (meeting_info is null or char_length(meeting_info) <= 120),
  max_members integer check (max_members is null or max_members between 2 and 200),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  is_official boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  member_count integer not null default 0 check (member_count >= 0),
  created_at timestamptz not null default now(),
  check (visibility = 'public' or kind = 'study')
);
create index if not exists communities_kind_idx on public.communities (kind, member_count desc);

-- Özel çalışma grupları için davet kodu (yalnızca grubun sahibi görür)
create table if not exists public.community_join_codes (
  community_id uuid primary key references public.communities(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{8}$')
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'mod', 'member')),
  via_profile boolean not null default false, -- bölüm/sınıf seçiminden gelen otomatik üyelik
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index if not exists community_members_user_idx on public.community_members (user_id);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'post' check (kind in ('post', 'question')),
  title text check (title is null or char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 4000),
  course text check (course is null or char_length(course) <= 80),
  images text[] not null default '{}' check (cardinality(images) <= 4),
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  accepted_comment_id uuid,
  hidden boolean not null default false,
  mod_reviewed boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (deleted_at is not null or char_length(body) >= 1 or cardinality(images) > 0),
  check (deleted_at is not null or kind <> 'question' or title is not null)
);
create index if not exists community_posts_feed_idx on public.community_posts (community_id, created_at desc) where deleted_at is null;
create index if not exists community_posts_kind_idx on public.community_posts (kind, created_at desc) where deleted_at is null;
create index if not exists community_posts_author_idx on public.community_posts (author_id, created_at desc);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  like_count integer not null default 0 check (like_count >= 0),
  hidden boolean not null default false,
  mod_reviewed boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (deleted_at is not null or char_length(body) >= 1)
);
create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);
create index if not exists community_comments_author_idx on public.community_comments (author_id, created_at desc);

do $$ begin
  alter table public.community_posts
    add constraint community_posts_accepted_fk foreign key (accepted_comment_id)
    references public.community_comments(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.community_comment_likes (
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- Forum: kategoriler ve sohbet kanalları
create table if not exists public.forum_categories (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,30}$'),
  name text not null check (char_length(name) between 2 and 40),
  blurb text,
  sort integer not null default 0
);
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade, -- null = herkese açık forum kanalı
  category text references public.forum_categories(slug) on delete restrict,
  name text not null check (char_length(name) between 2 and 40),
  description text check (description is null or char_length(description) <= 140),
  is_official boolean not null default false,
  sort integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((community_id is null) = (category is not null))
);
create unique index if not exists channels_global_name_idx on public.channels (category, lower(name)) where community_id is null;
create unique index if not exists channels_community_name_idx on public.channels (community_id, lower(name)) where community_id is not null;

create table if not exists public.channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1500),
  hidden boolean not null default false,
  mod_reviewed boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (deleted_at is not null or char_length(body) >= 1)
);
create index if not exists channel_messages_idx on public.channel_messages (channel_id, created_at desc);
create index if not exists channel_messages_author_idx on public.channel_messages (author_id, created_at desc);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  target_type text not null check (target_type in ('post', 'comment', 'message')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'taciz', 'uygunsuz', 'yanlis-bilgi', 'diger')),
  note text check (note is null or char_length(note) <= 300),
  status text not null default 'open' check (status in ('open', 'removed', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (reporter, target_type, target_id)
);
create index if not exists community_reports_open_idx on public.community_reports (status, target_type, target_id);

-- 2) YARDIMCI FONKSİYONLAR (private şema: RLS içinde çağrılır ama REST API'den yoklanamaz) -------
create or replace function private.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create or replace function private.is_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.community_members where community_id = c and user_id = auth.uid())
$$;

create or replace function private.can_read_community(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.communities x
     where x.id = c and (x.visibility = 'public' or private.is_member(c)))
$$;

create or replace function private.can_moderate(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    private.is_admin() or exists (
      select 1 from public.community_members
       where community_id = c and user_id = auth.uid() and role in ('owner', 'mod')))
$$;

create or replace function private.can_read_channel(ch uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.channels k
     where k.id = ch and (k.community_id is null or private.is_member(k.community_id)))
$$;

-- Davet kodu ve adres (slug) üretimi
create or replace function private.slugify(t text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(
           translate(lower(public.tr_norm(t)), 'âêîôû', 'aeiou'), '[^a-z0-9]+', '-', 'g'))
$$;
create or replace function private.random_code() returns text
language sql volatile as $$
  select upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8))
$$;

-- 3) TETİKLEYİCİLER (sayaçlar, varsayılan kanal, genel topluluğa katılım) -----------------------
create or replace function private.trg_member_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
  else
    update public.communities set member_count = greatest(member_count - 1, 0) where id = old.community_id;
  end if;
  return null;
end $$;
drop trigger if exists community_members_count on public.community_members;
create trigger community_members_count after insert or delete on public.community_members
  for each row execute function private.trg_member_count();

create or replace function private.trg_post_like_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set like_count = like_count + 1 where id = new.post_id;
  else
    update public.community_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
drop trigger if exists community_post_likes_count on public.community_post_likes;
create trigger community_post_likes_count after insert or delete on public.community_post_likes
  for each row execute function private.trg_post_like_count();

create or replace function private.trg_comment_like_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_comments set like_count = like_count + 1 where id = new.comment_id;
  else
    update public.community_comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end $$;
drop trigger if exists community_comment_likes_count on public.community_comment_likes;
create trigger community_comment_likes_count after insert or delete on public.community_comment_likes
  for each row execute function private.trg_comment_like_count();

create or replace function private.trg_comment_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
  return null;
end $$;
drop trigger if exists community_comments_count on public.community_comments;
create trigger community_comments_count after insert on public.community_comments
  for each row execute function private.trg_comment_count();

-- Her topluluğa otomatik "Sohbet" kanalı
create or replace function private.trg_default_channel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.channels (community_id, name, description, is_official, created_by)
  values (new.id, 'Sohbet', 'Topluluğun genel sohbeti', true, new.created_by)
  on conflict do nothing;
  return null;
end $$;
drop trigger if exists communities_default_channel on public.communities;
create trigger communities_default_channel after insert on public.communities
  for each row execute function private.trg_default_channel();

-- Yeni kayıt olan herkes genel kampüs topluluğuna katılır
create or replace function private.trg_join_general() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.community_members (community_id, user_id, via_profile)
  select c.id, new.id, true from public.communities c where c.kind = 'general' and c.slug = 'bigova-kampus'
  on conflict do nothing;
  return null;
end $$;
drop trigger if exists profiles_join_general on public.profiles;
create trigger profiles_join_general after insert on public.profiles
  for each row execute function private.trg_join_general();

-- 4) RLS: istemci tablolara doğrudan yazamaz --------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'community_profiles', 'communities', 'community_join_codes', 'community_members', 'community_posts',
    'community_comments', 'community_post_likes', 'community_comment_likes', 'forum_categories',
    'channels', 'channel_messages', 'community_reports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Tek istisna: forum mesajları. Realtime (canlı sohbet) satırları okuma politikasına göre dağıtır;
-- bu yüzden politika gizli, engelli ve yetkisiz içeriği baştan eler. Yazma yine yalnızca channel_send ile.
grant select on public.channel_messages to authenticated;
drop policy if exists "channel_messages: yetkili okur" on public.channel_messages;
create policy "channel_messages: yetkili okur" on public.channel_messages for select to authenticated
  using (
    private.can_read_channel(channel_id)
    and (hidden = false or author_id = auth.uid())
    and (author_id = auth.uid() or not private.is_blocked_between(auth.uid(), author_id))
  );

do $$ begin
  begin alter publication supabase_realtime add table public.channel_messages;
  exception when duplicate_object then null; when undefined_object then null; end;
end $$;

-- 5) Görseller: özel kova, yalnızca giriş yapanlar okur, herkes yalnızca kendi klasörüne yükler -----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community', 'community', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;
drop policy if exists "community dosya: giris yapan okur" on storage.objects;
create policy "community dosya: giris yapan okur" on storage.objects for select to authenticated
  using (bucket_id = 'community');
drop policy if exists "community dosya: kendi klasorune yukler" on storage.objects;
create policy "community dosya: kendi klasorune yukler" on storage.objects for insert to authenticated
  with check (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "community dosya: kendi siler" on storage.objects;
create policy "community dosya: kendi siler" on storage.objects for delete to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

-- 6) PROFİL: BÖLÜM + SINIF ----------------------------------------------------------------------------
create or replace function public.community_my_profile()
returns table (department text, grade smallint)
language sql stable security definer set search_path = public as $$
  select p.department, p.grade from public.community_profiles p where p.user_id = auth.uid()
$$;

-- Bölüm ve sınıfı kaydeder; genel, bölüm ve sınıf topluluklarına otomatik üye yapar.
-- Daha önce profilden gelen (otomatik) üyelikler yenisiyle değiştirilir; elle katıldıkların korunur.
create or replace function public.community_set_profile(p_department text, p_grade integer)
returns void
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_dept public.communities;
  v_class uuid;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into v_dept from public.communities c where c.kind = 'department' and c.name = p_department;
  if not found then raise exception 'Bölüm bulunamadı.'; end if;
  select c.id into v_class from public.communities c
   where c.kind = 'class' and c.department = v_dept.name and c.grade = p_grade;
  if v_class is null then raise exception 'Bu bölüm için seçtiğin sınıf bulunamadı.'; end if;

  insert into public.community_profiles (user_id, department, grade)
  values (v_uid, v_dept.name, p_grade)
  on conflict (user_id) do update set department = excluded.department, grade = excluded.grade, updated_at = now();

  delete from public.community_members where user_id = v_uid and via_profile and role = 'member';
  insert into public.community_members (community_id, user_id, via_profile)
  select c.id, v_uid, true from public.communities c
   where c.id in (v_dept.id, v_class) or (c.kind = 'general' and c.slug = 'bigova-kampus')
  on conflict do nothing;
end $$;

-- 7) TOPLULUKLAR -------------------------------------------------------------------------------------
create or replace function public.community_list(p_kind text default null, p_q text default null)
returns table (
  id uuid, slug text, kind text, name text, description text, department text, grade smallint,
  course text, meeting_info text, max_members integer, visibility text, is_official boolean,
  member_count integer, is_member boolean, my_role text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_q text := replace(replace(replace(public.tr_norm(trim(coalesce(p_q, ''))), '\', '\\'), '%', '\%'), '_', '\_');
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  return query
  select c.id, c.slug, c.kind, c.name, c.description, c.department, c.grade, c.course, c.meeting_info,
         c.max_members, c.visibility, c.is_official, c.member_count,
         (m.user_id is not null), m.role
    from public.communities c
    left join public.community_members m on m.community_id = c.id and m.user_id = v_uid
   where (c.visibility = 'public' or m.user_id is not null)
     and (p_kind is null or c.kind = p_kind)
     and (v_q = '' or public.tr_norm(c.name || ' ' || coalesce(c.course, '') || ' ' || coalesce(c.department, ''))
                      like '%' || v_q || '%' escape '\')
   order by (m.user_id is not null) desc, c.is_official desc, c.member_count desc, c.name
   limit 100;
end $$;

create or replace function public.community_get(p_slug text)
returns table (
  id uuid, slug text, kind text, name text, description text, department text, grade smallint,
  course text, meeting_info text, max_members integer, visibility text, is_official boolean,
  member_count integer, is_member boolean, my_role text, can_moderate boolean, join_code text,
  owner_name text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  return query
  select c.id, c.slug, c.kind, c.name, c.description, c.department, c.grade, c.course, c.meeting_info,
         c.max_members, c.visibility, c.is_official, c.member_count,
         (m.user_id is not null), m.role, private.can_moderate(c.id),
         case when m.role = 'owner' then j.code end,
         (select p.name from public.profiles p where p.id = c.created_by)
    from public.communities c
    left join public.community_members m on m.community_id = c.id and m.user_id = v_uid
    left join public.community_join_codes j on j.community_id = c.id
   where c.slug = p_slug and (c.visibility = 'public' or m.user_id is not null);
end $$;

create or replace function public.community_join(p_community uuid)
returns void
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  c public.communities;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into c from public.communities x where x.id = p_community for update;
  if not found or c.visibility <> 'public' then raise exception 'Topluluk bulunamadı.'; end if;
  if exists (select 1 from public.community_members where community_id = c.id and user_id = v_uid) then return; end if;
  if c.max_members is not null and c.member_count >= c.max_members then raise exception 'Bu grup dolu.'; end if;
  insert into public.community_members (community_id, user_id) values (c.id, v_uid) on conflict do nothing;
end $$;

-- Özel çalışma grubuna davet koduyla katıl; grubun adresini (slug) döndürür
create or replace function public.community_join_with_code(p_code text)
returns text
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  c public.communities;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  select x.* into c from public.communities x
    join public.community_join_codes j on j.community_id = x.id
   where j.code = upper(trim(coalesce(p_code, ''))) for update of x;
  if not found then raise exception 'Davet kodu geçersiz.'; end if;
  if not exists (select 1 from public.community_members where community_id = c.id and user_id = v_uid) then
    if c.max_members is not null and c.member_count >= c.max_members then raise exception 'Bu grup dolu.'; end if;
    insert into public.community_members (community_id, user_id) values (c.id, v_uid) on conflict do nothing;
  end if;
  return c.slug;
end $$;

create or replace function public.community_leave(p_community uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  select role into v_role from public.community_members where community_id = p_community and user_id = auth.uid();
  if v_role is null then return; end if;
  if v_role = 'owner' then raise exception 'Grubun sahibi ayrılamaz. İstersen grubu silebilirsin.'; end if;
  delete from public.community_members where community_id = p_community and user_id = auth.uid();
end $$;

create or replace function public.community_create_study(
  p_name text, p_course text default null, p_description text default null,
  p_meeting text default null, p_max integer default 30, p_private boolean default false
) returns table (id uuid, slug text, join_code text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_id uuid;
  v_slug text;
  v_code text;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 60 then raise exception 'Grup adı 3 ile 60 karakter arasında olmalı.'; end if;
  if p_max is null or p_max < 2 or p_max > 200 then raise exception 'Üye sınırı 2 ile 200 arasında olmalı.'; end if;
  if (select count(*) from public.community_members m join public.communities c on c.id = m.community_id
       where m.user_id = v_uid and m.role = 'owner' and c.kind = 'study') >= 5 then
    raise exception 'En fazla 5 çalışma grubu yönetebilirsin.';
  end if;
  if (select count(*) from public.communities c where c.created_by = v_uid and c.kind = 'study'
         and c.created_at > now() - interval '1 day') >= 3 then
    raise exception 'Bugün çok fazla grup kurdun. Yarın tekrar dene.';
  end if;

  v_slug := left(coalesce(nullif(private.slugify(v_name), ''), 'grup'), 60) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
  insert into public.communities (slug, kind, name, description, course, meeting_info, max_members, visibility, created_by)
  values (v_slug, 'study', v_name,
          nullif(left(trim(coalesce(p_description, '')), 500), ''),
          nullif(left(trim(coalesce(p_course, '')), 80), ''),
          nullif(left(trim(coalesce(p_meeting, '')), 120), ''),
          p_max, case when p_private then 'private' else 'public' end, v_uid)
  returning communities.id into v_id;
  insert into public.community_members (community_id, user_id, role) values (v_id, v_uid, 'owner');
  if p_private then
    v_code := private.random_code();
    insert into public.community_join_codes (community_id, code) values (v_id, v_code);
  end if;
  return query select v_id, v_slug, v_code;
end $$;

create or replace function public.community_delete_group(p_community uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  select (c.kind = 'study') and (private.is_admin() or exists (
           select 1 from public.community_members m
            where m.community_id = c.id and m.user_id = auth.uid() and m.role = 'owner'))
    into v_ok from public.communities c where c.id = p_community;
  if not coalesce(v_ok, false) then raise exception 'Bu grubu silme yetkin yok.'; end if;
  delete from public.communities where id = p_community;
end $$;

create or replace function public.community_members(p_community uuid)
returns table (user_id uuid, name text, role text, joined_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  if not private.can_read_community(p_community) then raise exception 'Topluluk bulunamadı.'; end if;
  return query
  select m.user_id, p.name, m.role, m.joined_at
    from public.community_members m
    join public.profiles p on p.id = m.user_id
   where m.community_id = p_community
     and (m.user_id = auth.uid() or not private.is_blocked_between(auth.uid(), m.user_id))
   order by (m.role = 'owner') desc, (m.role = 'mod') desc, m.joined_at
   limit 200;
end $$;

create or replace function public.community_remove_member(p_community uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  if not private.can_moderate(p_community) then raise exception 'Bu işlem için yetkin yok.'; end if;
  select role into v_role from public.community_members where community_id = p_community and user_id = p_user;
  if v_role is null then return; end if;
  if v_role = 'owner' or p_user = auth.uid() then raise exception 'Bu üye çıkarılamaz.'; end if;
  delete from public.community_members where community_id = p_community and user_id = p_user;
end $$;

-- 8) GÖNDERİLER, SORULAR, YORUMLAR, BEĞENİLER ---------------------------------------------------------
-- p_scope: 'mine' = üyesi olduğun topluluklar · 'all' = okuyabildiğin tüm topluluklar · 'community' = tek topluluk
-- p_kind: 'post' | 'question' · p_status (sorular için): 'open' | 'solved' · p_post: tek gönderi
create or replace function public.community_feed(
  p_scope text default 'mine', p_community uuid default null, p_kind text default null,
  p_status text default null, p_before timestamptz default null, p_limit integer default 15,
  p_post uuid default null
) returns table (
  id uuid, community_id uuid, community_name text, community_slug text, author_id uuid, author_name text,
  kind text, title text, body text, course text, images text[], like_count integer, comment_count integer,
  accepted_comment_id uuid, liked boolean, mine boolean, can_moderate boolean, hidden boolean, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 15), 1), 40);
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_scope not in ('mine', 'all', 'community') then raise exception 'Geçersiz kapsam.'; end if;
  if p_kind is not null and p_kind not in ('post', 'question') then raise exception 'Geçersiz tür.'; end if;
  if p_status is not null and p_status not in ('open', 'solved') then raise exception 'Geçersiz durum.'; end if;
  if p_scope = 'community' and (p_community is null or not private.can_read_community(p_community)) then
    raise exception 'Topluluk bulunamadı.';
  end if;
  return query
  select p.id, p.community_id, c.name, c.slug, p.author_id, a.name, p.kind, p.title, p.body, p.course, p.images,
         p.like_count, p.comment_count, p.accepted_comment_id,
         exists (select 1 from public.community_post_likes l where l.post_id = p.id and l.user_id = v_uid),
         (p.author_id = v_uid), private.can_moderate(p.community_id), p.hidden, p.created_at
    from public.community_posts p
    join public.communities c on c.id = p.community_id
    join public.profiles a on a.id = p.author_id
   where p.deleted_at is null
     and (p_post is null or p.id = p_post)
     and (p_kind is null or p.kind = p_kind)
     and (p_status is null or (p.kind = 'question' and ((p_status = 'solved') = (p.accepted_comment_id is not null))))
     and (p_before is null or p.created_at < p_before)
     and (p_scope <> 'community' or p.community_id = p_community)
     and (p_scope <> 'mine' or exists (
            select 1 from public.community_members m where m.community_id = p.community_id and m.user_id = v_uid))
     and (c.visibility = 'public' or exists (
            select 1 from public.community_members m where m.community_id = p.community_id and m.user_id = v_uid))
     and (p.hidden = false or p.author_id = v_uid or private.can_moderate(p.community_id))
     and (p.author_id = v_uid or not private.is_blocked_between(v_uid, p.author_id))
   order by p.created_at desc
   limit v_limit;
end $$;

create or replace function public.community_comments(p_post uuid)
returns table (
  id uuid, post_id uuid, author_id uuid, author_name text, body text, like_count integer, liked boolean,
  mine boolean, can_moderate boolean, hidden boolean, is_accepted boolean, created_at timestamptz
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
         (k.author_id = v_uid), private.can_moderate(v_comm), k.hidden, (k.id = v_accepted), k.created_at
    from public.community_comments k
    join public.profiles a on a.id = k.author_id
   where k.post_id = p_post and k.deleted_at is null
     and (k.hidden = false or k.author_id = v_uid or private.can_moderate(v_comm))
     and (k.author_id = v_uid or not private.is_blocked_between(v_uid, k.author_id))
   order by k.created_at
   limit 300;
end $$;

create or replace function public.community_create_post(
  p_community uuid, p_kind text, p_title text, p_body text,
  p_course text default null, p_images text[] default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_body text := trim(coalesce(p_body, ''));
  v_imgs text[] := coalesce(p_images, '{}');
  v_img text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_kind not in ('post', 'question') then raise exception 'Geçersiz gönderi türü.'; end if;
  if not private.is_member(p_community) then raise exception 'Paylaşmak için önce topluluğa katılmalısın.'; end if;
  if char_length(v_body) > 4000 then raise exception 'Metin en fazla 4000 karakter olabilir.'; end if;
  if v_title is not null and char_length(v_title) > 120 then raise exception 'Başlık en fazla 120 karakter olabilir.'; end if;
  if p_kind = 'question' and (v_title is null or char_length(v_title) < 5) then
    raise exception 'Sorunun başlığı en az 5 karakter olmalı.';
  end if;
  if cardinality(v_imgs) > 4 then raise exception 'En fazla 4 fotoğraf ekleyebilirsin.'; end if;
  foreach v_img in array v_imgs loop
    if v_img !~ ('^' || v_uid::text || '/[A-Za-z0-9._-]{1,120}$') then raise exception 'Geçersiz fotoğraf.'; end if;
  end loop;
  if v_body = '' and cardinality(v_imgs) = 0 then raise exception 'Boş gönderi paylaşılamaz.'; end if;
  if (select count(*) from public.community_posts where author_id = v_uid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Çok hızlı paylaşıyorsun. Biraz sonra tekrar dene.';
  end if;
  insert into public.community_posts (community_id, author_id, kind, title, body, course, images)
  values (p_community, v_uid, p_kind, v_title, v_body,
          nullif(left(trim(coalesce(p_course, '')), 80), ''), v_imgs)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.community_add_comment(p_post uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_body text := trim(coalesce(p_body, ''));
  v_comm uuid;
  v_author uuid;
  v_hidden boolean;
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
  if (select count(*) from public.community_comments where author_id = v_uid and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Çok hızlı yorum yapıyorsun. Biraz sonra tekrar dene.';
  end if;
  insert into public.community_comments (post_id, author_id, body) values (p_post, v_uid, v_body) returning id into v_id;
  return v_id;
end $$;

-- Beğen / beğeniyi geri al. { liked, count } döner.
create or replace function public.community_toggle_like(p_type text, p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_comm uuid;
  v_author uuid;
  v_n integer;
  v_liked boolean;
  v_count integer;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_type = 'post' then
    select p.community_id, p.author_id into v_comm, v_author
      from public.community_posts p where p.id = p_id and p.deleted_at is null and (p.hidden = false or p.author_id = v_uid);
  elsif p_type = 'comment' then
    select p.community_id, k.author_id into v_comm, v_author
      from public.community_comments k join public.community_posts p on p.id = k.post_id
     where k.id = p_id and k.deleted_at is null and p.deleted_at is null and (k.hidden = false or k.author_id = v_uid);
  else
    raise exception 'Geçersiz tür.';
  end if;
  if v_comm is null or not private.can_read_community(v_comm) then raise exception 'İçerik bulunamadı.'; end if;
  if v_author <> v_uid and private.is_blocked_between(v_uid, v_author) then raise exception 'İçerik bulunamadı.'; end if;

  if p_type = 'post' then
    delete from public.community_post_likes where post_id = p_id and user_id = v_uid;
    get diagnostics v_n = row_count;
    if v_n = 0 then insert into public.community_post_likes (post_id, user_id) values (p_id, v_uid) on conflict do nothing; end if;
    v_liked := v_n = 0;
    select like_count into v_count from public.community_posts where id = p_id;
  else
    delete from public.community_comment_likes where comment_id = p_id and user_id = v_uid;
    get diagnostics v_n = row_count;
    if v_n = 0 then insert into public.community_comment_likes (comment_id, user_id) values (p_id, v_uid) on conflict do nothing; end if;
    v_liked := v_n = 0;
    select like_count into v_count from public.community_comments where id = p_id;
  end if;
  return jsonb_build_object('liked', v_liked, 'count', v_count);
end $$;

-- Soru sahibi bir yorumu "doğru yanıt" işaretler (aynı yoruma tekrar basınca işaret kalkar)
create or replace function public.community_accept_answer(p_post uuid, p_comment uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  p public.community_posts;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into p from public.community_posts x where x.id = p_post and x.deleted_at is null;
  if not found or p.author_id <> auth.uid() then raise exception 'Yalnızca soru sahibi yanıt işaretleyebilir.'; end if;
  if p.kind <> 'question' then raise exception 'Yalnızca sorularda yanıt işaretlenir.'; end if;
  if p.accepted_comment_id = p_comment then
    update public.community_posts set accepted_comment_id = null where id = p_post;
    return null;
  end if;
  if not exists (select 1 from public.community_comments k
                  where k.id = p_comment and k.post_id = p_post and k.deleted_at is null and k.hidden = false) then
    raise exception 'Yorum bulunamadı.';
  end if;
  update public.community_posts set accepted_comment_id = p_comment where id = p_post;
  return p_comment;
end $$;

-- Gönderi / yorum / forum mesajı sil (yumuşak silme). Sahibi silerse kendi fotoğraf yolları döner
-- (istemci bunları Storage'dan kaldırır); başkası siliyorsa boş dizi döner.
create or replace function public.community_delete(p_type text, p_id uuid)
returns text[]
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_post public.community_posts;
  v_comment public.community_comments;
  v_msg public.channel_messages;
  v_comm uuid;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_type = 'post' then
    select * into v_post from public.community_posts x where x.id = p_id and x.deleted_at is null;
    if not found then raise exception 'İçerik bulunamadı.'; end if;
    if v_post.author_id <> v_uid and not private.can_moderate(v_post.community_id) then
      raise exception 'Bu içeriği silme yetkin yok.';
    end if;
    update public.community_posts
       set deleted_at = now(), body = '', title = null, images = '{}', hidden = false, accepted_comment_id = null
     where id = p_id;
    update public.community_reports set status = 'removed', resolved_at = now()
     where target_type = 'post' and target_id = p_id and status = 'open';
    return case when v_post.author_id = v_uid then v_post.images else '{}'::text[] end;
  elsif p_type = 'comment' then
    select * into v_comment from public.community_comments x where x.id = p_id and x.deleted_at is null;
    if not found then raise exception 'İçerik bulunamadı.'; end if;
    select community_id into v_comm from public.community_posts where id = v_comment.post_id;
    if v_comment.author_id <> v_uid and not private.can_moderate(v_comm) then
      raise exception 'Bu içeriği silme yetkin yok.';
    end if;
    update public.community_comments set deleted_at = now(), body = '', hidden = false where id = p_id;
    update public.community_posts
       set comment_count = greatest(comment_count - 1, 0),
           accepted_comment_id = case when accepted_comment_id = p_id then null else accepted_comment_id end
     where id = v_comment.post_id;
    update public.community_reports set status = 'removed', resolved_at = now()
     where target_type = 'comment' and target_id = p_id and status = 'open';
    return '{}'::text[];
  elsif p_type = 'message' then
    select * into v_msg from public.channel_messages x where x.id = p_id and x.deleted_at is null;
    if not found then raise exception 'İçerik bulunamadı.'; end if;
    select community_id into v_comm from public.channels where id = v_msg.channel_id;
    if v_msg.author_id <> v_uid and not (private.is_admin() or (v_comm is not null and private.can_moderate(v_comm))) then
      raise exception 'Bu içeriği silme yetkin yok.';
    end if;
    update public.channel_messages set deleted_at = now(), body = '', hidden = false where id = p_id;
    update public.community_reports set status = 'removed', resolved_at = now()
     where target_type = 'message' and target_id = p_id and status = 'open';
    return '{}'::text[];
  end if;
  raise exception 'Geçersiz tür.';
end $$;

-- 9) ŞİKÂYET VE YÖNETİM ----------------------------------------------------------------------------------
create or replace function public.community_report(p_type text, p_id uuid, p_reason text, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_author uuid;
  v_comm uuid;
  v_ok boolean := false;
  v_n integer;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_reason not in ('spam', 'taciz', 'uygunsuz', 'yanlis-bilgi', 'diger') then raise exception 'Geçersiz neden.'; end if;
  if p_type = 'post' then
    select p.author_id, p.community_id into v_author, v_comm from public.community_posts p where p.id = p_id and p.deleted_at is null;
    v_ok := v_comm is not null and private.can_read_community(v_comm);
  elsif p_type = 'comment' then
    select k.author_id, p.community_id into v_author, v_comm
      from public.community_comments k join public.community_posts p on p.id = k.post_id
     where k.id = p_id and k.deleted_at is null and p.deleted_at is null;
    v_ok := v_comm is not null and private.can_read_community(v_comm);
  elsif p_type = 'message' then
    select m.author_id, k.community_id into v_author, v_comm
      from public.channel_messages m join public.channels k on k.id = m.channel_id
     where m.id = p_id and m.deleted_at is null;
    v_ok := v_author is not null and private.can_read_channel((select channel_id from public.channel_messages where id = p_id));
  else
    raise exception 'Geçersiz tür.';
  end if;
  if not v_ok then raise exception 'İçerik bulunamadı.'; end if;
  if v_author = v_uid then raise exception 'Kendi içeriğini şikâyet edemezsin.'; end if;
  if (select count(*) from public.community_reports where reporter = v_uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Bugün çok fazla şikâyet gönderdin.';
  end if;

  insert into public.community_reports (reporter, target_type, target_id, reason, note)
  values (v_uid, p_type, p_id, p_reason, nullif(left(trim(coalesce(p_note, '')), 300), ''))
  on conflict (reporter, target_type, target_id) do nothing;

  -- 3 farklı kişi ya da bir moderatör bildirirse içerik incelenene kadar gizlenir
  select count(distinct reporter) into v_n from public.community_reports
   where target_type = p_type and target_id = p_id and status = 'open';
  if v_n >= 3 or (v_comm is not null and private.can_moderate(v_comm)) then
    if p_type = 'post' then
      update public.community_posts set hidden = true where id = p_id and not mod_reviewed;
    elsif p_type = 'comment' then
      update public.community_comments set hidden = true where id = p_id and not mod_reviewed;
    else
      update public.channel_messages set hidden = true where id = p_id and not mod_reviewed;
    end if;
  end if;
end $$;

create or replace function public.community_admin_reports()
returns table (
  target_type text, target_id uuid, report_count integer, reasons text[], note text, author_id uuid,
  author_name text, preview text, hidden boolean, place text, first_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not private.is_admin() then raise exception 'Bu sayfa için yönetici yetkisi gerekir.'; end if;
  return query
  select u.target_type, u.target_id, u.n, u.reasons, u.note, u.author_id, u.author_name, u.preview, u.hidden, u.place, u.first_at
    from (
      with g as (
        select r.target_type, r.target_id, count(*)::integer as n, array_agg(distinct r.reason) as reasons,
               (array_agg(r.note order by r.created_at) filter (where r.note is not null))[1] as note,
               min(r.created_at) as first_at
          from public.community_reports r where r.status = 'open' group by r.target_type, r.target_id
      )
      select 'post'::text as target_type, p.id as target_id, g.n, g.reasons, g.note, p.author_id, a.name as author_name,
             left(coalesce(p.title || ' — ', '') || p.body, 280) as preview, p.hidden, c.name as place, g.first_at
        from g join public.community_posts p on g.target_type = 'post' and p.id = g.target_id
        join public.profiles a on a.id = p.author_id join public.communities c on c.id = p.community_id
       where p.deleted_at is null
      union all
      select 'comment', k.id, g.n, g.reasons, g.note, k.author_id, a.name, left(k.body, 280), k.hidden, c.name, g.first_at
        from g join public.community_comments k on g.target_type = 'comment' and k.id = g.target_id
        join public.community_posts p on p.id = k.post_id
        join public.profiles a on a.id = k.author_id join public.communities c on c.id = p.community_id
       where k.deleted_at is null
      union all
      select 'message', m.id, g.n, g.reasons, g.note, m.author_id, a.name, left(m.body, 280), m.hidden,
             coalesce(c.name, 'Forum · ' || ch.category), g.first_at
        from g join public.channel_messages m on g.target_type = 'message' and m.id = g.target_id
        join public.channels ch on ch.id = m.channel_id left join public.communities c on c.id = ch.community_id
        join public.profiles a on a.id = m.author_id
       where m.deleted_at is null
    ) u
   order by u.first_at;
end $$;

-- action: 'remove' = içeriği kaldır · 'dismiss' = şikâyetleri reddet ve gizlenmişse geri aç
create or replace function public.community_admin_resolve(p_type text, p_id uuid, p_action text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin() then raise exception 'Bu işlem için yönetici yetkisi gerekir.'; end if;
  if p_type not in ('post', 'comment', 'message') then raise exception 'Geçersiz tür.'; end if;
  if p_action = 'remove' then
    perform public.community_delete(p_type, p_id);
  elsif p_action = 'dismiss' then
    if p_type = 'post' then
      update public.community_posts set hidden = false, mod_reviewed = true where id = p_id;
    elsif p_type = 'comment' then
      update public.community_comments set hidden = false, mod_reviewed = true where id = p_id;
    else
      update public.channel_messages set hidden = false, mod_reviewed = true where id = p_id;
    end if;
    update public.community_reports set status = 'dismissed', resolved_at = now()
     where target_type = p_type and target_id = p_id and status = 'open';
  else
    raise exception 'Geçersiz işlem.';
  end if;
end $$;

-- 10) FORUM: KATEGORİLİ KANALLAR VE GRUP SOHBETLERİ ---------------------------------------------------------
create or replace function public.community_channels(p_community uuid default null)
returns table (
  id uuid, community_id uuid, category text, category_name text, category_sort integer,
  name text, description text, sort integer, last_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  return query
  select k.id, k.community_id, k.category, f.name, f.sort, k.name, k.description, k.sort,
         (select max(m.created_at) from public.channel_messages m where m.channel_id = k.id and m.deleted_at is null)
    from public.channels k
    left join public.forum_categories f on f.slug = k.category
   where (p_community is null and k.community_id is null)
      or (p_community is not null and k.community_id = p_community and private.is_member(p_community))
   order by f.sort nulls last, k.sort, k.name;
end $$;

create or replace function public.channel_get(p_channel uuid)
returns table (
  id uuid, community_id uuid, community_slug text, community_name text, category text, category_name text,
  name text, description text, can_moderate boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  return query
  select k.id, k.community_id, c.slug, c.name, k.category, f.name, k.name, k.description,
         (private.is_admin() or (k.community_id is not null and private.can_moderate(k.community_id)))
    from public.channels k
    left join public.communities c on c.id = k.community_id
    left join public.forum_categories f on f.slug = k.category
   where k.id = p_channel and private.can_read_channel(k.id);
end $$;

create or replace function public.channel_messages_get(p_channel uuid, p_before timestamptz default null, p_limit integer default 40)
returns table (
  id uuid, channel_id uuid, author_id uuid, author_name text, body text, created_at timestamptz,
  deleted boolean, hidden boolean, mine boolean, can_moderate boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_comm uuid;
  v_mod boolean;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if not private.can_read_channel(p_channel) then raise exception 'Sohbet bulunamadı.'; end if;
  select community_id into v_comm from public.channels where id = p_channel;
  v_mod := private.is_admin() or (v_comm is not null and private.can_moderate(v_comm));
  return query
  select m.id, m.channel_id, m.author_id, a.name, m.body, m.created_at, (m.deleted_at is not null), m.hidden,
         (m.author_id = v_uid), v_mod
    from public.channel_messages m
    join public.profiles a on a.id = m.author_id
   where m.channel_id = p_channel
     and (p_before is null or m.created_at < p_before)
     and (m.hidden = false or m.author_id = v_uid or v_mod)
     and (m.author_id = v_uid or not private.is_blocked_between(v_uid, m.author_id))
   order by m.created_at desc
   limit least(greatest(coalesce(p_limit, 40), 1), 100);
end $$;

create or replace function public.channel_send(p_channel uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_body text := trim(coalesce(p_body, ''));
  v_id uuid;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if v_body = '' or char_length(v_body) > 1500 then raise exception 'Mesaj 1 ile 1500 karakter arasında olmalı.'; end if;
  if not private.can_read_channel(p_channel) then raise exception 'Sohbet bulunamadı.'; end if;
  if (select count(*) from public.channel_messages where author_id = v_uid and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Çok hızlı yazıyorsun. Birkaç saniye bekle.';
  end if;
  insert into public.channel_messages (channel_id, author_id, body) values (p_channel, v_uid, v_body) returning id into v_id;
  return v_id;
end $$;

create or replace function public.community_create_channel(p_community uuid, p_name text, p_description text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  if not private.can_moderate(p_community) then raise exception 'Kanal açmak için yetkin yok.'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 40 then raise exception 'Kanal adı 2 ile 40 karakter arasında olmalı.'; end if;
  if (select count(*) from public.channels where community_id = p_community) >= 8 then
    raise exception 'Bir toplulukta en fazla 8 kanal olabilir.';
  end if;
  insert into public.channels (community_id, name, description, created_by)
  values (p_community, v_name, nullif(left(trim(coalesce(p_description, '')), 140), ''), auth.uid())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Bu adda bir kanal zaten var.';
end $$;

-- 11) İLK VERİLER: genel topluluk, bölüm/sınıf toplulukları, forum kategorileri ve kanalları ---------------------
-- Bölüm adları src/lib/scheduleData.ts içindeki iibfPrograms ile aynı olmalı.
insert into public.communities (slug, kind, name, description, is_official) values
  ('bigova-kampus', 'general', 'Bigova Kampüs', 'Biga''daki tüm öğrencilerin ortak alanı: duyurular, sorular, paylaşımlar.', true)
on conflict (slug) do nothing;

insert into public.communities (slug, kind, name, description, department, is_official)
select v.slug, 'department', v.name, v.name || ' öğrencilerinin topluluğu.', v.name, true
  from (values
    ('calisma-ekonomisi', 'Çalışma Ekonomisi ve Endüstri İlişkileri'),
    ('ekonometri', 'Ekonometri'),
    ('iktisat', 'İktisat'),
    ('isletme', 'İşletme'),
    ('kamu-yonetimi', 'Kamu Yönetimi'),
    ('maliye', 'Maliye'),
    ('uluslararasi-iliskiler', 'Uluslararası İlişkiler'),
    ('biga-myo', 'Biga MYO')
  ) as v(slug, name)
on conflict (slug) do nothing;

insert into public.communities (slug, kind, name, description, department, grade, is_official)
select d.slug || '-' || g || '-sinif', 'class', d.name || ' · ' || g || '. sınıf',
       d.name || ' ' || g || '. sınıf öğrencilerinin topluluğu.', d.name, g, true
  from public.communities d, generate_series(1, 4) g
 where d.kind = 'department' and not (d.slug = 'biga-myo' and g > 2)
on conflict (slug) do nothing;

-- Varsayılan "Sohbet" kanalı tetikleyiciden sonra eklenen topluluklar için otomatik oluşur;
-- yukarıdakiler tetikleyici zaten varken eklendiği için hazırdır. Eksik kalan varsa tamamla:
insert into public.channels (community_id, name, description, is_official)
select c.id, 'Sohbet', 'Topluluğun genel sohbeti', true from public.communities c
 where not exists (select 1 from public.channels k where k.community_id = c.id)
on conflict do nothing;

-- Mevcut tüm öğrenciler genel topluluğa katılır
insert into public.community_members (community_id, user_id, via_profile)
select c.id, p.id, true from public.communities c cross join public.profiles p
 where c.slug = 'bigova-kampus'
on conflict do nothing;

insert into public.forum_categories (slug, name, blurb, sort) values
  ('genel', 'Genel Sohbet', 'Tanış, sohbet et, gündemi konuş', 1),
  ('ders', 'Ders ve Sınav', 'Ders yardımı, sınav hazırlığı, hoca ve program', 2),
  ('kampus', 'Kampüs Yaşamı', 'Yemekhane, kütüphane, kampüs ve şehir', 3),
  ('barinma', 'Barınma ve Ev Arkadaşı', 'Yurt, ev, ev arkadaşı arayışı', 4),
  ('ulasim', 'Ulaşım', 'Otobüs, servis, yol arkadaşlığı', 5),
  ('kariyer', 'Staj ve Kariyer', 'Staj, iş, CV ve mülakat', 6),
  ('etkinlik', 'Etkinlik ve Kulüpler', 'Kulüpler, etkinlikler, gönüllülük', 7),
  ('spor', 'Spor', 'Maçlar, spor salonu, halı saha', 8),
  ('teknoloji', 'Teknoloji ve Oyun', 'Yazılım, donanım, oyun', 9),
  ('eglence', 'Müzik, Film ve Eğlence', 'Dizi, film, müzik, hobi', 10)
on conflict (slug) do update set name = excluded.name, blurb = excluded.blurb, sort = excluded.sort;

insert into public.channels (category, name, description, is_official, sort)
select v.category, v.name, v.descr, true, v.sort
  from (values
    ('genel', 'Hoş geldin', 'Kendini tanıt, yeni arkadaşlarla tanış', 1),
    ('genel', 'Günün konusu', 'Bugün ne konuşuyoruz?', 2),
    ('ders', 'Ders yardımı', 'Anlamadığın konuyu sor, birlikte çözelim', 1),
    ('ders', 'Sınav haftası', 'Vize ve final hazırlığı, motivasyon', 2),
    ('ders', 'Not ve kaynak paylaşımı', 'Ders notu, özet ve kaynak önerileri', 3),
    ('kampus', 'Yemekhane ve kafeler', 'Nerede ne yenir, fiyatlar', 1),
    ('kampus', 'Kampüste yaşam', 'Kütüphane, etkinlik alanları, ipuçları', 2),
    ('barinma', 'Yurt ve ev', 'Kiralık ev, yurt deneyimleri', 1),
    ('barinma', 'Ev arkadaşı arıyorum', 'Ev arkadaşı ilanları', 2),
    ('ulasim', 'Otobüs ve servis', 'Hat, saat ve gecikme bilgileri', 1),
    ('kariyer', 'Staj arayanlar', 'Staj ilanları ve tecrübeler', 1),
    ('kariyer', 'CV ve mülakat', 'CV hazırlama, mülakat hazırlığı', 2),
    ('etkinlik', 'Kulüpler', 'Kulüp duyuruları ve tanışma', 1),
    ('etkinlik', 'Etkinlik duyuruları', 'Kampüs ve şehir etkinlikleri', 2),
    ('spor', 'Halı saha ve takımlar', 'Takım kur, maç ayarla', 1),
    ('teknoloji', 'Yazılım ve teknoloji', 'Kod, donanım, yapay zekâ', 1),
    ('teknoloji', 'Oyun', 'Oyun sohbeti ve takım arayışı', 2),
    ('eglence', 'Müzik', 'Dinlediklerini paylaş', 1),
    ('eglence', 'Dizi ve film', 'Ne izliyoruz?', 2)
  ) as v(category, name, descr, sort)
on conflict do nothing;

-- 12) YETKİLER: yalnızca giriş yapanlar fonksiyonları çağırabilir -------------------------------------------
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
