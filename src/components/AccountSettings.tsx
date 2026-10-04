"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { EMAIL_RE, MIN_PASSWORD, REQUIRE_SCHOOL_MAIL, SCHOOL_MAIL } from "@/lib/authConfig";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
  faChevronRight,
  faEnvelope,
  faKey,
  faLock,
  faRightFromBracket,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const field = "w-full rounded-2xl bg-foam p-3.5 outline-none ring-1 ring-ink/10 focus:ring-2 focus:ring-tide";
type Msg = { t: string; ok: boolean } | null;

function Status({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p role="status" className={`text-sm font-bold ${msg.ok ? "text-tide" : "text-coral"}`}>
      {msg.t}
    </p>
  );
}

/** Mevcut şifreyi doğrular (e-posta/şifre değişikliğinden önce hesabı korur). */
async function verifyPassword(email: string, password: string) {
  const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
  return !error;
}

function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = email.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) return setMsg({ t: "Geçerli bir e-posta adresi yaz.", ok: false });
    if (REQUIRE_SCHOOL_MAIL && !SCHOOL_MAIL.test(next))
      return setMsg({ t: "Sadece ogrencinumarasi@ogr.comu.edu.tr adresi kabul edilir.", ok: false });
    if (next === currentEmail.toLowerCase()) return setMsg({ t: "Bu zaten mevcut e-posta adresin.", ok: false });
    setBusy(true);
    setMsg(null);
    try {
      if (!(await verifyPassword(currentEmail, password)))
        return setMsg({ t: "Mevcut şifre hatalı.", ok: false });
      const { error } = await supabaseBrowser().auth.updateUser(
        { email: next },
        { emailRedirectTo: `${location.origin}/auth/callback` },
      );
      if (error)
        setMsg({
          t:
            error.code === "email_exists"
              ? "Bu e-posta başka bir hesapta kullanılıyor."
              : error.status === 429
                ? "Çok sık istek gönderildi. Birkaç dakika bekleyip tekrar dene."
                : `E-posta değiştirilemedi: ${error.message}`,
          ok: false,
        });
      else {
        setMsg({
          t: "Onay bağlantısı gönderildi. Yeni adresindeki (gerekirse eski adresindeki de) bağlantıya tıklayınca değişiklik tamamlanır.",
          ok: true,
        });
        setEmail("");
        setPassword("");
      }
    } catch {
      setMsg({ t: "Sunucuya bağlanılamadı. Tekrar dene.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[22px] bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-tide/25">
          <FontAwesomeIcon icon={faEnvelope} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block">E-posta değiştir</b>
          <span className="block truncate text-sm opacity-70">{currentEmail}</span>
        </span>
        <FontAwesomeIcon icon={faChevronRight} className={`opacity-40 transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <form onSubmit={submit} className="grid gap-3 px-4 pb-4">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Yeni e-posta adresi"
            required
            className={field}
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mevcut şifren"
            required
            className={field}
          />
          <button disabled={busy} className="rounded-2xl bg-sea p-3.5 font-display font-bold text-white disabled:opacity-60">
            {busy ? "Bekle…" : "E-postayı değiştir"}
          </button>
          <Status msg={msg} />
        </form>
      )}
    </div>
  );
}

function PasswordForm({ currentEmail }: { currentEmail: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < MIN_PASSWORD) return setMsg({ t: `Yeni şifre en az ${MIN_PASSWORD} karakter olmalı.`, ok: false });
    if (next !== again) return setMsg({ t: "Yeni şifreler birbiriyle uyuşmuyor.", ok: false });
    if (next === current) return setMsg({ t: "Yeni şifre mevcut şifrenden farklı olmalı.", ok: false });
    setBusy(true);
    setMsg(null);
    try {
      if (!(await verifyPassword(currentEmail, current)))
        return setMsg({ t: "Mevcut şifre hatalı.", ok: false });
      const { error } = await supabaseBrowser().auth.updateUser({ password: next });
      if (error)
        setMsg({
          t: error.code === "same_password" ? "Yeni şifre eskisiyle aynı olamaz." : `Şifre değiştirilemedi: ${error.message}`,
          ok: false,
        });
      else {
        setMsg({ t: "Şifren güncellendi.", ok: true });
        setCurrent("");
        setNext("");
        setAgain("");
      }
    } catch {
      setMsg({ t: "Sunucuya bağlanılamadı. Tekrar dene.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[22px] bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-sun/40">
          <FontAwesomeIcon icon={faKey} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block">Şifre değiştir</b>
          <span className="block text-sm opacity-70">Hesabını güvende tut</span>
        </span>
        <FontAwesomeIcon icon={faChevronRight} className={`opacity-40 transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <form onSubmit={submit} className="grid gap-3 px-4 pb-4">
          <input
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Mevcut şifre"
            required
            className={field}
          />
          <input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder={`Yeni şifre (en az ${MIN_PASSWORD} karakter)`}
            minLength={MIN_PASSWORD}
            required
            className={field}
          />
          <input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            placeholder="Yeni şifre (tekrar)"
            minLength={MIN_PASSWORD}
            required
            className={field}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Şifreleri göster
          </label>
          <button disabled={busy} className="rounded-2xl bg-sea p-3.5 font-display font-bold text-white disabled:opacity-60">
            {busy ? "Bekle…" : "Şifreyi değiştir"}
          </button>
          <Status msg={msg} />
        </form>
      )}
    </div>
  );
}

