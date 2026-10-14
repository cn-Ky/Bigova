"use client";
import Mascot from "@/components/Mascot";
import {
  EMAIL_RE,
  MIN_PASSWORD,
  OTP_RE,
  REQUIRE_SCHOOL_MAIL,
  SCHOOL_MAIL,
  formatPhone,
  normalizePhone,
} from "@/lib/authConfig";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ForgotPassword from "./ForgotPassword";
import { CodeField, MethodTabs, PhoneField, authError, field, type Method } from "./parts";

const clean = (s: string) => s.trim().replace(/\s+/g, " ");
const REF_KEY = "bigova-ref";
const cleanRef = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

export default function Giris() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [refCode, setRefCode] = useState("");
  const [method, setMethod] = useState<Method>("email");
  const [phone, setPhone] = useState("");
  const [view, setView] = useState<"form" | "otp" | "forgot">("form");
  const [pendingPhone, setPendingPhone] = useState(""); // SMS kodu beklenen numara (E.164)
  const [otp, setOtp] = useState("");

  useEffect(() => {
    // Davet bağlantısı: /giris?ref=KOD → kayıt formu açılır, kod hazır gelir
    const ref = cleanRef(new URLSearchParams(window.location.search).get("ref") ?? "");
    if (ref) {
      setRefCode(ref);
      setMode("register");
      try { localStorage.setItem(REF_KEY, ref); } catch {}
    } else {
      try { setRefCode(cleanRef(localStorage.getItem(REF_KEY) ?? "")); } catch {}
    }
  }, []);

  useEffect(() => {
    const hata = new URLSearchParams(window.location.search).get("hata");
    // Supabase bazı hataları adres çubuğundaki # kısmında gönderir
    const hashExpired = /error_code=otp_expired|error=access_denied/.test(window.location.hash);
    if (hata === "tarayici") {
      setMsg({
        t: "E-postan büyük olasılıkla doğrulandı; ancak bağlantı farklı bir tarayıcıda açıldığı için otomatik giriş yapılamadı. E-posta ve şifrenle giriş yapmayı dene.",
        ok: true,
      });
    } else if (hata === "suresi-doldu" || hashExpired) {
      setMsg({
        t: "Doğrulama bağlantısının süresi dolmuş veya daha önce kullanılmış. E-postanı yazıp yeni bir bağlantı iste.",
        ok: false,
      });
      setCanResend(true);
    } else if (hata) {
      setMsg({ t: "Doğrulama bağlantısı geçersiz. E-postanı yazıp yeni bir bağlantı iste.", ok: false });
      setCanResend(true);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return setMsg({ t: "Önce e-posta adresini yaz.", ok: false });
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabaseBrowser().auth.resend({
        type: "signup",
        email: mail,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) {
        setMsg({
          t:
            error.code === "over_email_send_rate_limit" || error.status === 429
              ? "Çok sık istek gönderildi. Birkaç dakika bekleyip tekrar dene."
              : `E-posta gönderilemedi: ${error.message}`,
          ok: false,
        });
      } else {
        setMsg({ t: "Yeni doğrulama e-postası gönderildi. Spam klasörünü de kontrol et.", ok: true });
        setCooldown(60);
      }
    } catch {
      setMsg({ t: "Sunucuya bağlanılamadı. Tekrar dene.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  /** Telefona SMS doğrulama kodu ister (kayıt sonrası veya doğrulanmamış numarayla giriş). */
  async function sendSms(to: string) {
    const { error } = await supabaseBrowser().auth.resend({ type: "sms", phone: to });
    if (error) {
      setMsg({ t: authError(error, "SMS gönderilemedi"), ok: false });
      return false;
    }
    setCooldown(60);
    return true;
  }

  async function submitPhone() {
    const to = normalizePhone(phone);
    if (!to) return setMsg({ t: "Geçerli bir telefon numarası yaz. Örn: 5XX XXX XX XX", ok: false });
    if (password.length < MIN_PASSWORD)
      return setMsg({ t: `Şifre en az ${MIN_PASSWORD} karakter olmalı.`, ok: false });
    const first = clean(firstName);
    const last = clean(lastName);
    if (mode === "register" && (first.length < 2 || last.length < 2))
      return setMsg({ t: "İsim ve soyisim en az 2 karakter olmalı.", ok: false });

    setBusy(true);
    setMsg(null);
    try {
      const sb = supabaseBrowser();
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ phone: to, password });
        if (!error) {
          router.push("/");
          router.refresh();
        } else if (error.code === "phone_not_confirmed") {
          // Numara daha önce doğrulanmamış: yeni kod gönder ve kod ekranına geç
          if (await sendSms(to)) {
            setPendingPhone(to);
            setOtp("");
            setView("otp");
            setMsg({ t: "Numaran henüz doğrulanmamış. SMS ile yeni bir kod gönderdik.", ok: true });
          }
        } else {
          setMsg({
            t:
              error.code === "invalid_credentials"
                ? "Telefon veya şifre hatalı."
                : authError(error, "Giriş yapılamadı"),
            ok: false,
          });
        }
      } else {
        const { data, error } = await sb.auth.signUp({
          phone: to,
          password,
          options: {
            data: {
              first_name: first,
              last_name: last,
              name: `${first} ${last}`,
              ...(refCode.length === 8 ? { ref_code: refCode } : {}),
            },
          },
        });
        if (error) {
          setMsg({
            t:
              error.code === "user_already_exists" || error.code === "phone_exists"
                ? "Bu telefon ile zaten bir hesap var. Giriş yapmayı dene."
                : authError(error, "Kayıt yapılamadı"),
            ok: false,
          });
        } else if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setPendingPhone(to);
          setOtp("");
          setCooldown(60);
          setView("otp");
          setMsg({ t: "Kaydın oluşturuldu. SMS ile gelen kodu yaz.", ok: true });
        }
      }
    } catch {
      setMsg({ t: "Sunucuya bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!OTP_RE.test(otp)) return setMsg({ t: "Kodu eksiksiz yaz.", ok: false });
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabaseBrowser().auth.verifyOtp({
        phone: pendingPhone,
        token: otp,
        type: "sms",
      });
      if (error) {
        setMsg({
          t: error.code === "otp_expired" ? "Kodun süresi dolmuş. Yeni bir kod iste." : "Kod hatalı. Tekrar dene.",
          ok: false,
        });
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setMsg({ t: "Sunucuya bağlanılamadı. Tekrar dene.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    setBusy(true);
    setMsg(null);
    try {
      if (await sendSms(pendingPhone)) setMsg({ t: "Yeni kod gönderildi.", ok: true });
    } catch {
      setMsg({ t: "Sunucuya bağlanılamadı. Tekrar dene.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (method === "phone") return submitPhone();
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail))
      return setMsg({ t: "Geçerli bir e-posta adresi yaz.", ok: false });
    if (REQUIRE_SCHOOL_MAIL && !SCHOOL_MAIL.test(mail))
      return setMsg({
        t: "Sadece ogrencinumarasi@ogr.comu.edu.tr adresi kabul edilir.",
        ok: false,
      });
    if (password.length < MIN_PASSWORD)
      return setMsg({ t: `Şifre en az ${MIN_PASSWORD} karakter olmalı.`, ok: false });
    const first = clean(firstName);
    const last = clean(lastName);
    if (mode === "register" && (first.length < 2 || last.length < 2))
      return setMsg({ t: "İsim ve soyisim en az 2 karakter olmalı.", ok: false });

    setBusy(true);
    setMsg(null);
    try {
      const sb = supabaseBrowser();
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email: mail, password });
        if (error) {
          if (error.code === "email_not_confirmed") setCanResend(true);
          setMsg({
            t:
              error.code === "email_not_confirmed"
                ? "E-posta adresin henüz doğrulanmamış. Gelen kutundaki bağlantıya tıkla veya aşağıdan yeni bağlantı iste."
                : error.code === "invalid_credentials"
                  ? "E-posta veya şifre hatalı."
                  : `Giriş yapılamadı: ${error.message}`,
            ok: false,
          });
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        const { data, error } = await sb.auth.signUp({
          email: mail,
          password,
          options: {
            data: {
              first_name: first,
              last_name: last,
              name: `${first} ${last}`,
              // Davet kodu kullanıcı meta verisinde saklanır: e-posta başka cihazda doğrulansa da kaybolmaz
              ...(refCode.length === 8 ? { ref_code: refCode } : {}),
            },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) {
          setMsg({
            t:
              error.code === "user_already_exists"
                ? "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene."
                : `Kayıt yapılamadı: ${error.message}`,
            ok: false,
          });
        } else if (data.user && data.user.identities?.length === 0) {
          // Supabase, var olan e-postada hata vermeden boş identities döndürür
          setMsg({ t: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.", ok: false });
        } else if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setCanResend(true);
          setCooldown(60);
          setMsg({
            t: "Kaydın oluşturuldu. E-postana gönderilen doğrulama bağlantısına tıkla, sonra giriş yap. Spam klasörünü de kontrol et.",
            ok: true,
          });
        }
      }
    } catch {
      setMsg({
        t: "Sunucuya bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.",
        ok: false,
      });
    } finally {
      setBusy(false);
    }
  }

  if (view === "forgot")
    return (
      <main className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
        <Mascot size={96} className="mx-auto" />
        <ForgotPassword
          initialMethod={method}
          initialEmail={email}
          initialPhone={phone}
          onBack={() => {
            setView("form");
            setMsg(null);
          }}
        />
      </main>
    );

  if (view === "otp")
    return (
      <main className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-md text-center">
          <Mascot size={96} className="mx-auto" />
          <h1 className="font-display text-3xl font-extrabold">Telefonunu doğrula</h1>
          <p className="text-sm text-ink/70">{formatPhone(pendingPhone)} numarasına gelen kodu yaz.</p>
        </div>
        <form
          onSubmit={verifyOtp}
          className="mx-auto mt-6 grid max-w-md gap-3 rounded-[28px] bg-card p-5 shadow-sm"
        >
          <CodeField value={otp} onChange={setOtp} />
          <button
            type="submit"
            disabled={busy || otp.length < 6}
            className="rounded-2xl bg-sea p-4 font-display text-lg font-bold text-white active:scale-[.98] disabled:opacity-60"
          >
            {busy ? "Doğrulanıyor…" : "Doğrula"}
          </button>
          {msg && (
            <p role="status" className={`text-sm font-bold ${msg.ok ? "text-tide" : "text-coral"}`}>
              {msg.t}
            </p>
          )}
          <button
            type="button"
            onClick={resendOtp}
            disabled={busy || cooldown > 0}
            className="rounded-2xl bg-sun p-3 text-sm font-bold text-deep disabled:opacity-60"
          >
            {cooldown > 0 ? `Yeni kod için ${cooldown} sn bekle` : "Kodu tekrar gönder"}
          </button>
          <button
            type="button"
            onClick={() => {
              setView("form");
              setMsg(null);
            }}
            className="text-sm font-bold underline"
          >
            Numarayı değiştir
          </button>
        </form>
      </main>
    );

  return (
    <main className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md text-center">
        <Mascot size={112} className="mx-auto" />
        <h1 className="font-display text-3xl font-extrabold">
          {mode === "login" ? "Tekrar hoş geldin" : "Aramıza katıl"}
        </h1>
        <p className="text-sm text-ink/70">
          {mode === "login"
            ? method === "email"
              ? "E-posta ve şifrenle giriş yap."
              : "Telefon numaran ve şifrenle giriş yap."
            : method === "email"
              ? "İsim, soyisim, e-posta ve şifreyle hemen kayıt ol."
              : "İsim, soyisim, telefon ve şifreyle hemen kayıt ol. Numaranı SMS koduyla doğrularsın."}
        </p>
      </div>
      <form
        onSubmit={submit}
        className="mx-auto mt-6 grid max-w-md gap-3 rounded-[28px] bg-card p-5 shadow-sm"
      >
        <MethodTabs
          value={method}
          onChange={(m) => {
            setMethod(m);
            setMsg(null);
            setCanResend(false);
          }}
        />
        {mode === "register" && (
          <div className="grid grid-cols-2 gap-3">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="İsim"
              autoComplete="given-name"
              maxLength={40}
              required
              className={field}
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Soyisim"
              autoComplete="family-name"
              maxLength={40}
              required
              className={field}
            />
          </div>
        )}
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
        <div className="relative">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={`Şifre (en az ${MIN_PASSWORD} karakter)`}
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
        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setView("forgot");
              setMsg(null);
            }}
            className="-mt-1 justify-self-end px-1 text-sm font-bold text-sea underline"
          >
            Şifremi unuttum
          </button>
        )}
        {mode === "register" && (
          <div>
            <input
              value={refCode}
              onChange={(e) => setRefCode(cleanRef(e.target.value))}
              placeholder="Davet kodu (varsa)"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={8}
              aria-describedby="ref-help"
              className={`${field} w-full font-display font-extrabold uppercase tracking-[.2em] placeholder:font-body placeholder:font-normal placeholder:normal-case placeholder:tracking-normal`}
            />
            <p id="ref-help" className="mt-1.5 px-1 text-xs font-bold text-ink/65">
              {refCode.length === 8
                ? "Kayıt olup e-postanı doğruladığında sen de arkadaşın da +30 Bigcoin kazanırsınız."
                : "Bir arkadaşın davet ettiyse kodunu yaz; ikiniz de +30 Bigcoin kazanırsınız."}
            </p>
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-2xl bg-sea p-4 font-display text-lg font-bold text-white active:scale-[.98] disabled:opacity-60"
        >
          {busy ? "Bekle…" : mode === "login" ? "Giriş yap" : "Kayıt ol"}
        </button>
        {msg && (
          <p
            role="status"
            className={`text-sm font-bold ${msg.ok ? "text-tide" : "text-coral"}`}
          >
            {msg.t}
          </p>
        )}
        {canResend && method === "email" && (
          <button
            type="button"
            onClick={resend}
            disabled={busy || cooldown > 0}
            className="rounded-2xl bg-sun p-3 text-sm font-bold text-deep disabled:opacity-60"
          >
            {cooldown > 0 ? `Yeni e-posta için ${cooldown} sn bekle` : "Doğrulama e-postasını tekrar gönder"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMsg(null);
          }}
          className="text-sm font-bold underline"
        >
          {mode === "login" ? "Hesabın yok mu? Kayıt ol" : "Hesabın var mı? Giriş yap"}
        </button>
      </form>
      <div className="mx-auto mt-4 max-w-md text-center">
        <Link
          href="/"
          className="inline-block rounded-full bg-sun px-6 py-3 font-display font-bold text-deep"
        >
          Giriş yapmadan devam et
        </Link>
      </div>
    </main>
  );
}
