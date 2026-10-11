"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import { blockErrorText, type BlockedUser } from "@/lib/blocks";
import { useAvatars } from "@/lib/bigocuk/useAvatars";
import { faBan, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo, useState } from "react";

/** Arkadaşlar sayfasındaki "Engellenenler" bölümü. Kimse engellenmemişse hiç görünmez. */
export default function BlockedUsers({
  blocked,
  onUnblock,
}: {
  blocked: BlockedUser[];
  onUnblock: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const ids = useMemo(() => blocked.map((b) => b.id), [blocked]);
  const avatars = useAvatars(ids);
  if (!blocked.length) return null;

  const unblock = async (b: BlockedUser) => {
    setBusyId(b.id);
    setError("");
    try {
      await onUnblock(b.id);
    } catch (e) {
      setError(blockErrorText(e));
    } finally {
      setBusyId("");
    }
  };

  return (
    <section aria-label="Engellenenler" className="rounded-2xl bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/10">
          <FontAwesomeIcon icon={faBan} />
        </span>
        <span className="flex-1 font-display text-base font-extrabold">
          Engellenenler <span className="text-sm font-bold opacity-60">{blocked.length}</span>
        </span>
        <FontAwesomeIcon icon={faChevronDown} className={`opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm opacity-70">
            Engellediğin kişiler sana mesaj yazamaz, arkadaşlık isteği gönderemez ve seni aramada göremez.
          </p>
          <ul className="mt-3 grid gap-2">
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-xl bg-foam p-2.5">
                <UserAvatar name={b.name} avatar={avatars[b.id]} size={40} />
                <span className="min-w-0 flex-1 truncate font-bold">{b.name || "Öğrenci"}</span>
                <button
                  type="button"
                  disabled={busyId === b.id}
                  onClick={() => void unblock(b)}
                  className="rounded-full bg-sea px-4 py-2 text-sm font-extrabold text-white active:scale-95 disabled:opacity-50"
                >
                  {busyId === b.id ? "…" : "Engeli kaldır"}
                </button>
              </li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="mt-3 text-sm font-bold text-coral">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
