"use client";
import { errText, postStory } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faImage, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import Sheet, { fieldClass } from "./Sheet";

const MAX = 200;

/** Hikaye ekle: fotoğraf seç, isteğe bağlı kısa bir yazı ekle, paylaş. Hikaye 24 saat sonra kendiliğinden kalkar. */
export default function StoryComposer({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const share = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || busy) return;
    setBusy(true);
    setErr("");
    try {
      await postStory(user.id, file, caption);
      onPosted();
      onClose();
    } catch (e2) {
      setErr(errText(e2));
      setBusy(false);
    }
  };

  return (
    <Sheet title="Hikaye ekle" onClose={onClose}>
      <form onSubmit={share} className="grid gap-3">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErr(""); if (input.current) input.current.value = ""; }} />
        {preview ? (
          <div className="relative mx-auto aspect-[9/16] max-h-[52dvh] overflow-hidden rounded-[24px] bg-foam">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Hikaye önizlemesi" className="h-full w-full object-cover" />
            {caption && <p className="absolute inset-x-3 bottom-4 rounded-xl bg-deep/60 px-3 py-2 text-center text-sm font-bold text-white">{caption}</p>}
            <motion.button whileTap={{ scale: 0.88 }} type="button" onClick={() => input.current?.click()} aria-label="Başka fotoğraf seç" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-deep/70 text-white">
              <FontAwesomeIcon icon={faRotateLeft} />
            </motion.button>
          </div>
        ) : (
          <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => input.current?.click()} className="mx-auto grid aspect-[9/16] max-h-[52dvh] w-full max-w-[18rem] place-items-center rounded-[24px] border-2 border-dashed border-sea/40 bg-sea/5 text-center hover:bg-sea/10">
            <span>
              <FontAwesomeIcon icon={faImage} className="text-5xl text-sea" />
              <b className="mt-3 block font-display text-lg">Fotoğraf seç</b>
              <span className="text-xs text-ink/60">24 saat görünür</span>
            </span>
          </motion.button>
        )}
        <label className="text-xs font-bold">
          Yazı (isteğe bağlı)
          <input value={caption} onChange={(e) => setCaption(e.target.value.slice(0, MAX))} placeholder="Kısa bir not ekle…" className={`${fieldClass} mt-1`} />
          <span className="mt-1 block text-right font-normal text-ink/50">{caption.length}/{MAX}</span>
        </label>
        {err && <p role="alert" className="text-sm font-bold text-coral">{err}</p>}
        <motion.button whileTap={{ scale: 0.95 }} disabled={!file || busy} className="shine rounded-full bg-sea px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Paylaşılıyor…" : "Hikayeni paylaş"}
        </motion.button>
      </form>
    </Sheet>
  );
}
