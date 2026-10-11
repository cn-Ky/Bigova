import { createClient } from "@supabase/supabase-js";

/**
 * Çerezsiz, oturumsuz (anon) istemci: yalnızca RLS'in herkese açtığı tablolar için.
 * `cookies()` kullanmadığından rota CDN'de önbelleğe alınabilir (supabaseServer() ise her isteği dinamik yapar).
 */
export function supabasePublic() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
