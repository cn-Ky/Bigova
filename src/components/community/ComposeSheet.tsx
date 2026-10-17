"use client";
import { MAX_IMAGES, errText, removeImages, rpc, uploadPostImages, type Community, type FeedPost } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faImage, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import QuotedPost from "./QuotedPost";
import Sheet, { fieldClass } from "./Sheet";

/** Gönderi paylaş: metin yaz, en fazla 4 fotoğraf ekle (birden çok hedef grup varsa seçtirir). */
export default function ComposeSheet({
  communities,
  defaultCommunity,
  defaultKind = "post",
  lockKind = true,
  quote,
  onClose,
  onPosted,
}: {
  communities: Community[];
  defaultCommunity?: string;
  defaultKind?: "post" | "question";
  lockKind?: boolean;
  /** Dolu ise alıntı modu: bu gönderi alıntılanır (topluluk ve tür değiştirilemez). */
  quote?: FeedPost;
  onClose: () => void;
  onPosted: () => void;
}) {
  const { user } = useUser();
  const [kind, setKind] = useState<"post" | "question">(defaultKind);
  const [community, setCommunity] = useState(defaultCommunity && communities.some((c) => c.id === defaultCommunity) ? defaultCommunity : (communities[0]?.id ?? ""));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [course, setCourse] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, MAX_IMAGES);
    if (files.length + list.length > MAX_IMAGES) setErr(`En fazla ${MAX_IMAGES} fotoğraf ekleyebilirsin.`);
    else setErr("");
    setFiles(next);
    if (input.current) input.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (quote) {
      if (!body.trim() && !files.length) return setErr("Alıntıya bir şeyler yaz ya da düz yeniden paylaş.");
    } else if (!community) return setErr("Paylaşmak için önce bölümünü ve sınıfını seçmelisin.");
    if (!quote && kind === "question" && title.trim().length < 5) return setErr("Sorunun başlığı en az 5 karakter olmalı.");
    if (!quote && !body.trim() && !files.length && kind === "post") return setErr("Bir şeyler yaz veya fotoğraf ekle.");
    if (!quote && kind === "question" && !body.trim()) return setErr("Sorunu birkaç cümleyle açıkla.");
    setBusy(true);
    setErr("");
    let paths: string[] = [];
    try {
      paths = files.length ? await uploadPostImages(user.id, files) : [];
      if (quote) await rpc("community_quote_post", { p_post: quote.id, p_body: body.trim(), p_images: paths });
      else
        await rpc("community_create_post", {
          p_community: community,
          p_kind: kind,
          p_title: title.trim() || null,
          p_body: body.trim(),
          p_course: kind === "question" ? course.trim() || null : null,
          p_images: paths,
        });
      onPosted();
      onClose();
    } catch (e2) {
      await removeImages(paths);
      setErr(errText(e2));
      setBusy(false);
    }
  };

  return (
    <Sheet title={quote ? "Alıntıla" : kind === "question" ? "Soru sor" : "Gönderi paylaş"} onClose={onClose}>
      {!quote && communities.length === 0 ? (
        <p className="rounded-2xl bg-foam p-4 text-sm">Paylaşım yapmak için önce Akış sayfasından bölümünü ve sınıfını seç.</p>
      ) : (
        <form onSubmit={submit} className="grid gap-3">
          {!lockKind && !quote && (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-foam p-1" role="tablist" aria-label="Gönderi türü">
              {(["post", "question"] as const).map((k) => (
                <motion.button key={k} whileTap={{ scale: 0.95 }} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${kind === k ? "bg-sea text-white shadow-sm" : "text-ink/65"}`}>
                  {k === "post" ? "Paylaşım" : "Soru"}
                </motion.button>
              ))}
            </div>
          )}
          {!quote && communities.length > 1 && (
          <label className="text-xs font-bold">
            Nerede paylaşılsın?
            <select value={community} onChange={(e) => setCommunity(e.target.value)} className={`${fieldClass} mt-1`}>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          )}
          {!quote && kind === "question" && (
            <>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Sorunun başlığı" aria-label="Başlık" className={fieldClass} />
              <input value={course} onChange={(e) => setCourse(e.target.value)} maxLength={80} placeholder="Ders (isteğe bağlı)" aria-label="Ders" className={fieldClass} />
            </>
          )}
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={4000}
              rows={kind === "question" ? 5 : 4}
              placeholder={quote ? "Yorum ekle…" : kind === "question" ? "Sorunu ayrıntılı anlat…" : "Neler oluyor?"}
              aria-label="Metin"
              className={fieldClass}
            />
            <p className="mt-1 text-right text-[11px] text-ink/50">{body.length}/4000</p>
          </div>
          {quote && (
            <QuotedPost id={quote.id} authorName={quote.author_name} body={quote.title ? `${quote.title}\n${quote.body}` : quote.body} images={quote.images} community={quote.community_name} at={quote.created_at} asLink={false} />
          )}
          {previews.length > 0 && (
            <ul className="grid grid-cols-4 gap-2">
              {previews.map((u, i) => (
                <motion.li key={u} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="relative aspect-square overflow-hidden rounded-xl bg-foam">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`Seçilen fotoğraf ${i + 1}`} className="h-full w-full object-cover" />
                  <motion.button whileTap={{ scale: 0.85 }} type="button" aria-label={`Fotoğraf ${i + 1} kaldır`} onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-deep/70 text-[10px] text-white">
                    <FontAwesomeIcon icon={faXmark} />
                  </motion.button>
                </motion.li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => pick(e.target.files)} />
            <motion.button whileTap={{ scale: 0.92 }} type="button" disabled={files.length >= MAX_IMAGES} onClick={() => input.current?.click()} className="rounded-full bg-foam px-4 py-2.5 text-sm font-bold transition-colors hover:bg-tide/15 disabled:opacity-50">
              <FontAwesomeIcon icon={faImage} className="mr-2" />
              Fotoğraf ({files.length}/{MAX_IMAGES})
            </motion.button>
            <p className="text-[11px] text-ink/55">Fotoğraflar otomatik küçültülür.</p>
          </div>
          {err && (
            <p role="alert" className="text-sm font-bold text-coral">
              {err}
            </p>
          )}
          <motion.button whileTap={{ scale: 0.95 }} disabled={busy} className="shine rounded-full bg-sea px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
            {busy ? "Paylaşılıyor…" : quote ? "Alıntıyı paylaş" : kind === "question" ? "Soruyu paylaş" : "Paylaş"}
          </motion.button>
        </form>
      )}
    </Sheet>
  );
}
