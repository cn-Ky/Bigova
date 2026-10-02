import { NextResponse } from "next/server";

const allowedPaths: Record<string, RegExp[]> = {
  "dergipark.org.tr": [
    /^\/tr\/download\/(?:article-file|issue-full-file)\/\d+\/?$/,
  ],
  "ybd.dergi.comu.edu.tr": [/^\/dosyalar\/Ybd\/[\w.-]+\.pdf$/i],
  "uueyad.dergi.comu.edu.tr": [/^\/dosyalar\/Uueyad\/[\w.-]+\.pdf$/i],
  "cdn.comu.edu.tr": [/^\/cms\/(?:biibf|bigamyo)\/files\/[\w.-]+\.pdf$/i],
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

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("src");
  if (!source)
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

  try {
    const range = request.headers.get("range");
    const upstream = await fetch(sourceUrl, {
      headers: range ? { Range: range } : undefined,
      redirect: "follow",
      ...(range
        ? { cache: "no-store" as const }
        : { next: { revalidate: 3600 } }),
    });
    const finalUrl = new URL(upstream.url);
    const contentType = upstream.headers.get("content-type") ?? "";
    if (
      !upstream.ok ||
      !isAllowedPdf(finalUrl) ||
      !contentType.includes("pdf")
    ) {
      await upstream.body?.cancel();
      return NextResponse.json(
        { error: "PDF kaynağından dosya alınamadı." },
        { status: 502 },
      );
    }

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
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
