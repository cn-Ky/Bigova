"use client";
import SearchBox from "@/components/SearchBox";
import { demoBooks } from "@/lib/demoData";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
    faBook,
    faPlus,
    faUser,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Book = {
  id: string;
  title: string;
  author: string | null;
  course: string | null;
  condition: string;
  price: number;
  description: string | null;
  seller_id: string | null;
  profiles: { name: string } | null;
};
const inputClass =
  "w-full rounded-xl bg-foam px-4 py-3 field-ring";

export default function KitapPazari() {
  const { user } = useUser();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [books, setBooks] = useState<Book[]>(demoBooks);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [course, setCourse] = useState("");
  const [condition, setCondition] = useState("İyi");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await sb
      .from("book_listings")
      .select("*, profiles(name)")
      .eq("status", "available")
      .order("created_at", { ascending: false });
    let localBooks: Book[] = [];
    try {
      localBooks = JSON.parse(
        localStorage.getItem("bigova-demo-books") || "[]",
      ) as Book[];
    } catch {}
    setBooks([
      ...(error ? [] : ((data as Book[]) ?? [])),
      ...localBooks,
      ...demoBooks,
    ]);
  }, [sb]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = books.filter((book) =>
    `${book.title} ${book.author ?? ""} ${book.course ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !price || Number(price) < 0)
      return setNotice("Kitap adı ve geçerli fiyat gerekli.");
    if (!user) {
      const listing: Book = {
        id: `demo-book-${crypto.randomUUID()}`,
        title: title.trim(),
        author: author.trim() || null,
        course: course.trim() || null,
        condition,
        price: Number(price),
        description: description.trim() || null,
        seller_id: null,
        profiles: { name: "Demo kullanıcısı" },
      };
      let saved: Book[] = [];
      try {
        saved = JSON.parse(
          localStorage.getItem("bigova-demo-books") || "[]",
        ) as Book[];
        localStorage.setItem(
          "bigova-demo-books",
          JSON.stringify([listing, ...saved]),
        );
      } catch {}
      setBooks((current) => [listing, ...current]);
      setTitle("");
      setAuthor("");
      setCourse("");
      setPrice("");
      setDescription("");
      setShowForm(false);
      setNotice(
        "Demo ilanı bu tarayıcıda saklandı; gerçek pazarda yayınlanmadı.",
      );
      return;
    }
    setBusy(true);
    setNotice("");
    const { error } = await sb.from("book_listings").insert({
      title: title.trim(),
      author: author.trim() || null,
      course: course.trim() || null,
      condition,
      price: Number(price),
      description: description.trim() || null,
    });
    setBusy(false);
    if (error) return setNotice(`İlan eklenemedi: ${error.message}`);
    setTitle("");
    setAuthor("");
    setCourse("");
    setPrice("");
    setDescription("");
    setShowForm(false);
    await load();
  }

  return (
    <main>
      <header className="sticky top-0 z-20 rounded-b-[24px] bg-sea px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold">
              Kitap pazarı
            </h1>
            <p className="text-sm text-white/75">
              Biga öğrencileri arasında ikinci el ders kitapları.
            </p>
          </div>
          <button
            onClick={() => {
              setNotice("");
              setShowForm(true);
            }}
            aria-label="Kitap ilanı ekle"
            title="Kitap ilanı ekle"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sun text-deep"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
        <SearchBox className="mt-3" value={query} onChange={setQuery} placeholder="Kitap, yazar veya ders ara" label="Kitap ara" />
      </header>
      {notice && !showForm && (
        <p role="status" className="mx-5 mt-4 text-sm font-bold text-coral">
          {notice}
        </p>
      )}
      <p className="px-5 pt-4 text-xs text-ink/60">
        Deneme ilanları bu tarayıcıda saklanır. Gerçek pazarda ilan yayınlamak
        ve satıcılarla iletişim kurmak için doğrulanmış öğrenci hesabı gerekir.
      </p>
      <ul className="grid gap-3 px-5 pt-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((book) => (
          <li key={book.id} className="rounded-[20px] bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sun/30 text-deep">
                <FontAwesomeIcon icon={faBook} />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block break-words font-display text-lg leading-tight">
                  {book.title}
                </b>
                <p className="mt-1 text-sm text-ink/65">
                  {book.author || "Yazar belirtilmemiş"}
                </p>
              </div>
              <b className="shrink-0 text-coral">{book.price} TL</b>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-tide/20 px-3 py-1 font-bold">
                {book.course || "Ders belirtilmemiş"}
              </span>
              <span className="rounded-full bg-foam px-3 py-1">
                {book.condition}
              </span>
            </div>
            {book.description && (
              <p className="mt-3 text-sm text-ink/75">{book.description}</p>
            )}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-ink/10 pt-3">
              <span className="min-w-0 truncate text-xs text-ink/60">
                <FontAwesomeIcon icon={faUser} className="mr-1" />
                {book.profiles?.name || "Öğrenci"}
                {book.id.startsWith("demo-") ? " · Örnek ilan" : ""}
              </span>
              {book.seller_id && user && book.seller_id !== user.id && (
                <Link
                  href={`/arkadaslar/${book.seller_id}`}
                  className="shrink-0 rounded-full bg-sea px-3 py-2 text-xs font-bold text-white"
                >
                  Satıcıya yaz
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
      {shown.length === 0 && (
        <p className="px-5 py-12 text-center text-sm text-ink/65">
          Aramana uygun kitap bulunamadı.
        </p>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-deep/60 backdrop-blur-sm md:items-center"
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="grid max-h-[92dvh] w-full max-w-md gap-3 overflow-y-auto rounded-t-[24px] bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink md:rounded-[24px]"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold">
                Yeni kitap ilanı
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Kapat"
                className="grid h-9 w-9 place-items-center rounded-full bg-foam"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            {!user && (
              <p className="text-sm text-ink/65">
                Deneme ilanı sadece bu tarayıcıya kaydedilir.
              </p>
            )}
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Kitap adı"
              required
            />
            <input
              className={inputClass}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={120}
              placeholder="Yazar (isteğe bağlı)"
            />
            <input
              className={inputClass}
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              maxLength={80}
              placeholder="Ders / bölüm"
            />
            <select
              className={inputClass}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option>Yeni</option>
              <option>Çok iyi</option>
              <option>İyi</option>
              <option>Kullanılmış</option>
            </select>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Fiyat (TL)"
              required
            />
            <textarea
              className={inputClass}
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kitabın durumu ve teslim bilgisi"
            />
            {notice && (
              <p role="alert" className="text-sm font-bold text-coral">
                {notice}
              </p>
            )}
            <button
              disabled={busy}
              className="rounded-xl bg-sea p-3 font-bold text-white disabled:opacity-50"
            >
              {busy ? "Ekleniyor…" : "İlanı yayınla"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
