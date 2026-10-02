import { load } from "cheerio";

export const magazineSources = {
  biibfd: {
    archiveUrl: "https://dergipark.org.tr/tr/pub/biibfd/archive",
  },
  comuybd: {
    archiveUrl: "https://dergipark.org.tr/tr/pub/comuybd/archive",
  },
  uueyad: {
    archiveUrl: "http://dergi.comu.edu.tr/dergiler/Uueyad",
  },
} as const;

export type MagazineSlug = keyof typeof magazineSources;
export type MagazineIssue = {
  id: string;
  title: string;
  series: string;
  pdfUrl?: string;
};
export type MagazineArticle = {
  id: string;
  title: string;
  pdfUrl: string;
};

export function isMagazineSlug(value: string): value is MagazineSlug {
  return Object.hasOwn(magazineSources, value);
}

const cleanText = (value: string) => value.replace(/\s+/g, " ").trim();

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Bigova/1.0 (+https://bigova.app)" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error("Yayın arşivi alınamadı.");
  return response.text();
}

function parseUueyadIssues(html: string): MagazineIssue[] {
  const $ = load(html);
  const seen = new Set<string>();
  return $("a[href*='/dosyalar/Uueyad/'][href$='.pdf']")
    .toArray()
    .flatMap((anchor) => {
      const pdfUrl = new URL(
        $(anchor).attr("href")!,
        magazineSources.uueyad.archiveUrl,
      ).href;
      const id = new URL(pdfUrl).pathname
        .split("/")
        .pop()
        ?.replace(/\.pdf$/i, "");
      if (!id || seen.has(id)) return [];
      seen.add(id);

      const title =
        cleanText($(anchor).parent().text()) ||
        cleanText($(anchor).find("img").attr("alt") ?? "") ||
        id.replace(/-/g, " ");
      const volume = title.match(/c(?:i|İ|ı|I)lt\s*[:\-]?\s*(\d+)/i)?.[1];
      return [
        {
          id,
          title,
          series: volume ? `Cilt ${volume}` : "Eski Sayılar",
          pdfUrl,
        },
      ];
    });
}

function parseDergiparkIssues(
  slug: Exclude<MagazineSlug, "uueyad">,
  html: string,
) {
  const $ = load(html);
  const seen = new Set<string>();
  return $(`a[href*='/tr/pub/${slug}/issue/']`)
    .toArray()
    .flatMap((anchor) => {
      const href = $(anchor).attr("href");
      if (!href) return [];
      const url = new URL(href, magazineSources[slug].archiveUrl);
      const id = url.pathname.match(/\/issue\/(\d+)/)?.[1];
      if (!id || seen.has(id)) return [];
      seen.add(id);

      const rawTitle = cleanText($(anchor).text());
      const volume = rawTitle.match(/cilt\s*:?\s*(\d+)/i)?.[1];
      const issueNumber = rawTitle.match(/sayı\s*:?\s*([^,]+)/i)?.[1];
      const date = rawTitle.match(/\d{2}\.\d{2}\.\d{4}/)?.[0];
      const title = issueNumber
        ? `Sayı ${cleanText(issueNumber)}${date ? ` · ${date}` : ""}`
        : rawTitle;

      return [
        {
          id,
          title,
          series: volume ? `Cilt ${volume}` : "Diğer Sayılar",
        },
      ];
    });
}

export async function getMagazineIssues(
  slug: MagazineSlug,
): Promise<MagazineIssue[]> {
  const source = magazineSources[slug];
  const html = await fetchHtml(source.archiveUrl);
  const issues =
    slug === "uueyad"
      ? parseUueyadIssues(html)
      : parseDergiparkIssues(slug, html);
  const issueNumber = (issue: MagazineIssue) =>
    Number(
      issue.id.match(/cilt-\d+-sayi-(\d+)/i)?.[1] ??
        issue.title.match(/sayı\s*:?\s*(\d+)/i)?.[1] ??
        0,
    );
  return issues.sort((first, second) => {
    const volume =
      Number(second.series.match(/\d+/)?.[0] ?? 0) -
      Number(first.series.match(/\d+/)?.[0] ?? 0);
    return volume || issueNumber(second) - issueNumber(first);
  });
}

export async function getIssueContents(slug: MagazineSlug, issueId: string) {
  const issues = await getMagazineIssues(slug);
  const issue = issues.find((item) => item.id === issueId);
  if (!issue) return null;
  if (issue.pdfUrl)
    return {
      title: issue.title,
      series: issue.series,
      fullIssuePdfUrl: issue.pdfUrl,
      articles: [],
    };

  const issueUrl = `https://dergipark.org.tr/tr/pub/${slug}/issue/${issue.id}`;
  const html = await fetchHtml(issueUrl);
  const $ = load(html);
  const articles = $("article.article-card")
    .toArray()
    .flatMap((element) => {
      const card = $(element);
      const title = cleanText(
        card.find(`a[href*='/tr/pub/${slug}/article/']`).first().text(),
      );
      const href = card
        .find("a[href*='/tr/download/article-file/']")
        .first()
        .attr("href");
      if (!title || !href) return [];
      const id = new URL(href, issueUrl).pathname.split("/").pop() ?? title;
      return [{ id, title, pdfUrl: new URL(href, issueUrl).href }];
    });
  const fullIssueHref = $("a[href*='/tr/download/issue-full-file/']")
    .first()
    .attr("href");

  return {
    title: issue.title,
    series: issue.series,
    fullIssuePdfUrl: fullIssueHref
      ? new URL(fullIssueHref, issueUrl).href
      : undefined,
    articles,
  };
}
