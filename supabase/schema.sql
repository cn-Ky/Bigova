-- Supabase > SQL Editor'de tek seferde çalıştır.
-- 1) Sadece okul maili ile kayıt (veritabanı düzeyinde)
create or replace function public.enforce_school_mail() returns trigger language plpgsql as $$
begin
  if new.email is null or new.email !~* '^[0-9]{6,12}@ogr\.comu\.edu\.tr$' then
    raise exception 'Sadece ogrencinumarasi@ogr.comu.edu.tr adresi ile kayit olunabilir.';
  end if;
  return new;
end $$;
drop trigger if exists school_mail_only on auth.users;
create trigger school_mail_only before insert on auth.users for each row execute function public.enforce_school_mail();

-- 2) Tablolar
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  student_no text unique not null, name text not null default '', created_at timestamptz default now());
create table public.businesses (
  id uuid primary key default gen_random_uuid(), name text not null, category text not null,
  phone text, price_info text, has_toilet boolean default false, opens_at text, closes_at text,
  address text, lat double precision, lng double precision);
create table public.transport_routes (
  id uuid primary key default gen_random_uuid(), name text not null, type text not null, destination text not null,
  first_departure text, last_departure text, price numeric, stops text[]);
create table public.notes (
  id uuid primary key default gen_random_uuid(), title text not null, course text not null, file_path text not null,
  author_id uuid not null references public.profiles on delete cascade default auth.uid(), created_at timestamptz default now());
create table public.friendships (
  requester uuid not null references public.profiles on delete cascade default auth.uid(),
  addressee uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  primary key (requester, addressee), check (requester <> addressee));
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles on delete cascade default auth.uid(),
  to_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000), created_at timestamptz default now());
create table public.user_locations (
  user_id uuid primary key references public.profiles on delete cascade default auth.uid(),
  lat double precision not null, lng double precision not null,
  shared boolean default false, updated_at timestamptz default now());
create table public.magazines (
  id uuid primary key default gen_random_uuid(), title text not null, issue text, pdf_path text not null, cover_path text);

-- 3) Yeni kullanıcı -> profil
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, student_no, name)
  values (new.id, split_part(new.email,'@',1), coalesce(new.raw_user_meta_data->>'name',''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 4) Arkadaş kontrolü
create or replace function public.are_friends(a uuid, b uuid) returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from friendships where status='accepted'
    and ((requester=a and addressee=b) or (requester=b and addressee=a)));
$$;

-- 5) RLS
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.transport_routes enable row level security;
alter table public.notes enable row level security;
alter table public.friendships enable row level security;
alter table public.messages enable row level security;
alter table public.user_locations enable row level security;
alter table public.magazines enable row level security;

create policy "profiles: giris yapan okur" on public.profiles for select to authenticated using (true);
create policy "profiles: kendini gunceller" on public.profiles for update to authenticated using (id = auth.uid());
create policy "businesses: herkes okur" on public.businesses for select using (true);
create policy "transport: herkes okur" on public.transport_routes for select using (true);
create policy "magazines: herkes okur" on public.magazines for select using (true);
create policy "notes: giris yapan okur" on public.notes for select to authenticated using (true);
create policy "notes: kendi ekler" on public.notes for insert to authenticated with check (author_id = auth.uid());
create policy "notes: kendi siler" on public.notes for delete to authenticated using (author_id = auth.uid());
create policy "friends: taraflar okur" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
create policy "friends: istek gonderir" on public.friendships for insert to authenticated with check (requester = auth.uid() and status = 'pending');
create policy "friends: alici kabul eder" on public.friendships for update to authenticated using (addressee = auth.uid()) with check (status = 'accepted');
create policy "friends: taraflar siler" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));
create policy "msg: taraflar okur" on public.messages for select to authenticated using (auth.uid() in (from_id, to_id));
create policy "msg: sadece arkadasa yazar" on public.messages for insert to authenticated with check (from_id = auth.uid() and public.are_friends(from_id, to_id));
create policy "loc: kendi yazar" on public.user_locations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "loc: arkadas okur" on public.user_locations for select to authenticated using (shared and public.are_friends(user_id, auth.uid()));

-- 6) Realtime
alter publication supabase_realtime add table public.messages, public.user_locations;

-- 7) Depolama: notlar (özel, giriş gerekli) ve dergiler (herkese açık okuma)
insert into storage.buckets (id, name, public) values ('notes','notes',false), ('magazines','magazines',true) on conflict do nothing;
create policy "notes dosya: giris yapan okur" on storage.objects for select to authenticated using (bucket_id = 'notes');
create policy "notes dosya: kendi klasorune yukler" on storage.objects for insert to authenticated
  with check (bucket_id = 'notes' and (storage.foldername(name))[1] = auth.uid()::text);

-- 8) Örnek veri
insert into public.businesses (name, category, phone, price_info, has_toilet, opens_at, closes_at) values
 ('Örnek Kafe','Kafe','0286 000 00 00','Çay 15 TL',true,'08:00','23:00'),
 ('Örnek Kırtasiye','Kırtasiye',null,'Fotokopi 1 TL',false,'09:00','19:00');
