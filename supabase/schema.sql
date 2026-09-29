-- Supabase > SQL Editor'a yapıştırıp çalıştır.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  department text,
  created_at timestamptz default now()
);

create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  address text,
  price_level int check (price_level between 1 and 3) default 1,
  hours text,
  phone text,
  instagram text,
  has_toilet boolean default false,
  student_friendly boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table business_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  name text not null,
  price numeric not null
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique (business_id, user_id)
);

create table book_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  course text,
  department text,
  price numeric not null,
  condition text default 'İyi',
  contact text not null,               -- telefon / Instagram
  status text default 'active' check (status in ('active','sold')),
  created_at timestamptz default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  course text,
  department text,
  year text,
  type text default 'Ders notu',
  file_path text,                      -- storage bucket: materials
  created_at timestamptz default now()
);

-- Kayıt: sadece üniversite e-postası. Alan adını kendi okulunuza göre doğrulayın.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email not like '%comu.edu.tr' then
    raise exception 'Sadece üniversite e-postası ile kayıt olunabilir';
  end if;
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table businesses enable row level security;
alter table business_items enable row level security;
alter table reviews enable row level security;
alter table book_listings enable row level security;
alter table notes enable row level security;

create policy "herkes okur" on profiles for select using (true);
create policy "kendi profili" on profiles for update using (auth.uid() = id);

create policy "herkes okur" on businesses for select using (true);
create policy "herkes okur" on business_items for select using (true);
create policy "herkes okur" on reviews for select using (true);
create policy "herkes okur" on book_listings for select using (true);
create policy "herkes okur" on notes for select using (true);

create policy "üye yorum ekler" on reviews for insert with check (auth.uid() = user_id);
create policy "yorumunu siler" on reviews for delete using (auth.uid() = user_id);
create policy "üye ilan ekler" on book_listings for insert with check (auth.uid() = seller_id);
create policy "ilanını günceller" on book_listings for update using (auth.uid() = seller_id);
create policy "ilanını siler" on book_listings for delete using (auth.uid() = seller_id);
create policy "üye not ekler" on notes for insert with check (auth.uid() = author_id);
create policy "notunu siler" on notes for delete using (auth.uid() = author_id);
-- İşletme ekleme/düzenleme şimdilik sadece dashboard'dan (admin) yapılır.