function PrivacyToggle({ userId }: { userId: string }) {
  const [friendsOnly, setFriendsOnly] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => {
    supabaseBrowser()
      .from("profiles")
      .select("privacy")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setFriendsOnly(data?.privacy === "friends"));
  }, [userId]);
  async function toggle() {
    const next = !friendsOnly;
    setMsg(null);
    const { error } = await supabaseBrowser().rpc("set_profile_privacy", { p_value: next ? "friends" : "everyone" });
    if (error) setMsg({ t: "Ayar kaydedilemedi. profiles_upgrade.sql çalıştırıldı mı?", ok: false });
    else setFriendsOnly(next);
  }
  if (friendsOnly === null) return null;
  return (
    <div className="rounded-[22px] bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-foam">
          <FontAwesomeIcon icon={faLock} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block">Sadece arkadaşlar görsün</b>
          <span className="block text-sm opacity-70">Avatarın ve profilin yalnızca arkadaşlarına görünür.</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={friendsOnly}
          aria-label="Profili sadece arkadaşlara göster"
          onClick={toggle}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${friendsOnly ? "bg-tide" : "bg-ink/25"}`}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${friendsOnly ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>
      <div className="mt-2"><Status msg={msg} /></div>
    </div>
  );
}

/** Ayarlar > Hesap: profil, e-posta/şifre değiştirme ve çıkış (mobil dahil tüm ekranlarda). */
export default function AccountSettings() {
  const { user, fullName, email, signOut } = useUser();
  const router = useRouter();
  const ids = useMemo(() => (user ? [user.id] : []), [user]);
  const avatars = useAvatars(ids);

  if (user === undefined) return <div className="shimmer h-20 rounded-[22px]" />;
  if (!user)
    return (
      <Link
        href="/giris"
        className="flex items-center gap-3 rounded-[22px] bg-card p-4 shadow-sm transition active:scale-[.97]"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-sea text-white">
          <FontAwesomeIcon icon={faUser} />
        </span>
        <span className="flex-1">
          <b className="block">Hesap</b>
          <span className="text-sm opacity-70">Giriş yap veya kayıt ol</span>
        </span>
        <FontAwesomeIcon icon={faChevronRight} className="opacity-40" />
      </Link>
    );

  return (
    <div className="grid gap-3">
      <Link
        href={`/profil/${user.id}`}
        className="flex items-center gap-3 rounded-[22px] bg-card p-4 shadow-sm transition active:scale-[.97]"
      >
        <UserAvatar name={fullName ?? ""} avatar={avatars[user.id]} size={52} />
        <span className="min-w-0 flex-1">
          <b className="block truncate">{fullName}</b>
          <span className="block truncate text-sm opacity-70">{email}</span>
          <span className="text-xs font-bold text-sea">Profilimi gör</span>
        </span>
        <FontAwesomeIcon icon={faChevronRight} className="opacity-40" />
      </Link>
      <PrivacyToggle userId={user.id} />
      {email && <EmailForm currentEmail={email} />}
      {email && <PasswordForm currentEmail={email} />}
      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.push("/");
          router.refresh();
        }}
        className="flex items-center justify-center gap-2 rounded-[22px] bg-coral/15 p-4 font-display font-bold text-coral transition active:scale-[.97]"
      >
        <FontAwesomeIcon icon={faRightFromBracket} /> Çıkış yap
      </button>
    </div>
  );
}
