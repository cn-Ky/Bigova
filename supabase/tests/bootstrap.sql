create role anon nologin; create role authenticated nologin;
create schema auth; create schema storage; create schema private;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n, '/') $$;
create publication supabase_realtime;
create table public.profiles (id uuid primary key, name text not null default '', created_at timestamptz default now());
create function public.tr_norm(t text) returns text language sql immutable as $$ select lower(translate(coalesce(t,''), 'İIıĞğÜüŞşÖöÇç', 'iiiggguussoocc')) $$;
create table public.user_blocks (blocker uuid, blocked uuid);
create function private.is_blocked_between(a uuid, b uuid) returns boolean language sql security definer stable as $$
  select exists (select 1 from public.user_blocks where (blocker=a and blocked=b) or (blocker=b and blocked=a)) $$;
grant usage on schema public to anon, authenticated;
grant execute on function private.is_blocked_between(uuid,uuid) to authenticated;
grant select on public.profiles to authenticated;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
