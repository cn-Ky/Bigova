"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { faCheck, faLink, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import Sheet, { fieldClass } from "./Sheet";

type Friend = { id: string; name: string };

/**
 * Gönderiyi paylaş: bağlantıyı kopyala / sistem paylaşımı ya da bir arkadaşa sohbetten gönder.
 * Arkadaşa gönderilen mesaj, gönderi bağlantısı (ve isteğe bağlı kısa bir not) olur; sohbette tıklanabilir görünür.
 */
export default function ShareSheet({ postId, onClose, onLink }: { postId: string; onClose: () => void; onLink: () => void | Promise<void> }) {
  const { user } = useUser();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data: links } = await sb.from("friendships").select("requester,addressee").eq("status", "accepted").or(`requester.eq.${user.id},addressee.eq.${user.id}`);
      const ids = Array.from(new Set((links ?? []).map((l) => (l.requester === user.id ? l.addressee : l.requester))));
      if (!ids.length) return setFriends([]);
      const { data: profiles } = await sb.from("profiles").select("id,name").in("id", ids);
      setFriends(((profiles as Friend[]) ?? []).filter((p) => p.name).sort((a, b) => a.name.localeCompare(b.name, "tr")));
    } catch {
      setFriends([]);
    }
  }, [sb, user]);
  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLocaleLowerCase("tr");
    return (friends ?? []).filter((f) => !t || f.name.toLocaleLowerCase("tr").includes(t));
  }, [friends, q]);
  const avatars = useAvatars(useMemo(() => shown.map((f) => f.id), [shown]));

  const send = async (f: Friend) => {
    if (busy || sent.has(f.id)) return;
    setBusy(f.id);
    setErr("");
    const link = `${window.location.origin}/topluluk/gonderi/${postId}`;
    const body = note.trim() ? `${note.trim()}\n${link}` : link;
    const { error } = await sb.from("messages").insert({ to_id: f.id, body });
    if (error) setErr((error as { code?: string }).code === "42501" ? "Bu kişiye şu an mesaj gönderilemiyor." : "Mesaj gönderilemedi. Bağlantını kontrol edip tekrar dene.");
    else setSent((s) => new Set(s).add(f.id));
    setBusy(null);
  };

  return (
    <Sheet title="Gönderiyi paylaş" onClose={onClose}>
      <div className="grid gap-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={async () => {
            await onLink();
            onClose();
          }}
          className="flex items-center gap-3 rounded-2xl bg-foam p-3 text-left font-bold"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-sea/10 text-sea">
            <FontAwesomeIcon icon={faLink} />
          </span>
          Bağlantıyı paylaş / kopyala
        </motion.button>

        <section aria-label="Arkadaşa gönder">
          <h3 className="mb-2 font-display text-base font-extrabold">Arkadaşa gönder</h3>
          {friends === null ? (
            <div className="shimmer h-14 rounded-2xl" aria-busy="true" aria-label="Yükleniyor" />
          ) : friends.length === 0 ? (
            <p className="rounded-2xl bg-foam p-4 text-center text-sm text-ink/65">Henüz arkadaşın yok. Arkadaşlar sayfasından arkadaş ekleyince gönderileri sohbetten paylaşabilirsin.</p>
          ) : (
            <>
              <div className="relative mb-2">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
                <input value={q} onChange={(e) => setQ(e.target.value.slice(0, 60))} type="search" placeholder="Arkadaş ara" aria-label="Arkadaş ara" className={`${fieldClass} pl-10`} />
              </div>
              <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="İstersen bir not ekle…" aria-label="Not" className={`${fieldClass} mb-2`} />
              <ul className="grid max-h-[40dvh] gap-1 overflow-y-auto">
                {shown.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-2xl px-1 py-1.5">
                    <UserAvatar name={f.name} avatar={avatars[f.id]} size={42} />
                    <b className="min-w-0 flex-1 truncate">{f.name}</b>
                    <motion.button whileTap={{ scale: 0.92 }} type="button" disabled={busy === f.id || sent.has(f.id)} onClick={() => send(f)} className={`rounded-full px-4 py-1.5 text-xs font-bold disabled:opacity-70 ${sent.has(f.id) ? "bg-tide/30 text-deep" : "bg-sea text-white"}`}>
                      {sent.has(f.id) ? (
                        <>
                          <FontAwesomeIcon icon={faCheck} className="mr-1" />
                          Gönderildi
                        </>
                      ) : busy === f.id ? (
                        "…"
                      ) : (
                        "Gönder"
                      )}
                    </motion.button>
                  </li>
                ))}
                {shown.length === 0 && <li className="py-3 text-center text-sm text-ink/60">Eşleşen arkadaş yok.</li>}
              </ul>
            </>
          )}
          {err && <p role="alert" className="mt-2 text-sm font-bold text-coral">{err}</p>}
        </section>
      </div>
    </Sheet>
  );
}
