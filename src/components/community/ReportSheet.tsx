"use client";
import { REPORT_REASONS, errText, rpc, type TargetType } from "@/lib/community";
import { motion } from "framer-motion";
import { useState } from "react";
import Sheet, { fieldClass } from "./Sheet";

/** Gönderi, yorum veya forum mesajı şikâyeti. Aynı içerik 3 kişi tarafından bildirilirse incelenene kadar gizlenir. */
export default function ReportSheet({ type, id, onClose }: { type: TargetType; id: string; onClose: () => void }) {
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const send = async () => {
    if (!reason) return setErr("Bir neden seç.");
    setBusy(true);
    setErr("");
    try {
      await rpc("community_report", { p_type: type, p_id: id, p_reason: reason, p_note: note.trim() || null });
      setDone(true);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title="Şikâyet et" onClose={onClose}>
      {done ? (
        <div>
          <p className="rounded-2xl bg-tide/20 p-4 text-sm font-bold">Bildirimin alındı. Teşekkürler; ekibimiz inceleyecek.</p>
          <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={onClose} className="mt-4 w-full rounded-full bg-sea px-4 py-3 text-sm font-bold text-white">
            Tamam
          </motion.button>
        </div>
      ) : (
        <div className="grid gap-3">
          <fieldset className="grid gap-1.5">
            <legend className="mb-1 text-sm font-bold">Neden şikâyet ediyorsun?</legend>
            {REPORT_REASONS.map((r) => (
              <motion.label key={r.id} whileTap={{ scale: 0.98 }} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${reason === r.id ? "bg-sea text-white" : "bg-foam hover:bg-tide/15"}`}>
                <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-sun" />
                {r.label}
              </motion.label>
            ))}
          </fieldset>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} placeholder="İstersen kısa bir not ekle (isteğe bağlı)" aria-label="Not" className={fieldClass} />
          {err && (
            <p role="alert" className="text-sm font-bold text-coral">
              {err}
            </p>
          )}
          <motion.button whileTap={{ scale: 0.95 }} type="button" disabled={busy} onClick={send} className="rounded-full bg-sea px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
            {busy ? "Gönderiliyor…" : "Şikâyeti gönder"}
          </motion.button>
          <p className="text-xs text-ink/60">Şikâyetin gizli tutulur; içeriğin sahibi kimin bildirdiğini görmez.</p>
        </div>
      )}
    </Sheet>
  );
}
