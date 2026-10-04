// Saf (ikonsuz) hava durumu yardımcıları. Hem API rotası (sunucu) hem de panel (istemci) kullanır.
// Veri kaynağı: Open-Meteo (ücretsiz, anahtarsız). Konum: Biga, Çanakkale.

export const BIGA = { lat: 40.2286, lon: 27.2425, tz: "Europe/Istanbul", name: "Biga, Çanakkale" } as const;

export type Kind = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm";
export const KINDS: Kind[] = ["clear", "partly", "cloudy", "fog", "rain", "snow", "storm"];

/** WMO hava kodu -> görsel tür */
export function kindOf(code: number): Kind {
  if (code >= 95) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code === 3) return "cloudy";
  if (code === 1 || code === 2) return "partly";
  return "clear";
}
export const label = (k: Kind, day: boolean) =>
  ({ clear: day ? "Güneşli" : "Açık", partly: "Parçalı bulutlu", cloudy: "Bulutlu", fog: "Sisli", rain: "Yağmurlu", snow: "Karlı", storm: "Gök gürültülü" })[k];

export type Current = {
  time: string; // "2026-10-04T02:15" (Europe/Istanbul)
  temp: number;
  feels: number;
  humidity: number;
  wind: number; // km/sa
  gust: number;
  windDir: number; // derece (rüzgârın geldiği yön)
  pressure: number; // hPa
  precip: number; // mm
  cloud: number; // %
  code: number;
  isDay: boolean;
};
export type Hour = { time: string; temp: number; code: number; pop: number; isDay: boolean };
export type Day = {
  date: string; // "2026-10-04"
  code: number;
  max: number;
  min: number;
  pop: number; // yağış olasılığı %
  rain: number; // mm
  wind: number; // km/sa (günlük en yüksek)
  uv: number;
  sunrise: string; // "07:12"
  sunset: string; // "18:41"
};
export type WeatherData = {
  current: Current;
  hours: Hour[]; // şu andan itibaren 24 saat
  days: Day[]; // [0] = bugün, [1..3] = önümüzdeki 3 gün
  fetchedAt: number; // sunucunun veriyi çektiği an (ms)
  stale?: boolean; // sunucu Open-Meteo'ya ulaşamadı, son bilinen veri
};

export function buildUrl(): string {
  const p = new URLSearchParams({
    latitude: String(BIGA.lat),
    longitude: String(BIGA.lon),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max,sunrise,sunset",
    timezone: BIGA.tz,
    forecast_days: "4",
    wind_speed_unit: "kmh",
  });
  return `https://api.open-meteo.com/v1/forecast?${p.toString()}`;
}

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const hhmm = (s: unknown) => (typeof s === "string" && s.includes("T") ? s.split("T")[1].slice(0, 5) : "--:--");

