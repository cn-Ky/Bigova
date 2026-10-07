"use client";
import Coin from "@/components/bigocuk/Coin";
import { COIN_NAME } from "@/lib/bigocuk/config";
import { inviteLink, REF_REWARD, type ReferralInfo } from "@/lib/referral";
import { supabaseBrowser } from "@/lib/supabase/client";
import { faCheck, faCopy, faShareNodes, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/** Arkadaş daveti: kişisel kod + bağlantı. Kayıt olan arkadaş ve davet eden +30 Bigcoin kazanır. */
export default function InviteCard() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    let alive = true;
    supabaseBrowser()
      .rpc("my_referral")
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data) setFailed(true);
        else setInfo(data as ReferralInfo);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return null; // SQL henüz kurulmadıysa kartı gizle
  const link = info && typeof window !== "undefined" ? inviteLink(location.origin, info.code) : "";
  const text = `Bigova'ya katıl, ikimiz de ${REF_REWARD} ${COIN_NAME} kazanalım! Davet kodum: ${info?.code ?? ""}`;

  async function copy(what: "code" | "link") {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(what === "code" ? info.code : link);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  }
  async function share() {
    if (!info) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Bigova daveti", text, url: link });
        return;
      } catch {
        /* kullanıcı vazgeçti */
      }
    }
    void copy("link");
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] bg-card p-4 shadow-sm" aria-labelledby="invite-title">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sun/30 text-xl text-deep">
          <FontAwesomeIcon icon={faUserPlus} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h2 id="invite-title" className="font-display text-lg font-extrabold">
            Arkadaşını davet et
          </h2>
          <p className="mt-0.5 text-sm text-ink/70">
            Davetinle kayıt olan her arkadaşın için ikiniz de{" "}
            <b className="inline-flex items-center gap-1 align-middle">
              +{REF_REWARD} <Coin size={15} /> {COIN_NAME}
            </b>{" "}
            kazanırsınız.
          </p>
        </div>
      </div>

      {!info ? (
        <div className="shimmer mt-3 h-14 rounded-2xl" />
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-foam p-2 pl-4">
            <span className="min-w-0 flex-1 truncate font-display text-2xl font-extrabold tracking-[.25em]" aria-label={`Davet kodun ${info.code.split("").join(" ")}`}>
              {info.code}
            </span>
            <button
              onClick={() => copy("code")}
              className="flex items-center gap-2 rounded-xl bg-sea px-3.5 py-2.5 text-sm font-bold text-white"
            >
              <FontAwesomeIcon icon={copied === "code" ? faCheck : faCopy} /> {copied === "code" ? "Kopyalandı" : "Kodu kopyala"}
            </button>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={share}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-sun px-4 py-3 font-display text-base font-extrabold text-deep"
          >
            <FontAwesomeIcon icon={copied === "link" ? faCheck : faShareNodes} />
            {copied === "link" ? "Bağlantı kopyalandı" : "Davet bağlantısını paylaş"}
          </motion.button>
          <p className="mt-3 text-center text-xs font-bold text-ink/60">
            {info.invited > 0
              ? `${info.invited} arkadaşın katıldı · toplam ${info.earned} ${COIN_NAME} kazandın`
              : "Henüz davet ettiğin biri katılmadı."}{" "}
            · En fazla {info.limit} davetten ödül alınır.
          </p>
        </>
      )}
    </section>
  );
}
