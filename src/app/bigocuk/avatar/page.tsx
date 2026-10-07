"use client";
import Avatar, { SLOT_VIEW } from "@/components/bigocuk/Avatar";
import Coin from "@/components/bigocuk/Coin";
import { errMsg, useBigocuk } from "@/lib/bigocuk/api";
import { COIN_NAME } from "@/lib/bigocuk/config";
import {
  DEFAULT_AVATAR,
  EYE_COLORS,
  ITEM_MAP,
  PATTERNS,
  SETS,
  SLOTS,
  isFree,
  itemsOf,
  speciesOf,
  type AvatarConfig,
  type ItemSet,
  type Slot,
} from "@/lib/bigocuk/items";
import { faArrowLeft, faCheck, faLock, faPaw, faRotateLeft, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const fmt = (n: number) => n.toLocaleString("tr-TR");
const SLOT_IDS = SLOTS.map((s) => s.id);
const TIER_TONE: Record<string, string> = { Yaygın: "bg-foam text-ink/70", Nadir: "bg-tide/25 text-ink", Efsanevi: "bg-sun/40 text-deep" };

export default function AvatarSayfasi() {
  const { status, state, loadError, buy, saveAvatar, refresh } = useBigocuk();
  const live = status === "ready" && !!state;
  const [draft, setDraft] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [tab, setTab] = useState<Slot>("species");
  const [setFilter, setSetFilter] = useState<ItemSet | "all">("all");
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
  const sp = speciesOf(draft.species);
  const showSets = tab !== "species";
  const list = itemsOf(tab).filter((i) => setFilter === "all" || i.set === setFilter);

  const showBar = live && (dirty || !!msg);

  // kaydedilmemiş değişiklik varken sekmeyi kapatma/yenileme uyarısı
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // başarı mesajı birkaç saniye sonra kaybolur
  useEffect(() => {
    if (!msg?.ok) return;
    const t = setTimeout(() => setMsg(null), 4500);
    return () => clearTimeout(t);
  }, [msg]);

  // kilitli (satın alınmamış) parçaları son kaydedilen / varsayılan haline döndürür
  const dropLocked = () => {
    setMsg(null);
    setFocus(null);
    setDraft((d) => {
      const next = { ...d };
      for (const s of SLOT_IDS) if (!has(d[s])) next[s] = has(saved[s]) ? saved[s] : DEFAULT_AVATAR[s];
      return next;
    });
  };

  const setLook = (k: "color" | "pattern" | "eyes" | "feature", v: string) => {
    setMsg(null);
    setDraft((d) => ({ ...d, [k]: v }));
  };
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
  const doSave = () => run(() => saveAvatar(draft), "Avatarın kaydedildi. Arkadaşların da yeni görünümünü görecek.");

  return (
    <main className={showBar ? "pb-44 lg:pb-10" : "pb-10"}>
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <Link href="/bigocuk" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-white/75">
          <FontAwesomeIcon icon={faArrowLeft} /> Bigocuk
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <FontAwesomeIcon icon={faPaw} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold">Avatarım</h1>
            <p className="text-sm text-white/75">Hayvanını seç, giydir, {COIN_NAME} ile al</p>
          </div>
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-display text-lg font-extrabold">
              <Coin size={22} /> {fmt(coins)}
            </span>
          )}
        </div>
      </header>

      {(status === "error" || status === "loading") && (
        <div role="status" className="mx-5 mt-5 flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
          <FontAwesomeIcon icon={status === "error" ? faTriangleExclamation : faPaw} className={status === "error" ? "text-coral" : "text-sea"} />
          <p className="min-w-0 flex-1 text-sm font-bold">
            {status === "error" ? "Avatar bilgilerin yüklenemedi, bu yüzden kaydedemezsin." : "Avatar bilgilerin yükleniyor…"}
            {status === "error" && loadError && <span className="mt-1 block text-xs font-semibold text-ink/60">Ayrıntı: {loadError}</span>}
          </p>
          {status === "error" && (
            <button onClick={() => void refresh()} className="rounded-xl bg-sea px-3.5 py-2 text-sm font-bold text-white">
              Tekrar dene
            </button>
          )}
        </div>
      )}

      <div className="grid gap-5 px-5 pt-5 lg:grid-cols-[320px_1fr] lg:items-start">
        {/* Önizleme */}
        <section className="rounded-[24px] bg-card p-4 shadow-sm lg:sticky lg:top-6">
          <motion.div key={JSON.stringify(draft)} initial={{ scale: 0.97 }} animate={{ scale: 1 }} className="mx-auto h-[300px] w-[222px] overflow-hidden rounded-3xl">
            <Avatar config={draft} size="fluid" label="Avatar önizlemesi" />
          </motion.div>
          <p className="mt-2 text-center font-display text-lg font-extrabold leading-tight">
            {sp.name}
            <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[11px] font-bold ${TIER_TONE[sp.tier]}`}>{sp.tier}</span>
          </p>

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
            <div className="mt-2 text-center">
              <p className="text-xs font-bold text-ink/65">
                Kaydetmek için denediğin kilitli parçaları satın al ya da çıkar.
              </p>
              <button onClick={dropLocked} disabled={busy} className="mt-1.5 rounded-full bg-foam px-3 py-1.5 text-xs font-extrabold text-ink">
                Kilitlileri çıkar
              </button>
            </div>
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
          {/* Görünüm: seçili hayvana göre değişir, hepsi ücretsiz */}
          <div className="rounded-[20px] bg-card p-4 shadow-sm">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-ink/50">{sp.name} görünümü · ücretsiz</p>
            <Swatches label="Renk" items={sp.palette} value={draft.color} onPick={(id) => setLook("color", id)} />
            <Swatches label="Göz rengi" items={EYE_COLORS} value={draft.eyes} onPick={(id) => setLook("eyes", id)} className="mt-3" />
            <Chips label="Desen" items={PATTERNS} value={draft.pattern} onPick={(id) => setLook("pattern", id)} className="mt-3" />
            <Chips
              label={sp.featureLabel}
              items={sp.features.map((name, i) => ({ id: `f${i + 1}`, name }))}
              value={draft.feature}
              onPick={(id) => setLook("feature", id)}
              className="mt-3"
            />
          </div>

          <div role="tablist" aria-label="Parça türü" className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {SLOTS.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={tab === s.id}
                onClick={() => { setTab(s.id); setSetFilter("all"); }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${tab === s.id ? "bg-sea text-white" : "bg-card text-ink"}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {showSets && (
            <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" aria-label="Koleksiyon">
              {[{ id: "all" as const, label: "Tümü" }, ...SETS].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSetFilter(s.id)}
                  aria-pressed={setFilter === s.id}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1 ${setFilter === s.id ? "bg-sun text-deep ring-sun" : "bg-transparent text-ink/70 ring-ink/15"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {list.length === 0 ? (
            <p className="mt-4 rounded-2xl border-2 border-dashed border-ink/15 p-5 text-center text-sm text-ink/55">Bu koleksiyonda bu türden parça yok.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 xl:grid-cols-5">
              {list.map((it) => {
                const equipped = draft[tab] === it.id;
                const mine = has(it.id);
                const setLabel = SETS.find((x) => x.id === it.set)?.label;
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
                      <span className="flex items-center justify-between gap-1 px-0.5 pb-0.5 text-[11px] font-bold text-ink/60">
                        {isFree(it.id) ? (
                          "Ücretsiz"
                        ) : owned.has(it.id) ? (
                          "Sende"
                        ) : (
                          <span className="inline-flex items-center gap-1"><Coin size={13} /> {fmt(it.price)}</span>
                        )}
                        {setLabel && <span className="truncate rounded-full bg-sun/25 px-1.5 text-[9px] font-extrabold text-ink/70">{setLabel.split(" ")[0]}</span>}
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
          )}
        </section>
      </div>

      {/* Mobilde her zaman görünen kaydetme çubuğu (masaüstünde önizleme kartı zaten sabit) */}
      {showBar && (
        <div
          className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 mx-auto w-full max-w-[440px] px-3 md:max-w-[520px] lg:hidden"
          role="region"
          aria-label="Avatarı kaydet"
        >
          <div className="rounded-[24px] bg-card p-3 shadow-[0_12px_38px_rgba(14,58,91,.28)] ring-1 ring-ink/5">
            {msg && (
              <p role="status" className={`mb-2 text-center text-sm font-bold ${msg.ok ? "text-sea" : "text-coral"}`}>
                {msg.text}
              </p>
            )}
            {dirty && (
              <>
                {lockedInDraft.length > 0 ? (
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs font-bold text-ink/70">
                    <span>Kilitli parça denedin, kaydetmek için satın al.</span>
                    <button onClick={dropLocked} disabled={busy} className="shrink-0 rounded-full bg-foam px-3 py-1.5 font-extrabold text-ink">
                      Kilitlileri çıkar
                    </button>
                  </div>
                ) : (
                  <p className="mb-2 text-center text-xs font-bold text-ink/70">Kaydedilmemiş değişiklikler var.</p>
                )}
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <button
                    onClick={doSave}
                    disabled={busy || lockedInDraft.length > 0}
                    className="flex items-center justify-center gap-2 rounded-xl bg-sea px-4 py-3 font-bold text-white disabled:opacity-45"
                  >
                    <FontAwesomeIcon icon={faCheck} /> {busy ? "Kaydediliyor…" : "Kaydet"}
                  </button>
                  <button
                    onClick={() => { setDraft(saved); setFocus(null); setMsg(null); }}
                    disabled={busy}
                    aria-label="Değişiklikleri geri al"
                    className="grid w-12 place-items-center rounded-xl bg-foam text-ink disabled:opacity-45"
                  >
                    <FontAwesomeIcon icon={faRotateLeft} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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

function Chips({
  label, items, value, onPick, className = "",
}: {
  label: string;
  items: readonly { id: string; name: string }[];
  value: string;
  onPick: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-xs font-bold text-ink/60">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            aria-pressed={value === s.id}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${value === s.id ? "bg-sea text-white" : "bg-foam text-ink"}`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
