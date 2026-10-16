-- ============================================================================
-- Kültür Ajandası: kişisel tarih notları (/kultur)
-- Supabase > SQL Editor'de çalıştır. Tekrar çalıştırmak güvenlidir.
-- Önkoşul: schema.sql (public.profiles tablosu).
--
-- Kişisel sınavlar zaten student_exams tablosundadır (student_home_upgrade.sql);
-- bu dosya yalnızca öğrencinin kendi belirlediği özel tarihleri ve notlarını ekler.
--
-- Güvenlik modeli: Tablo yalnızca sahibine aittir (RLS). Kullanıcı kendi satırlarını okur, ekler,
-- günceller ve siler; başkasının verisine erişemez. Misafir (anon) hiçbir şeye erişemez.
-- ============================================================================

create table if not exists public.agenda_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  note text check (note is null or char_length(note) <= 500),
  note_date date not null,
  end_date date,                       -- birden fazla gün süren kayıtlar için (boşsa tek gün)
  note_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or (end_date >= note_date and end_date <= note_date + 60))
);
create index if not exists agenda_notes_user_idx on public.agenda_notes (user_id, note_date);

-- RLS: herkes yalnızca kendi satırlarını görür ve değiştirir
alter table public.agenda_notes enable row level security;
revoke all on public.agenda_notes from anon;
grant select, insert, update, delete on public.agenda_notes to authenticated;
drop policy if exists "agenda_notes: kendi" on public.agenda_notes;
create policy "agenda_notes: kendi" on public.agenda_notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Kullanıcı başına üst sınır (kötüye kullanımı ve şişmeyi önler)
create or replace function public.agenda_notes_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_n integer;
begin
  select count(*) into v_n from public.agenda_notes where user_id = new.user_id;
  if v_n >= 300 then
    raise exception 'Ajandana en fazla 300 not ekleyebilirsin.';
  end if;
  return new;
end $$;

drop trigger if exists agenda_notes_limit on public.agenda_notes;
create trigger agenda_notes_limit before insert on public.agenda_notes
  for each row execute function public.agenda_notes_limit();

-- updated_at otomatik güncellensin
create or replace function public.agenda_notes_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists agenda_notes_touch on public.agenda_notes;
create trigger agenda_notes_touch before update on public.agenda_notes
  for each row execute function public.agenda_notes_touch();

-- PostgREST şema önbelleğini yenile
notify pgrst, 'reload schema';
