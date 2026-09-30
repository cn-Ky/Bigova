import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SCHOOL_MAIL, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = b?.email?.trim().toLowerCase() ?? "";
  if (!SCHOOL_MAIL.test(email) || !b?.password) return NextResponse.json({ error: "Geçersiz giriş." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(b.password, user.passwordHash))) return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
