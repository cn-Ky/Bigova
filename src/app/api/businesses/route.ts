import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const items = await prisma.business.findMany({ where: { name: { contains: q, mode: "insensitive" } }, orderBy: { name: "asc" }, take: 100 });
  return NextResponse.json(items);
}