/** Open-Meteo yanıtını panelin kullandığı sade yapıya çevirir. Beklenmeyen biçimde hata fırlatır. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseOpenMeteo(j: any, now = Date.now()): WeatherData {
  const c = j?.current;
  const d = j?.daily;
  const h = j?.hourly;
  if (!c || typeof c.temperature_2m !== "number" || !d?.time?.length || !h?.time?.length) throw new Error("Beklenmeyen hava durumu yanıtı");

  const current: Current = {
    time: String(c.time ?? ""),
    temp: Math.round(c.temperature_2m),
    feels: Math.round(num(c.apparent_temperature, c.temperature_2m)),
    humidity: Math.round(num(c.relative_humidity_2m)),
    wind: Math.round(num(c.wind_speed_10m)),
    gust: Math.round(num(c.wind_gusts_10m)),
    windDir: Math.round(num(c.wind_direction_10m)),
    pressure: Math.round(num(c.pressure_msl)),
    precip: Math.round(num(c.precipitation) * 10) / 10,
    cloud: Math.round(num(c.cloud_cover)),
    code: num(c.weather_code),
    isDay: c.is_day === 1,
  };

  // Saatlik veride "şimdi"nin bulunduğu saati bul (aynı saat dilimi, metin karşılaştırması yeterli).
  const hourStart = current.time.slice(0, 13) + ":00";
  let from = h.time.findIndex((t: string) => t >= hourStart);
  if (from < 0) from = 0;
  const hours: Hour[] = [];
  for (let i = from; i < Math.min(h.time.length, from + 24); i++) {
    hours.push({
      time: h.time[i],
      temp: Math.round(num(h.temperature_2m?.[i])),
      code: num(h.weather_code?.[i]),
      pop: Math.round(num(h.precipitation_probability?.[i])),
      isDay: h.is_day?.[i] === 1,
    });
  }

  const days: Day[] = d.time.slice(0, 4).map((date: string, i: number) => ({
    date,
    code: num(d.weather_code?.[i]),
    max: Math.round(num(d.temperature_2m_max?.[i])),
    min: Math.round(num(d.temperature_2m_min?.[i])),
    pop: Math.round(num(d.precipitation_probability_max?.[i])),
    rain: Math.round(num(d.precipitation_sum?.[i]) * 10) / 10,
    wind: Math.round(num(d.wind_speed_10m_max?.[i])),
    uv: Math.round(num(d.uv_index_max?.[i]) * 10) / 10,
    sunrise: hhmm(d.sunrise?.[i]),
    sunset: hhmm(d.sunset?.[i]),
  }));

  return { current, hours, days, fetchedAt: now };
}

// ---------------------------------------------------------------- Biçimlendirme

const WIND_NAMES = ["Yıldız", "Poyraz", "Gündoğusu", "Keşişleme", "Kıble", "Lodos", "Günbatısı", "Karayel"];
const WIND_SHORT = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"];
/** Rüzgârın geldiği yöne göre geleneksel Türkçe rüzgâr adı ve kısaltma. */
export function windName(deg: number): { name: string; short: string } {
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return { name: WIND_NAMES[i], short: WIND_SHORT[i] };
}
export function windLabel(kmh: number): string {
  if (kmh < 6) return "Sakin";
  if (kmh < 20) return "Hafif";
  if (kmh < 39) return "Orta";
  if (kmh < 62) return "Kuvvetli";
  return "Fırtına";
}
export function uvLabel(uv: number): string {
  if (uv < 3) return "Düşük";
  if (uv < 6) return "Orta";
  if (uv < 8) return "Yüksek";
  if (uv < 11) return "Çok yüksek";
  return "Aşırı";
}

const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
/** "2026-10-06" -> "Salı" ; index 0 -> "Bugün", 1 -> "Yarın". */
export function dayLabel(date: string, index: number): string {
  if (index === 0) return "Bugün";
  if (index === 1) return "Yarın";
  const [y, m, d] = date.split("-").map(Number);
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
}

const partsFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: BIGA.tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
/** Verilen anı Biga (İstanbul) saatinde parçalar. */
export function istanbulParts(d: Date) {
  const o: Record<string, number> = {};
  for (const p of partsFmt.formatToParts(d)) if (p.type !== "literal") o[p.type] = Number(p.value);
  return { y: o.year, mo: o.month, d: o.day, h: o.hour % 24, mi: o.minute, s: o.second };
}
const longDateFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: BIGA.tz, weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const longDate = (d: Date) => longDateFmt.format(d);
/** Yılın günü gibi her gün değişen, deterministik bir sayı (günlük içerik seçimi için). */
export const dayNumber = (d: Date) => {
  const p = istanbulParts(d);
  return Math.floor(Date.UTC(p.y, p.mo - 1, p.d) / 86400000);
};
export const toMin = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};
export const fmtDur = (min: number) => {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  return h ? `${h} sa ${m % 60} dk` : `${m % 60} dk`;
};
export function greeting(hour: number): string {
  if (hour >= 5 && hour < 11) return "Günaydın";
  if (hour >= 11 && hour < 17) return "İyi günler";
  if (hour >= 17 && hour < 22) return "İyi akşamlar";
  return "İyi geceler";
}
export function periodTip(hour: number): string {
  if (hour >= 5 && hour < 9) return "Güne başlarken servis saatlerine ve ders programına göz at.";
  if (hour >= 9 && hour < 12) return "Verimli saatler: zor dersi şimdi çalış, kısa molaları unutma.";
  if (hour >= 12 && hour < 14) return "Öğle arası: yemeğe çıkmadan İşletmeler sayfasında fiyatlara bak.";
  if (hour >= 14 && hour < 18) return "Öğleden sonra: ders notlarını gözden geçir ya da kısa bir yürüyüşe çık.";
  if (hour >= 18 && hour < 22) return "Akşam: arkadaşlarınla buluş, yarının planını yap.";
  return "Geç oldu: uykunu al, yarın taze bir kafayla devam.";
}

