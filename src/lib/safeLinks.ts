/**
 * Kullanıcı/dış kaynaklı değerlerden güvenli bağlantı üretir.
 * Veritabanı kısıtları atlanmış ya da eski kayıtlar olsa bile `javascript:`, `mailto:...?bcc=` gibi
 * enjeksiyonlar tarayıcıya hiç ulaşmaz.
 */
const EMAIL = /^[^\s@?&#,;:<>()"'\\/]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const safeMailto = (email?: string | null, subject?: string): string | null => {
  const e = (email ?? "").trim();
  if (e.length > 120 || !EMAIL.test(e)) return null;
  return `mailto:${e}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
};

export const safeWaUrl = (digits?: string | null, text?: string): string | null => {
  const d = (digits ?? "").trim();
  if (!/^[0-9]{10,15}$/.test(d)) return null;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

export const safeTelUrl = (phone?: string | null): string | null => {
  const p = (phone ?? "").replace(/[^+\d]/g, "");
  return /^\+?\d{7,15}$/.test(p) ? `tel:${p}` : null;
};

/** Yalnızca http(s) bağlantılarına izin verir. */
export const safeHttpUrl = (value?: string | null): string | null => {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
};
