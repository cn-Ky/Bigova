import { NextResponse } from "next/server";
// Biga, Çanakkale — Open-Meteo (ücretsiz, anahtarsız). Sunucuda 10 dk önbelleğe alınır.
const URL_ = "https://api.open-meteo.com/v1/forecast?latitude=40.2286&longitude=27.2425&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m&timezone=Europe%2FIstanbul";
export const revalidate = 600;
export async function GET() {
  try {
    const r = await fetch(URL_, { next: { revalidate: 600 } });
    if (!r.ok) throw new Error("upstream");
    const c = (await r.json()).current;
    return NextResponse.json(
      { temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), wind: Math.round(c.wind_speed_10m), code: c.weather_code, isDay: c.is_day === 1 },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({ error: "Hava durumu alınamadı." }, { status: 502 });
  }
}
