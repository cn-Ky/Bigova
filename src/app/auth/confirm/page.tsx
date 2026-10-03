"use client";
import Mascot from "@/components/Mascot";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "magiclink", "recovery"];

/**
 * E-postadaki bağlantı buraya gelir. Doğrulama, sayfadaki düğmeye basılınca yapılır;
 * böylece e-posta güvenlik tarayıcıları bağlantıyı önceden açıp tek kullanımlık kodu harcayamaz.
 */
export default function Confirm() {
  const router = useRouter();
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [type, setType] = useState<EmailOtpType>("email");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setTokenHash(p.get("token_hash"));
    const t = p.get("type") as EmailOtpType | null;
    if (t && OTP_TYPES.includes(t)) setType(t);
    setReady(true);
  }, []);

  async function verify() {
    if (!tokenHash) return;
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabaseBrowser().auth.verifyOtp({ type, token_hash: tokenHash });
      if (error) {
        setErr(
          "Bağlantının süresi dolmuş veya daha önce kullanılmış. Giriş sayfasından yeni bir doğrulama e-postası iste.",
        );
      } else {
        setDone(true);
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1200);
      }
    } catch {
      setErr("Sunucuya bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md rounded-[28px] bg-card p-6 text-center shadow-sm">
        <Mascot size={96} className="mx-auto" />
        {done ? (
          <>
            <h1 className="mt-2 font-display text-2xl font-extrabold">E-postan doğrulandı 🎉</h1>
            <p className="mt-1 text-sm text-ink/70">Seni ana sayfaya yönlendiriyoruz…</p>
          </>
        ) : ready && !tokenHash ? (
          <>
            <h1 className="mt-2 font-display text-2xl font-extrabold">Geçersiz bağlantı</h1>
            <p className="mt-1 text-sm text-ink/70">Bu doğrulama bağlantısı eksik görünüyor.</p>
            <Link href="/giris" className="mt-4 inline-block rounded-full bg-sun px-6 py-3 font-display font-bold text-deep">
              Giriş sayfasına git
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-2xl font-extrabold">E-postanı doğrula</h1>
            <p className="mt-1 text-sm text-ink/70">Hesabını etkinleştirmek için aşağıdaki düğmeye bas.</p>
            <button
              onClick={verify}
              disabled={busy || !tokenHash}
              className="mt-5 w-full rounded-2xl bg-sea p-4 font-display text-lg font-bold text-white active:scale-[.98] disabled:opacity-60"
            >
              {busy ? "Doğrulanıyor…" : "E-postamı doğrula"}
            </button>
            {err && (
              <>
                <p role="alert" className="mt-3 text-sm font-bold text-coral">{err}</p>
                <Link href="/giris" className="mt-3 inline-block text-sm font-bold underline">
                  Giriş sayfasına git
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
