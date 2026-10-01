-- Notlar modülü: Supabase > SQL Editor'de bir kez çalıştır.
alter table public.notes add column if not exists description text check (char_length(description) <= 500);
alter table public.notes add column if not exists file_name text;
alter table public.notes add column if not exists size_bytes bigint;
alter table public.notes add constraint notes_title_len check (char_length(title) between 1 and 120);
create index if not exists notes_created_idx on public.notes (created_at desc);

-- Dosya güvenliği: sadece PDF, en fazla 10 MB
update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['application/pdf'] where id = 'notes';

-- Kullanıcı yalnızca kendi klasöründeki dosyayı silebilir
create policy "notes dosya: kendi siler" on storage.objects for delete to authenticated
  using (bucket_id = 'notes' and (storage.foldername(name))[1] = auth.uid()::text);
