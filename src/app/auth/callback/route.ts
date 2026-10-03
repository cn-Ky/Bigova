import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "magiclink", "recovery"];

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const go = (path: string) => NextResponse.redirect(`${origin}${path}`);

  // Supabase bağlantıyı reddettiyse (süresi dolmuş / kullanılmış)
  if (searchParams.get("error") || searchParams.get("error_code"))
    return go("/giris?hata=suresi-doldu");

  const sb = supabaseServer();

  // Yeni akış: e-posta şablonundan gelen token_hash (tarayıcıdan bağımsız çalışır)
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    return go(error ? "/giris?hata=suresi-doldu" : "/");
  }

  // Eski akış (PKCE): kod, kayıt olunan tarayıcıda saklanan doğrulayıcıyla eşleşmeli
  const code = searchParams.get("code");
  if (!code) return go("/giris");
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (!error) return go("/");
  // Bağlantı büyük olasılıkla başka bir tarayıcıda açıldı: e-posta doğrulanmış olabilir
  return go("/giris?hata=tarayici");
}
