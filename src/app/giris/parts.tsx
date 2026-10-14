"use client";
import { PHONE_AUTH_ENABLED } from "@/lib/authConfig";

export const field = "rounded-2xl bg-foam p-4 field-ring";
export type Method = "email" | "phone";
export type Msg = { t: string; ok: boolean } | null;

/** E-posta ↔ Telefon seçici (telefon girişi kapalıysa hiç görünmez). */
export function MethodTabs({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  if (!PHONE_AUTH_ENABLED) return null;
  return (
    <div role="tablist" aria-label="Giriş yöntemi" className="grid grid-cols-2 gap-1 rounded-2xl bg-foam p-1">
      {(["email", "phone"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={value === m}
          onClick={() => onChange(m)}
          className={`rounded-xl p-2.5 text-sm font-bold transition ${
            value === m ? "bg-card text-sea shadow-sm" : "text-ink/60"
          }`}
        >
          {m === "email" ? "E-posta" : "Telefon"}
        </button>
      ))}
    </div>
  );
}

/** Türkiye numarası için +90 önekli telefon alanı. Yabancı numara için +ülke kodu yazılabilir. */
export function PhoneField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-stretch gap-2">
      <span className="grid place-items-center rounded-2xl bg-foam px-4 font-bold text-ink/70">+90</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d+\s()-]/g, ""))}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="5XX XXX XX XX"
        maxLength={20}
        required
        aria-label="Telefon numarası"
        className={`${field} min-w-0 flex-1`}
      />
    </div>
  );
}

/** SMS / e-posta ile gelen doğrulama kodu alanı. */
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
  if (code === "over_sms_send_rate_limit" || code === "over_email_send_rate_limit" || error.status === 429)
    return "Çok sık istek gönderildi. Birkaç dakika bekleyip tekrar dene.";
  if (code === "otp_expired") return "Kodun süresi dolmuş. Yeni bir kod iste.";
  if (code === "sms_send_failed" || /provider|twilio|sms/i.test(error.message))
    return "SMS gönderilemedi. Numarayı kontrol et; sorun sürerse e-posta ile devam et.";
  if (code === "weak_password") return "Şifre çok kolay tahmin edilebilir. Daha güçlü bir şifre seç.";
  return `${fallback}: ${error.message}`;
}
