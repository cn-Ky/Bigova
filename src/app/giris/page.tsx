"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Mascot from "@/components/Mascot";
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
    <main className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="text-center"><Mascot size={112} className="mx-auto" /><h1 className="font-display text-3xl font-extrabold">{mode === "login" ? "Tekrar hoş geldin" : "Aramıza katıl"}</h1><p className="text-sm text-sea/70">Sadece okul mailiyle giriş yapılır.</p></div>
      <div className="mt-6 grid gap-3 rounded-[28px] bg-white p-5 shadow-sm">
        {mode === "register" && <input value={name} onChange={e => setName(e.target.value)} placeholder="Ad Soyad" autoComplete="name" className="rounded-2xl bg-foam p-4 outline-none" />}
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="123456789@ogr.comu.edu.tr" className="rounded-2xl bg-foam p-4 outline-none" />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Şifre (en az 8 karakter)" className="rounded-2xl bg-foam p-4 outline-none" />
        <button onClick={submit} disabled={busy} className="rounded-2xl bg-sea p-4 font-display text-lg font-bold text-white active:scale-[.98] disabled:opacity-60">{busy ? "Bekle…" : mode === "login" ? "Giriş yap" : "Kayıt ol"}</button>
        {msg && <p role="status" className={`text-sm font-bold ${msg.ok ? "text-tide" : "text-coral"}`}>{msg.t}</p>}
        <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setMsg(null); }} className="text-sm font-bold underline">{mode === "login" ? "Hesabın yok mu? Kayıt ol" : "Hesabın var mı? Giriş yap"}</button>
      </div>
    </main>
  );
}
