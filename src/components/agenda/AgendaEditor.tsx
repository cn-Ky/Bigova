"use client";
import Sheet, { fieldClass } from "@/components/community/Sheet";
import type { AgendaNote, NoteInput } from "@/lib/agendaNotes";
import { addDays, fmtRange } from "@/lib/agendaData";
import { EXAM_KINDS, type Exam, type ExamKind } from "@/lib/studentHome";
import { faPen, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { useState } from "react";

type Tab = "note" | "exam";

type Props = {
  onClose: () => void;
  /** Yeni kayıt için varsayılan tarih (ajandada seçili gün) */
  initialDate: string;
  today: string;
  /** Düzenlenen not; yoksa yeni kayıt */
  editing: AgendaNote | null;
  startTab?: Tab;
  notes: AgendaNote[];
  exams: Exam[];
  error: string | null;
  /** Veriler yalnızca bu cihazda saklanıyorsa (sunucu tablosu kurulmamış) true */
  local: boolean;
  addNote: (n: NoteInput) => Promise<boolean>;
  updateNote: (id: string, n: NoteInput) => Promise<boolean>;
  removeNote: (id: string) => Promise<void>;
  addExam: (e: Omit<Exam, "id">) => Promise<void>;
  removeExam: (id: string) => Promise<void>;
  /** Kayıt eklenince/düzenlenince ajandada o güne git */
  onSaved: (date: string) => void;
  onEdit: (n: AgendaNote) => void;
};

const label = "text-xs font-bold";
const submitBtn = "w-full rounded-full bg-sea px-4 py-3 text-sm font-bold text-white disabled:opacity-60";

export default function AgendaEditor(p: Props) {
  const [tab, setTab] = useState<Tab>(p.startTab ?? "note");
  const editing = p.editing;

  /* — Not formu — */
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.note ?? "");
  const [date, setDate] = useState(editing?.note_date ?? p.initialDate);
  const [multi, setMulti] = useState(!!editing?.end_date);
  const [endDate, setEndDate] = useState(editing?.end_date ?? addDays(editing?.note_date ?? p.initialDate, 1));
  const [time, setTime] = useState(editing?.note_time ?? "");
  /* — Sınav formu — */
  const [course, setCourse] = useState("");
  const [kind, setKind] = useState<ExamKind>("Vize");
  const [xDate, setXDate] = useState(p.initialDate);
  const [xTime, setXTime] = useState("");
  const [room, setRoom] = useState("");

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setMsg("Kayda bir başlık yaz.");
    if (!date) return setMsg("Tarihi seç.");
    if (multi && endDate < date) return setMsg("Bitiş tarihi başlangıçtan önce olamaz.");
    if (multi && endDate > addDays(date, 60)) return setMsg("Bir kayıt en fazla 60 gün sürebilir.");
    setMsg("");
    setBusy(true);
    const input: NoteInput = { title, note: body, note_date: date, end_date: multi ? endDate : null, note_time: time || null };
    const ok = editing ? await p.updateNote(editing.id, input) : await p.addNote(input);
    setBusy(false);
    if (ok) {
      p.onSaved(date);
      p.onClose();
    }
  };

  const submitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course.trim()) return setMsg("Ders adını yaz.");
    if (!xDate) return setMsg("Sınav tarihini seç.");
    setMsg("");
    setBusy(true);
    await p.addExam({ course: course.trim().slice(0, 80), kind, exam_date: xDate, exam_time: xTime || null, room: room.trim().slice(0, 40) || null });
    setBusy(false);
    p.onSaved(xDate);
    p.onClose();
  };

  const tabBtn = (t: Tab, text: string) => (
    <button
      type="button"
      onClick={() => {
        setTab(t);
        setMsg("");
      }}
      aria-pressed={tab === t}
      className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition-colors ${tab === t ? "bg-sea text-white" : "bg-foam text-ink"}`}
    >
      {text}
    </button>
  );

  const mine = [
    ...p.notes.map((n) => ({ id: n.id, own: "note" as const, title: n.title, start: n.note_date, end: n.end_date ?? n.note_date, time: n.note_time, note: n })),
    ...p.exams.map((x) => ({ id: x.id, own: "exam" as const, title: `${x.course} · ${x.kind}`, start: x.exam_date, end: x.exam_date, time: x.exam_time, note: null })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <Sheet title={editing ? "Notu düzenle" : "Ajandama ekle"} onClose={p.onClose}>
      {!editing && <div className="mb-3 flex gap-2">{[tabBtn("note", "Özel tarih / not"), tabBtn("exam", "Sınav")]}</div>}

      {tab === "note" || editing ? (
        <form onSubmit={submitNote} className="grid gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Başlık (örn. Proje teslimi, Doğum günü)"
            aria-label="Başlık"
            className={fieldClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <label className={label}>
              {multi ? "Başlangıç" : "Tarih"}
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${fieldClass} mt-1`} />
            </label>
            <label className={label}>
              Saat (isteğe bağlı)
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${fieldClass} mt-1`} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--sea))]" />
            Birden fazla gün sürüyor
          </label>
          {multi && (
            <label className={label}>
              Bitiş tarihi
              <input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} className={`${fieldClass} mt-1`} />
            </label>
          )}
          <label className={label}>
            Not (isteğe bağlı)
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Bu tarihle ilgili kendine bir not bırak…"
              className={`${fieldClass} mt-1 resize-none`}
            />
            <span className="mt-0.5 block text-right text-[11px] font-bold text-ink/50">{body.length}/500</span>
          </label>
          {(msg || p.error) && (
            <p role="alert" className="text-sm font-bold text-coral">
              {msg || p.error}
            </p>
          )}
          <motion.button whileTap={{ scale: 0.95 }} disabled={busy} className={submitBtn}>
            {editing ? "Değişiklikleri kaydet" : "Ajandaya ekle"}
          </motion.button>
        </form>
      ) : (
        <form onSubmit={submitExam} className="grid gap-2">
          <input value={course} onChange={(e) => setCourse(e.target.value)} maxLength={80} placeholder="Ders adı" aria-label="Ders adı" className={fieldClass} autoFocus />
          <select value={kind} onChange={(e) => setKind(e.target.value as ExamKind)} aria-label="Sınav türü" className={fieldClass}>
            {EXAM_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <label className={label}>
              Tarih
              <input type="date" value={xDate} onChange={(e) => setXDate(e.target.value)} className={`${fieldClass} mt-1`} />
            </label>
            <label className={label}>
              Saat (isteğe bağlı)
              <input type="time" value={xTime} onChange={(e) => setXTime(e.target.value)} className={`${fieldClass} mt-1`} />
            </label>
          </div>
          <input value={room} onChange={(e) => setRoom(e.target.value)} maxLength={40} placeholder="Salon (isteğe bağlı)" aria-label="Salon" className={fieldClass} />
          {(msg || p.error) && (
            <p role="alert" className="text-sm font-bold text-coral">
              {msg || p.error}
            </p>
          )}
          <motion.button whileTap={{ scale: 0.95 }} disabled={busy} className={submitBtn}>
            Sınavı ekle
          </motion.button>
        </form>
      )}

      {p.local && (
        <p className="mt-3 rounded-xl bg-sun/25 px-3 py-2 text-xs font-bold">Kayıtların şu an yalnızca bu cihazda saklanıyor.</p>
      )}

      {!editing && (
        <>
          <h3 className="mt-5 font-display text-base font-extrabold">Eklediklerim</h3>
          <ul className="mt-2 grid gap-1.5">
            {mine.length === 0 && <li className="text-sm text-ink/60">Henüz bir şey eklemedin.</li>}
            {mine.map((x) => (
              <li key={`${x.own}-${x.id}`} className={`flex items-center gap-2 rounded-xl bg-foam px-3 py-2 text-sm ${x.end < p.today ? "opacity-50" : ""}`}>
                <span className="min-w-0 flex-1 truncate">
                  <b>{x.title}</b>
                  <span className="text-ink/60">
                    {" "}
                    · {x.own === "exam" ? "sınav · " : ""}
                    {fmtRange(x.start, x.end)}
                    {x.time ? ` ${x.time}` : ""}
                  </span>
                </span>
                {x.note && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={() => p.onEdit(x.note!)}
                    aria-label={`${x.title} notunu düzenle`}
                    className="grid h-8 w-8 place-items-center rounded-full text-ink/60 hover:bg-card"
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={() => (x.own === "note" ? p.removeNote(x.id) : p.removeExam(x.id))}
                  aria-label={`${x.title} kaydını sil`}
                  className="grid h-8 w-8 place-items-center rounded-full text-ink/60 hover:bg-card"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </motion.button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
