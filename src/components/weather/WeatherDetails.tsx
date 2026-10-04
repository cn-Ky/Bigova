"use client";
import { useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight, faArrowUp, faBriefcase, faBus, faClock, faGraduationCap, faLightbulb, faMapLocationDot, faRotateRight, faShuffle,
  faUserGroup, faUtensils, faXmark, faCalendarDay, faDroplet, faTemperatureHalf, faGauge, faSun, faMoon, faUmbrella, faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { iconOf, kindOf } from "@/lib/weather";
import {
  BIGA, adviceFor, dayLabel, dayNumber, fmtDur, greeting, istanbulParts, longDate, periodTip, toMin, uvLabel, windLabel, windName,
  type Day, type WeatherData,
} from "@/lib/weatherData";
import { BIGA_NOTES, GUIDE, type TipSection } from "@/lib/bigaInfo";
import { ADVICE_ICON, TIP_ICON } from "@/lib/icons";
import { useTween } from "./hooks";

const sv = (i: number) => ({ ["--i" as string]: i }) as CSSProperties;
const pad = (n: number) => String(n).padStart(2, "0");
const SECTION_ICON: Record<TipSection["icon"], typeof faBus> = {
  kampus: faGraduationCap, yemek: faUtensils, ulasim: faBus, gezi: faMapLocationDot, sosyal: faUserGroup, yasam: faBriefcase,
};

type Props = {
  data: WeatherData;
  open: boolean;
  now: Date | null;
  spin: boolean;
  failed: boolean;
  lastOk: number;
  onRefresh: () => void;
  onClose: () => void;
};

/* ------------------------------------------------------------------ Saat + gün doğumu/batımı yayı */
function SunArc({ day, open, nowMin }: { day: Day; open: boolean; nowMin: number | null }) {
  const sr = toMin(day.sunrise);
  const ss = toMin(day.sunset);
  const valid = Number.isFinite(sr) && Number.isFinite(ss) && ss > sr && nowMin !== null;
  let p = 0;
  let isDay = false;
  let text = "";
  if (valid && nowMin !== null) {
    if (nowMin < sr) { p = 0; text = `Gün doğumuna ${fmtDur(sr - nowMin)}`; }
    else if (nowMin > ss) { p = 1; text = `Gün doğumuna ${fmtDur(1440 - nowMin + sr)}`; }
    else { isDay = true; p = (nowMin - sr) / (ss - sr); text = `Gün batımına ${fmtDur(ss - nowMin)}`; }
  }
  const t = useTween(open ? p : 0, 1600);
  const CX = 100, CY = 74, RX = 80, RY = 60;
  const clamped = Math.min(Math.max(t, 0), 0.9999);
  const x = CX - RX * Math.cos(clamped * Math.PI);
  const y = CY - RY * Math.sin(clamped * Math.PI);
  return (
    <div className="wx-sun" aria-label={text || "Gün doğumu ve batımı"}>
      <svg viewBox="0 0 200 90" role="img" aria-hidden>
        <path d={`M${CX - RX},${CY} A${RX},${RY} 0 0 1 ${CX + RX},${CY}`} className="wx-sun-track" />
        {clamped > 0.002 && <path d={`M${CX - RX},${CY} A${RX},${RY} 0 0 1 ${x.toFixed(2)},${y.toFixed(2)}`} className="wx-sun-done" />}
        <line x1="8" y1={CY} x2="192" y2={CY} className="wx-sun-horizon" />
        <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
          <circle r="13" className={isDay ? "wx-sun-halo" : "wx-moon-halo"} />
          <circle r="7" className={isDay ? "wx-sun-dot" : "wx-moon-dot"} />
        </g>
      </svg>
      <div className="wx-sun-times">
        <span><FontAwesomeIcon icon={faSun} /> {day.sunrise}</span>
        <span><FontAwesomeIcon icon={faMoon} /> {day.sunset}</span>
      </div>
      <div className="wx-sun-left">{text}</div>
    </div>
  );
}

function ClockCard({ data, open, now }: { data: WeatherData; open: boolean; now: Date | null }) {
  const p = now ? istanbulParts(now) : null;
  const nowMin = p ? p.h * 60 + p.mi : null;
  return (
    <div className="wx-sec wx-clock" style={sv(0)}>
      <div>
        <div className="wx-t"><FontAwesomeIcon icon={faClock} /> Biga saati</div>
        <div className="wx-time" suppressHydrationWarning>
          {p ? <>{pad(p.h)}<span className="wx-colon">:</span>{pad(p.mi)}<small>:{pad(p.s)}</small></> : "--:--"}
        </div>
        <div className="wx-date" suppressHydrationWarning>{now ? longDate(now) : " "}</div>
        {p && <div className="wx-greet" suppressHydrationWarning>{greeting(p.h)}, Biga!</div>}
        {p && <p className="wx-ptip" suppressHydrationWarning>{periodTip(p.h)}</p>}
      </div>
      <SunArc day={data.days[0]} open={open} nowMin={nowMin} />
    </div>
  );
}

/* ------------------------------------------------------------------ 24 saatlik sıcaklık grafiği */
function HourChart({ data }: { data: WeatherData }) {
  const hrs = data.hours;
  const W = 480, H = 100, PX = 20, PT = 12, PB = 10;
  const g = useMemo(() => {
    if (hrs.length < 2) return null;
    const temps = hrs.map((h) => h.temp);
    const lo = Math.min(...temps), hi = Math.max(...temps), span = hi - lo || 1;
    const xs = hrs.map((_, i) => PX + (i * (W - PX * 2)) / (hrs.length - 1));
    const ys = temps.map((t) => PT + (1 - (t - lo) / span) * (H - PT - PB));
    let line = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
    for (let i = 1; i < xs.length; i++) {
      const cx = ((xs[i - 1] + xs[i]) / 2).toFixed(1);
      line += ` C${cx},${ys[i - 1].toFixed(1)} ${cx},${ys[i].toFixed(1)} ${xs[i].toFixed(1)},${ys[i].toFixed(1)}`;
    }
    const area = `${line} L${xs[xs.length - 1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;
    return { xs, ys, line, area };
  }, [hrs]);
  if (!g) return null;
  const picks = hrs.map((_, i) => i).filter((i) => i % 4 === 0);
  return (
    <div className="wx-sec" style={sv(1)}>
      <div className="wx-t"><FontAwesomeIcon icon={faTemperatureHalf} /> Önümüzdeki 24 saat</div>
      <div className="wx-chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="24 saatlik sıcaklık grafiği">
          <defs>
            <linearGradient id="wx-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgb(255 216 107)" stopOpacity=".55" />
              <stop offset="1" stopColor="rgb(255 216 107)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={g.area} className="wx-area" fill="url(#wx-grad)" />
          <path d={g.line} className="wx-line" pathLength={1} />
          {picks.map((i) => <circle key={i} cx={g.xs[i]} cy={g.ys[i]} r={i === 0 ? 5 : 3.5} className={i === 0 ? "wx-dot wx-dot-now" : "wx-dot"} />)}
        </svg>
        <div className="wx-hrs">
          {picks.map((i) => {
            const h = hrs[i];
            return (
              <div key={h.time} className="wx-h" style={{ left: `${(g.xs[i] / W) * 100}%` }}>
                <b>{h.temp}°</b>
                <FontAwesomeIcon icon={iconOf(kindOf(h.code), h.isDay)} />
                <span>{i === 0 ? "Şimdi" : `${h.time.slice(11, 13)}:00`}</span>
                {h.pop >= 30 && <em><FontAwesomeIcon icon={faDroplet} /> {h.pop}%</em>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Günlük tahmin */
function Forecast({ data, open }: { data: WeatherData; open: boolean }) {
  const lo = Math.min(...data.days.map((d) => d.min));
  const hi = Math.max(...data.days.map((d) => d.max));
  const span = hi - lo || 1;
  return (
    <div className="wx-sec" style={sv(2)}>
      <div className="wx-t"><FontAwesomeIcon icon={faCalendarDay} /> Önümüzdeki 3 gün</div>
      <div className="wx-fc">
        {data.days.map((d, i) => {
          const left = ((d.min - lo) / span) * 100;
          const width = Math.max(10, ((d.max - d.min) / span) * 100);
          return (
            <div key={d.date} className="wx-fr" style={sv(i)}>
              <span className="wx-fr-d"><b>{dayLabel(d.date, i)}</b>{d.pop >= 20 && <em><FontAwesomeIcon icon={faDroplet} /> %{d.pop}</em>}</span>
              <FontAwesomeIcon icon={iconOf(kindOf(d.code), true)} className="wx-fr-i" />
              <span className="wx-fr-lo">{d.min}°</span>
              <span className="wx-bar"><i style={{ left: `${left}%`, width: open ? `${width}%` : "0%", transitionDelay: `${0.45 + i * 0.1}s` }} /></span>
              <span className="wx-fr-hi">{d.max}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Ayrıntı kutucukları */
function Stats({ data }: { data: WeatherData }) {
  const c = data.current;
  const today = data.days[0];
  const wn = windName(c.windDir);
  const hum = c.humidity < 30 ? "Kuru" : c.humidity < 60 ? "Rahat" : c.humidity < 80 ? "Nemli" : "Çok nemli";
  const pr = c.pressure < 1009 ? "Düşük" : c.pressure > 1022 ? "Yüksek" : "Normal";
  const tiles: { k: string; v: string; s: string; i?: ReactNode; t?: string }[] = [
    { k: "Hissedilen", v: `${c.feels}°`, s: `Ölçülen ${c.temp}°`, i: <FontAwesomeIcon icon={faTemperatureHalf} /> },
    { k: "Nem", v: `%${c.humidity}`, s: hum, i: <FontAwesomeIcon icon={faDroplet} /> },
    { k: "Rüzgâr", v: `${c.wind} km/sa`, s: `${wn.name} · ${windLabel(c.wind)}`, i: <FontAwesomeIcon icon={faArrowUp} className="wx-wind-arrow" style={{ transform: `rotate(${(c.windDir + 180) % 360}deg)` }} />, t: `Rüzgâr ${wn.short} yönünden esiyor` },
    { k: "Basınç", v: `${c.pressure} hPa`, s: pr, i: <FontAwesomeIcon icon={faGauge} /> },
    { k: "UV", v: `${today.uv}`, s: uvLabel(today.uv), i: <FontAwesomeIcon icon={faSun} /> },
    { k: "Yağış", v: `%${today.pop}`, s: `${today.rain} mm`, i: <FontAwesomeIcon icon={faUmbrella} /> },
  ];
  return (
    <div className="wx-sec wx-stats" style={sv(3)}>
      {tiles.map((t, n) => (
        <div key={t.k} className="wx-tile" style={sv(n)} title={t.t}>
          <span className="wx-tile-k">{t.i} {t.k}</span>
          <b>{t.v}</b>
          <small>{t.s}</small>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Akıllı öneriler */
function Advice({ data }: { data: WeatherData }) {
  const list = useMemo(() => adviceFor(data), [data]);
  return (
    <div className="wx-sec" style={sv(4)}>
      <div className="wx-t"><FontAwesomeIcon icon={faLightbulb} /> Bugün için öneriler</div>
      <div className="wx-chips">
        {list.map((a, i) => (
          <span key={a.t} className="wx-chip" style={sv(i)}><FontAwesomeIcon icon={ADVICE_ICON[a.icon]} /> {a.t}</span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Günün Biga'sı */
function Note({ now }: { now: Date | null }) {
  const [shift, setShift] = useState(0);
  const seed = now ? dayNumber(now) : 0;
  const n = BIGA_NOTES[(((seed + shift) % BIGA_NOTES.length) + BIGA_NOTES.length) % BIGA_NOTES.length];
  return (
    <div className="wx-sec wx-note" style={sv(5)}>
      <div className="wx-t">
        <FontAwesomeIcon icon={faCircleInfo} /> Günün Biga'sı
        <button type="button" className="wx-mini" onClick={() => setShift((s) => s + 1)} aria-label="Sıradaki not">
          <FontAwesomeIcon icon={faShuffle} /> Sıradaki
        </button>
      </div>
      <article key={n.title} className="wx-note-in">
        <span className="wx-tag" data-tag={n.tag}>{n.tag}</span>
        <h4>{n.title}</h4>
        <p>{n.text}</p>
      </article>
    </div>
  );
}

/* ------------------------------------------------------------------ Öğrenci rehberi */
function Guide() {
  const [active, setActive] = useState(GUIDE[0].id);
  const sec = GUIDE.find((s) => s.id === active) ?? GUIDE[0];
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = GUIDE.findIndex((s) => s.id === active);
    const next = GUIDE[(i + (e.key === "ArrowRight" ? 1 : GUIDE.length - 1)) % GUIDE.length];
    setActive(next.id);
    requestAnimationFrame(() => document.getElementById(`wx-tab-${next.id}`)?.focus());
  };
  return (
    <div className="wx-sec" style={sv(6)}>
      <div className="wx-t"><FontAwesomeIcon icon={faGraduationCap} /> Öğrenci rehberi</div>
      <div className="wx-tabs" role="tablist" aria-label="Rehber bölümleri" onKeyDown={onKey}>
        {GUIDE.map((s) => (
          <button key={s.id} id={`wx-tab-${s.id}`} type="button" role="tab" aria-selected={s.id === active} aria-controls="wx-tabpanel" tabIndex={s.id === active ? 0 : -1} className="wx-tab" onClick={() => setActive(s.id)}>
            <FontAwesomeIcon icon={SECTION_ICON[s.icon]} /> {s.title}
          </button>
        ))}
      </div>
      <div key={sec.id} id="wx-tabpanel" role="tabpanel" aria-labelledby={`wx-tab-${sec.id}`} className="wx-tips">
        {sec.tips.map((t, i) => (
          <div key={t.title} className="wx-tip" style={sv(i)}>
            <span className="wx-tip-e" aria-hidden><FontAwesomeIcon icon={TIP_ICON[t.icon]} /></span>
            <div>
              <b>{t.title}</b>
              <p>{t.text}</p>
            </div>
            {t.href && (
              <Link href={t.href} className="wx-go" aria-label={`${t.cta ?? "Aç"}: ${t.title}`}>
                {t.cta ?? "Aç"} <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Ana bileşen */
export default function WeatherDetails({ data, open, now, spin, failed, lastOk, onRefresh, onClose }: Props) {
  const ok = lastOk ? istanbulParts(new Date(lastOk)) : null;
  const mins = now && lastOk ? Math.max(0, Math.floor((now.getTime() - lastOk) / 60000)) : 0;
  const status = failed ? "Bağlantı sorunu: son veri gösteriliyor" : data.stale ? "Sunucu verisi yenilenemedi: son bilinen veri" : "Canlı veri · 5 dakikada bir yenilenir";
  return (
    <div className="wx-body">
      <ClockCard data={data} open={open} now={now} />
      <HourChart data={data} />
      <Forecast data={data} open={open} />
      <Stats data={data} />
      <Advice data={data} />
      <Note now={now} />
      <Guide />
      <div className="wx-sec wx-foot" style={sv(7)}>
        <div className={failed || data.stale ? "wx-warn" : ""}>
          <span>{status}</span>
          <small suppressHydrationWarning>
            {BIGA.name} · ölçüm {data.current.time.slice(11, 16) || "--:--"}
            {ok ? ` · güncellendi ${pad(ok.h)}:${pad(ok.mi)}${mins >= 1 ? ` (${mins} dk önce)` : ""}` : ""} · Open-Meteo
          </small>
          <small>İçerikler genel bilgidir; saat, fiyat ve sefer bilgilerini gitmeden önce doğrula.</small>
        </div>
        <div className="wx-actions">
          <button type="button" className={`wx-btn ${spin ? "is-spin" : ""}`} onClick={onRefresh} aria-label="Hava durumunu şimdi yenile">
            <FontAwesomeIcon icon={faRotateRight} />
          </button>
          <button type="button" className="wx-btn" onClick={onClose} aria-label="Paneli kapat">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>
    </div>
  );
}
