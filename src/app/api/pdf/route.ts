import { NextResponse } from "next/server";
import { allow, clientIp, tooMany } from "@/lib/rateLimit";

const allowedPaths: Record<string, RegExp[]> = {
  "dergipark.org.tr": [
    /^\/tr\/download\/(?:article-file|issue-full-file)\/\d+\/?$/,
  ],
  "ybd.dergi.comu.edu.tr": [/^\/dosyalar\/Ybd\/[\w.-]+\.pdf$/i],
  "uueyad.dergi.comu.edu.tr": [/^\/dosyalar\/Uueyad\/[\w.-]+\.pdf$/i],
  "cdn.comu.edu.tr": [/^\/cms\/(?:biibf|bigamyo|ogrenciisleri)\/files\/[\w.-]+\.pdf$/i],
};

function isAllowedPdf(value: URL) {
  const patterns = allowedPaths[value.hostname];
  return (
    !value.username &&
    !value.password &&
    !value.port &&
    ["http:", "https:"].includes(value.protocol) &&
    !!patterns?.some((pattern) => pattern.test(value.pathname))
  );
}

const MAX_REDIRECTS = 3;
const MAX_PDF_BYTES = 60 * 1024 * 1024; // vekil üzerinden aşırı bant genişliği kullanımını sınırlar
const RANGE_RE = /^bytes=\d{0,12}-\d{0,12}$/;

/** Yönlendirmeleri elle izler: her adım beyaz listeye karşı doğrulanır (SSRF / açık yönlendirme koruması). */
async function fetchAllowed(start: URL, init: RequestInit & { next?: { revalidate: number } }) {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedPdf(current)) return null;
    const response = await fetch(current, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) return null;
      try {
        current = new URL(location, current);
      } catch {
        return null;
      }
      continue;
    }
    return response;
  }
  return null;
}

export async function GET(request: Request) {
  // Tarayıcının PDF görüntüleyicisi aralıklı (Range) çok sayıda istek atar; cömert ama sınırlı.
  if (!allow(`pdf:${clientIp(request)}`, 240, 60_000)) return tooMany();
  const source = new URL(request.url).searchParams.get("src");
  if (!source || source.length > 600)
    return NextResponse.json({ error: "PDF adresi gerekli." }, { status: 400 });

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return NextResponse.json(
      { error: "PDF adresi geçersiz." },
      { status: 400 },
    );
  }
  if (!isAllowedPdf(sourceUrl))
    return NextResponse.json(
      { error: "Bu PDF kaynağına izin verilmiyor." },
      { status: 403 },
    );

  const rawRange = request.headers.get("range");
  const range = rawRange && RANGE_RE.test(rawRange) ? rawRange : null;

  try {
    const upstream = await fetchAllowed(sourceUrl, {
      headers: range ? { Range: range } : undefined,
      ...(range
        ? { cache: "no-store" as const }
        : { next: { revalidate: 3600 } }),
    });
    const contentType = upstream?.headers.get("content-type") ?? "";
    if (!upstream || !upstream.ok || !contentType.includes("pdf")) {
      await upstream?.body?.cancel();
      return NextResponse.json(
        { error: "PDF kaynağından dosya alınamadı." },
        { status: 502 },
      );
    }

    const declared = Number(upstream.headers.get("content-length") ?? 0);
    if (declared > MAX_PDF_BYTES) {
      await upstream.body?.cancel();
      return NextResponse.json({ error: "PDF çok büyük." }, { status: 413 });
    }

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": range ? "private, no-store" : "public, max-age=3600",
      "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes",
      Vary: "Range",
    });
    for (const name of ["content-length", "content-range"] as const) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: "PDF şu anda açılamıyor." },
      { status: 502 },
    );
  }
}
