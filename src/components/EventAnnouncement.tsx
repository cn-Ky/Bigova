"use client";
import { FEATURED_EVENT, type CampusEvent, type EventHighlight } from "@/lib/eventsData";
import {
  faBell,
  faCalendarDays,
  faCalendarPlus,
  faCandyCane,
  faCamera,
  faCheck,
  faChevronDown,
  faClock,
  faGhost,
  faLocationDot,
  faMasksTheater,
  faMusic,
  faShareNodes,
  faShirt,
  faTicket,
  faUserGroup,
  faWandMagicSparkles,
  faXmark,
  faMapLocationDot,
  faCircleInfo,
  faSuitcase,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

const sv = (i: number) => ({ ["--i" as string]: i }) as CSSProperties;
const pad = (n: number) => String(n).padStart(2, "0");

const HL_ICON: Record<EventHighlight["icon"], IconDefinition> = {
  ghost: faGhost,
  mask: faMasksTheater,
  camera: faCamera,
  music: faMusic,
  pumpkin: faWandMagicSparkles,
  candy: faCandyCane,
};

type Phase = "upcoming" | "live" | "ended";
function phaseOf(ev: CampusEvent, now: Date): Phase {
  const t = now.getTime();
  if (t < new Date(ev.start).getTime()) return "upcoming";
  if (t <= new Date(ev.end).getTime()) return "live";
  return "ended";
}

function remaining(ev: CampusEvent, now: Date) {
  const ms = Math.max(0, new Date(ev.start).getTime() - now.getTime());
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** .ics dosyası: telefon/bilgisayar takvimine tek dokunuşla eklenir. */
function icsOf(ev: CampusEvent) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bigova//Etkinlik//TR",
    "BEGIN:VEVENT",
    `UID:${ev.id}@bigova`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(ev.start)}`,
    `DTEND:${stamp(ev.end)}`,
    `SUMMARY:${esc(ev.title)}`,
    `LOCATION:${esc(`${ev.place}, Biga`)}`,
    `DESCRIPTION:${esc(ev.tagline)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function Art() {
  return (
    <svg className="ev-art" viewBox="0 0 160 150" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="ev-glow" cx="50%" cy="55%" r="55%">
          <stop offset="0" stopColor="rgb(255 184 77)" stopOpacity=".55" />
          <stop offset="1" stopColor="rgb(255 107 87)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ev-pk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFB84D" />
          <stop offset="1" stopColor="#FF6B57" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="88" r="70" fill="url(#ev-glow)" />
      {/* ay */}
      <g className="ev-moon">
        <circle cx="132" cy="26" r="15" fill="#FFF3D1" />
        <circle cx="138" cy="22" r="13" fill="#2a1450" />
      </g>
      {/* yıldızlar */}
      <path className="ev-twinkle" d="m22 30 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff" />
      <path className="ev-twinkle ev-twinkle-b" d="m108 52 1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#fff" />
      {/* yarasalar */}
      <g className="ev-bat" fill="#0d0620">
        <path d="M34 62c5-6 9-2 12 2 3-4 7-8 12-2-3-1-6 0-8 3l-4 5-4-5c-2-3-5-4-8-3z" />
      </g>
      <g className="ev-bat ev-bat-b" fill="#0d0620">
        <path transform="translate(82 14) scale(.8)" d="M34 62c5-6 9-2 12 2 3-4 7-8 12-2-3-1-6 0-8 3l-4 5-4-5c-2-3-5-4-8-3z" />
      </g>
      {/* kabak */}
      <g className="ev-pumpkin">
        <ellipse cx="50" cy="96" rx="30" ry="34" fill="url(#ev-pk)" opacity=".85" />
        <ellipse cx="110" cy="96" rx="30" ry="34" fill="url(#ev-pk)" opacity=".85" />
        <ellipse cx="80" cy="96" rx="34" ry="38" fill="url(#ev-pk)" />
        <path d="M80 60c-5 12-5 52 0 72M62 64c-8 14-8 48 0 66M98 64c8 14 8 48 0 66" stroke="#C94A36" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M76 58c-1-10 4-17 14-19 1 8-3 15-8 19z" fill="rgb(44 196 181)" stroke="#0d6e66" strokeWidth="2" strokeLinejoin="round" />
        <g className="ev-face" fill="#2a1450">
          <path d="M56 88l10-14 10 14z" />
          <path d="M84 88l10-14 10 14z" />
          <path d="M76 100l4-7 4 7z" />
          <path d="M54 108l9 6 6-8 6 9 5-9 5 9 6-9 6 8 9-6c-6 18-18 22-26 22s-20-4-26-22z" />
        </g>
      </g>
    </svg>
  );
}

function CountTile({ v, l }: { v: number; l: string }) {
  return (
    <div className="ev-count-tile">
      <b>{pad(v)}</b>
      <small>{l}</small>
    </div>
  );
}

export default function EventAnnouncement({ event = FEATURED_EVENT }: { event?: CampusEvent }) {
  const ev = event;
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [going, setGoing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const key = `bigova-event-${ev.id}`;

  // Katılım tercihi yalnızca bu cihazda tutulur (tarayıcı depolaması kapalıysa sessizce atlanır).
  useEffect(() => {
    try {
      setGoing(localStorage.getItem(key) === "1");
    } catch {}
  }, [key]);

  // Açıkken saniyede bir, kapalıyken dakikada bir güncellenir.
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), open ? 1000 : 30000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleGoing = () => {
    const next = !going;
    setGoing(next);
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {}
    setToast(next ? "Harika! Etkinlik listene eklendi." : "Katılım işaretin kaldırıldı.");
  };

  const addToCalendar = useCallback(() => {
    const blob = new Blob([icsOf(ev)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ev.id}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Takvim dosyası indirildi.");
  }, [ev]);

  const share = async () => {
    const text = `${ev.title} · ${ev.dateLabel} ${ev.timeLabel} · ${ev.place}`;
    const url = typeof location !== "undefined" ? location.origin : "";
    try {
      if (navigator.share) await navigator.share({ title: ev.title, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setToast("Bağlantı panoya kopyalandı.");
      }
    } catch {
      /* kullanıcı paylaşımı iptal etti */
    }
  };

  const phase: Phase = now ? phaseOf(ev, now) : "upcoming";
  const left = now ? remaining(ev, now) : { d: 0, h: 0, m: 0, s: 0 };
  const current = now && phase === "live" ? ev.program.filter((p) => new Date(p.at).getTime() <= now.getTime()).length - 1 : -1;
  const pill =
    phase === "live" ? "Şu an devam ediyor" : phase === "ended" ? "Sona erdi" : left.d > 0 ? `${left.d} gün kaldı` : left.h > 0 ? `${left.h} saat kaldı` : "Birazdan başlıyor";

  return (
    <section className={`ev ${open ? "is-open" : ""}`} aria-labelledby="event-heading" data-phase={phase}>
      <div className="ev-sky" aria-hidden="true">
        <i /> <i /> <i /> <i /> <i /> <i />
      </div>

      <button type="button" className="ev-head" aria-expanded={open} aria-controls="ev-body" onClick={() => setOpen((o) => !o)}>
        <span className="ev-head-main">
          <span className="ev-kicker">
            <FontAwesomeIcon icon={faCalendarDays} /> {ev.kicker}
            {ev.sample && <span className="ev-tag">Örnek</span>}
            <span className={`ev-pill ${phase === "live" ? "is-live" : ""}`}>{pill}</span>
          </span>
          <h2 id="event-heading" className="ev-title">
            {ev.title}
          </h2>
          <span className="ev-tagline">{ev.tagline}</span>
          <span className="ev-chips">
            <span>
              <FontAwesomeIcon icon={faCalendarDays} /> {ev.dateLabel}
            </span>
            <span>
              <FontAwesomeIcon icon={faClock} /> {ev.timeLabel}
            </span>
            <span>
              <FontAwesomeIcon icon={faLocationDot} /> {ev.place}
            </span>
            <span className="ev-chip-free">
              <FontAwesomeIcon icon={faTicket} /> {ev.price}
            </span>
          </span>
        </span>
        <span className="ev-art-wrap">
          <Art />
        </span>
        <span className="ev-chev" aria-hidden="true">
          <span className="sr-only">{open ? "Ayrıntıları kapat" : "Ayrıntıları aç"}</span>
          <FontAwesomeIcon icon={faChevronDown} />
        </span>
      </button>

      <div className="ev-collapse" id="ev-body">
        <div className="ev-collapse-in">
          <div className="ev-body">
            {/* Geri sayım */}
            {phase === "upcoming" && (
              <div className="ev-block ev-count" style={sv(0)} role="timer" aria-label="Etkinliğe kalan süre">
                <CountTile v={left.d} l="gün" />
                <CountTile v={left.h} l="saat" />
                <CountTile v={left.m} l="dakika" />
                <CountTile v={left.s} l="saniye" />
              </div>
            )}
            {phase === "live" && (
              <div className="ev-block ev-live" style={sv(0)}>
                <i aria-hidden="true" /> Etkinlik şu an devam ediyor. Meydana gel!
              </div>
            )}
            {phase === "ended" && (
              <div className="ev-block ev-live is-ended" style={sv(0)}>
                Bu etkinlik sona erdi. Yenisi için bu karta göz at.
              </div>
            )}

            {/* Hakkında */}
            <div className="ev-block" style={sv(1)}>
              <h3 className="ev-h">
                <FontAwesomeIcon icon={faCircleInfo} /> Etkinlik hakkında
              </h3>
              {ev.about.map((p) => (
                <p key={p} className="ev-p">
                  {p}
                </p>
              ))}
            </div>

            {/* Künye */}
            <dl className="ev-block ev-facts" style={sv(2)}>
              <div>
                <dt>
                  <FontAwesomeIcon icon={faCalendarDays} /> Tarih
                </dt>
                <dd>
                  {ev.dateLabel}
                  <small>{ev.timeLabel}</small>
                </dd>
              </div>
              <div>
                <dt>
                  <FontAwesomeIcon icon={faLocationDot} /> Yer
                </dt>
                <dd>
                  {ev.place}
                  <small>{ev.placeHint}</small>
                </dd>
              </div>
              <div>
                <dt>
                  <FontAwesomeIcon icon={faTicket} /> Giriş
                </dt>
                <dd>
                  {ev.price}
                  <small>{ev.audience}</small>
                </dd>
              </div>
              <div>
                <dt>
                  <FontAwesomeIcon icon={faShirt} /> Kıyafet
                </dt>
                <dd>
                  Kostüm
                  <small>{ev.dress}</small>
                </dd>
              </div>
            </dl>

            {/* Neler var */}
            <div className="ev-block" style={sv(3)}>
              <h3 className="ev-h">
                <FontAwesomeIcon icon={faGhost} /> Gecede neler var?
              </h3>
              <ul className="ev-hl">
                {ev.highlights.map((h, i) => (
                  <li key={h.title} style={sv(i)}>
                    <span className="ev-hl-ico">
                      <FontAwesomeIcon icon={HL_ICON[h.icon]} />
                    </span>
                    <b>{h.title}</b>
                    <small>{h.text}</small>
                  </li>
                ))}
              </ul>
            </div>

            {/* Program */}
            <div className="ev-block" style={sv(4)}>
              <h3 className="ev-h">
                <FontAwesomeIcon icon={faClock} /> Akış
              </h3>
              <ol className="ev-tl">
                {ev.program.map((p, i) => (
                  <li key={p.time} className={i === current ? "is-now" : now && phase === "live" && i < current ? "is-past" : ""}>
                    <time>{p.time}</time>
                    <span>
                      <b>{p.title}</b>
                      <small>{p.text}</small>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Yanında getir + notlar */}
            <div className="ev-cols" style={sv(5)}>
              <div className="ev-block">
                <h3 className="ev-h">
                  <FontAwesomeIcon icon={faSuitcase} /> Yanında getir
                </h3>
                <ul className="ev-list">
                  {ev.bring.map((b) => (
                    <li key={b}>
                      <FontAwesomeIcon icon={faCheck} /> {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ev-block">
                <h3 className="ev-h">
                  <FontAwesomeIcon icon={faBell} /> Bilmen gerekenler
                </h3>
                <ul className="ev-list ev-list-dot">
                  {ev.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Eylemler */}
            <div className="ev-actions" style={sv(6)}>
              <button type="button" className={`ev-btn ev-btn-main ${going ? "is-on" : ""}`} onClick={toggleGoing} aria-pressed={going}>
                <FontAwesomeIcon icon={going ? faCheck : faUserGroup} /> {going ? "Katılıyorsun" : "Katılacağım"}
              </button>
              <button type="button" className="ev-btn" onClick={addToCalendar}>
                <FontAwesomeIcon icon={faCalendarPlus} /> Takvime ekle
              </button>
              <Link href="/harita" className="ev-btn">
                <FontAwesomeIcon icon={faMapLocationDot} /> Haritada gör
              </Link>
              <button type="button" className="ev-btn" onClick={share}>
                <FontAwesomeIcon icon={faShareNodes} /> Paylaş
              </button>
              <button type="button" className="ev-btn ev-btn-close" onClick={() => setOpen(false)} aria-label="Etkinlik ayrıntılarını kapat">
                <FontAwesomeIcon icon={faXmark} /> Kapat
              </button>
            </div>

            <p className="ev-foot">
              Düzenleyen: {ev.organizer}.{ev.sample && " “Örnek” etiketli etkinlik biçimi göstermek için hazırlanmıştır, gerçek bir etkinlik değildir."}
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className="ev-toast" role="status">
          {toast}
        </div>
      )}
    </section>
  );
}
