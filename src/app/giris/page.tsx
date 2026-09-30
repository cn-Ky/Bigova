"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap } from "@fortawesome/free-solid-svg-icons";
import { supabaseBrowser } from "@/lib/supabase/client";

const SCHOOL_MAIL = /^\d{6,12}@ogr\.comu\.edu\.tr$/i;

export default function Giris() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null); const [busy, setBusy] = useState(false);

  async function submit() {
    const mail = email.trim().toLowerCase();
    if (!SCHOOL_MAIL.test(mail)) return setMsg({ t: "Sadece ogrencinumarasi@ogr.comu.edu.tr adresi kabul edilir.", ok: false });
    if (password.length < 8) return setMsg({ t: "Şifre en az 8 karakter olmalı.", ok: false });
    setBusy(true); setMsg(null);
    const sb = supabaseBrowser();
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email: mail, password });
      if (error) setMsg({ t: "E-posta veya şifre hatalı ya da e-posta doğrulanmadı.", ok: false });
      else { router.push("/"); router.refresh(); }
    } else {
      const { error } = await sb.auth.signUp({ email: mail, password, options: { data: { name }, emailRedirectTo: `${location.origin}/auth/callback` } });
      setMsg(error ? { t: "Kayıt yapılamadı: " + error.message, ok: false } : { t: "Doğrulama bağlantısı okul mailine gönderildi.", ok: true });
    }
    setBusy(false);
  }
  return (
    <main className="min-h-[100dvh] grid place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <div className="text-center"><FontAwesomeIcon icon={faGraduationCap} className="text-3xl text-olive" /><h1 className="font-display text-2xl mt-2">{mode === "login" ? "Giriş Yap" : "Kayıt Ol"}</h1></div>
        <div className="mt-4 grid gap-3">
          {mode === "register" && <input value={name} onChange={e => setName(e.target.value)} placeholder="Ad Soyad" className="rounded-xl border p-3" />}
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="123456789@ogr.comu.edu.tr" className="rounded-xl border p-3" />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Şifre" className="rounded-xl border p-3" />
          <button onClick={submit} disabled={busy} className="rounded-xl bg-sea p-3 font-semibold text-white disabled:opacity-60">{busy ? "..." : mode === "login" ? "Giriş" : "Kayıt Ol"}</button>
          {msg && <p className={`text-sm ${msg.ok ? "text-olive" : "text-clay"}`}>{msg.t}</p>}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setMsg(null); }} className="text-sm underline">{mode === "login" ? "Hesabın yok mu? Kayıt ol" : "Hesabın var mı? Giriş yap"}</button>
        </div>
      </div>
    </main>
  );
}
