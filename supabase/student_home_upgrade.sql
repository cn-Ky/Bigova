-- ============================================================================
-- Kişisel öğrenci ana sayfası: derslerim, sınavlarım, yapılacaklar/ödevler, widget tercihleri
-- Supabase > SQL Editor'de çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: schema.sql (public.profiles tablosu).
--
-- Güvenlik modeli: Her tablo yalnızca sahibine aittir (RLS). Öğrenci kendi satırlarını okur,
-- ekler, günceller ve siler; başkasının verisine erişemez. Bigcoin gibi bir ödül bağlı olmadığı için
-- RPC yerine doğrudan RLS yeterlidir.
--
-- Ders programı resmî kaynaklarda yalnızca PDF olarak yayımlandığından (bkz. scheduleData.ts)
-- "bugünkü dersler" öğrencinin kendi girdiği haftalık programdan hesaplanır.
-- ============================================================================

-- 1) Haftalık ders programı -----------------------------------------------------
create table if not exists public.student_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 80),
  day_of_week smallint not null check (day_of_week between 1 and 7), -- 1 = Pazartesi … 7 = Pazar
  start_time time not null,
  end_time time not null,
  room text check (room is null or char_length(room) <= 40),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists student_courses_user_idx on public.student_courses (user_id, day_of_week, start_time);

-- 2) Sınavlar -------------------------------------------------------------------
create table if not exists public.student_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  course text not null check (char_length(course) between 1 and 80),
  kind text not null default 'Vize' check (kind in ('Vize', 'Final', 'Bütünleme', 'Quiz', 'Ödev teslimi', 'Diğer')),
  exam_date date not null,
  exam_time time,
  room text check (room is null or char_length(room) <= 40),
  created_at timestamptz not null default now()
);
create index if not exists student_exams_user_idx on public.student_exams (user_id, exam_date);

-- 3) Yapılacaklar ve ödevler -----------------------------------------------------
create table if not exists public.student_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 120),
  kind text not null default 'task' check (kind in ('task', 'homework')),
  course text check (course is null or char_length(course) <= 80),
  due_date date,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists student_tasks_user_idx on public.student_tasks (user_id, done, due_date);

-- 4) Ana sayfa tercihleri (widget sırası/görünürlüğü, kısayollar) ---------------------
create table if not exists public.student_home_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade default auth.uid(),
  widgets jsonb not null default '[]'::jsonb check (jsonb_typeof(widgets) = 'array' and jsonb_array_length(widgets) <= 12),
  shortcuts jsonb not null default '[]'::jsonb check (jsonb_typeof(shortcuts) = 'array' and jsonb_array_length(shortcuts) <= 12),
  updated_at timestamptz not null default now()
);

-- 5) RLS: herkes yalnızca kendi satırlarını görür ve değiştirir -----------------------
do $$
declare
  t text;
begin
  foreach t in array array['student_courses', 'student_exams', 'student_tasks', 'student_home_prefs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || ': kendi', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || ': kendi', t
    );
  end loop;
end $$;

-- Kullanıcı başına makul üst sınırlar (kötüye kullanımı ve şişmeyi önler)
create or replace function public.student_home_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_max integer := case tg_table_name
    when 'student_courses' then 80
    when 'student_exams' then 80
    when 'student_tasks' then 300
    else 100 end;
  v_n integer;
begin
  execute format('select count(*) from public.%I where user_id = $1', tg_table_name) into v_n using new.user_id;
  if v_n >= v_max then
    raise exception 'Bu liste için en fazla % kayıt ekleyebilirsin.', v_max;
  end if;
  return new;
end $$;

drop trigger if exists student_courses_limit on public.student_courses;
create trigger student_courses_limit before insert on public.student_courses
  for each row execute function public.student_home_limit();
drop trigger if exists student_exams_limit on public.student_exams;
create trigger student_exams_limit before insert on public.student_exams
  for each row execute function public.student_home_limit();
drop trigger if exists student_tasks_limit on public.student_tasks;
create trigger student_tasks_limit before insert on public.student_tasks
  for each row execute function public.student_home_limit();

-- PostgREST şema önbelleğini yenile
notify pgrst, 'reload schema';
