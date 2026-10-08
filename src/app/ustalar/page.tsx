"use client";
import SearchBox from "@/components/SearchBox";
import Mascot from "@/components/Mascot";
import {
  PRICE_UNITS,
  SORTS,
  USTA_CATEGORIES,
  categoryIcon,
  demoUstalar,
  digits,
  formatPrice,
  fullName,
  isDemoUsta,
  timeAgo,
  toWa,
  type SortId,
  type Usta,
} from "@/lib/ustaData";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
  faBolt,
  faChevronDown,
  faClock,
  faCommentDots,
  faLocationDot,
  faMedal,
  faPhone,
  faPlus,
  faSackDollar,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

const inputClass = "w-full rounded-xl bg-foam px-4 py-3 field-ring";
const LOCAL_KEY = "bigova-demo-ustalar";
const emptyForm = {
  first_name: "",
  last_name: "",
  category: USTA_CATEGORIES[0] as string,
  phone: "",
  whatsapp: "",
  district: "",
  price_from: "",
  price_unit: PRICE_UNITS[0] as string,
  price_note: "",
  experience_years: "",
  emergency: false,
  description: "",
  consent: false,
};
const telUrl = (p: string) => `tel:${p.replace(/\s/g, "")}`;

export default function Ustalar() {
  const { user } = useUser();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [items, setItems] = useState<Usta[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tümü");
  const [sort, setSort] = useState<SortId>("new");
  const [onlyEmergency, setOnlyEmergency] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const v = new URLSearchParams(location.search).get("q");
    if (v) setQ(v);
  }, []);

  const load = useCallback(async () => {
    let remote: Usta[] = [];
    try {
      const { data, error } = await sb
        .from("service_providers")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (!error && data) remote = data as Usta[];
    } catch {}
    let local: Usta[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") as Usta[];
    } catch {}
    setItems([...remote, ...local, ...demoUstalar]);
  }, [sb]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    const list = (items ?? []).filter(
      (u) =>
        (cat === "Tümü" || u.category === cat) &&
        (!onlyEmergency || u.emergency) &&
        `${fullName(u)} ${u.category} ${u.district ?? ""} ${u.description ?? ""} ${u.price_note ?? ""}`
          .toLocaleLowerCase("tr")
          .includes(needle),
    );
    if (sort === "price")
      list.sort((a, b) => (a.price_from ?? Infinity) - (b.price_from ?? Infinity));
    else if (sort === "exp")
      list.sort((a, b) => (b.experience_years ?? -1) - (a.experience_years ?? -1));
    return list;
  }, [items, q, cat, sort, onlyEmergency]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const first = form.first_name.trim();
    const last = form.last_name.trim();
    const phoneDigits = digits(form.phone);
    const wa = form.whatsapp.trim() ? toWa(form.whatsapp) : "";
    const price = form.price_from.trim() ? Number(form.price_from) : null;
    const exp = form.experience_years.trim() ? Number(form.experience_years) : null;
    if (first.length < 2 || last.length < 2) return setNotice("Ad ve soyad en az 2 karakter olmalı.");
    if (phoneDigits.length < 10 || phoneDigits.length > 15)
      return setNotice("Geçerli bir telefon numarası gir (ör. 0505 000 00 00).");
    if (wa && !/^\d{10,15}$/.test(wa)) return setNotice("WhatsApp numarası geçerli değil.");
    if (price !== null && (!Number.isInteger(price) || price < 0 || price > 1_000_000))
      return setNotice("Fiyat 0 ile 1.000.000 arasında tam sayı olmalı.");
    if (exp !== null && (!Number.isInteger(exp) || exp < 0 || exp > 60))
      return setNotice("Deneyim yılı 0 ile 60 arasında olmalı.");
    if (!form.consent)
      return setNotice("Bilgilerin yayınlanması için kişinin onayı olduğunu işaretlemelisin.");
    const payload = {
      first_name: first,
      last_name: last,
      category: form.category,
      phone: form.phone.trim(),
      whatsapp: wa || null,
      district: form.district.trim() || null,
      price_from: price,
      price_unit: price === null ? null : form.price_unit,
      price_note: form.price_note.trim() || null,
      experience_years: exp,
      emergency: form.emergency,
      description: form.description.trim() || null,
    };
    setBusy(true);
    setNotice("");
    if (!user) {
      const rec: Usta = {
        ...payload,
        id: `demo-usta-${crypto.randomUUID()}`,
        created_at: new Date().toISOString(),
      };
      try {
        const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") as Usta[];
        localStorage.setItem(LOCAL_KEY, JSON.stringify([rec, ...saved]));
      } catch {}
      setItems((c) => [rec, ...(c ?? [])]);
      setBusy(false);
      setForm(emptyForm);
      setShowForm(false);
      setNotice("Deneme kaydı bu tarayıcıda saklandı; gerçek rehberde yayınlanmadı.");
      return;
    }
    const { error } = await sb.from("service_providers").insert(payload);
    setBusy(false);
    if (error) return setNotice(`Usta eklenemedi: ${error.message}`);
    setForm(emptyForm);
    setShowForm(false);
    await load();
  }

  return (
    <main>
      <header className="sticky top-0 z-20 rounded-b-[28px] bg-sea px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Usta Bul</h1>
            <p className="text-sm text-white/75">
              Tesisatçı, elektrikçi, mobilyacı ve daha fazlası: telefon ve fiyat bilgisiyle.
            </p>
          </div>
          <button
            onClick={() => {
              setNotice("");
              setShowForm(true);
            }}
            aria-label="Usta ekle"
            title="Usta ekle"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sun text-deep"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
        <SearchBox className="mt-3" value={q} onChange={setQ} placeholder="Usta, meslek veya mahalle ara" label="Usta ara" />
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {["Tümü", ...USTA_CATEGORIES].map((c) => (
            <motion.button
              whileTap={{ scale: 0.9 }}
              key={c}
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${cat === c ? "bg-sun text-deep" : "bg-white/15 text-white"}`}
            >
              {c}
            </motion.button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortId)}
          aria-label="Sırala"
          className="rounded-full bg-card px-4 py-2 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-tide"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setOnlyEmergency((v) => !v)}
          aria-pressed={onlyEmergency}
          className={`rounded-full px-4 py-2 text-sm font-bold shadow-sm transition-colors ${onlyEmergency ? "bg-tide text-deep" : "bg-card"}`}
        >
          <FontAwesomeIcon icon={faBolt} className="mr-1.5" />
          Acil çağrı
        </button>
        {items && <span className="ml-auto text-xs text-ink/60">{shown.length} usta</span>}
      </div>

      {notice && !showForm && (
        <p role="status" className="mx-5 mt-3 text-sm font-bold text-coral">
          {notice}
        </p>
      )}
      <p className="px-5 pt-3 text-xs text-ink/60">
        “Örnek” etiketli kayıtlar temsilidir. Fiyatlar başlangıç tutarıdır, kesin fiyat işin
        kapsamına göre değişir. İş başlamadan fiyatı netleştir, peşin ödeme yapma. Bigova
        ustaların işçiliğinden sorumlu değildir.
      </p>

      <ul className="grid items-start gap-3 px-5 pt-3 md:grid-cols-2 xl:grid-cols-3">
        {items === null &&
          [0, 1, 2].map((i) => <li key={i} className="shimmer h-36 rounded-[24px]" />)}
        <AnimatePresence initial={false}>
          {shown.map((u) => {
            const open = openId === u.id;
            return (
              <motion.li
                key={u.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="rounded-[24px] bg-card p-4 shadow-sm"
              >
                <button
                  onClick={() => setOpenId(open ? null : u.id)}
                  aria-expanded={open}
                  className="block w-full text-left"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tide/25 text-deep">
                      <FontAwesomeIcon icon={categoryIcon(u.category)} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="block break-words font-display text-lg leading-tight">
                        {fullName(u)}
                      </b>
                      <p className="mt-0.5 text-sm text-ink/65">{u.category}</p>
                    </div>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`mt-1 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {u.emergency && (
                      <span className="rounded-full bg-coral/25 px-3 py-1 font-bold">
                        <FontAwesomeIcon icon={faBolt} className="mr-1" />
                        Acil çağrı
                      </span>
                    )}
                    {u.experience_years != null && (
                      <span className="rounded-full bg-sun/30 px-3 py-1 font-bold">
                        <FontAwesomeIcon icon={faMedal} className="mr-1" />
                        {u.experience_years} yıl deneyim
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/80">
                    {u.district && (
                      <span>
                        <FontAwesomeIcon icon={faLocationDot} /> {u.district}
                      </span>
                    )}
                    <span className="font-bold text-coral">
                      <FontAwesomeIcon icon={faSackDollar} /> {formatPrice(u)}
                    </span>
                  </div>
                </button>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <motion.a
                    whileTap={{ scale: 0.9 }}
                    href={telUrl(u.phone)}
                    className="inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2 text-sm font-bold text-white"
                  >
                    <FontAwesomeIcon icon={faPhone} /> Ara
                  </motion.a>
                  {u.whatsapp && (
                    <motion.a
                      whileTap={{ scale: 0.9 }}
                      href={`https://wa.me/${u.whatsapp}?text=${encodeURIComponent(`Merhaba ${u.first_name} Usta, Bigova'da ${u.category.toLocaleLowerCase("tr")} olarak gördüm. Müsait misiniz?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-tide px-4 py-2 text-sm font-bold text-deep"
                    >
                      <FontAwesomeIcon icon={faCommentDots} /> WhatsApp
                    </motion.a>
                  )}
                  <span className="ml-auto text-sm font-bold tabular-nums text-ink/70">{u.phone}</span>
                </div>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 border-t border-ink/10 pt-3 text-sm">
                        {u.description && (
                          <p className="whitespace-pre-line text-ink/80">{u.description}</p>
                        )}
                        <b className="mt-3 block font-display">Fiyat bilgisi</b>
                        <p className="text-ink/80">
                          {formatPrice(u)}
                          {u.price_note ? ` — ${u.price_note}` : ""}
                        </p>
                        {u.district && (
                          <>
                            <b className="mt-3 block font-display">Hizmet bölgesi</b>
                            <p className="text-ink/80">{u.district}</p>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3 text-xs text-ink/60">
                  <span>
                    <FontAwesomeIcon icon={faClock} className="mr-1" />
                    {timeAgo(u.created_at)}
                  </span>
                  {isDemoUsta(u) && <span className="font-bold text-coral">Örnek kayıt</span>}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {items && shown.length === 0 && (
        <div className="px-5 py-12 text-center">
          <Mascot size={96} className="mx-auto" />
          <p className="mt-2 font-display text-lg font-bold">Usta bulunamadı</p>
          <p className="text-sm text-ink/70">
            Filtreleri temizle, başka bir kelimeyle ara ya da bildiğin bir ustayı sen ekle.
          </p>
        </div>
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
              <h2 className="font-display text-xl font-extrabold">Usta ekle</h2>
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
                Giriş yapmadan eklenen kayıt sadece bu tarayıcıya kaydedilir.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <input className={inputClass} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} maxLength={40} placeholder="Ad" required />
              <input className={inputClass} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} maxLength={40} placeholder="Soyad" required />
            </div>
            <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)} aria-label="Meslek">
              {USTA_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input className={inputClass} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} placeholder="Telefon (05xx … veya 0286 …)" required />
            <input className={inputClass} type="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} maxLength={20} placeholder="WhatsApp (isteğe bağlı)" />
            <input className={inputClass} value={form.district} onChange={(e) => set("district", e.target.value)} maxLength={120} placeholder="Hizmet bölgesi (ör. Biga merkez)" />
            <fieldset className="grid gap-3 rounded-xl border border-ink/10 p-3">
              <legend className="px-1 text-sm font-bold">Fiyat</legend>
              <div className="grid grid-cols-2 gap-3">
                <input className={inputClass} type="number" inputMode="numeric" min={0} max={1000000} value={form.price_from} onChange={(e) => set("price_from", e.target.value)} placeholder="Başlangıç (₺)" />
                <select className={inputClass} value={form.price_unit} onChange={(e) => set("price_unit", e.target.value)} aria-label="Fiyat birimi">
                  {PRICE_UNITS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <input className={inputClass} value={form.price_note} onChange={(e) => set("price_note", e.target.value)} maxLength={160} placeholder="Fiyat notu (ör. keşif ücretsiz, malzeme ayrı)" />
              <p className="text-xs text-ink/60">Boş bırakırsan “Görüşmede belirlenir” görünür.</p>
            </fieldset>
            <input className={inputClass} type="number" inputMode="numeric" min={0} max={60} value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} placeholder="Deneyim (yıl, isteğe bağlı)" />
            <textarea className={inputClass} rows={3} maxLength={600} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Hangi işlere bakıyor? (isteğe bağlı)" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.emergency} onChange={(e) => set("emergency", e.target.checked)} className="h-4 w-4 accent-[rgb(var(--tide))]" />
              Acil çağrıya / gece ve hafta sonuna bakıyor
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--tide))]" />
              <span>Bu kişinin bilgilerini (ad, telefon, fiyat) herkese açık paylaşmak için kendisinin onayı var ya da bilgiler bana ait.</span>
            </label>
            {notice && (
              <p role="alert" className="text-sm font-bold text-coral">
                {notice}
              </p>
            )}
            <button disabled={busy} className="rounded-xl bg-sea p-3 font-bold text-white disabled:opacity-50">
              {busy ? "Ekleniyor…" : "Rehbere ekle"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
