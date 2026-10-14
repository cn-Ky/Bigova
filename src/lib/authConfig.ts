/**
 * Okul maili zorunluluğu şu an ASKIDA.
 * Tekrar açmak için REQUIRE_SCHOOL_MAIL değerini true yapın ve
 * supabase/auth_open_signup.sql dosyasının sonundaki "geri açma" bloğunu çalıştırın.
 */
export const REQUIRE_SCHOOL_MAIL = false;
export const SCHOOL_MAIL = /^\d{6,12}@ogr\.comu\.edu\.tr$/i;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 8;

/** E-postaya gelen tek kullanımlık kod (Supabase'de 6–10 hane arasında ayarlanabilir). */
export const OTP_RE = /^\d{6,10}$/;
