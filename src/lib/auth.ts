import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SCHOOL_MAIL = /^(\d{6,12})@ogr\.comu\.edu\.tr$/i;
const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET en az 32 karakter olmalı");
  return new TextEncoder().encode(s);
};

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d").sign(secret());
  cookies().set("session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
}
export async function getSessionUserId(): Promise<string | null> {
  const t = cookies().get("session")?.value;
  if (!t) return null;
  try { return (await jwtVerify(t, secret())).payload.sub ?? null; } catch { return null; }
}
