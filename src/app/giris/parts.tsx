"use client";

export const field = "rounded-2xl bg-foam p-4 field-ring";
export type Msg = { t: string; ok: boolean } | null;

/** E-postaya gelen doğrulama kodu alanı. */
export function CodeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="Doğrulama kodu"
      aria-label="Doğrulama kodu"
      maxLength={10}
      required
      className={`${field} w-full text-center font-display text-2xl font-extrabold tracking-[.3em] placeholder:font-body placeholder:text-base placeholder:font-normal placeholder:tracking-normal`}
    />
  );
}

export function Status({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p role="status" className={`text-sm font-bold ${msg.ok ? "text-tide" : "text-coral"}`}>
      {msg.t}
    </p>
  );
}

/** Supabase hata kodlarını kullanıcıya anlaşılır Türkçe mesaja çevirir. */
export function authError(error: { code?: string; status?: number; message: string }, fallback: string): string {
  const code = error.code ?? "";
  if (code === "over_email_send_rate_limit" || error.status === 429)
    return "Çok sık istek gönderildi. Birkaç dakika bekleyip tekrar dene.";
  if (code === "otp_expired") return "Kodun süresi dolmuş. Yeni bir kod iste.";
  if (code === "weak_password") return "Şifre çok kolay tahmin edilebilir. Daha güçlü bir şifre seç.";
  return `${fallback}: ${error.message}`;
}
