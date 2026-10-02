"use client";
import { takePendingPdfUrl } from "@/lib/pdfReader";
import { useEffect, useState } from "react";

export default function PdfFrame({
  initialUrl,
  title,
}: {
  initialUrl: string | null;
  title: string;
}) {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (!initialUrl) setUrl(takePendingPdfUrl());
  }, [initialUrl]);

  if (!url)
    return (
      <div className="grid min-h-[70dvh] flex-1 place-items-center rounded-xl bg-card px-6 text-center text-sm text-ink/70">
        Belge açılamadı. Geri dönüp yeniden deneyin.
      </div>
    );

  return (
    <iframe
      src={url}
      title={title}
      className="min-h-[70dvh] flex-1 rounded-xl bg-white"
    />
  );
}
