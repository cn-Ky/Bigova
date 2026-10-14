-- ============================================================================
-- Anketler v2: Bigocuk'a taşındı. Gerçek veri, Bigcoin ödülü, yüzdelik haftalık sonuçlar.
-- Supabase > SQL Editor'de çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: polls_upgrade.sql ve bigocuk_upgrade.sql çalıştırılmış olmalı.
--
-- Kurallar (hepsi veritabanında denetlenir, istemciye güvenilmez):
--   * Yalnızca giriş yapmış VE e-postası doğrulanmış hesaplar oy verebilir (poll_vote).
--   * Her hesap her ankete yalnızca bir kez oy verir; her geçerli oy 1 Bigcoin kazandırır.
--   * Oylar isimsizdir: kimse başkasının oyunu göremez (yönetici dahil), sonuçlar yalnızca YÜZDE olarak çıkar.
--   * Sonuçlar haftalıktır: bir haftanın anket sonuçları o hafta BİTİNCE herkese (girişsiz dahil) açılır.
--   * Bir haftada birden fazla anket yayımlanabilir (her biri ayrı oy ve ayrı 1 Bigcoin).
--   * Anketi yalnızca app_metadata.role = 'admin' olan hesap yayımlayabilir (poll_publish).
-- ============================================================================

-- 1) Bir haftada birden fazla ankete izin ver -----------------------------------
alter table public.weekly_polls drop constraint if exists weekly_polls_week_start_key;
create index if not exists weekly_polls_week_idx on public.weekly_polls (week_start desc);

-- 2) Ödül kaynağı: her anket oyu = 1 Bigcoin (günlük en fazla 20 anket) ---------
insert into public.bigocuk_earn_sources (source, label, coins, daily_limit, active)
values ('poll_vote', 'Anket doldurma', 1, 20, true)
on conflict (source) do update set label = excluded.label, coins = excluded.coins, active = true;

-- 3) Yetkiler: istemci artık tablolara doğrudan YAZAMAZ ---------------------------
-- Anketleri herkes (girişsiz dahil) görür; yalnızca başlamış haftalar listelenir.
drop policy if exists "poll herkes okur" on public.weekly_polls;
create policy "poll herkes okur" on public.weekly_polls for select to anon, authenticated
  using (week_start <= public.bigocuk_today());

drop policy if exists "poll admin olusturur" on public.weekly_polls;
revoke insert on public.weekly_polls from authenticated;

drop policy if exists "kullanici haftada bir oy verir" on public.poll_votes;
revoke insert on public.poll_votes from authenticated;
-- poll_votes: herkes yalnızca KENDİ oyunu okuyabilir ("kullanici kendi oyununu okur" politikası aynen kalır).

-- 4) Eski sonuç fonksiyonları (sayı döndürüyordu) kaldırılır ---------------------
drop function if exists public.get_weekly_poll_results(uuid);
drop function if exists public.get_my_weekly_poll_vote(uuid);

