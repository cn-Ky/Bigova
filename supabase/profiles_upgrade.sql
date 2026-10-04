-- ============================================================================
-- Profil sayfaları + herkese görünen avatarlar + profil gizliliği
-- Supabase > SQL Editor'de bir kez çalıştırın (tekrar çalıştırmak güvenlidir).
-- Önkoşul: schema.sql, friends_upgrade.sql, social_marketplace_upgrade.sql ve
-- bigocuk_upgrade.sql daha önce çalıştırılmış olmalı.
--
-- Güvenlik: bigocuk_wallets (coin, adım) hâlâ yalnızca sahibine açık.
-- Başkaları SADECE aşağıdaki fonksiyonlarla avatar görünümünü okuyabilir.
-- ============================================================================

-- 0) Gizlilik ayarı: 'everyone' = herkes görür, 'friends' = sadece arkadaşlar
alter table public.profiles add column if not exists privacy text not null default 'everyone';
alter table public.profiles drop constraint if exists profiles_privacy_check;
alter table public.profiles add constraint profiles_privacy_check check (privacy in ('everyone','friends'));

-- 1) Bu profili görebilir miyim? (kendim, arkadaşım ya da herkese açık)
create or replace function public.can_see_profile(p_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles p
    where p.id = p_id
      and (p.privacy = 'everyone' or p.id = auth.uid() or public.are_friends(p.id, auth.uid()))
  )
$$;

-- 2) Avatar okuma (gizli profillerin satırı hiç dönmez)
drop function if exists public.get_avatars(uuid[]);
create or replace function public.get_avatars(p_ids uuid[])
returns table (id uuid, avatar jsonb)
language sql stable security definer set search_path = public as $$
  select p.id, public.bigocuk_default_avatar() || coalesce(w.avatar, '{}'::jsonb)
  from public.profiles p
  left join public.bigocuk_wallets w on w.user_id = p.id
  where auth.uid() is not null
    and p.id = any (p_ids[1:100])
    and public.can_see_profile(p.id)
$$;

-- 3) Profil kartı
drop function if exists public.profile_card(uuid);
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
  where auth.uid() is not null and p.id = p_id
$$;

-- 4) Ortak arkadaş sayısı
create or replace function public.mutual_friend_count(p_id uuid)
returns integer
language sql stable security definer set search_path = public as $$
  with mine as (
    select case when requester = auth.uid() then addressee else requester end as fid
    from public.friendships
    where status = 'accepted' and auth.uid() in (requester, addressee)
  ), theirs as (
    select case when requester = p_id then addressee else requester end as fid
    from public.friendships
    where status = 'accepted' and p_id in (requester, addressee)
  )
  select case when public.can_see_profile(p_id) then (select count(*)::integer from mine join theirs using (fid)) else 0 end
$$;

-- 5) Gizlilik ayarını değiştir
create or replace function public.set_profile_privacy(p_value text)
returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  if p_value not in ('everyone','friends') then raise exception 'Geçersiz değer.'; end if;
  update public.profiles set privacy = p_value where id = auth.uid();
  return p_value;
end $$;

-- 6) Yetkiler
revoke execute on function public.can_see_profile(uuid) from public, anon;
revoke execute on function public.get_avatars(uuid[]) from public, anon;
revoke execute on function public.profile_card(uuid) from public, anon;
revoke execute on function public.mutual_friend_count(uuid) from public, anon;
revoke execute on function public.set_profile_privacy(text) from public, anon;
grant execute on function public.can_see_profile(uuid) to authenticated;
grant execute on function public.get_avatars(uuid[]) to authenticated;
grant execute on function public.profile_card(uuid) to authenticated;
grant execute on function public.mutual_friend_count(uuid) to authenticated;
grant execute on function public.set_profile_privacy(text) to authenticated;
