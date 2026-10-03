import { NextResponse } from "next/server";
import { buildUrl, parseOpenMeteo, type WeatherData } from "@/lib/weatherData";

// Biga, Çanakkale — Open-Meteo (ücretsiz, anahtarsız).
// Önceki sürüm rotayı statik önbelleğe alıyordu (ISR + CDN + 10 dk), bu yüzden veri uzun süre "donmuş" görünebiliyordu.
// Artık her istek dinamik: Open-Meteo'ya taze gidilir, uçta (CDN) yalnızca 2 dakika paylaşılır.
export const dynamic = "force-dynamic";

let lastGood: WeatherData | null = null; // Open-Meteo kısa süre erişilemezse son bilinen veriyi göstermek için
const MAX_STALE_MS = 3 * 60 * 60 * 1000;

export async function GET() {
  try {
    const r = await fetch(buildUrl(), { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = parseOpenMeteo(await r.json());
    lastGood = data;
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" } });
  } catch {
    if (lastGood && Date.now() - lastGood.fetchedAt < MAX_STALE_MS) {
      return NextResponse.json({ ...lastGood, stale: true }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Hava durumu alınamadı." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
