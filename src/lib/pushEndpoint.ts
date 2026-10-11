/**
 * Web Push uç noktası beyaz listesi.
 * Sunucu bu adreslere istek attığı için keyfi bir URL kabul etmek SSRF'e (iç ağa / metadata servisine
 * istek attırma) yol açar. Yalnızca tarayıcı üreticilerinin push servisleri kabul edilir.
 * (supabase/security_hardening.sql içindeki CHECK kısıtıyla aynı kural olmalı.)
 */
const ALLOWED_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge, Brave, Opera, Samsung (FCM)
  "android.googleapis.com", // eski FCM/GCM
  "push.services.mozilla.com", // Firefox
  "notify.windows.com", // Edge / Windows (WNS)
  "push.apple.com", // Safari / iOS
];

export function isAllowedPushEndpoint(value: string): boolean {
  if (value.length > 1000) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}
