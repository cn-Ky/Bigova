import { getIssueContents, isMagazineSlug } from "@/lib/magazineCatalog";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: { slug: string; issue: string } },
) {
  if (!isMagazineSlug(params.slug))
    return NextResponse.json({ error: "Dergi bulunamadı." }, { status: 404 });
  try {
    const contents = await getIssueContents(params.slug, params.issue);
    if (!contents)
      return NextResponse.json({ error: "Sayı bulunamadı." }, { status: 404 });
    return NextResponse.json(contents);
  } catch {
    return NextResponse.json(
      { error: "Sayı içeriği şu anda alınamıyor." },
      { status: 502 },
    );
  }
}
