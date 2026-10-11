"use client";

import Coin from "@/components/bigocuk/Coin";
import WildAnimal, { speciesName } from "@/components/bigocuk/WildAnimal";
import { COIN_NAME } from "@/lib/bigocuk/config";
import type { SafariThrowResult } from "@/lib/bigocuk/api";
import { RARITY, fmtCountdown, type Spawn } from "@/lib/bigocuk/safari";
import { faCamera, faCheck, faVideoSlash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "aim" | "flying" | "shaking" | "result";
type AnimalAnim = "idle" | "pop" | "absorbed" | "escaped" | "caught";
type Cam = "starting" | "on" | "off" | "denied" | "unsupported";
type Pt = { x: number; y: number; t: number };

const BALL = 68; // top çapı (px)
const RING_MS = 1500; // halka bir turu bu sürede tamamlar
/** Halka çarpanı: 1 (büyük) → 0.25 (küçük). Küçükken bırakmak daha çok bonus verir. */
const ringF = (t: number) => 1 - 0.75 * ((t % RING_MS) / RING_MS);
const qualityOf = (f: number) => (f <= 0.45 ? 3 : f <= 0.65 ? 2 : f <= 0.9 ? 1 : 0);
const QUALITY = [
  { text: "Güzel atış", color: "#E7E7E7" },
  { text: "Güzel!", color: "#FFD84D" },
  { text: "Harika!", color: "#FF9F40" },
  { text: "Mükemmel!", color: "#5BE08A" },
] as const;
const ringColor = (f: number) => QUALITY[qualityOf(f)].color;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function describe(r: SafariThrowResult): { title: string; body: string } {
  switch (r.status) {
    case "too_far":
      return { title: "Çok uzaktasın", body: `Hayvana yaklaşık ${r.dist} m uzaktasın. Yakalamak için en az ${r.need} m yaklaşmalısın.` };
    case "bad_gps":
      return { title: "GPS sinyali zayıf", body: "Konumun yeterince net değil. Açık bir alana çıkıp birkaç saniye bekledikten sonra tekrar dene." };
    case "too_fast":
      return { title: "Çok hızlı hareket ettin", body: `Konumun kısa sürede çok uzağa taşındı. Yaklaşık ${fmtCountdown(r.wait)} sonra tekrar dene. Safari yürüyerek oynanır!` };
    case "expired":
      return { title: "Hayvan kayboldu", body: "Bu hayvan artık burada değil. Haritada yenilerini bulabilirsin." };
    case "already":
      return { title: "Bu hayvan gitti", body: "Bu hayvanı zaten yakaladın ya da kaçtı." };
    case "fled":
      return { title: "Kaçtı!", body: "Bütün toplarını kullandın ve hayvan kaçıp gitti. Bir sonrakinde daha şanslı olursun!" };
    default:
      return { title: "Bir şeyler ters gitti", body: "Tekrar dene." };
  }
}

export default function CatchScreen({
  spawn,
  onThrow,
  onClose,
}: {
  spawn: Spawn;
  /** Yalnızca topun hayvana değdiği atışta çağrılır. Sunucu sonucu döner. */
  onThrow: (bonus: number) => Promise<SafariThrowResult>;
  onClose: () => void;
}) {
  const r = RARITY[spawn.rarity];
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const busy = useRef(false);
  const drag = useRef<{ id: number; start: Pt; samples: Pt[] } | null>(null);
  const popupId = useRef(0);

  const [box, setBox] = useState({ w: typeof window === "undefined" ? 390 : window.innerWidth, h: typeof window === "undefined" ? 800 : window.innerHeight });
  const [phase, setPhase] = useState<Phase>("aim");
  const [animal, setAnimal] = useState<AnimalAnim>("idle");
  const [used, setUsed] = useState(0);
  const [maxTries, setMaxTries] = useState(r.maxTries);
  const [result, setResult] = useState<SafariThrowResult | null>(null);
  const [popup, setPopup] = useState<{ id: number; text: string; color: string } | null>(null);
  const [cam, setCam] = useState<Cam>("starting");
  const [camWanted, setCamWanted] = useState(true);

  const W = box.w;
  const H = box.h;
  const S = Math.round(Math.min(Math.max(Math.min(W * 0.6, H * 0.3), 150), 270));
  const ax = W / 2;
  const ay = H * 0.4;
  const hitR = S * 0.36;
  const D0 = S * 1.25; // halkanın en büyük çapı
  const start = { x: W / 2, y: H - 118 };
  const [ball, setBall] = useState({ x: start.x, y: start.y, s: 1, anim: false, hidden: false });
  const resetBall = useCallback(
    () => setBall({ x: W / 2, y: H - 118, s: 1, anim: false, hidden: false }),
    [W, H],
  );

  /* ───────── yaşam döngüsü ───────── */
  useEffect(() => {
    alive.current = true;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      alive.current = false;
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) setBox({ w: b.width, h: b.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (phase === "aim" && !drag.current) resetBall();
  }, [box.w, box.h, phase, resetBall]);

  /* ───────── kamera ───────── */
  useEffect(() => {
    if (!camWanted) {
      setCam("off");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCam("unsupported");
      return;
    }
    let stream: MediaStream | null = null;
    let dead = false;
    setCam("starting");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((st) => {
        if (dead) {
          st.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = st;
        const v = videoRef.current;
        if (v) {
          v.srcObject = st;
          void v.play().catch(() => {});
        }
        setCam("on");
      })
      .catch(() => {
        if (!dead) setCam("denied");
      });
    return () => {
      dead = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camWanted]);

  /* ───────── halka animasyonu (React'i yormamak için doğrudan DOM) ───────── */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ringRef.current;
      if (el) {
        const f = ringF(performance.now());
        el.style.transform = `translate(-50%,-50%) scale(${f})`;
        el.style.borderColor = ringColor(f);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ───────── Esc ile kapat (atış sırasında değil) ───────── */
  const close = useCallback(() => {
    if (!busy.current) onClose();
  }, [onClose]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [close]);

  const showPopup = (text: string, color: string) => {
    const id = ++popupId.current;
    setPopup({ id, text, color });
    setTimeout(() => alive.current && setPopup((p) => (p?.id === id ? null : p)), 1300);
  };
  const buzz = (ms: number | number[]) => {
    try {
      navigator.vibrate?.(ms);
    } catch {}
  };

  /* ───────── atış ───────── */
  async function hit(bonus: number) {
    busy.current = true;
    setPhase("flying");
    setBall({ x: ax, y: ay, s: 0.42, anim: true, hidden: false });
    showPopup(QUALITY[bonus].text, QUALITY[bonus].color);
    buzz(25);
    // Sunucu isteği animasyonla aynı anda gider; sonucu animasyon bitince gösteririz.
    const req = onThrow(bonus).then(
      (res) => ({ ok: true as const, res }),
      () => ({ ok: false as const }),
    );
    await sleep(480);
    if (!alive.current) return;
    setAnimal("absorbed");
    await sleep(420);
    if (!alive.current) return;
    setPhase("shaking");
    await sleep(1550);
    const out = await req;
    if (!alive.current) return;

    if (!out.ok) {
      showPopup("Bağlantı sorunu, tekrar dene", "#FF8A7A");
      setAnimal("pop");
      resetBall();
      setPhase("aim");
      busy.current = false;
      return;
    }
    const res = out.res;
    setMaxTries(res.maxTries || maxTries);
    if (res.status === "caught") {
      setAnimal("caught");
      setResult(res);
      setPhase("result");
      buzz([60, 40, 60, 40, 140]);
    } else if (res.status === "broke" || res.status === "slow") {
      if (res.status === "broke") setUsed(res.tries);
      showPopup(res.status === "broke" ? "Kurtuldu!" : "Biraz yavaş, tekrar dene", "#FFB84D");
      setAnimal("pop");
      resetBall();
      setPhase("aim");
      busy.current = false;
      buzz(40);
    } else {
      setAnimal(res.status === "fled" ? "escaped" : "idle");
      if (res.status === "fled") setUsed(res.tries);
      setResult(res);
      setPhase("result");
      buzz(res.status === "fled" ? [80, 50, 80] : 40);
    }
  }

  async function miss(msg: string, toX: number, toY: number) {
    busy.current = true;
    showPopup(msg, "#FFFFFF");
    setBall({ x: toX, y: toY, s: 0.4, anim: true, hidden: false });
    await sleep(520);
    if (!alive.current) return;
    setBall((b) => ({ ...b, hidden: true, anim: false }));
    await sleep(120);
    if (!alive.current) return;
    resetBall();
    busy.current = false;
  }

  function release(d: { start: Pt; samples: Pt[] }) {
    const last = d.samples[d.samples.length - 1];
    const first = d.samples.find((s) => s.t >= last.t - 140) ?? d.samples[0];
    const dt = Math.max(1, last.t - first.t);
    const vx = (last.x - first.x) / dt;
    const vy = (last.y - first.y) / dt;
    const rise = d.start.y - last.y;
    if (rise < 40 || vy > -0.25) {
      resetBall(); // dokunma ya da aşağı çekme: atış sayılmaz
      return;
    }
    const speed = Math.hypot(vx, vy);
    const px = last.y <= ay ? last.x : last.x + vx * ((ay - last.y) / vy); // topun hayvanın hizasındaki yatay konumu
    const f = ringF(performance.now());
    if (speed < 0.35) return void miss("Daha güçlü fırlat!", last.x + vx * 200, last.y - 110);
    if (speed > 3.8) return void miss("Çok güçlü!", px, Math.max(40, ay - 220));
    if (Math.abs(px - ax) > hitR) return void miss("Iskaladın!", px, Math.max(40, ay - 120));
    void hit(qualityOf(f));
  }

  /** Dokunmatik olmayan / erişilebilir yol: düğmeyle ortadan atış (halka bonusu geçerli). */
  function tapThrow() {
    if (busy.current || phase !== "aim") return;
    void hit(qualityOf(ringF(performance.now())));
  }

  const local = (e: React.PointerEvent): Pt => {
    const b = rootRef.current!.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top, t: e.timeStamp };
  };
  const onDown = (e: React.PointerEvent) => {
    if (busy.current || phase !== "aim" || (e.target as HTMLElement).closest("[data-nothrow]")) return;
    const p = local(e);
    if (p.y < H * 0.42) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, start: { x: start.x, y: start.y, t: p.t }, samples: [p] };
    setBall({ x: p.x, y: p.y, s: 1.08, anim: false, hidden: false });
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p = local(e);
    d.samples.push(p);
    if (d.samples.length > 8) d.samples.shift();
    setBall({ x: p.x, y: p.y, s: 1.08, anim: false, hidden: false });
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const p = local(e);
    d.samples.push(p);
    release(d);
  };
  const onCancel = () => {
    drag.current = null;
    if (!busy.current) resetBall();
  };

  /* ───────── görünüm ───────── */
  const animalClass =
    animal === "idle" ? "sf-bob" : animal === "pop" ? "sf-pop" : animal === "absorbed" ? "sf-absorb" : animal === "escaped" ? "sf-escape" : "sf-gone";
  const showAim = phase === "aim";
  const camOk = cam === "on";
  const caught = result?.status === "caught";
  const info = result && !caught ? describe(result) : null;
  const capped = !!result && caught && result.earned < result.reward;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${speciesName(spawn.species)} yakalama ekranı`}
      className="fixed inset-0 z-[1000] select-none overflow-hidden bg-black text-white"
      style={{ touchAction: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
    >
      {/* arka plan: kamera ya da yedek sahne */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: camOk ? 1 : 0 }}
      />
      {!camOk && <Scene />}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 42%, ${r.glow.replace(/[\d.]+\)$/, "0.28)")} 0%, transparent 55%), linear-gradient(to bottom, rgba(0,0,0,.35), transparent 22%, transparent 70%, rgba(0,0,0,.45))` }}
      />

      {/* üst çubuk */}
      <div data-nothrow className="absolute inset-x-0 top-0 flex items-start gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={close}
          disabled={phase === "flying" || phase === "shaking"}
          aria-label="Yakalamayı bırak"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/45 text-lg backdrop-blur disabled:opacity-40"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
        <div className="min-w-0 flex-1 text-center leading-tight">
          <p className="font-display text-xl font-extrabold drop-shadow">{speciesName(spawn.species)}</p>
          <span className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-black" style={{ background: r.color }}>
            {r.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCamWanted((v) => !v)}
          disabled={phase === "flying" || phase === "shaking"}
          aria-label={camWanted ? "Kamerayı kapat" : "Kamerayı aç"}
          aria-pressed={camWanted}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/45 text-base backdrop-blur disabled:opacity-40"
        >
          <FontAwesomeIcon icon={camWanted && cam !== "denied" && cam !== "unsupported" ? faCamera : faVideoSlash} />
        </button>
      </div>
      {(cam === "denied" || cam === "unsupported") && (
        <p data-nothrow className="absolute inset-x-6 top-[calc(max(1rem,env(safe-area-inset-top))+4.6rem)] rounded-xl bg-black/50 px-3 py-2 text-center text-xs font-bold backdrop-blur">
          {cam === "denied" ? "Kamera izni verilmedi, sahne modunda oynuyorsun. İzin için adres çubuğundaki kilit simgesine dokun." : "Bu cihazda kamera kullanılamıyor, sahne modunda oynuyorsun."}
        </p>
      )}

      {/* hayvan */}
      <div className="pointer-events-none absolute" style={{ left: ax, top: ay, width: S, height: S * 1.35, transform: "translate(-50%,-50%)" }}>
        <div className={animalClass} style={{ width: "100%", height: "100%", filter: `drop-shadow(0 0 22px ${r.glow})` }}>
          <WildAnimal species={spawn.species} variant={spawn.variant} size={S} />
        </div>
      </div>

      {/* zamanlama halkası */}
      {showAim && (
        <>
          <div
            className="pointer-events-none absolute rounded-full border-2 border-dashed border-white/45"
            style={{ left: ax, top: ay, width: D0, height: D0, transform: "translate(-50%,-50%) scale(.45)" }}
          />
          <div
            ref={ringRef}
            className="pointer-events-none absolute rounded-full"
            style={{ left: ax, top: ay, width: D0, height: D0, border: "5px solid #fff", transform: "translate(-50%,-50%)", boxShadow: "0 0 14px rgba(255,255,255,.5)" }}
          />
        </>
      )}

      {/* atış sonucu yazısı */}
      {popup && (
        <div key={popup.id} className="sf-float pointer-events-none absolute left-1/2 font-display text-3xl font-extrabold" style={{ top: ay - S * 0.72, color: popup.color, textShadow: "0 2px 10px rgba(0,0,0,.6)" }}>
          {popup.text}
        </div>
      )}

      {/* top */}
      {phase !== "result" && (
        <div
          className="pointer-events-none absolute left-0 top-0"
          style={{
            width: BALL,
            height: BALL,
            opacity: ball.hidden ? 0 : 1,
            transform: `translate3d(${ball.x - BALL / 2}px, ${ball.y - BALL / 2}px, 0) scale(${ball.s})`,
            transition: ball.anim ? "transform .48s cubic-bezier(.2,.7,.3,1), opacity .15s" : "none",
          }}
        >
          {/* sallanma ayrı bir katmanda: animasyon dıştaki konum dönüşümünü ezmesin */}
          <div className={phase === "shaking" ? "sf-shake" : ""} style={{ width: "100%", height: "100%" }}>
            <BigoBall />
          </div>
        </div>
      )}

      {/* alt: ipucu, hak sayacı, düğme */}
      {showAim && (
        <div data-nothrow className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="rounded-full bg-black/45 px-3 py-1 text-xs font-bold backdrop-blur">Topu yukarı fırlat · halka küçükken bırak, bonus kazan</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-label={`Top hakkı ${used}/${maxTries}`}>
              {Array.from({ length: maxTries }, (_, i) => (
                <span key={i} className="h-3 w-3 rounded-full border border-white/70" style={{ background: i < used ? "rgba(255,255,255,.15)" : "#FFB84D" }} />
              ))}
            </div>
            <button type="button" onClick={tapThrow} className="rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-extrabold backdrop-blur">
              Dokunarak at
            </button>
          </div>
        </div>
      )}

      {/* konfeti */}
      {caught && <Confetti color={r.color} />}

      {/* sonuç kartı */}
      {phase === "result" && result && (
        <div data-nothrow className="absolute inset-0 grid place-items-center bg-black/55 p-5 backdrop-blur-sm">
          <div className="sf-card w-full max-w-sm rounded-[28px] bg-card p-6 text-center text-ink shadow-2xl">
            {caught ? (
              <>
                <p className="font-display text-3xl font-extrabold">Yakalandı!</p>
                <div className="mx-auto mt-2 w-fit" style={{ filter: `drop-shadow(0 0 18px ${r.glow})` }}>
                  <WildAnimal species={spawn.species} variant={spawn.variant} size={132} view="bust" />
                </div>
                <p className="font-display text-xl font-extrabold">{speciesName(spawn.species)}</p>
                <span className="mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-extrabold text-black" style={{ background: r.color }}>
                  {r.label}
                </span>
                {result.first && (
                  <p className="mt-3 rounded-xl bg-tide/20 px-3 py-2 text-sm font-extrabold">
                    <FontAwesomeIcon icon={faCheck} /> Yeni tür! Hayvan defterine eklendi
                  </p>
                )}
                <p className="mt-3 flex items-center justify-center gap-2 font-display text-3xl font-extrabold">
                  <Coin size={30} /> +{result.earned}
                </p>
                <p className="text-xs text-ink/60">
                  {result.earned > 0
                    ? `${COIN_NAME} cüzdanına eklendi${result.first && !capped ? ` (${r.coins} + ${r.firstBonus} ilk yakalama bonusu)` : ""}`
                    : "Bugünkü Bigcoin sınırına ulaştın. Hayvan yine de defterine eklendi."}
                </p>
                {capped && result.earned > 0 && <p className="mt-1 text-xs font-bold text-coral">Günlük sınır nedeniyle ödülün bir kısmı verilemedi.</p>}
              </>
            ) : (
              info && (
                <>
                  <p className="font-display text-2xl font-extrabold">{info.title}</p>
                  {result.status === "fled" && (
                    <div className="mx-auto mt-2 w-fit opacity-60">
                      <WildAnimal species={spawn.species} variant={spawn.variant} size={110} view="bust" />
                    </div>
                  )}
                  <p className="mt-3 text-sm text-ink/75">{info.body}</p>
                </>
              )
            )}
            <button type="button" onClick={onClose} className="mt-5 w-full rounded-2xl bg-sea px-4 py-3 font-display text-lg font-extrabold text-white">
              Haritaya dön
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Kamera yokken görünen yedek sahne: gökyüzü, tepeler, bulutlar. */
function Scene() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7CC8EE" />
          <stop offset="1" stopColor="#D8F1FA" />
        </linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#sf-sky)" />
      <g fill="#fff" opacity=".85">
        <ellipse cx="90" cy="120" rx="52" ry="16" />
        <ellipse cx="125" cy="108" rx="34" ry="14" />
        <ellipse cx="310" cy="190" rx="60" ry="17" />
        <ellipse cx="345" cy="177" rx="34" ry="13" />
      </g>
      <path d="M0 470 Q90 380 190 440 T400 420 V800 H0Z" fill="#6FBF86" />
      <path d="M0 540 Q120 480 230 530 T400 510 V800 H0Z" fill="#4FA66B" />
      <path d="M0 640 Q150 590 280 640 T400 620 V800 H0Z" fill="#3D8F5A" />
    </svg>
  );
}

/** Bigo topu: Bigcoin renklerinde, ortasında "B" olan top. */
function BigoBall() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,.45))" }}>
      <circle cx="32" cy="32" r="30" fill="#0E3A5B" />
      <path d="M2 32a30 30 0 0 1 60 0z" fill="#1D6A93" />
      <path d="M2 32h60" stroke="#fff" strokeWidth="4" />
      <circle cx="32" cy="32" r="11" fill="#FFC94D" stroke="#fff" strokeWidth="3.5" />
      <text x="32" y="37.4" textAnchor="middle" fontSize="14" fontWeight="800" fill="#8A5A00" fontFamily="'Baloo 2', sans-serif">
        B
      </text>
      <path d="M14 18c4-5 10-8 17-8" stroke="#fff" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 9) * 0.07,
  dur: 1.5 + (i % 5) * 0.22,
  size: 7 + (i % 4) * 2,
  rot: (i * 53) % 360,
}));
function Confetti({ color }: { color: string }) {
  const palette = [color, "#FFC94D", "#FF6B57", "#2CC4B5", "#FFFFFF"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="sf-confetti absolute top-[-20px] block rounded-[2px]"
          style={{ left: `${c.left}%`, width: c.size, height: c.size * 1.6, background: palette[i % palette.length], animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, transform: `rotate(${c.rot}deg)` }}
        />
      ))}
    </div>
  );
}
