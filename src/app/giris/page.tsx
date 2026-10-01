"use client";
import Mascot from "@/components/Mascot";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SCHOOL_MAIL = /^\d{6,12}@ogr\.comu\.edu\.tr$/i;

export default function Giris() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("hata") === "dogrulama"
    ) {
      setMsg({
        t: "Doğrulama bağlantısı geçersiz veya süresi dolmuş. Yeni bir kayıt bağlantısı iste.",
        ok: false,
      });
    }
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    if (!SCHOOL_MAIL.test(mail))
      return setMsg({
        t: "Sadece ogrencinumarasi@ogr.comu.edu.tr adresi kabul edilir.",
        ok: false,
      });
    if (password.length < 8)
      return setMsg({ t: "Şifre en az 8 karakter olmalı.", ok: false });
    setBusy(true);
    setMsg(null);
    try {
      const sb = supabaseBrowser();
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({
          email: mail,
          password,
        });
        if (error)
          setMsg({
            t:
              error.code === "email_not_confirmed"
                ? "E-posta adresin henüz doğrulanmamış. Deneme sürümüne giriş yapmadan devam edebilirsin."
                : `Giriş yapılamadı: ${error.message}`,
            ok: false,
          });
        else {
          router.push("/");
          router.refresh();
        }
      } else {
        const { data, error } = await sb.auth.signUp({
          email: mail,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error)
          setMsg({ t: "Kayıt yapılamadı: " + error.message, ok: false });
        else if (data.session) {
          router.push("/");
          router.refresh();
        } else
          setMsg({
            t: "Doğrulama bağlantısı okul mailine gönderildi. Gelen kutunu ve spam klasörünü kontrol et.",
            ok: true,
          });
      }
    } catch {
      setMsg({
        t: "Supabase bağlantısı kurulamadı. Uygulama ayarlarını ve internet bağlantını kontrol et.",
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
          Sadece okul mailiyle giriş yapılır.
        </p>
      </div>
      <form
        onSubmit={submit}
        className="mx-auto mt-6 grid max-w-md gap-3 rounded-[28px] bg-card p-5 shadow-sm"
      >
        {mode === "register" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ad Soyad"
            autoComplete="name"
            required
            className="rounded-2xl bg-foam p-4 outline-none"
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="123456789@ogr.comu.edu.tr"
          required
          className="rounded-2xl bg-foam p-4 outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="Şifre (en az 8 karakter)"
          minLength={8}
          required
          className="rounded-2xl bg-foam p-4 outline-none"
        />
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
          {mode === "login"
            ? "Hesabın yok mu? Kayıt ol"
            : "Hesabın var mı? Giriş yap"}
        </button>
      </form>
      <div className="mx-auto mt-4 max-w-md text-center">
        <Link
          href="/"
          className="inline-block rounded-full bg-sun px-6 py-3 font-display font-bold text-deep"
        >
          Deneme sürümüne giriş yapmadan devam et
        </Link>
      </div>
    </main>
  );
}
