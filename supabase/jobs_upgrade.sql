-- İş ilanları bölümü. Supabase SQL Editor'de çalıştırın.
create table if not exists public.job_listings (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 3 and 100),
  company text not null check (char_length(company) between 2 and 100),
  category text not null check (char_length(category) <= 40),
  job_type text not null check (job_type in ('Yarı zamanlı','Tam zamanlı','Staj','Sezonluk','Uzaktan')),
  location text check (location is null or char_length(location) <= 120),
  salary text check (salary is null or char_length(salary) <= 60),
  description text not null check (char_length(description) between 10 and 1000),
  requirements text check (requirements is null or char_length(requirements) <= 500),
  contact_name text check (contact_name is null or char_length(contact_name) <= 80),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 20),
  contact_whatsapp text check (contact_whatsapp is null or contact_whatsapp ~ '^[0-9]{10,15}$'),
  contact_email text check (contact_email is null or char_length(contact_email) <= 120),
  student_friendly boolean not null default true,
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now(),
  -- ilan en az bir iletişim yöntemi içermeli
  check (contact_phone is not null or contact_whatsapp is not null or contact_email is not null)
);
create index if not exists job_listings_active_idx on public.job_listings (created_at desc) where status = 'active';
alter table public.job_listings enable row level security;
drop policy if exists "jobs herkes okur" on public.job_listings;
drop policy if exists "jobs kendi ekler" on public.job_listings;
drop policy if exists "jobs kendi gunceller" on public.job_listings;
drop policy if exists "jobs kendi siler" on public.job_listings;
create policy "jobs herkes okur" on public.job_listings for select using (status = 'active' or poster_id = auth.uid());
create policy "jobs kendi ekler" on public.job_listings for insert to authenticated with check (poster_id = auth.uid());
create policy "jobs kendi gunceller" on public.job_listings for update to authenticated using (poster_id = auth.uid()) with check (poster_id = auth.uid());
create policy "jobs kendi siler" on public.job_listings for delete to authenticated using (poster_id = auth.uid());
