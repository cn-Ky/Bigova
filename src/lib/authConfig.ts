/**
 * Okul maili zorunluluğu şu an ASKIDA.
 * Tekrar açmak için REQUIRE_SCHOOL_MAIL değerini true yapın ve
 * supabase/auth_open_signup.sql dosyasının sonundaki "geri açma" bloğunu çalıştırın.
 */
export const REQUIRE_SCHOOL_MAIL = false;
export const SCHOOL_MAIL = /^\d{6,12}@ogr\.comu\.edu\.tr$/i;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 8;

/**
 * Telefonla kayıt/giriş. Supabase > Authentication > Providers > Phone açık ve bir SMS sağlayıcısı
 * (Twilio vb.) bağlı olmalı. Sağlayıcı hazır değilken seçeneği gizlemek için NEXT_PUBLIC_PHONE_AUTH=0 yapın.
 */
export const PHONE_AUTH_ENABLED = process.env.NEXT_PUBLIC_PHONE_AUTH !== "0";
/** SMS / e-posta tek kullanımlık kod (Supabase 6–10 hane arasında ayarlanabilir). */
export const OTP_RE = /^\d{6,10}$/;

/**
 * Telefonu E.164'e çevirir. Türkiye için 5XX XXX XX XX, 05XX…, 905XX… veya +90 5XX… kabul edilir.
 * Yabancı numara için +ülke kodu ile başlanmalı. Geçersizse null.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  let d = raw.replace(/\D/g, "");
  const explicit = raw.startsWith("+") || raw.startsWith("00");
  if (raw.startsWith("00")) d = d.slice(2);
  if (!explicit) {
    if (d.startsWith("90") && d.length === 12) {
      // 905XXXXXXXXX zaten ülke kodlu
    } else {
      if (d.startsWith("0")) d = d.slice(1);
      d = `90${d}`;
    }
  }
  if (d.startsWith("90")) return /^905\d{9}$/.test(d) ? `+${d}` : null;
  return /^[1-9]\d{7,14}$/.test(d) ? `+${d}` : null;
}

/** +905321234567 → +90 532 123 45 67 (gösterim için) */
export function formatPhone(e164: string): string {
  const m = /^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+90 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}
