"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { deleteStory, errText, rpc, timeAgo, useImageUrls, type Story, type StoryTrayItem, type StoryViewerRow } from "@/lib/community";
import { faEye, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DURATION = 5000;

/**
 * Tam ekran hikaye görüntüleyici (Instagram gibi): üstte ilerleme çubukları, sol/sağ dokunuşla önceki/sonraki,
 * basılı tutunca duraklatma, sona gelince sıradaki kişiye geçiş. Sahibi görüntülenme sayısını, görenleri ve silme düğmesini görür.
 * Klavye: ← → gezinme, Boşluk duraklat, Esc kapat.
 */
export default function StoryViewer({ users, start, selfId, onClose, onChanged }: { users: StoryTrayItem[]; start: number; selfId: string; onClose: () => void; onChanged: () => void }) {
  const [ui, setUi] = useState(start);
  const [si, setSi] = useState(0);
  const [stories, setStories] = useState<Story[] | null>(null);
  const [paused, setPaused] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerRow[] | null>(null);
  const [err, setErr] = useState("");
  const dirty = useRef(false);
  const progress = useRef(0);
  const barRef = useRef<HTMLSpanElement>(null);
  const press = useRef<{ t: number; x: number } | null>(null);

  const cur = users[ui];
  const isSelf = cur?.user_id === selfId;
  const story = stories?.[si];
  const urls = useImageUrls(useMemo(() => (stories ?? []).map((s) => s.image), [stories]));
  const avatars = useAvatars(useMemo(() => (cur ? [cur.user_id] : []), [cur]));
  const panelOpen = viewers !== null;
  const ready = !!story && !!urls[story.image];

  const close = useCallback(() => {
    if (dirty.current) onChanged();
    onClose();
  }, [onChanged, onClose]);

  const toUser = useCallback((i: number) => {
    setStories(null);
    setViewers(null);
    setErr("");
    progress.current = 0;
    setUi(i);
  }, []);

  const goNext = useCallback(() => {
    if (stories && si < stories.length - 1) {
      progress.current = 0;
      setSi(si + 1);
    } else if (ui < users.length - 1) toUser(ui + 1);
    else close();
  }, [stories, si, ui, users.length, toUser, close]);

  const goPrev = useCallback(() => {
    if (progress.current > 0.15 || (si === 0 && ui === 0)) {
      progress.current = 0;
      if (barRef.current) barRef.current.style.width = "0%";
    } else if (si > 0) {
      progress.current = 0;
      setSi(si - 1);
    } else toUser(ui - 1);
  }, [si, ui, toUser]);

  // Kişi değişince hikayelerini yükle; izlemediğin ilk hikayeden başla.
  useEffect(() => {
    if (!cur) return;
    let live = true;
    rpc<Story[]>("community_stories_of", { p_user: cur.user_id })
      .then((rows) => {
        if (!live) return;
        const list = rows ?? [];
        const firstUnseen = list.findIndex((s) => !s.seen);
        setSi(cur.user_id !== selfId && firstUnseen >= 0 ? firstUnseen : 0);
        setStories(list);
      })
      .catch((e) => {
        if (!live) return;
        setErr(errText(e));
        setStories([]);
      });
    return () => {
      live = false;
    };
  }, [cur, selfId]);

  // Hikaye süresi dolmuşsa / boşsa sıradakine geç.
  useEffect(() => {
    if (stories && stories.length === 0 && !err) goNext();
  }, [stories, err, goNext]);

  // Gördüm işareti (kendi hikayen sayılmaz).
  useEffect(() => {
    if (!story || isSelf || story.seen) return;
    dirty.current = true;
    rpc("community_story_view", { p_id: story.id }).catch(() => {});
    setStories((list) => (list ? list.map((s) => (s.id === story.id ? { ...s, seen: true } : s)) : list));
  }, [story, isSelf]);

  // İlerleme çubuğu: her karede DOM'a yazılır (yeniden çizim yok); görsel yüklenince ve duraklatılmadıkça ilerler.
  const nextRef = useRef(goNext);
  nextRef.current = goNext;
  useEffect(() => {
    if (!ready || paused || panelOpen) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      progress.current += (now - last) / DURATION;
      last = now;
      if (barRef.current) barRef.current.style.width = `${Math.min(progress.current, 1) * 100}%`;
      if (progress.current >= 1) {
        nextRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, paused, panelOpen, story?.id]);

  // Klavye ve sayfa kaydırmasını kilitleme
  const keys = useRef({ goNext, goPrev, close });
  keys.current = { goNext, goPrev, close };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") keys.current.close();
      else if (e.key === "ArrowRight") keys.current.goNext();
      else if (e.key === "ArrowLeft") keys.current.goPrev();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  const openViewers = async () => {
    if (!story) return;
    try {
      setViewers((await rpc<StoryViewerRow[]>("community_story_viewers", { p_id: story.id })) ?? []);
    } catch (e) {
      setErr(errText(e));
    }
  };
  const remove = async () => {
    if (!story || !window.confirm("Bu hikaye silinsin mi?")) return;
    setPaused(true);
    try {
      await deleteStory(story.id);
      dirty.current = true;
      const left = (stories ?? []).filter((s) => s.id !== story.id);
      progress.current = 0;
      if (left.length) {
        setStories(left);
        setSi(Math.min(si, left.length - 1));
      } else close();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setPaused(false);
    }
  };

  if (!cur) return null;
  const url = story ? urls[story.image] : undefined;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={`${cur.name} hikayesi`} className="fixed inset-0 z-[95] grid place-items-center bg-black">
      <div className="relative h-full max-h-[100dvh] w-full max-w-[460px] select-none overflow-hidden bg-deep sm:aspect-[9/16] sm:h-auto sm:max-h-[96dvh] sm:rounded-[28px]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={story?.caption || `${cur.name} hikayesi`} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="shimmer absolute inset-0" aria-busy="true" aria-label="Yükleniyor" />
        )}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />

        {/* dokunma bölgeleri: sol üçte bir önceki, geri kalanı sonraki; basılı tutunca duraklar */}
        <div
          className="absolute inset-0"
          onPointerDown={(e) => {
            press.current = { t: Date.now(), x: e.clientX };
            setPaused(true);
          }}
          onPointerUp={(e) => {
            setPaused(false);
            const p = press.current;
            press.current = null;
            if (!p || Date.now() - p.t > 250 || Math.abs(e.clientX - p.x) > 12) return;
            const r = e.currentTarget.getBoundingClientRect();
            if (e.clientX - r.left < r.width / 3) goPrev();
            else goNext();
          }}
          onPointerLeave={() => {
            press.current = null;
            setPaused(false);
          }}
          onPointerCancel={() => {
            press.current = null;
            setPaused(false);
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-[max(.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1" aria-hidden>
            {(stories ?? []).map((s, i) => {
              const state = i < si ? "past" : i === si ? "cur" : "future";
              return (
                <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                  <span key={state} ref={state === "cur" ? barRef : undefined} className="block h-full rounded-full bg-white" style={{ width: state === "past" ? "100%" : "0%" }} />
                </span>
              );
            })}
          </div>
          <div className="pointer-events-auto mt-3 flex items-center gap-2.5 text-white">
            <Link href={`/profil/${cur.user_id}`} onClick={close} className="flex min-w-0 flex-1 items-center gap-2.5">
              <UserAvatar name={cur.name} avatar={avatars[cur.user_id]} size={36} />
              <span className="min-w-0 leading-tight">
                <b className="block truncate text-sm font-extrabold">{isSelf ? "Hikayen" : cur.name}</b>
                {story && <span className="text-xs text-white/75">{timeAgo(story.created_at)}</span>}
              </span>
            </Link>
            {isSelf && story && (
              <button type="button" aria-label="Hikayeyi sil" onClick={remove} className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-sm">
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
            <button type="button" aria-label="Kapat" onClick={close} className="grid h-9 w-9 place-items-center rounded-full bg-black/35">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {story?.caption && <p className="mb-3 text-center text-[15px] font-bold leading-snug text-white drop-shadow-[0_1px_4px_rgba(0,0,0,.6)]">{story.caption}</p>}
          {err && <p role="alert" className="mb-2 rounded-xl bg-coral/90 px-3 py-2 text-center text-xs font-bold text-white">{err}</p>}
          {isSelf && story && (
            <button type="button" onClick={openViewers} className="pointer-events-auto mx-auto flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm font-bold text-white">
              <FontAwesomeIcon icon={faEye} />
              {story.view_count} görüntülenme
            </button>
          )}
        </div>

        {viewers && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 32 }} className="absolute inset-x-0 bottom-0 z-10 max-h-[60%] overflow-y-auto rounded-t-[26px] bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink">
            <div className="mb-2 flex items-center">
              <h2 className="flex-1 font-display text-lg font-extrabold">Görenler · {viewers.length}</h2>
              <button type="button" aria-label="Kapat" onClick={() => setViewers(null)} className="grid h-8 w-8 place-items-center rounded-full bg-foam">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            {viewers.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink/60">Henüz kimse görmedi.</p>
            ) : (
              <ul className="grid gap-1">
                {viewers.map((v) => (
                  <li key={v.user_id}>
                    <Link href={`/profil/${v.user_id}`} onClick={close} className="flex items-center justify-between gap-3 rounded-xl px-1 py-2 hover:bg-foam">
                      <b className="truncate text-sm">{v.name}</b>
                      <span className="shrink-0 text-xs text-ink/55">{timeAgo(v.viewed_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
