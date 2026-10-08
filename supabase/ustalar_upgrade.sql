-- Usta & hizmet rehberi (tesisatçı, elektrikçi, mobilyacı vb.). Supabase SQL Editor'de çalıştırın.
-- Tekrar çalıştırmak güvenlidir.
create table if not exists public.service_providers (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  first_name text not null check (char_length(first_name) between 2 and 40),
  last_name text not null check (char_length(last_name) between 2 and 40),
  category text not null check (char_length(category) <= 40),
  phone text not null check (char_length(phone) between 10 and 20),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$'),
  district text check (district is null or char_length(district) <= 120),
  price_from integer check (price_from is null or price_from between 0 and 1000000),
  price_unit text check (price_unit is null or price_unit in ('işlem başı','saat','gün','m²','adet','sefer')),
  price_note text check (price_note is null or char_length(price_note) <= 160),
  experience_years integer check (experience_years is null or experience_years between 0 and 60),
  emergency boolean not null default false,
  description text check (description is null or char_length(description) <= 600),
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now()
);
create index if not exists service_providers_active_idx on public.service_providers (created_at desc) where status = 'active';
create index if not exists service_providers_category_idx on public.service_providers (category) where status = 'active';
alter table public.service_providers enable row level security;
drop policy if exists "ustalar herkes okur" on public.service_providers;
drop policy if exists "ustalar kendi ekler" on public.service_providers;
drop policy if exists "ustalar kendi gunceller" on public.service_providers;
drop policy if exists "ustalar kendi siler" on public.service_providers;
create policy "ustalar herkes okur" on public.service_providers for select using (status = 'active' or poster_id = auth.uid());
create policy "ustalar kendi ekler" on public.service_providers for insert to authenticated with check (poster_id = auth.uid());
create policy "ustalar kendi gunceller" on public.service_providers for update to authenticated using (poster_id = auth.uid()) with check (poster_id = auth.uid());
create policy "ustalar kendi siler" on public.service_providers for delete to authenticated using (poster_id = auth.uid());
