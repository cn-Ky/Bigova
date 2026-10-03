-- Arkadaşlar: anlık arama önerileri, istek/mesaj altyapısı düzeltmeleri.
-- Supabase > SQL Editor'de bir kez çalıştırın (tekrar çalıştırmak güvenlidir).

-- 0) Profil tablosu hazırlığı (auth_open_signup.sql çalıştırılmadıysa da sorun olmasın)
alter table public.profiles alter column student_no drop not null;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;

-- 1) Profili olmayan kullanıcılar için profil oluştur (aranamayan/istek atılamayan hesapları düzeltir)
insert into public.profiles (id, student_no, name, first_name, last_name)
select u.id, null,
  coalesce(nullif(trim(concat_ws(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name')), ''), u.raw_user_meta_data->>'name', ''),
  nullif(trim(coalesce(u.raw_user_meta_data->>'first_name','')), ''),
  nullif(trim(coalesce(u.raw_user_meta_data->>'last_name','')), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;

-- 2) Türkçe karakterlere duyarsız karşılaştırma (İ/I/ı -> i, ğ->g, ü->u, ş->s, ö->o, ç->c)
create or replace function public.tr_norm(t text) returns text language sql immutable as $$
  select lower(translate(coalesce(t,''), 'İIıĞğÜüŞşÖöÇç', 'iiiggguussoocc'))
$$;

-- 3) Anlık arama: ismin veya soyismin başı eşleşir ("C", "Ca", "Can" ...)
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
    and (public.tr_norm(p.name) like q.t || '%' escape '\'
      or public.tr_norm(p.name) like '% ' || q.t || '%' escape '\')
  order by (public.tr_norm(p.name) like q.t || '%' escape '\') desc, p.name
  limit least(greatest(max_results, 1), 20)
$$;

-- 4) Önerilen kişiler: henüz bağlantın olmayan en yeni üyeler
create or replace function public.suggest_people(max_results int default 6)
returns table (id uuid, name text)
language sql stable security invoker set search_path = public as $$
  select p.id, p.name
  from public.profiles p
  where p.id <> auth.uid()
    and p.name <> ''
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

-- 5) Karşılıklı çift isteği engelle (A->B ve B->A aynı anda olamaz)
delete from public.friendships f using public.friendships g
where f.requester = g.addressee and f.addressee = g.requester
  and ((f.status = 'pending' and g.status = 'accepted')
    or (f.status = g.status and f.requester > f.addressee));
create unique index if not exists friendships_pair_uniq
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

-- 6) Mesaj sorguları için indeks
create index if not exists messages_pair_idx on public.messages (from_id, to_id, created_at desc);

-- 7) Canlı güncelleme (istek ve mesajlar anında görünsün)
do $$ begin
  begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
end $$;
