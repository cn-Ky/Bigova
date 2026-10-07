"use client";
import { disablePush, enablePush, getPushStatus, type PushStatus } from "@/lib/push";
import { useUser } from "@/lib/useUser";
import { faBell, faBellSlash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";

const DISMISS_KEY = "bigova-push-dismissed";

const COPY: Record<Exclude<PushStatus, "loading">, string> = {
  unsupported: "Bu tarayıcı anlık bildirimleri desteklemiyor.",
  "ios-install": "iPhone'da bildirim için önce Paylaş (⬆︎) → “Ana Ekrana Ekle” ile uygulamayı yükle, sonra buradan aç.",
  unconfigured: "Anlık bildirim altyapısı henüz sunucuda kurulmamış.",
  denied: "Bildirimler tarayıcıda engellenmiş. Adres çubuğundaki site ayarlarından izin ver.",
  off: "Uygulama kapalıyken bile arkadaşlarından mesaj gelince haberin olsun.",
  on: "Açık: yeni mesaj geldiğinde bu cihaza bildirim gönderilir.",
};

/**
 * Anlık bildirim açma/kapama.
 * variant="card": Ayarlar sayfasında her zaman görünür · variant="banner": Keşfet'te, sadece henüz sorulmadıysa.
 */
export default function PushControl({ variant = "card" }: { variant?: "card" | "banner" }) {
  const { user } = useUser();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    void getPushStatus().then(setStatus);
  }, [user?.id]);

  if (!user || status === "loading") return null;
  // banner: yalnızca açılabilir durumdayken ve kapatılmadıysa göster
  if (variant === "banner" && (status !== "off" || dismissed)) return null;

  async function toggle() {
    setBusy(true);
    setErr("");
    try {
      setStatus(status === "on" ? await disablePush() : await enablePush());
    } catch (e) {
      setErr((e as Error).message || "Bir şeyler ters gitti.");
      setStatus(await getPushStatus());
    } finally {
      setBusy(false);
    }
  }

  const canToggle = status === "on" || status === "off";
  return (
    <div className={`flex items-center gap-3 rounded-[22px] bg-card p-4 shadow-sm ${variant === "banner" ? "mx-5 mt-4" : ""}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${status === "on" ? "bg-tide/30" : "bg-sun/30"}`}>
        <FontAwesomeIcon icon={status === "on" || status === "off" ? faBell : faBellSlash} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <b className="block font-display">Mesaj bildirimleri</b>
        <span className="block text-sm text-ink/70">{COPY[status]}</span>
        {err && <span role="alert" className="mt-1 block text-sm font-bold text-coral">{err}</span>}
      </span>
      {canToggle && (
        <button
          onClick={toggle}
          disabled={busy}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold disabled:opacity-60 ${status === "on" ? "bg-foam text-ink" : "bg-sea text-white"}`}
        >
          {busy ? "Bekle…" : status === "on" ? "Kapat" : "Aç"}
        </button>
      )}
      {variant === "banner" && (
        <button
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {}
            setDismissed(true);
          }}
          aria-label="Şimdilik gizle"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foam text-xs"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
    </div>
  );
}
