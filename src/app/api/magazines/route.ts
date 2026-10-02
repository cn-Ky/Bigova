import { load } from "cheerio";
import { NextResponse } from "next/server";

const SOURCE_URL =
  "https://biibf.comu.edu.tr/arastirma-yayin/fakulte-dergileri-r113.html";
const slugByHost: Record<string, string> = {
  "ybd.dergi.comu.edu.tr": "comuybd",
  "uueyad.dergi.comu.edu.tr": "uueyad",
};
const titlesBySlug: Record<string, string> = {
  biibfd: "Biga İktisadi ve İdari Bilimler Fakültesi Dergisi",
  comuybd: "Yönetim Bilimleri Dergisi",
  uueyad: "Uluslararası Uygulamalı Ekonomi ve Yönetim Araştırmaları Dergisi",
};

export const revalidate = 3600;

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error("Dergi kaynağına ulaşılamadı.");

    const $ = load(await response.text());
    const journals = new Map<string, { title: string; slug: string }>();
    $("a[href]").each((_, anchor) => {
      const title = $(anchor).text().replace(/\s+/g, " ").trim();
      const href = $(anchor).attr("href");
      if (!title || !href) return;
      try {
        const url = new URL(href, SOURCE_URL);
        let slug = slugByHost[url.hostname];
        if (
          url.hostname === "dergipark.org.tr" &&
          /\/pub\/biibfd\/?$/.test(url.pathname)
        )
          slug = "biibfd";
        if (slug && !journals.has(slug))
          journals.set(slug, { title: titlesBySlug[slug] ?? title, slug });
      } catch {
        return;
      }
    });

    return NextResponse.json({
      journals: [...journals.values()],
      source: SOURCE_URL,
    });
  } catch {
    return NextResponse.json(
      { error: "Dergi listesi şu anda alınamıyor." },
      { status: 502 },
    );
  }
}
