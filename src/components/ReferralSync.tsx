"use client";
import Coin from "@/components/bigocuk/Coin";
import Mascot from "@/components/Mascot";
import { COIN_NAME } from "@/lib/bigocuk/config";
import { REF_KEY, type RedeemResult } from "@/lib/referral";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Giriş yapan kullanıcının kayıt sırasında kullandığı davet kodunu bir kez işler.
 * Sunucu fonksiyonu tekrar çağrılsa da ödülü yalnızca bir kez verir; burada sadece gereksiz
 * çağrıları azaltmak için cihaz başına bir "bitti" işareti tutulur.
 */
export default function ReferralSync() {
  const { user } = useUser();
  const [toast, setToast] = useState<RedeemResult | null>(null);
  const uid = user?.id;

  useEffect(() => {
    if (!uid) return;
    const doneKey = `bigova-ref-done:${uid}`;
    try {
      if (localStorage.getItem(doneKey)) return;
    } catch {}
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabaseBrowser().rpc("redeem_referral");
        if (error || !data || !alive) return; // SQL kurulu değilse sessizce geç
        const r = data as RedeemResult;
        if (r.status !== "unverified") {
          try {
            localStorage.setItem(doneKey, "1");
            localStorage.removeItem(REF_KEY);
          } catch {}
        }
        if (r.status === "rewarded" || r.status === "limit") setToast(r);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="notif-stack" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key="ref"
            role="status"
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="notif-card"
          >
            <Mascot size={44} />
            <span className="min-w-0 flex-1 leading-tight">
              {toast.status === "rewarded" ? (
                <>
                  <b className="flex items-center gap-1.5 font-display text-base">
                    <Coin size={18} /> +{toast.amount} {COIN_NAME} kazandın!
                  </b>
                  <span className="text-sm text-ink/70">
                    {toast.inviter ? `${toast.inviter} seni davet etti; ikiniz de ödülü aldınız.` : "Davet ödülün hesabına eklendi."}
                  </span>
                </>
              ) : (
                <>
                  <b className="block font-display text-base">Davet limiti dolmuş</b>
                  <span className="text-sm text-ink/70">Bu davet kodunun ödül hakkı bittiği için Bigcoin eklenmedi.</span>
                </>
              )}
            </span>
            <button onClick={() => setToast(null)} aria-label="Kapat" className="grid h-8 w-8 place-items-center rounded-full bg-foam text-xs font-bold">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
