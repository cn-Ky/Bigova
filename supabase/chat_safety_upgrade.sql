-- ============================================================================
-- Sohbet güvenliği: MESAJ SİLME + KULLANICI ENGELLEME
-- Supabase > SQL Editor'de TEK SEFERDE çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: schema.sql, friends_upgrade.sql, social_marketplace_upgrade.sql,
--          bigova_v3_upgrade.sql ve profiles_upgrade.sql çalıştırılmış olmalı.
--
-- MESAJ SİLME ("herkesten sil")
--  * Yalnızca mesajı GÖNDEREN silebilir. Silinen mesajın metni veritabanından gerçekten
--    temizlenir (body = ''), karşı tarafta "Bu mesaj silindi" yer tutucusu kalır.
--  * İstemci messages tablosunu doğrudan güncelleyemez; silme public.delete_message(...)
--    fonksiyonundan geçer (başkasının mesajı silinemez, düzenleme yoktur).
--
-- ENGELLEME
--  * A, B'yi engelleyince: aralarındaki arkadaşlık/istek ve mesaj serisi silinir.
--  * Engel iki yönde de etki eder: B, A'ya mesaj yazamaz, istek gönderemez; A ile B
--    birbirini arama/öneri listelerinde görmez; B, A'nın profil kartını açamaz.
--  * B engellendiğini görmez ("bulunamadı/gönderilemedi" gibi genel hatalar alır).
--  * Engeli yalnızca engelleyen kaldırır. Kaldırınca arkadaşlık geri gelmez.
-- ============================================================================

-- 1) MESAJ SİLME --------------------------------------------------------------
alter table public.messages add column if not exists deleted_at timestamptz;

-- Silinmiş mesajın gövdesi boş olabilir; diğerleri 1-2000 karakter kalır.
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check
  check (
    (deleted_at is not null and char_length(body) <= 2000)
    or (deleted_at is null and char_length(body) between 1 and 2000)
  );

create or replace function public.delete_message(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  update public.messages
     set body = '', deleted_at = now()
   where id = p_id and from_id = auth.uid() and deleted_at is null;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Bu mesaj silinemedi.'; end if;
end $$;
revoke all on function public.delete_message(uuid) from public, anon;
grant execute on function public.delete_message(uuid) to authenticated;

-- Realtime'ta UPDATE olayları (silme) karşı tarafa anında ulaşsın
do $$ begin
  begin alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null; end;
end $$;

-- 2) ENGELLEME TABLOSU -------------------------------------------------------
create table if not exists public.user_blocks (
  blocker uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  blocked uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked);

alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon, authenticated;
grant select on public.user_blocks to authenticated;
drop policy if exists "blocks: engelleyen okur" on public.user_blocks;
-- Yalnızca engelleyen kendi listesini okur; engellenen kişi bunu GÖREMEZ.
create policy "blocks: engelleyen okur" on public.user_blocks for select to authenticated using (blocker = auth.uid());

-- İki kişi arasında (hangi yönde olursa olsun) engel var mı? RLS'i aşar, istemciye açılmaz.
create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.user_blocks
     where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  )
$$;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- 3) ENGELLE / KALDIR / LİSTE --------------------------------------------------
create or replace function public.block_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_user is null or p_user = v_uid then raise exception 'Kendini engelleyemezsin.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Kullanıcı bulunamadı.'; end if;

  insert into public.user_blocks (blocker, blocked) values (v_uid, p_user) on conflict do nothing;

  -- arkadaşlık / bekleyen istek (iki yön) ve ortak mesaj serisi silinir
  delete from public.friendships
   where (requester = v_uid and addressee = p_user) or (requester = p_user and addressee = v_uid);
  delete from public.friendship_streaks
   where user_a = least(v_uid, p_user) and user_b = greatest(v_uid, p_user);
end $$;

create or replace function public.unblock_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  delete from public.user_blocks where blocker = auth.uid() and blocked = p_user;
end $$;

create or replace function public.list_blocked()
returns table (id uuid, name text, blocked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.blocked, p.name, b.created_at
    from public.user_blocks b
    join public.profiles p on p.id = b.blocked
   where b.blocker = auth.uid()
   order by b.created_at desc
$$;

revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
revoke all on function public.list_blocked() from public, anon;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.list_blocked() to authenticated;

-- 4) ENGELİN UYGULANDIĞI YERLER ------------------------------------------------
-- 4a) Mesaj yazma: yalnızca arkadaşa VE engel yoksa
drop policy if exists "msg: sadece arkadasa yazar" on public.messages;
create policy "msg: sadece arkadasa yazar" on public.messages for insert to authenticated
  with check (
    from_id = auth.uid()
    and public.are_friends(from_id, to_id)
    and not public.is_blocked_between(from_id, to_id)
  );

