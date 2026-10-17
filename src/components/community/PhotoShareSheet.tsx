"use client";
import { MAX_IMAGES, errText, removeImages, rpc, uploadPostImages, type Community } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faArrowLeft, faImages, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import Sheet, { fieldClass } from "./Sheet";

const MAX = 2200;

/**
 * Instagram tarzı iki adımlı fotoğraf paylaşımı: 1) fotoğraf(lar)ı seç, 2) açıklama yaz ve paylaş.
 * Fotoğraflar yüklenmeden önce küçültülür; ızgaralar için küçük kopya da kaydedilir.
 */
export default function PhotoShareSheet({
  communities,
  defaultCommunity,
  onClose,
  onPosted,
}: {
  communities: Community[];
  defaultCommunity?: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const { user } = useUser();
  const [step, setStep] = useState<"pick" | "write">("pick");
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [community, setCommunity] = useState(defaultCommunity && communities.some((c) => c.id === defaultCommunity) ? defaultCommunity : (communities[0]?.id ?? ""));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const pick = (list: FileList | null) => {
    if (!list) return;
    setErr(files.length + list.length > MAX_IMAGES ? `En fazla ${MAX_IMAGES} fotoğraf ekleyebilirsin.` : "");
    setFiles([...files, ...Array.from(list)].slice(0, MAX_IMAGES));
    if (input.current) input.current.value = "";
  };

  const share = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || busy) return;
    if (!community) return setErr("Paylaşmak için bir topluluğa katılmalısın.");
    if (!files.length) return setErr("En az bir fotoğraf seç.");
    setBusy(true);
    setErr("");
    let paths: string[] = [];
    try {
      paths = await uploadPostImages(user.id, files);
      await rpc("community_create_post", { p_community: community, p_kind: "post", p_title: null, p_body: caption.trim(), p_course: null, p_images: paths });
      onPosted();
      onClose();
    } catch (e2) {
      await removeImages(paths);
      setErr(errText(e2));
      setBusy(false);
    }
  };

  const picker = (
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => pick(e.target.files)} />
  );

  return (
    <Sheet title={step === "pick" ? "Fotoğraf seç" : "Yeni gönderi"} onClose={onClose}>
      {communities.length === 0 ? (
        <p className="rounded-2xl bg-foam p-4 text-sm">Paylaşım yapmak için önce bir topluluğa katıl. “Topluluklar” sekmesinden bölümünü, sınıfını veya bir çalışma grubunu seçebilirsin.</p>
      ) : step === "pick" ? (
        <div className="grid gap-4">
          {picker}
          {files.length === 0 ? (
            <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => input.current?.click()} className="grid aspect-[4/5] max-h-[50dvh] w-full place-items-center rounded-[24px] border-2 border-dashed border-sea/40 bg-sea/5 text-center transition-colors hover:bg-sea/10">
              <span>
                <FontAwesomeIcon icon={faImages} className="text-5xl text-sea" />
                <b className="mt-3 block font-display text-lg">Fotoğraf seç</b>
                <span className="text-xs text-ink/60">En fazla {MAX_IMAGES} fotoğraf · JPEG, PNG, WebP</span>
              </span>
            </motion.button>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {previews.map((u, i) => (
                <motion.li key={u} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-foam">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`Seçilen fotoğraf ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && files.length > 1 && <span className="absolute left-2 top-2 rounded-full bg-deep/70 px-2 py-0.5 text-[10px] font-extrabold text-white">Kapak</span>}
                  <motion.button whileTap={{ scale: 0.85 }} type="button" aria-label={`Fotoğraf ${i + 1} kaldır`} onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-deep/75 text-xs text-white">
                    <FontAwesomeIcon icon={faXmark} />
                  </motion.button>
                </motion.li>
              ))}
              {files.length < MAX_IMAGES && (
                <li>
                  <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => input.current?.click()} aria-label="Fotoğraf ekle" className="grid aspect-[4/5] w-full place-items-center rounded-2xl border-2 border-dashed border-sea/40 text-2xl text-sea hover:bg-sea/10">
                    <FontAwesomeIcon icon={faPlus} />
                  </motion.button>
                </li>
              )}
            </ul>
          )}
          {err && <p role="alert" className="text-sm font-bold text-coral">{err}</p>}
          <motion.button whileTap={{ scale: 0.95 }} type="button" disabled={!files.length} onClick={() => { setErr(""); setStep("write"); }} className="shine rounded-full bg-sea px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
            İleri
          </motion.button>
        </div>
      ) : (
        <form onSubmit={share} className="grid gap-3">
          <div className="flex gap-3">
            <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-foam">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[0]} alt="Kapak fotoğrafı" className="h-full w-full object-cover" />
              {files.length > 1 && <span className="absolute bottom-1 right-1 rounded-full bg-deep/70 px-1.5 py-0.5 text-[10px] font-extrabold text-white">+{files.length - 1}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <textarea value={caption} onChange={(e) => setCaption(e.target.value.slice(0, MAX))} rows={4} placeholder="Bir açıklama yaz… #etiket ekleyebilirsin" aria-label="Açıklama" className={`${fieldClass} resize-none`} />
              <p className="mt-1 text-right text-[11px] text-ink/50">{caption.length}/{MAX}</p>
            </div>
          </div>
          <label className="text-xs font-bold">
            Nerede paylaşılsın?
            <select value={community} onChange={(e) => setCommunity(e.target.value)} className={`${fieldClass} mt-1`}>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {err && <p role="alert" className="text-sm font-bold text-coral">{err}</p>}
          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.95 }} type="button" disabled={busy} onClick={() => { setErr(""); setStep("pick"); }} aria-label="Geri" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-foam disabled:opacity-50">
              <FontAwesomeIcon icon={faArrowLeft} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} disabled={busy} className="shine flex-1 rounded-full bg-sea px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
              {busy ? "Paylaşılıyor…" : "Paylaş"}
            </motion.button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