-- 5) Yönetici: bu haftaya anket yayımla ---------------------------------------
create or replace function public.poll_publish(p_question text, p_options jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_start date := date_trunc('week', public.bigocuk_today())::date; -- haftanın pazartesisi (İstanbul saati)
  v_q text := trim(coalesce(p_question, ''));
  v_opts jsonb;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Anket yayımlamak için yönetici yetkisi gerekir.';
  end if;
  if char_length(v_q) not between 5 and 240 then raise exception 'Soru 5–240 karakter olmalı.'; end if;
  if jsonb_typeof(p_options) is distinct from 'array' or jsonb_array_length(p_options) not between 2 and 8 then
    raise exception '2–8 seçenek gerekli.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_options) o
     where jsonb_typeof(o) <> 'string' or char_length(trim(o #>> '{}')) not between 1 and 80
  ) then raise exception 'Her seçenek 1–80 karakterlik metin olmalı.'; end if;

  select jsonb_agg(to_jsonb(trim(o.val #>> '{}')) order by o.ord) into v_opts
    from jsonb_array_elements(p_options) with ordinality as o(val, ord);
  if (select count(distinct lower(x #>> '{}')) from jsonb_array_elements(v_opts) x) <> jsonb_array_length(v_opts) then
    raise exception 'Seçenekler birbirinden farklı olmalı.';
  end if;

  insert into public.weekly_polls (week_start, week_end, question, options, created_by)
  values (v_start, v_start + 6, v_q, v_opts, v_uid)
  returning id into v_id;
  return v_id;
end $$;

-- 6) Oy ver: doğrula, kaydet, 1 Bigcoin yaz (tek işlemde) -----------------------
-- status: ok = oy kaydedildi (earned = kazanılan Bigcoin; günlük sınır dolduysa 0)
--         already = bu ankete zaten oy verilmişti (hiçbir şey değişmez)
create or replace function public.poll_vote(p_poll_id uuid, p_option integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_confirmed timestamptz;
  p public.weekly_polls;
  v_earned integer := 0;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;

  select u.email_confirmed_at into v_confirmed from auth.users u where u.id = v_uid;
  if v_confirmed is null then raise exception 'Oy vermek için e-posta adresini doğrulamalısın.'; end if;

  select * into p from public.weekly_polls where id = p_poll_id;
  if not found or public.bigocuk_today() not between p.week_start and p.week_end then
    raise exception 'Bu anket şu an oylamaya açık değil.';
  end if;
  if p_option is null or p_option < 0 or p_option >= jsonb_array_length(p.options) then
    raise exception 'Geçersiz seçenek.';
  end if;

  perform public.bigocuk_ensure_wallet();

  insert into public.poll_votes (poll_id, voter_id, option_index)
  values (p_poll_id, v_uid, p_option)
  on conflict (poll_id, voter_id) do nothing;

  if not found then
    return jsonb_build_object('status', 'already', 'earned', 0) || public.bigocuk_build_state(v_uid);
  end if;

  v_earned := public.bigocuk_grant(v_uid, 'poll_vote');
  return jsonb_build_object('status', 'ok', 'earned', v_earned) || public.bigocuk_build_state(v_uid);
end $$;

-- 7) Haftalık sonuçlar: YALNIZCA yüzde, yalnızca bitmiş haftalar -----------------
-- Oy sayısı ve oy verenler hiçbir yoldan döndürülmez. Henüz bitmemiş haftanın anketleri için satır dönmez.
create or replace function public.get_poll_results(p_poll_ids uuid[])
returns table(poll_id uuid, option_index smallint, percent integer)
language sql security definer stable set search_path = public as $$
  with closed as (
    select p.id, p.options from public.weekly_polls p
     where p.id = any (p_poll_ids) and p.week_end < public.bigocuk_today()
  ),
  counts as (
    select c.id as poll_id, (o.ord - 1)::smallint as option_index, count(v.id) as n
      from closed c
      cross join lateral jsonb_array_elements(c.options) with ordinality as o(val, ord)
      left join public.poll_votes v on v.poll_id = c.id and v.option_index = o.ord - 1
     group by c.id, o.ord
  )
  select poll_id, option_index,
         case when sum(n) over (partition by poll_id) = 0 then 0
              else round(100.0 * n / sum(n) over (partition by poll_id))::integer end
    from counts
$$;

-- 8) Yetkiler -------------------------------------------------------------------
revoke all on function public.poll_publish(text, jsonb) from public, anon;
revoke all on function public.poll_vote(uuid, integer) from public, anon;
revoke all on function public.get_poll_results(uuid[]) from public;
grant execute on function public.poll_publish(text, jsonb) to authenticated;
grant execute on function public.poll_vote(uuid, integer) to authenticated;
grant execute on function public.get_poll_results(uuid[]) to anon, authenticated; -- sonuçlar herkese açık (yalnızca yüzde)

-- PostgREST'in fonksiyon önbelleğini yenile
notify pgrst, 'reload schema';
