import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await prisma.$queryRaw`SELECT 1`; return NextResponse.json({ db: "ok", jwt: !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32 }); }
  catch { return NextResponse.json({ db: "error" }, { status: 500 }); }
}
