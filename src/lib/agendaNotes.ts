"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Kültür Ajandası: öğrencinin kendi özel tarihleri ve notları.
 * - Kayıtlı kullanıcıya aittir; veriler Supabase `agenda_notes` tablosunda (RLS) hesabında saklanır (supabase/agenda_upgrade.sql).
 * - Tablo henüz kurulmamışsa cihazda (localStorage) çalışır; studentHome.ts ile aynı desen.
 * - Misafirde hiçbir şey yüklenmez ve eklenemez (status = "guest").
 */
export type AgendaNote = {
  id: string;
  title: string;
  note: string | null;
  note_date: string;
  end_date: string | null;
  note_time: string | null;
};
export type NoteInput = Omit<AgendaNote, "id">;
type Status = "loading" | "ready" | "local" | "guest";

const COLS = "id,title,note,note_date,end_date,note_time";
const localKey = (uid: string) => `bigova-agenda-notes:${uid}`;
const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);
const byDate = (a: AgendaNote, b: AgendaNote) => a.note_date.localeCompare(b.note_date) || (a.note_time ?? "").localeCompare(b.note_time ?? "") || a.title.localeCompare(b.title, "tr");
const norm = (r: AgendaNote): AgendaNote => ({ ...r, note_time: hhmm(r.note_time) });
const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const isMissingTable = (e: unknown) => {
  const x = e as { code?: string; message?: string };
  return x?.code === "42P01" || x?.code === "PGRST205" || /Could not find the table|does not exist|schema cache/i.test(x?.message ?? "");
};

export function useAgendaNotes() {
  const { user } = useUser();
  const uid = user?.id;
  const [status, setStatus] = useState<Status>("loading");
  const [notes, setNotes] = useState<AgendaNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const modeRef = useRef<Status>("loading");
  const snapshot = useRef<AgendaNote[]>([]);

  const persistLocal = useCallback(() => {
    if (!uid || modeRef.current !== "local") return;
    try {
      localStorage.setItem(localKey(uid), JSON.stringify(snapshot.current));
    } catch {}
  }, [uid]);

  useEffect(() => {
    if (user === undefined) return;
    if (!uid) {
      modeRef.current = "guest";
      setNotes([]);
      setStatus("guest");
      return;
    }
    let off = false;
    (async () => {
      const useLocal = () => {
        let l: AgendaNote[] = [];
        try {
          const raw = JSON.parse(localStorage.getItem(localKey(uid)) || "[]");
          if (Array.isArray(raw)) l = raw;
        } catch {}
        snapshot.current = l;
        modeRef.current = "local";
        setNotes([...l].sort(byDate));
        setStatus("local");
      };
      let sb: ReturnType<typeof supabaseBrowser>;
      try {
        sb = supabaseBrowser();
      } catch {
        return !off && useLocal();
      }
      const { data, error: er } = await sb.from("agenda_notes").select(COLS).order("note_date").limit(300);
      if (off) return;
      if (er) {
        if (!isMissingTable(er)) setError("Notların yüklenemedi. Bağlantını kontrol edip sayfayı yenile.");
        return useLocal(); // SQL henüz çalıştırılmamış: cihazda çalış
      }
      modeRef.current = "ready";
      setNotes(((data ?? []) as AgendaNote[]).map(norm).sort(byDate));
      setStatus("ready");
    })().catch(() => {
      if (!off) setError("Notların yüklenemedi.");
    });
    return () => {
      off = true;
    };
  }, [uid, user === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  const sb = useCallback(() => supabaseBrowser(), []);
  const clean = (n: NoteInput): NoteInput => ({
    title: n.title.trim().slice(0, 80),
    note: n.note?.trim() ? n.note.trim().slice(0, 500) : null,
    note_date: n.note_date,
    end_date: n.end_date && n.end_date > n.note_date ? n.end_date : null,
    note_time: n.note_time || null,
  });

  /** Başarılıysa true döner (form kapanıp kapanmayacağına karar vermek için). */
  const addNote = async (input: NoteInput): Promise<boolean> => {
    setError(null);
    if (status === "guest" || !uid) return false;
    const n = clean(input);
    if (modeRef.current === "local") {
      const row: AgendaNote = { ...n, id: uuid() };
      snapshot.current = [...snapshot.current, row];
      setNotes([...snapshot.current].sort(byDate));
      persistLocal();
      return true;
    }
    const { data, error: er } = await sb().from("agenda_notes").insert(n).select(COLS).single();
    if (er) {
      setError(er.message);
      return false;
    }
    setNotes((cur) => [...cur, norm(data as AgendaNote)].sort(byDate));
    return true;
  };

  const updateNote = async (id: string, input: NoteInput): Promise<boolean> => {
    setError(null);
    if (status === "guest" || !uid) return false;
    const n = clean(input);
    if (modeRef.current === "local") {
      snapshot.current = snapshot.current.map((x) => (x.id === id ? { ...x, ...n } : x));
      setNotes([...snapshot.current].sort(byDate));
      persistLocal();
      return true;
    }
    const { data, error: er } = await sb().from("agenda_notes").update(n).eq("id", id).select(COLS).single();
    if (er) {
      setError(er.message);
      return false;
    }
    setNotes((cur) => cur.map((x) => (x.id === id ? norm(data as AgendaNote) : x)).sort(byDate));
    return true;
  };

  const removeNote = async (id: string) => {
    setError(null);
    const prev = notes;
    setNotes((cur) => cur.filter((x) => x.id !== id));
    if (modeRef.current === "local") {
      snapshot.current = snapshot.current.filter((x) => x.id !== id);
      return persistLocal();
    }
    const { error: er } = await sb().from("agenda_notes").delete().eq("id", id);
    if (er) {
      setNotes(prev);
      setError(er.message);
    }
  };

  return { status, error, clearError: () => setError(null), notes, addNote, updateNote, removeNote };
}
