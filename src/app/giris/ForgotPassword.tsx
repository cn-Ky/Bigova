"use client";
import { EMAIL_RE, MIN_PASSWORD, OTP_RE, formatPhone, normalizePhone } from "@/lib/authConfig";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CodeField, MethodTabs, PhoneField, Status, authError, field, type Method, type Msg } from "./parts";

type Step = "ask" | "code" | "new";

/**
 * Şifremi unuttum: 1) e-posta/telefon → 2) gelen kod → 3) yeni şifre.
 * Kod doğrulanınca oturum açılır; yeni şifre auth.updateUser ile kaydedilir.
 * Hesap var/yok bilgisi sızmasın diye ilk adımda her zaman aynı mesaj gösterilir.
 */
export default function ForgotPassword({
  initialMethod,
  initialEmail,
  initialPhone,
  onBack,
}: {
  initialMethod: Method;
  initialEmail: string;
  initialPhone: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>(initialMethod);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [step, setStep] = useState<Step>("ask");
  const [target, setTarget] = useState(""); // kodun gönderildiği, normalize edilmiş adres
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  /** Kod gönderir. Başarıysa true (hesap yoksa da true: bilgi sızdırmamak için). */
  async function sendCode(to: string, via: Method): Promise<boolean> {
    const sb = supabaseBrowser();
    const { error } =
      via === "email"
        ? await sb.auth.resetPasswordForEmail(to)
        : await sb.auth.signInWithOtp({ phone: to, options: { shouldCreateUser: false } });
    if (!error) return true;
    // Kayıtsız numara: Supabase "signups not allowed" döner; hesap varlığını belli etme.
    if (via === "phone" && (error.code === "otp_disabled" || /signups? not allowed/i.test(error.message))) return true;
    setMsg({ t: authError(error, "Kod gönderilemedi"), ok: false });
    return false;
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const to = method === "email" ? email.trim().toLowerCase() : normalizePhone(phone);
    if (method === "email" && !EMAIL_RE.test(to ?? ""))
      return setMsg({ t: "Geçerli bir e-posta adresi yaz.", ok: false });
    if (method === "phone" && !to)
      return setMsg({ t: "Geçerli bir telefon numarası yaz. Örn: 5XX XXX XX XX", ok: false });
    setBusy(true);
    setMsg(null);
    try {
      if (await sendCode(to!, method)) {
        setTarget(to!);
        setStep("code");
        setCode("");
        setCooldown(60);
        setMsg({
          t:
            method === "email"
              ? "Bu e-posta kayıtlıysa doğrulama kodu gönderildi. Spam klasörünü de kontrol et."
              : "Bu numara kayıtlıysa doğrulama kodu SMS ile gönderildi.",
          ok: true,
        });
      }
    } catch {
      setMsg({ t: "Sunucuya bağlanılamadı. Tekrar dene.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setMsg(null);
    try {
      if (await sendCode(target, method)) {
        setCooldown(60);
        setMsg({ t: "Yeni kod gönderildi.", ok: true });
      }
    } catch {
      setMsg({ t: "Sunucuya bağlanılamadı. Tekrar dene.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!OTP_RE.test(code)) return setMsg({ t: "Kodu eksiksiz yaz.", ok: false });
    setBusy(true);
    setMsg(null);
    try {
      const sb = supabaseBrowser();
      const { error } =
        method === "email"
          ? await sb.auth.verifyOtp({ email: target, token: code, type: "recovery" })
          : await sb.auth.verifyOtp({ phone: target, token: code, type: "sms" });
      if (error) {
        setMsg({
          t:
            error.code === "otp_expired"
              ? "Kodun süresi dolmuş. Yeni bir kod iste."
              : error.status === 429
                ? authError(error, "")
                : "Kod hatalı. Tekrar dene.",
          ok: false,
        });
      } else {
        setStep("new");
        setMsg(null);
      }
    } catch {
      setMsg({ t: "Sunucuya bağlanılamadı. Tekrar dene.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD)
      return setMsg({ t: `Şifre en az ${MIN_PASSWORD} karakter olmalı.`, ok: false });
    if (password !== again) return setMsg({ t: "Şifreler birbiriyle uyuşmuyor.", ok: false });
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabaseBrowser().auth.updateUser({ password });
      if (error) {
        setMsg({
          t:
            error.code === "same_password"
              ? "Yeni şifre eskisiyle aynı olamaz."
              : authError(error, "Şifre değiştirilemedi"),
          ok: false,
        });
      } else {
        setMsg({ t: "Şifren güncellendi. Yönlendiriliyorsun…", ok: true });
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 900);
      }
    } catch {
      setMsg({ t: "Sunucuya bağlanılamadı. Tekrar dene.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "rounded-2xl bg-sea p-4 font-display text-lg font-bold text-white active:scale-[.98] disabled:opacity-60";
  const sentTo = method === "email" ? target : formatPhone(target);

  return (
    <>
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl font-extrabold">
          {step === "new" ? "Yeni şifreni belirle" : "Şifreni mi unuttun?"}
        </h1>
        <p className="text-sm text-ink/70">
          {step === "ask" && "Hesabına bağlı e-posta veya telefona bir kod göndereceğiz."}
          {step === "code" && `${sentTo} adresine gönderilen kodu yaz.`}
          {step === "new" && "Kod doğrulandı. Yeni şifreni yaz."}
        </p>
      </div>
      <div className="mx-auto mt-6 grid max-w-md gap-3 rounded-[28px] bg-card p-5 shadow-sm">
        {step === "ask" && (
          <form onSubmit={ask} className="grid gap-3">
            <MethodTabs
              value={method}
              onChange={(m) => {
                setMethod(m);
                setMsg(null);
              }}
            />
            {method === "email" ? (
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="E-posta adresi"
                required
                className={field}
              />
            ) : (
              <PhoneField value={phone} onChange={setPhone} />
            )}
            <button type="submit" disabled={busy} className={btn}>
              {busy ? "Gönderiliyor…" : "Kod gönder"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verify} className="grid gap-3">
            <CodeField value={code} onChange={setCode} />
            <button type="submit" disabled={busy || code.length < 6} className={btn}>
              {busy ? "Doğrulanıyor…" : "Kodu doğrula"}
            </button>
            <button
              type="button"
              onClick={resend}
              disabled={busy || cooldown > 0}
              className="rounded-2xl bg-sun p-3 text-sm font-bold text-deep disabled:opacity-60"
            >
              {cooldown > 0 ? `Yeni kod için ${cooldown} sn bekle` : "Kodu tekrar gönder"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("ask");
                setMsg(null);
              }}
              className="text-sm font-bold underline"
            >
              {method === "email" ? "E-postayı değiştir" : "Numarayı değiştir"}
            </button>
          </form>
        )}

        {step === "new" && (
          <form onSubmit={save} className="grid gap-3">
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={show ? "text" : "password"}
                autoComplete="new-password"
                placeholder={`Yeni şifre (en az ${MIN_PASSWORD} karakter)`}
                minLength={MIN_PASSWORD}
                required
                className={`${field} w-full pr-20`}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-bold text-ink/70"
              >
                {show ? "Gizle" : "Göster"}
              </button>
            </div>
            <input
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Yeni şifre (tekrar)"
              minLength={MIN_PASSWORD}
              required
              className={field}
            />
            <button type="submit" disabled={busy} className={btn}>
              {busy ? "Kaydediliyor…" : "Şifreyi kaydet"}
            </button>
          </form>
        )}

        <Status msg={msg} />
        <button type="button" onClick={onBack} className="text-sm font-bold underline">
          Giriş ekranına dön
        </button>
      </div>
    </>
  );
}
