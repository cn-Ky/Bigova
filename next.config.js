const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Next.js satır içi betik kullandığı için 'unsafe-inline' gerekir
// (nonce'lu CSP için middleware gerekir); yine de object/base/frame/form kısıtları ve
// bağlantı (connect-src) beyaz listesi XSS ve veri sızdırma yüzeyini ciddi biçimde daraltır.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Görseller: Wikimedia, harita karoları, Supabase depolama vb. Betik çalıştırmaz, bu yüzden https genel izinli.
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  // Supabase (REST + realtime websocket) ve istemciden çağrılan rota servisleri
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://routing.openstreetmap.de https://router.project-osrm.org",
  // PDF okuyucu: kendi /api/pdf rotası ve Supabase imzalı bağlantıları
  "frame-src 'self' https://*.supabase.co",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// Tüm yanıtlara uygulanan başlıklar
const commonHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Hareket sensörü (Bigocuk yürüyüş) ve konum (harita) kendi sitemizde açık; kamera/mikrofon vb. kapalı.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), payment=(), usb=(), accelerometer=(self), gyroscope=(self), geolocation=(self)",
  },
];

// HTML sayfaları: CSP + çerçeveye alınamaz
const pageHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
];

// PDF yanıtları (kendi PDF okuyucumuzun iframe'inde açılır): CSP uygulanmaz (tarayıcının PDF görüntüleyicisini
// bozabilir), yalnızca aynı site çerçeveleyebilir.
const pdfHeaders = [{ key: "X-Frame-Options", value: "SAMEORIGIN" }];

module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Uygulama next/image kullanmıyor; görsel optimizasyon uç noktasının saldırı yüzeyini daralt (yalnızca WebP, uzak kaynak yok).
  images: { formats: ["image/webp"], remotePatterns: [], minimumCacheTTL: 60 },
  env: {
    ...(supabaseUrl ? { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } : {}),
    ...(supabaseAnonKey
      ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey }
      : {}),
  },
  async headers() {
    return [
      { source: "/:path*", headers: commonHeaders },
      { source: "/((?!api/pdf|api/sample-notes).*)", headers: pageHeaders },
      { source: "/api/pdf", headers: pdfHeaders },
      { source: "/api/sample-notes/:id", headers: pdfHeaders },
      // Service worker: önbelleğe alınmasın, kapsamı değişmesin
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};
