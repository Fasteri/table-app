import { NextResponse } from "next/server";

const AUTH_COOKIE = "table_auth";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const password = String(body?.password || "");
  const expectedPassword = process.env.AUTH_PASSWORD || "1234";

  if (!password || password !== expectedPassword) {
    return NextResponse.json({ message: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
