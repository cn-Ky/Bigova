"use client";
import { GRADE_LABELS, errText, rpc, type Community } from "@/lib/community";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { fieldClass } from "./Sheet";
import { SPRING } from "./ui";

/** İlk girişte bölüm ve sınıf seçtirir; akışın buna göre kişiselleşir (ilgili gruplara otomatik üyelik arka planda yapılır). */
export default function OnboardingCard({ initialDepartment, initialGrade, onDone, compact = false }: { initialDepartment?: string | null; initialGrade?: number | null; onDone: () => void; compact?: boolean }) {
  const [depts, setDepts] = useState<Community[]>([]);
  const [classes, setClasses] = useState<Community[]>([]);
  const [dept, setDept] = useState(initialDepartment ?? "");
  const [grade, setGrade] = useState<number | "">(initialGrade ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    let off = false;
    Promise.all([rpc<Community[]>("community_list", { p_kind: "department" }), rpc<Community[]>("community_list", { p_kind: "class" })])
      .then(([d, c]) => {
        if (off) return;
        setDepts(d ?? []);
        setClasses(c ?? []);
      })
      .catch((e) => !off && setErr(errText(e)));
    return () => {
      off = true;
    };
  }, []);
  const grades = classes.filter((c) => c.department === dept && c.grade).map((c) => c.grade as number).sort();
  const save = async () => {
    if (!dept || !grade) return setErr("Bölümünü ve sınıfını seç.");
    setBusy(true);
    setErr("");
    try {
      await rpc("community_set_profile", { p_department: dept, p_grade: grade });
      onDone();
    } catch (e) {
      setErr(errText(e));
      setBusy(false);
    }
  };
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} aria-label="Bölüm ve sınıf seçimi" className={`rounded-[24px] bg-card p-4 shadow-sm ${compact ? "" : "border-2 border-tide/40"}`}>
      <h2 className="font-display text-lg font-extrabold">{compact ? "Bölümün ve sınıfın" : "Bölümünü seç"}</h2>
      <p className="mt-1 text-sm text-ink/70">Bölümünü ve sınıfını seç; akışında sana özel gönderiler görünür. İstediğin zaman değiştirebilirsin.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select value={dept} onChange={(e) => { setDept(e.target.value); setGrade(""); }} aria-label="Bölüm" className={fieldClass}>
          <option value="">Bölüm seç…</option>
          {depts.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
        <select value={grade} onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : "")} disabled={!dept} aria-label="Sınıf" className={`${fieldClass} disabled:opacity-50`}>
          <option value="">Sınıf seç…</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {GRADE_LABELS[g]}
            </option>
          ))}
        </select>
      </div>
      {err && (
        <p role="alert" className="mt-2 text-sm font-bold text-coral">
          {err}
        </p>
      )}
      <motion.button whileTap={{ scale: 0.92 }} type="button" disabled={busy} onClick={save} className="shine mt-3 rounded-full bg-sea px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        {busy ? "Kaydediliyor…" : "Kaydet"}
      </motion.button>
    </motion.section>
  );
}
