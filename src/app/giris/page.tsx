"use client";
import Mascot from "@/components/Mascot";
import {
  EMAIL_RE,
  MIN_PASSWORD,
  REQUIRE_SCHOOL_MAIL,
  SCHOOL_MAIL,
} from "@/lib/authConfig";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const field = "rounded-2xl bg-foam p-4 outline-none focus:ring-2 focus:ring-tide";
const clean = (s: string) => s.trim().replace(/\s+/g, " ");

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

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("hata") === "dogrulama") {
      setMsg({
        t: "Doğrulama bağlantısı geçersiz veya süresi dolmuş. Yeniden kayıt olmayı dene.",
        ok: false,
      });
    }
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
          setMsg({
            t:
              error.code === "email_not_confirmed"
                ? "E-posta adresin henüz doğrulanmamış. Gelen kutundaki bağlantıya tıkla."
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
            data: { first_name: first, last_name: last, name: `${first} ${last}` },
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

  return (
    <main className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md text-center">
        <Mascot size={112} className="mx-auto" />
        <h1 className="font-display text-3xl font-extrabold">
          {mode === "login" ? "Tekrar hoş geldin" : "Aramıza katıl"}
        </h1>
        <p className="text-sm text-ink/70">
          {mode === "login"
            ? "E-posta ve şifrenle giriş yap."
            : "İsim, soyisim, e-posta ve şifreyle hemen kayıt ol."}
        </p>
      </div>
      <form
        onSubmit={submit}
        className="mx-auto mt-6 grid max-w-md gap-3 rounded-[28px] bg-card p-5 shadow-sm"
      >
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
