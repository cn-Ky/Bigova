"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import type { AvatarConfig } from "@/lib/bigocuk/items";
import { MAX_IMAGES, errText, removeImages, rpc, uploadPostImages, type Community } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { faChevronDown, faImage, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { SPRING } from "./ui";

const MAX = 4000;

/** Karakter sayacı halkası: dolunca sarı, sınıra yaklaşınca mercan rengi. */
function CharRing({ used }: { used: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const left = MAX - used;
  const warn = left <= 200;
  return (
    <span className="relative inline-grid h-6 w-6 place-items-center" role="img" aria-label={`${left} karakter kaldı`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6 -rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" strokeWidth="2.5" className="stroke-ink/10" />
        <circle cx="12" cy="12" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(used / MAX, 1))} className={warn ? "stroke-coral" : "stroke-sea"} />
      </svg>
      {left <= 100 && <span className={`absolute text-[9px] font-extrabold tabular-nums ${left < 0 ? "text-coral" : "text-ink/60"}`}>{left}</span>}
    </span>
  );
}

/**
 * Akışın en üstündeki "Neler oluyor?" kutusu (X/Threads gibi): sayfadan ayrılmadan paylaşım yapılır.
 * Odaklanınca genişler; fotoğraf ekleme ve karakter halkası vardır.
 */
export default function InlineComposer({
  communities,
  avatar,
  name,
  defaultCommunity,
  onPosted,
}: {
  communities: Community[];
  avatar?: AvatarConfig;
  name: string;
  defaultCommunity?: string;
  onPosted: () => void;
}) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [community, setCommunity] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  // Hedef grup listesi geç gelirse veya değişirse geçerli bir seçim tut.
  useEffect(() => {
    if (!communities.length) return;
    setCommunity((cur) =>
      communities.some((c) => c.id === cur)
        ? cur
        : defaultCommunity && communities.some((c) => c.id === defaultCommunity)
          ? defaultCommunity
          : communities[0].id,
    );
  }, [communities, defaultCommunity]);

  // Metne göre yüksekliği ayarla
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [body, open]);

  const reset = () => {
    setBody("");
    setFiles([]);
    setErr("");
    setOpen(false);
  };
  const pick = (list: FileList | null) => {
    if (!list) return;
    if (files.length + list.length > MAX_IMAGES) setErr(`En fazla ${MAX_IMAGES} fotoğraf ekleyebilirsin.`);
    else setErr("");
    setFiles([...files, ...Array.from(list)].slice(0, MAX_IMAGES));
    if (input.current) input.current.value = "";
  };

  const canPost = (body.trim().length > 0 || files.length > 0) && body.length <= MAX && !busy && !!community;
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !canPost) return;
    setBusy(true);
    setErr("");
    let paths: string[] = [];
    try {
      paths = files.length ? await uploadPostImages(user.id, files) : [];
      await rpc("community_create_post", { p_community: community, p_kind: "post", p_title: null, p_body: body.trim(), p_course: null, p_images: paths });
      reset();
      setDone(true);
      window.setTimeout(() => setDone(false), 2200);
      onPosted();
    } catch (e2) {
      await removeImages(paths);
      setErr(errText(e2));
    } finally {
      setBusy(false);
    }
  };

  if (!communities.length)
    return (
      <div className="flex items-center gap-3 rounded-[26px] bg-card p-4 shadow-sm ring-1 ring-ink/[0.04]">
        <UserAvatar name={name} avatar={avatar} size={46} />
        <p className="min-w-0 flex-1 text-sm text-ink/70">Paylaşım yapmak için önce bölümünü ve sınıfını seç.</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="min-w-0 rounded-[26px] bg-card p-4 shadow-sm ring-1 ring-ink/[0.04] transition-shadow focus-within:shadow-lg sm:p-5">
      <div className="flex gap-3">
        <UserAvatar name={name} avatar={avatar} size={46} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <AnimatePresence initial={false}>
            {open && communities.length > 1 && (
              <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={SPRING} className="mb-1 block overflow-hidden">
                <span className="relative inline-flex items-center">
                  <span className="sr-only">Nerede paylaşılsın?</span>
                  <select value={community} onChange={(e) => setCommunity(e.target.value)} className="max-w-[14rem] appearance-none truncate rounded-full bg-sea/10 py-1 pl-3 pr-7 text-xs font-extrabold text-sea field-ring">
                    {communities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <FontAwesomeIcon icon={faChevronDown} className="pointer-events-none absolute right-2.5 text-[9px] text-sea" />
                </span>
              </motion.label>
            )}
          </AnimatePresence>
          <textarea
            ref={area}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
            }}
            rows={open ? 2 : 1}
            aria-label="Gönderi metni"
            placeholder="Neler oluyor?"
            className="block w-full resize-none bg-transparent py-2 text-[17px] leading-snug outline-none placeholder:text-ink/45"
          />
          {previews.length > 0 && (
            <ul className={`mt-1 grid gap-1 overflow-hidden rounded-[18px] ${previews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {previews.map((u, i) => (
                <motion.li key={u} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING} className="relative bg-foam">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`Seçilen fotoğraf ${i + 1}`} className={`w-full object-cover ${previews.length === 1 ? "max-h-72" : "aspect-square"}`} />
                  <motion.button whileTap={{ scale: 0.85 }} type="button" aria-label={`Fotoğraf ${i + 1} kaldır`} onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-deep/75 text-xs text-white">
                    <FontAwesomeIcon icon={faXmark} />
                  </motion.button>
                </motion.li>
              ))}
            </ul>
          )}
          <div className={`mt-2 flex items-center gap-1 ${open || body || files.length ? "border-t border-ink/[0.07] pt-2" : ""}`}>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => pick(e.target.files)} />
            <motion.button whileTap={{ scale: 0.88 }} type="button" disabled={files.length >= MAX_IMAGES} onClick={() => input.current?.click()} aria-label={`Fotoğraf ekle (${files.length}/${MAX_IMAGES})`} className="grid h-9 w-9 place-items-center rounded-full text-sea transition-colors hover:bg-sea/10 disabled:opacity-40">
              <FontAwesomeIcon icon={faImage} />
            </motion.button>
            <span className="ml-auto flex items-center gap-3">
              {body.length > 0 && <CharRing used={body.length} />}
              {(open || body || files.length > 0) && !busy && (
                <button type="button" onClick={reset} className="text-xs font-bold text-ink/55 hover:text-ink">
                  Vazgeç
                </button>
              )}
              <motion.button whileTap={{ scale: 0.92 }} disabled={!canPost} className="rounded-full bg-sea px-5 py-2 text-sm font-bold text-white transition-opacity disabled:opacity-40">
                {busy ? "Paylaşılıyor…" : "Paylaş"}
              </motion.button>
            </span>
          </div>
          <div aria-live="polite">
            {err && (
              <p role="alert" className="mt-2 text-sm font-bold text-coral">
                {err}
              </p>
            )}
            {done && <p className="mt-2 text-sm font-bold text-tide">Paylaşıldı!</p>}
          </div>
        </div>
      </div>
    </form>
  );
}
