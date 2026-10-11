/**
 * Basit, bellek içi kayan-pencere hız sınırı (sunucusuz ortamda örnek başına çalışır: en iyi çaba).
 * Gerçek DDoS koruması için Vercel Firewall / WAF kuralı da açın; bu yalnızca tek örneğe yönelik kötüye
 * kullanımı (PDF vekili üzerinden bant genişliği, kazıma) yavaşlatır.
 */
const buckets = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-real-ip") ||
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** true = izin verildi, false = sınır aşıldı. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
    if (buckets.size > MAX_KEYS) buckets.clear();
  }
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export const tooMany = () =>
  new Response(JSON.stringify({ error: "Çok fazla istek. Biraz sonra tekrar dene." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": "30", "Cache-Control": "no-store" },
  });
