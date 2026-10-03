"use client";
import Avatar, { SLOT_VIEW } from "@/components/bigocuk/Avatar";
import Coin from "@/components/bigocuk/Coin";
import { errMsg, useBigocuk } from "@/lib/bigocuk/api";
import { COIN_NAME } from "@/lib/bigocuk/config";
import {
  DEFAULT_AVATAR,
  HAIR_COLORS,
  ITEM_MAP,
  SKINS,
  SLOTS,
  isFree,
  itemsOf,
  type AvatarConfig,
  type Slot,
} from "@/lib/bigocuk/items";
import { faArrowLeft, faCheck, faLock, faRotateLeft, faShirt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const fmt = (n: number) => n.toLocaleString("tr-TR");
const SLOT_IDS = SLOTS.map((s) => s.id);

export default function AvatarSayfasi() {
  const { status, state, buy, saveAvatar } = useBigocuk();
  const live = status === "ready" && !!state;
  const [draft, setDraft] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [tab, setTab] = useState<Slot>("hair");
  const [focus, setFocus] = useState<string | null>(null); // satın alınmamış, denenen parça
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const loaded = useRef(false);

  // sunucudaki avatar ilk yüklendiğinde taslağı doldur
  useEffect(() => {
    if (state && !loaded.current) {
      loaded.current = true;
      setDraft(state.avatar);
    }
  }, [state]);

  const owned = useMemo(() => new Set(state?.owned ?? []), [state]);
  const has = (id: string) => isFree(id) || owned.has(id);
  const saved = state?.avatar ?? DEFAULT_AVATAR;
  const dirty = live && JSON.stringify(draft) !== JSON.stringify(saved);
  const lockedInDraft = SLOT_IDS.filter((s) => !has(draft[s]));
  const focusItem = focus ? ITEM_MAP[focus] : null;
  const coins = state?.coins ?? 0;

  const pick = (slot: Slot, id: string) => {
    setMsg(null);
    setDraft((d) => ({ ...d, [slot]: id }));
    setFocus(has(id) ? null : id);
  };

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  }
  const doBuy = () => focusItem && run(async () => { await buy(focusItem.id); setFocus(null); }, `${focusItem.name} senin oldu.`);
  const doSave = () => run(() => saveAvatar(draft), "Avatarın kaydedildi.");

  return (
    <main className="pb-10">
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <Link href="/bigocuk" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-white/75">
          <FontAwesomeIcon icon={faArrowLeft} /> Bigocuk
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <FontAwesomeIcon icon={faShirt} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold">Avatarım</h1>
            <p className="text-sm text-white/75">Giy, dene, {COIN_NAME} ile al</p>
          </div>
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-display text-lg font-extrabold">
              <Coin size={22} /> {fmt(coins)}
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-5 px-5 pt-5 lg:grid-cols-[320px_1fr] lg:items-start">
        {/* Önizleme */}
        <section className="rounded-[24px] bg-card p-4 shadow-sm lg:sticky lg:top-6">
          <motion.div key={JSON.stringify(draft)} initial={{ scale: 0.97 }} animate={{ scale: 1 }} className="mx-auto h-[300px] w-[222px] overflow-hidden rounded-3xl">
            <Avatar config={draft} size="fluid" label="Avatar önizlemesi" />
          </motion.div>

          {focusItem && (
            <div className="mt-3 rounded-2xl bg-sun/20 p-3 text-center">
              <b className="font-display text-base">{focusItem.name}</b>
              {live ? (
                <>
                  <button
                    onClick={doBuy}
                    disabled={busy || coins < focusItem.price}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-sun px-4 py-3 font-display text-lg font-extrabold text-deep disabled:opacity-50"
                  >
                    Satın al · <Coin size={20} /> {fmt(focusItem.price)}
                  </button>
                  {coins < focusItem.price && (
                    <p className="mt-1.5 text-xs font-bold text-ink/70">
                      {fmt(focusItem.price - coins)} {COIN_NAME} eksik. Yürüyerek kazanabilirsin.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-xs text-ink/70">
                  Denemek serbest. Satın almak için{" "}
                  <Link href="/giris" className="font-extrabold underline">giriş yap</Link>.
                </p>
              )}
            </div>
          )}

          {live && (
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <button
                onClick={doSave}
                disabled={busy || !dirty || lockedInDraft.length > 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-sea px-4 py-3 font-bold text-white disabled:opacity-45"
              >
                <FontAwesomeIcon icon={faCheck} /> Kaydet
              </button>
              <button
                onClick={() => { setDraft(saved); setFocus(null); setMsg(null); }}
                disabled={busy || !dirty}
                aria-label="Değişiklikleri geri al"
                className="grid w-12 place-items-center rounded-xl bg-foam text-ink disabled:opacity-45"
              >
                <FontAwesomeIcon icon={faRotateLeft} />
              </button>
            </div>
          )}
          {live && dirty && lockedInDraft.length > 0 && (
            <p className="mt-2 text-center text-xs font-bold text-ink/65">
              Kaydetmek için denediğin kilitli parçaları satın al ya da çıkar.
            </p>
          )}
          {msg && (
            <p role="status" className={`mt-2 text-center text-sm font-bold ${msg.ok ? "text-sea" : "text-coral"}`}>
              {msg.text}
            </p>
          )}
          {status === "setup" && (
            <p className="mt-2 text-center text-sm font-bold text-coral">
              Kurulum eksik: <code>supabase/bigocuk_upgrade.sql</code> dosyasını çalıştır.
            </p>
          )}
          {status === "guest" && (
            <p className="mt-3 text-center text-xs text-ink/65">
              Misafir olarak deneyebilirsin. Kaydetmek ve satın almak için giriş yapmalısın.
            </p>
          )}
        </section>

        {/* Seçenekler */}
        <section className="min-w-0">
          <div className="rounded-[20px] bg-card p-4 shadow-sm">
            <Swatches label="Ten rengi" items={SKINS} value={draft.skin} onPick={(id) => setDraft((d) => ({ ...d, skin: id }))} />
            <Swatches label="Saç rengi" items={HAIR_COLORS} value={draft.hairColor} onPick={(id) => setDraft((d) => ({ ...d, hairColor: id }))} className="mt-3" />
          </div>

          <div role="tablist" aria-label="Parça türü" className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {SLOTS.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={tab === s.id}
                onClick={() => setTab(s.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${tab === s.id ? "bg-sea text-white" : "bg-card text-ink"}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 xl:grid-cols-5">
            {itemsOf(tab).map((it) => {
              const equipped = draft[tab] === it.id;
              const mine = has(it.id);
              return (
                <li key={it.id}>
                  <button
                    onClick={() => pick(tab, it.id)}
                    aria-pressed={equipped}
                    className={`relative w-full rounded-2xl bg-card p-1.5 text-left shadow-sm ring-2 transition ${equipped ? "ring-sun" : "ring-transparent"}`}
                  >
                    <span className="block aspect-square overflow-hidden rounded-xl">
                      <Avatar config={{ ...draft, [tab]: it.id }} size="fluid" view={SLOT_VIEW[tab]} label={it.name} />
                    </span>
                    <span className="mt-1.5 block truncate px-0.5 text-[12px] font-bold leading-tight">{it.name}</span>
                    <span className="block px-0.5 pb-0.5 text-[11px] font-bold text-ink/60">
                      {isFree(it.id) ? (
                        "Ücretsiz"
                      ) : owned.has(it.id) ? (
                        "Sende"
                      ) : (
                        <span className="inline-flex items-center gap-1"><Coin size={13} /> {fmt(it.price)}</span>
                      )}
                    </span>
                    {equipped && (
                      <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-sun text-xs text-deep">
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                    )}
                    {!mine && !equipped && (
                      <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-deep/70 text-[10px] text-white">
                        <FontAwesomeIcon icon={faLock} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}

function Swatches({
  label, items, value, onPick, className = "",
}: {
  label: string;
  items: { id: string; name: string; c: string }[];
  value: string;
  onPick: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-xs font-bold text-ink/60">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            aria-label={s.name}
            aria-pressed={value === s.id}
            title={s.name}
            className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-[rgb(var(--card))] ${value === s.id ? "ring-sun" : "ring-ink/10"}`}
            style={{ background: s.c }}
          />
        ))}
      </div>
    </div>
  );
}
