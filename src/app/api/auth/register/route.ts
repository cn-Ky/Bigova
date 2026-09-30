import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SCHOOL_MAIL, createSession } from "@/lib/auth";

const schema = z.object({ email: z.string().trim().toLowerCase(), name: z.string().min(2).max(60), password: z.string().min(8).max(100) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz bilgiler." }, { status: 400 });
  const { email, name, password } = parsed.data;
  const m = email.match(SCHOOL_MAIL);
  if (!m) return NextResponse.json({ error: "Sadece ogrencinumarasi@ogr.comu.edu.tr adresi kabul edilir." }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
  const user = await prisma.user.create({ data: { email, name, studentNo: m[1], passwordHash: await bcrypt.hash(password, 12) } });
  await createSession(user.id);
  return NextResponse.json({ ok: true }, { status: 201 });
}
