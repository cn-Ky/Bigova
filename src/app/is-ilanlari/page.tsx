"use client";
import Mascot from "@/components/Mascot";
import {
  JOB_CATEGORIES,
  JOB_TYPES,
  demoJobs,
  timeAgo,
  type Job,
  type JobType,
} from "@/lib/jobsData";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
  faBriefcase,
  faChevronDown,
  faClock,
  faCommentDots,
  faEnvelope,
  faGraduationCap,
  faLocationDot,
  faMagnifyingGlass,
  faPhone,
  faPlus,
  faSackDollar,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

const inputClass =
  "w-full rounded-xl bg-foam px-4 py-3 outline-none focus:ring-2 focus:ring-tide";
const LOCAL_KEY = "bigova-demo-jobs";
const emptyForm = {
  title: "",
  company: "",
  category: JOB_CATEGORIES[0],
  job_type: "Yarı zamanlı" as JobType,
  location: "",
  salary: "",
  description: "",
  requirements: "",
  contact_name: "",
  contact_phone: "",
  contact_whatsapp: "",
  contact_email: "",
  student_friendly: true,
};
const digits = (s: string) => s.replace(/\D/g, "");
// 0505... / 505... / +90505... -> 90505...
const toWa = (s: string) => {
  const d = digits(s);
  if (d.startsWith("90") && d.length >= 12) return d;
  if (d.startsWith("0")) return `90${d.slice(1)}`;
  return d.length === 10 ? `90${d}` : d;
};

