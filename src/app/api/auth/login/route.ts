import { NextResponse } from "next/server";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  const [user] = await db.select().from(users).where(eq(users.email, String(email).toLowerCase())).limit(1);
  if (!user || !(await argon2.verify(user.passwordHash, String(password)))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  await createSession({ id: user.id, email: user.email, displayName: user.displayName, role: user.role });
  await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
