import { getMagazineIssues, isMagazineSlug } from "@/lib/magazineCatalog";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  if (!isMagazineSlug(params.slug))
    return NextResponse.json({ error: "Dergi bulunamadı." }, { status: 404 });
  try {
    return NextResponse.json({ issues: await getMagazineIssues(params.slug) });
  } catch {
    return NextResponse.json(
      { error: "Dergi arşivi şu anda alınamıyor." },
      { status: 502 },
    );
  }
}
