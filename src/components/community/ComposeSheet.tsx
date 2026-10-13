"use client";
import { MAX_IMAGES, errText, removeImages, rpc, uploadPostImages, type Community } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faImage, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useMemo, useRef, useState } from "react";
import Sheet, { fieldClass } from "./Sheet";

/** Gönderi veya soru paylaş: topluluk seç, metin yaz, en fazla 4 fotoğraf ekle. */
export default function ComposeSheet({
  communities,
  defaultCommunity,
  defaultKind = "post",
  lockKind = false,
  onClose,
  onPosted,
}: {
  communities: Community[];
  defaultCommunity?: string;
  defaultKind?: "post" | "question";
  lockKind?: boolean;
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
    if (!community) return setErr("Paylaşmak için bir topluluğa katılmalısın.");
    if (kind === "question" && title.trim().length < 5) return setErr("Sorunun başlığı en az 5 karakter olmalı.");
    if (!body.trim() && !files.length && kind === "post") return setErr("Bir şeyler yaz veya fotoğraf ekle.");
    if (kind === "question" && !body.trim()) return setErr("Sorunu birkaç cümleyle açıkla.");
    setBusy(true);
    setErr("");
    let paths: string[] = [];
    try {
      paths = files.length ? await uploadPostImages(user.id, files) : [];
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
    <Sheet title={kind === "question" ? "Soru sor" : "Gönderi paylaş"} onClose={onClose}>
      {communities.length === 0 ? (
        <p className="rounded-2xl bg-foam p-4 text-sm">Paylaşım yapmak için önce bir topluluğa katıl. “Topluluklar” sekmesinden bölümünü, sınıfını veya bir çalışma grubunu seçebilirsin.</p>
      ) : (
        <form onSubmit={submit} className="grid gap-3">
          {!lockKind && (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-foam p-1" role="tablist" aria-label="Gönderi türü">
              {(["post", "question"] as const).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={`rounded-lg px-3 py-2 text-sm font-bold ${kind === k ? "bg-card shadow-sm" : "text-ink/65"}`}>
                  {k === "post" ? "Paylaşım" : "Soru"}
                </button>
              ))}
            </div>
          )}
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
          {kind === "question" && (
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
              placeholder={kind === "question" ? "Sorunu ayrıntılı anlat…" : "Neler oluyor?"}
              aria-label="Metin"
              className={fieldClass}
            />
            <p className="mt-1 text-right text-[11px] text-ink/50">{body.length}/4000</p>
          </div>
          {previews.length > 0 && (
            <ul className="grid grid-cols-4 gap-2">
              {previews.map((u, i) => (
                <li key={u} className="relative aspect-square overflow-hidden rounded-xl bg-foam">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`Seçilen fotoğraf ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" aria-label={`Fotoğraf ${i + 1} kaldır`} onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-[10px] text-white">
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => pick(e.target.files)} />
            <button type="button" disabled={files.length >= MAX_IMAGES} onClick={() => input.current?.click()} className="rounded-full bg-foam px-4 py-2.5 text-sm font-extrabold disabled:opacity-50">
              <FontAwesomeIcon icon={faImage} className="mr-2" />
              Fotoğraf ({files.length}/{MAX_IMAGES})
            </button>
            <p className="text-[11px] text-ink/55">Fotoğraflar otomatik küçültülür.</p>
          </div>
          {err && (
            <p role="alert" className="text-sm font-bold text-coral">
              {err}
            </p>
          )}
          <button disabled={busy} className="rounded-full bg-sea px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60">
            {busy ? "Paylaşılıyor…" : kind === "question" ? "Soruyu paylaş" : "Paylaş"}
          </button>
        </form>
      )}
    </Sheet>
  );
}
