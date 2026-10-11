const PENDING_PDF_URL = "bigova-pending-pdf-url";

export function pdfReaderHref(url: string, title: string) {
  const internalUrl = url.startsWith("/")
    ? url
    : `/api/pdf?src=${encodeURIComponent(url)}`;
  const query = new URLSearchParams({ url: internalUrl, title });
  return `/belge?${query.toString()}`;
}

/** Supabase depolama sunucusunun adı (imzalı not PDF'leri buradan gelir). */
function supabaseHost(): string | null {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
}

/**
 * Okuyucuda açılabilecek adresler: yalnızca kendi PDF rotalarımız ve projenin Supabase depolaması.
 * (Keyfi bir https adresini <iframe> içine koymak, sitemiz üzerinden kimlik avı sayfası göstermeye yarar.)
 */
export function safePdfUrl(value?: string | null) {
  if (!value || value.length > 2000) return null;
  if (
    (value.startsWith("/api/sample-notes/") || value.startsWith("/api/pdf?src=")) &&
    !value.includes("..") &&
    !value.startsWith("//")
  )
    return value;
  try {
    const url = new URL(value);
    const host = supabaseHost();
    return url.protocol === "https:" && host && url.hostname === host && url.pathname.startsWith("/storage/v1/")
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function openPdfReader(url: string, title: string) {
  try {
    sessionStorage.setItem(PENDING_PDF_URL, url);
    const query = new URLSearchParams({ title });
    window.location.assign(`/belge?${query.toString()}`);
    return true;
  } catch {
    return false;
  }
}

export function takePendingPdfUrl() {
  const url = sessionStorage.getItem(PENDING_PDF_URL);
  sessionStorage.removeItem(PENDING_PDF_URL);
  return safePdfUrl(url);
}
