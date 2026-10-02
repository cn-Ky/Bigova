const PENDING_PDF_URL = "bigova-pending-pdf-url";

export function pdfReaderHref(url: string, title: string) {
  const internalUrl = url.startsWith("/")
    ? url
    : `/api/pdf?src=${encodeURIComponent(url)}`;
  const query = new URLSearchParams({ url: internalUrl, title });
  return `/belge?${query.toString()}`;
}

export function safePdfUrl(value?: string | null) {
  if (!value) return null;
  if (
    (value.startsWith("/api/sample-notes/") ||
      value.startsWith("/api/pdf?src=")) &&
    !value.includes("..")
  )
    return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
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