-- 4b) Arkadaşlık isteği: engel varsa gönderilemez
drop policy if exists "friends: istek gonderir" on public.friendships;
create policy "friends: istek gonderir" on public.friendships for insert to authenticated
  with check (
    requester = auth.uid()
    and status = 'pending'
    and not public.is_blocked_between(requester, addressee)
  );

-- 4c) Arama ve öneriler: engelli kişiler iki yönde de görünmez
create or replace function public.search_people(term text, max_results int default 8)
returns table (id uuid, name text)
language sql stable security invoker set search_path = public as $$
  with q as (
    select replace(replace(replace(public.tr_norm(trim(term)), '\', '\\'), '%', '\%'), '_', '\_') as t
  )
  select p.id, p.name
  from public.profiles p, q
  where p.id <> auth.uid()
    and p.name <> ''
    and q.t <> ''
    and not public.is_blocked_between(auth.uid(), p.id)
    and (public.tr_norm(p.name) like q.t || '%' escape '\'
      or public.tr_norm(p.name) like '% ' || q.t || '%' escape '\')
  order by (public.tr_norm(p.name) like q.t || '%' escape '\') desc, p.name
  limit least(greatest(max_results, 1), 20)
$$;

create or replace function public.suggest_people(max_results int default 6)
returns table (id uuid, name text)
language sql stable security invoker set search_path = public as $$
  select p.id, p.name
  from public.profiles p
  where p.id <> auth.uid()
    and p.name <> ''
    and not public.is_blocked_between(auth.uid(), p.id)
    and not exists (
      select 1 from public.friendships f
      where (f.requester = auth.uid() and f.addressee = p.id)
         or (f.addressee = auth.uid() and f.requester = p.id))
  order by p.created_at desc nulls last
  limit least(greatest(max_results, 1), 20)
$$;

revoke execute on function public.search_people(text, int) from public, anon;
revoke execute on function public.suggest_people(int) from public, anon;
grant execute on function public.search_people(text, int) to authenticated;
grant execute on function public.suggest_people(int) to authenticated;

-- 4d) Profil kartı: seni engelleyen kişinin profili "bulunamadı" görünür
--     (engelleyen kendi engellediği kişinin profilini görmeye devam eder, engeli kaldırabilsin)
create or replace function public.profile_card(p_id uuid)
returns table (id uuid, name text, avatar jsonb, friend_count integer, relation text, joined timestamptz, locked boolean)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.name,
    case when public.can_see_profile(p.id)
         then public.bigocuk_default_avatar() || coalesce(w.avatar, '{}'::jsonb)
         else public.bigocuk_default_avatar() end,
    case when public.can_see_profile(p.id)
         then (select count(*)::integer from public.friendships f
                 where f.status = 'accepted' and p.id in (f.requester, f.addressee))
         else 0 end,
    case
      when p.id = auth.uid() then 'self'
      when exists (select 1 from public.friendships f
                    where f.status = 'accepted'
                      and ((f.requester = auth.uid() and f.addressee = p.id)
                        or (f.addressee = auth.uid() and f.requester = p.id))) then 'friend'
      when exists (select 1 from public.friendships f
                    where f.status = 'pending' and f.requester = auth.uid() and f.addressee = p.id) then 'outgoing'
      when exists (select 1 from public.friendships f
                    where f.status = 'pending' and f.addressee = auth.uid() and f.requester = p.id) then 'incoming'
      else 'none'
    end,
    p.created_at,
    not public.can_see_profile(p.id)
  from public.profiles p
  left join public.bigocuk_wallets w on w.user_id = p.id
  where auth.uid() is not null
    and p.id = p_id
    and not exists (select 1 from public.user_blocks b where b.blocker = p.id and b.blocked = auth.uid())
$$;
revoke execute on function public.profile_card(uuid) from public, anon;
grant execute on function public.profile_card(uuid) to authenticated;

-- 4e) Okunmamış mesaj özeti: silinen mesajlar ve engellenen kişiler sayılmaz
create or replace function public.unread_summary()
returns table (friend_id uuid, name text, unread integer, last_body text, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  with unread as (
    select m.from_id, count(*)::integer as n, max(m.created_at) as last_at
      from public.messages m
      left join public.message_reads r on r.user_id = auth.uid() and r.friend_id = m.from_id
     where m.to_id = auth.uid()
       and m.deleted_at is null
       and not public.is_blocked_between(auth.uid(), m.from_id)
       and m.created_at > coalesce(r.last_read_at, now() - interval '3 days')
     group by m.from_id
  )
  select u.from_id, p.name, u.n,
         (select m2.body from public.messages m2
           where m2.from_id = u.from_id and m2.to_id = auth.uid() and m2.deleted_at is null
           order by m2.created_at desc limit 1),
         u.last_at
    from unread u
    join public.profiles p on p.id = u.from_id
   where auth.uid() is not null
   order by u.last_at desc
$$;
revoke all on function public.unread_summary() from public, anon;
grant execute on function public.unread_summary() to authenticated;

notify pgrst, 'reload schema';
