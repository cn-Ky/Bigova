"use client";
import Mascot from "@/components/Mascot";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
    faArrowUpRightFromSquare,
    faCloudArrowUp,
    faFilePdf,
    faLock,
    faMagnifyingGlass,
    faPlus,
    faTrash,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type N = {
  id: string;
  title: string;
  course: string;
  description: string | null;
  file_path: string;
  file_name: string | null;
  size_bytes: number | null;
  author_id: string;
  created_at: string;
  profiles: { name: string } | null;
};
const MAX = 10 * 1024 * 1024;
const size = (b?: number | null) =>
  !b
    ? ""
    : b > 1048576
      ? `${(b / 1048576).toFixed(1)} MB`
      : `${Math.max(1, Math.round(b / 1024))} KB`;
const date = (s: string) =>
  new Date(s).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

export default function Notlar() {
  const { user } = useUser();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [items, setItems] = useState<N[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("Tümü");
  const [sheet, setSheet] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await sb
      .from("notes")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      setErr("Notlar yüklenemedi.");
      setItems([]);
    } else setItems(data as unknown as N[]);
  }, [sb]);
  useEffect(() => {
    if (user) load();
    else if (user === null) setItems([]);
  }, [user, load]);

  const courses = useMemo(
    () => ["Tümü", ...Array.from(new Set((items ?? []).map((n) => n.course)))],
    [items],
  );
  const shown = (items ?? []).filter(
    (n) =>
      (course === "Tümü" || n.course === course) &&
      `${n.title} ${n.course}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  async function open(n: N) {
    const { data, error } = await sb.storage
      .from("notes")
      .createSignedUrl(n.file_path, 120);
    if (error || !data) return setErr("Dosya açılamadı.");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }
  async function remove(n: N) {
    if (!confirm(`"${n.title}" silinsin mi?`)) return;
    const { error } = await sb.from("notes").delete().eq("id", n.id);
    if (error) return setErr("Silinemedi.");
    await sb.storage.from("notes").remove([n.file_path]);
    setItems((l) => (l ?? []).filter((x) => x.id !== n.id));
  }

  return (
    <main>
      <header className="sticky top-0 z-20 rounded-b-[28px] bg-sea px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Notlar</h1>
            <p className="text-sm text-white/75">
              Ders notu ve PDF paylaş, ara, indir.
            </p>
          </div>
          {user && (
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setSheet(true)}
              className="shine flex items-center gap-2 rounded-full bg-sun px-4 py-2.5 font-display font-bold text-deep"
            >
              <FontAwesomeIcon icon={faPlus} /> Not yükle
            </motion.button>
          )}
        </div>
        {user && (
          <>
            <label className="mt-3 flex items-center gap-2 rounded-full bg-card px-4 py-3 text-ink">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="opacity-50"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Not veya ders ara"
                aria-label="Not ara"
                className="w-full bg-transparent outline-none"
              />
            </label>
            <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
              {courses.map((c) => (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  key={c}
                  onClick={() => setCourse(c)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${course === c ? "bg-sun text-deep" : "bg-white/15"}`}
                >
                  {c}
                </motion.button>
              ))}
            </div>
          </>
        )}
      </header>

      <section className="px-5 pt-5" aria-labelledby="sample-pdfs">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2
              id="sample-pdfs"
              className="font-display text-lg font-extrabold"
            >
              Örnek PDF'ler
            </h2>
            <p className="text-xs text-ink/65">
              İçerik ve dosya akışını denemek için temsili materyaller.
            </p>
          </div>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {[
            {
              id: "mikroekonomi",
              title: "Mikroekonomi Vize Özeti",
              course: "Mikroekonomi",
              description:
                "Arz-talep, esneklik ve tüketici dengesi için kısa tekrar notu.",
            },
            {
              id: "pazarlama",
              title: "Pazarlama İlkeleri Ders Notu",
              course: "Pazarlama İlkeleri",
              description:
                "Pazarlama karması, segmentasyon ve hedef kitle başlıkları.",
            },
          ].map((note) => (
            <li
              key={note.id}
              className="flex items-start gap-3 rounded-[20px] bg-card p-4 shadow-sm"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-coral/20 text-coral">
                <FontAwesomeIcon icon={faFilePdf} />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block font-display leading-tight">{note.title}</b>
                <span className="mt-1 inline-block rounded-full bg-tide/20 px-2.5 py-0.5 text-xs font-bold">
                  {note.course}
                </span>
                <p className="mt-2 text-sm text-ink/70">{note.description}</p>
                <p className="mt-1 text-xs font-bold text-coral">
                  Temsili örnek içerik
                </p>
              </div>
              <a
                href={`/api/sample-notes/${note.id}`}
                target="_blank"
                rel="noopener"
                aria-label={`${note.title} PDF aç`}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sea text-white"
              >
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </a>
            </li>
          ))}
        </ul>
      </section>

      {user === null && (
        <div className="px-5 py-14 text-center">
          <Mascot size={110} className="mx-auto" />
          <p className="mt-2 font-display text-xl font-bold">
            <FontAwesomeIcon icon={faLock} className="mr-2 text-coral" />
            Notlar sadece öğrencilere açık
          </p>
          <p className="mt-1 text-sm text-ink/70">
            Okul mailinle giriş yapınca notları görebilir ve paylaşabilirsin.
          </p>
          <Link
            href="/giris"
            className="mt-5 inline-block rounded-full bg-sea px-6 py-3 font-bold text-white"
          >
            Giriş yap
          </Link>
        </div>
      )}
      {err && (
        <p role="alert" className="px-5 pt-4 text-sm font-bold text-coral">
          {err}
        </p>
      )}
      {user && (
        <ul className="grid gap-3 px-5 pt-5 md:grid-cols-2 xl:grid-cols-3">
          {items === null &&
            [0, 1, 2].map((i) => (
              <li key={i} className="shimmer h-32 rounded-[24px]" />
            ))}
          <AnimatePresence initial={false}>
            {shown.map((n) => (
              <motion.li
                key={n.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-[24px] bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-coral/20 text-coral">
                    <FontAwesomeIcon icon={faFilePdf} className="text-xl" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block break-words font-display text-lg leading-tight">
                      {n.title}
                    </b>
                    <span className="mt-1 inline-block rounded-full bg-tide/20 px-3 py-0.5 text-xs font-bold">
                      {n.course}
                    </span>
                  </div>
                </div>
                {n.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-ink/75">
                    {n.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-ink/60">
                  {n.profiles?.name || "Öğrenci"} · {date(n.created_at)}
                  {n.size_bytes ? ` · ${size(n.size_bytes)}` : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => open(n)}
                    className="inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2 text-sm font-bold text-white"
                  >
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} /> Aç
                  </motion.button>
                  {n.author_id === user.id && (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => remove(n)}
                      aria-label="Sil"
                      className="grid h-9 w-9 place-items-center rounded-full bg-coral/15 text-coral"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </motion.button>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {user && items && shown.length === 0 && !err && (
        <div className="px-5 py-12 text-center">
          <Mascot size={96} className="mx-auto" />
          <p className="mt-2 font-display text-lg font-bold">
            {items.length ? "Sonuç bulunamadı" : "İlk notu sen paylaş!"}
          </p>
          <p className="text-sm text-ink/70">
            {items.length
              ? "Başka bir kelime dene."
              : "“Not yükle” butonuyla PDF ekleyebilirsin."}
          </p>
        </div>
      )}

      <AnimatePresence>
        {sheet && user && (
          <UploadSheet
            uid={user.id}
            onClose={() => setSheet(false)}
            onDone={() => {
              setSheet(false);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function UploadSheet({
  uid,
  onClose,
  onDone,
}: {
  uid: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const pick = (f?: File | null) => {
    if (!f) return;
    setMsg("");
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf"))
      return setMsg("Sadece PDF yüklenebilir.");
    if (f.size > MAX) return setMsg("Dosya en fazla 10 MB olabilir.");
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, "").slice(0, 120));
  };
  async function submit() {
    if (!file) return setMsg("Bir PDF seç.");
    if (!title.trim() || !course.trim())
      return setMsg("Başlık ve ders adı gerekli.");
    setBusy(true);
    setMsg("");
    const path = `${uid}/${crypto.randomUUID()}.pdf`;
    const up = await sb.storage
      .from("notes")
      .upload(path, file, { contentType: "application/pdf" });
    if (up.error) {
      setBusy(false);
      return setMsg("Yükleme başarısız: " + up.error.message);
    }
    const ins = await sb
      .from("notes")
      .insert({
        title: title.trim(),
        course: course.trim(),
        description: desc.trim() || null,
        file_path: path,
        file_name: file.name,
        size_bytes: file.size,
      });
    if (ins.error) {
      await sb.storage.from("notes").remove([path]);
      setBusy(false);
      return setMsg("Kaydedilemedi: " + ins.error.message);
    }
    onDone();
  }
  const f = "rounded-2xl bg-foam p-4 outline-none focus:ring-2 focus:ring-tide";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-deep/60 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Not yükle"
        className="grid max-h-[92dvh] w-full max-w-md gap-3 overflow-y-auto rounded-t-[32px] bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink md:rounded-[32px]"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold">Not yükle</h2>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="grid h-9 w-9 place-items-center rounded-full bg-foam"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files[0]);
          }}
          className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition ${drag ? "scale-[1.02] border-tide bg-tide/10" : "border-ink/20 bg-foam"}`}
        >
          <motion.span
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-3xl text-tide"
          >
            <FontAwesomeIcon icon={file ? faFilePdf : faCloudArrowUp} />
          </motion.span>
          <b className="mt-1 break-all">
            {file ? file.name : "PDF seç veya sürükle"}
          </b>
          <span className="text-xs text-ink/60">
            {file ? size(file.size) : "En fazla 10 MB"}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Başlık (ör. Vize özeti)"
          className={f}
        />
        <input
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          maxLength={60}
          placeholder="Ders (ör. Mikroekonomi)"
          className={f}
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Açıklama (isteğe bağlı)"
          className={f}
        />
        {msg && (
          <p role="alert" className="text-sm font-bold text-coral">
            {msg}
          </p>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={submit}
          disabled={busy}
          className="rounded-2xl bg-sea p-4 font-display text-lg font-bold text-white disabled:opacity-60"
        >
          {busy ? "Yükleniyor…" : "Paylaş"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