// ---------------------------------------------------------------- Akıllı öneriler

export type AdviceIcon = "storm" | "snow" | "fog" | "umbrella" | "wind" | "cold" | "cool" | "hot" | "uv" | "park" | "stars" | "rain" | "calm";
export type Advice = { icon: AdviceIcon; t: string };
/** Güncel durum ve tahmine göre kısa, uygulanabilir öneriler (en fazla 4). */
export function adviceFor(w: WeatherData): Advice[] {
  const c = w.current;
  const kind = kindOf(c.code);
  const today = w.days[0];
  const tomorrow = w.days[1];
  const out: Advice[] = [];

  if (kind === "storm") out.push({ icon: "storm", t: "Gök gürültülü fırtına: açık alandan ve ağaç altından uzak dur." });
  if (kind === "snow") out.push({ icon: "snow", t: "Kar var: kaymaz tabanlı ayakkabı giy, yola erken çık." });
  if (kind === "fog") out.push({ icon: "fog", t: "Sis var: görüş düşük, yolda ve trafikte dikkatli ol." });
  if (kind !== "storm" && kind !== "snow" && (kind === "rain" || (today && today.pop >= 50))) {
    out.push({ icon: "umbrella", t: `Bugün yağış ihtimali %${today?.pop ?? 0}: şemsiye ya da yağmurluk al.` });
  }
  if (c.wind >= 35 || c.gust >= 55) out.push({ icon: "wind", t: "Rüzgâr sert: eşyalarını sabitle, feribot ve deniz seferleri aksayabilir." });
  if (c.feels <= 8) out.push({ icon: "cold", t: "Soğuk: kat kat giyin, atkı ve eldiven iyi gider." });
  else if (c.feels <= 15) out.push({ icon: "cool", t: "Serin: ince bir ceket ya da hırka yanında olsun." });
  if (c.feels >= 30) out.push({ icon: "hot", t: "Çok sıcak: bol su iç, öğle güneşinde dışarıda kalma." });
  if (today && today.uv >= 6 && c.isDay) out.push({ icon: "uv", t: `UV ${today.uv} (${uvLabel(today.uv).toLowerCase()}): güneş kremi ve gözlük şart.` });
  if (c.isDay && (kind === "clear" || kind === "partly") && c.feels >= 16 && c.feels <= 27 && c.wind < 25) {
    out.push({ icon: "park", t: "Hava çok güzel: ders arasında kampüste kısa bir yürüyüş ya da açık havada çalışma iyi gelir." });
  }
  if (!c.isDay && kind === "clear") out.push({ icon: "stars", t: "Gökyüzü açık: şehir ışığından uzaklaşırsan yıldızlar harika görünür." });
  if (tomorrow && tomorrow.pop >= 60 && out.length < 4) out.push({ icon: "rain", t: `Yarın yağış bekleniyor (%${tomorrow.pop}): planını buna göre yap.` });
  if (out.length === 0) out.push({ icon: "calm", t: "Hava sakin görünüyor: günün keyfini çıkar, su içmeyi unutma." });
  return out.slice(0, 4);
}