export default function IsIlanlari() {
  const { user } = useUser();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("Tümü");
  const [cat, setCat] = useState("Tümü");
  const [onlyStudent, setOnlyStudent] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    let remote: Job[] = [];
    try {
      const { data, error } = await sb
        .from("job_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (!error && data) remote = data as Job[];
    } catch {}
    let local: Job[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") as Job[];
    } catch {}
    setJobs([...remote, ...local, ...demoJobs]);
  }, [sb]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = (jobs ?? []).filter(
    (j) =>
      (type === "Tümü" || j.job_type === type) &&
      (cat === "Tümü" || j.category === cat) &&
      (!onlyStudent || j.student_friendly) &&
      `${j.title} ${j.company} ${j.category} ${j.location ?? ""} ${j.description}`
        .toLowerCase()
        .includes(q.trim().toLowerCase()),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const phone = form.contact_phone.trim();
    const wa = form.contact_whatsapp.trim() ? toWa(form.contact_whatsapp) : "";
    const mail = form.contact_email.trim();
    if (form.title.trim().length < 3 || form.company.trim().length < 2)
      return setNotice("İlan başlığı ve işletme adı gerekli.");
    if (form.description.trim().length < 10)
      return setNotice("Açıklama en az 10 karakter olmalı.");
    if (!phone && !wa && !mail)
      return setNotice("En az bir iletişim yöntemi (telefon, WhatsApp veya e-posta) ekle.");
    if (wa && !/^\d{10,15}$/.test(wa))
      return setNotice("WhatsApp numarası geçerli değil.");
    if (mail && !/^\S+@\S+\.\S+$/.test(mail))
      return setNotice("E-posta adresi geçerli değil.");
    const payload = {
      title: form.title.trim(),
      company: form.company.trim(),
      category: form.category,
      job_type: form.job_type,
      location: form.location.trim() || null,
      salary: form.salary.trim() || null,
      description: form.description.trim(),
      requirements: form.requirements.trim() || null,
      contact_name: form.contact_name.trim() || null,
      contact_phone: phone || null,
      contact_whatsapp: wa || null,
      contact_email: mail || null,
      student_friendly: form.student_friendly,
    };
    setBusy(true);
    setNotice("");
    if (!user) {
      const listing: Job = {
        ...payload,
        id: `demo-job-${crypto.randomUUID()}`,
        created_at: new Date().toISOString(),
      };
      try {
        const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") as Job[];
        localStorage.setItem(LOCAL_KEY, JSON.stringify([listing, ...saved]));
      } catch {}
      setJobs((c) => [listing, ...(c ?? [])]);
      setBusy(false);
      setForm(emptyForm);
      setShowForm(false);
      setNotice("Deneme ilanı bu tarayıcıda saklandı; gerçek ilan panosunda yayınlanmadı.");
      return;
    }
    const { error } = await sb.from("job_listings").insert(payload);
    setBusy(false);
    if (error) return setNotice(`İlan eklenemedi: ${error.message}`);
    setForm(emptyForm);
    setShowForm(false);
    await load();
  }

  return (
    <main>
      <header className="sticky top-0 z-20 rounded-b-[28px] bg-sea px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold">İş ilanları</h1>
            <p className="text-sm text-white/75">
              Biga'da öğrenciye uygun iş, staj ve ek gelir fırsatları.
            </p>
          </div>
          <button
            onClick={() => {
              setNotice("");
              setShowForm(true);
            }}
            aria-label="İlan ver"
            title="İlan ver"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sun text-deep"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-full bg-card px-4 py-3 text-ink transition-shadow focus-within:ring-2 focus-within:ring-tide focus-within:ring-offset-2 focus-within:ring-offset-sea">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="opacity-50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pozisyon, işletme veya konum ara"
            aria-label="İlan ara"
            className="w-full bg-transparent outline-none focus-visible:outline-none focus-visible:ring-0"
          />
        </label>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {["Tümü", ...JOB_TYPES].map((t) => (
            <motion.button
              whileTap={{ scale: 0.9 }}
              key={t}
              onClick={() => setType(t)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${type === t ? "bg-sun text-deep" : "bg-white/15 text-white"}`}
            >
              {t}
            </motion.button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Kategori"
          className="rounded-full bg-card px-4 py-2 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-tide"
        >
          <option>Tümü</option>
          {JOB_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={() => setOnlyStudent((v) => !v)}
          aria-pressed={onlyStudent}
          className={`rounded-full px-4 py-2 text-sm font-bold shadow-sm transition-colors ${onlyStudent ? "bg-tide text-deep" : "bg-card"}`}
        >
          <FontAwesomeIcon icon={faGraduationCap} className="mr-1.5" />
          Öğrenci dostu
        </button>
        {jobs && (
          <span className="ml-auto text-xs text-ink/60">{shown.length} ilan</span>
        )}
      </div>

      {notice && !showForm && (
        <p role="status" className="mx-5 mt-3 text-sm font-bold text-coral">
          {notice}
        </p>
      )}
      <p className="px-5 pt-3 text-xs text-ink/60">
        “Örnek ilan” etiketli kayıtlar temsilidir. Başvurmadan önce işveren bilgilerini
        doğrula; kimseye ön ödeme veya kimlik belgesi gönderme.
      </p>

      <ul className="grid items-start gap-3 px-5 pt-3 md:grid-cols-2 xl:grid-cols-3">
        {jobs === null &&
          [0, 1, 2].map((i) => (
            <li key={i} className="shimmer h-36 rounded-[24px]" />
          ))}
        <AnimatePresence initial={false}>
          {shown.map((j) => {
            const open = openId === j.id;
            const demo = j.id.startsWith("demo-");
            return (
              <motion.li
                key={j.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="rounded-[24px] bg-card p-4 shadow-sm"
              >
                <button
                  onClick={() => setOpenId(open ? null : j.id)}
                  aria-expanded={open}
                  className="block w-full text-left"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sun/30 text-deep">
                      <FontAwesomeIcon icon={faBriefcase} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="block break-words font-display text-lg leading-tight">
                        {j.title}
                      </b>
                      <p className="mt-0.5 text-sm text-ink/65">{j.company}</p>
                    </div>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`mt-1 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-tide/20 px-3 py-1 font-bold">
                      {j.job_type}
                    </span>
                    <span className="rounded-full bg-foam px-3 py-1">{j.category}</span>
                    {j.student_friendly && (
                      <span className="rounded-full bg-sun/30 px-3 py-1 font-bold">
                        <FontAwesomeIcon icon={faGraduationCap} className="mr-1" />
                        Öğrenci dostu
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/80">
                    {j.location && (
                      <span>
                        <FontAwesomeIcon icon={faLocationDot} /> {j.location}
                      </span>
                    )}
                    {j.salary && (
                      <span className="font-bold text-coral">
                        <FontAwesomeIcon icon={faSackDollar} /> {j.salary}
                      </span>
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 border-t border-ink/10 pt-3 text-sm">
                        <p className="whitespace-pre-line text-ink/80">{j.description}</p>
                        {j.requirements && (
                          <>
                            <b className="mt-3 block font-display">Aranan nitelikler</b>
                            <p className="text-ink/80">{j.requirements}</p>
                          </>
                        )}
                        <b className="mt-3 block font-display">İletişim</b>
                        {j.contact_name && (
                          <p className="text-ink/70">{j.contact_name}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {j.contact_phone && (
                            <a
                              href={`tel:${j.contact_phone.replace(/\s/g, "")}`}
                              className="inline-flex items-center gap-2 rounded-full bg-sea px-4 py-2 text-sm font-bold text-white"
                            >
                              <FontAwesomeIcon icon={faPhone} /> Ara
                            </a>
                          )}
                          {j.contact_whatsapp && (
                            <a
                              href={`https://wa.me/${j.contact_whatsapp}?text=${encodeURIComponent(`Merhaba, Bigova'daki "${j.title}" ilanı için yazıyorum.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-tide px-4 py-2 text-sm font-bold text-deep"
                            >
                              <FontAwesomeIcon icon={faCommentDots} /> WhatsApp
                            </a>
                          )}
                          {j.contact_email && (
                            <a
                              href={`mailto:${j.contact_email}?subject=${encodeURIComponent(`${j.title} başvurusu`)}`}
                              className="inline-flex items-center gap-2 rounded-full bg-sun px-4 py-2 text-sm font-bold text-deep"
                            >
                              <FontAwesomeIcon icon={faEnvelope} /> E-posta
                            </a>
                          )}
                        </div>
                        {j.contact_phone && (
                          <p className="mt-2 text-xs text-ink/60">{j.contact_phone}</p>
                        )}
                        {j.contact_email && (
                          <p className="break-all text-xs text-ink/60">{j.contact_email}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3 text-xs text-ink/60">
                  <span>
                    <FontAwesomeIcon icon={faClock} className="mr-1" />
                    {timeAgo(j.created_at)}
                  </span>
                  {demo && <span className="font-bold text-coral">Örnek ilan</span>}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {jobs && shown.length === 0 && (
        <div className="px-5 py-12 text-center">
          <Mascot size={96} className="mx-auto" />
          <p className="mt-2 font-display text-lg font-bold">İlan bulunamadı</p>
          <p className="text-sm text-ink/70">
            Filtreleri temizle ya da başka bir kelimeyle ara.
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
              <h2 className="font-display text-xl font-extrabold">Yeni iş ilanı</h2>
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
                Giriş yapmadan eklenen ilan sadece bu tarayıcıya kaydedilir.
              </p>
            )}
            <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={100} placeholder="İlan başlığı (ör. Barista)" required />
            <input className={inputClass} value={form.company} onChange={(e) => set("company", e.target.value)} maxLength={100} placeholder="İşletme / işveren adı" required />
            <div className="grid grid-cols-2 gap-3">
              <select className={inputClass} value={form.job_type} onChange={(e) => set("job_type", e.target.value as JobType)}>
                {JOB_TYPES.map((t) => (<option key={t}>{t}</option>))}
              </select>
              <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {JOB_CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
              </select>
            </div>
            <input className={inputClass} value={form.location} onChange={(e) => set("location", e.target.value)} maxLength={120} placeholder="Konum (ör. Biga çarşı)" />
            <input className={inputClass} value={form.salary} onChange={(e) => set("salary", e.target.value)} maxLength={60} placeholder="Ücret (isteğe bağlı)" />
            <textarea className={inputClass} rows={3} maxLength={1000} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="İşin tanımı ve çalışma saatleri" required />
            <textarea className={inputClass} rows={2} maxLength={500} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} placeholder="Aranan nitelikler (isteğe bağlı)" />
            <fieldset className="grid gap-3 rounded-xl border border-ink/10 p-3">
              <legend className="px-1 text-sm font-bold">İletişim (en az biri)</legend>
              <input className={inputClass} value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} maxLength={80} placeholder="Yetkili adı (isteğe bağlı)" />
              <input className={inputClass} type="tel" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} maxLength={20} placeholder="Telefon (0286 …)" />
              <input className={inputClass} type="tel" value={form.contact_whatsapp} onChange={(e) => set("contact_whatsapp", e.target.value)} maxLength={20} placeholder="WhatsApp (05xx …)" />
              <input className={inputClass} type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} maxLength={120} placeholder="E-posta" />
              <p className="text-xs text-ink/60">Bu bilgiler ilanı gören herkese açık gösterilir.</p>
            </fieldset>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.student_friendly} onChange={(e) => set("student_friendly", e.target.checked)} className="h-4 w-4 accent-[rgb(var(--tide))]" />
              Öğrenci dostu (esnek saat / ders programına uyumlu)
            </label>
            {notice && (<p role="alert" className="text-sm font-bold text-coral">{notice}</p>)}
            <button disabled={busy} className="rounded-xl bg-sea p-3 font-bold text-white disabled:opacity-50">
              {busy ? "Ekleniyor…" : "İlanı yayınla"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
