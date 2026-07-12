import argon2 from "argon2";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { env } from "@/lib/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const createUserSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(1),
  password: z.string().min(8),
  role: z.enum(["admin", "user"]).default("user"),
  canAccessRaw: z.preprocess((value) => value === true || value === "true", z.boolean()).default(false),
});

const rawAccessSchema = z.object({
  action: z.literal("raw-access"),
  userId: z.string().uuid(),
  canAccessRaw: z.preprocess((value) => value === true || value === "true", z.boolean()),
});

export async function GET() {
  await requireAdmin();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      canAccessRaw: users.canAccessRaw,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .orderBy(asc(users.email));

  return NextResponse.json({ users: rows });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithError("forbidden", 303);
  }

  const payload = await parsePayload(request);
  const rawAccess = rawAccessSchema.safeParse(payload);
  if (rawAccess.success) {
    await db.update(users).set({ canAccessRaw: rawAccess.data.canAccessRaw, updatedAt: new Date() }).where(eq(users.id, rawAccess.data.userId));
    return NextResponse.redirect(new URL("/admin/users?updated=1", env.APP_BASE_URL), 303);
  }
  const parsed = createUserSchema.safeParse(payload);
  if (!parsed.success) return redirectWithError("invalid", 303);

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing) return redirectWithError("duplicate", 303);

  const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id });
  await db.insert(users).values({
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    role: parsed.data.role,
    canAccessRaw: parsed.data.canAccessRaw,
    passwordHash,
  });

  return NextResponse.redirect(new URL("/admin/users?created=1", env.APP_BASE_URL), 303);
}

async function parsePayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return request.json();
  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

function redirectWithError(error: string, status = 303) {
  return NextResponse.redirect(new URL(`/admin/users?error=${encodeURIComponent(error)}`, env.APP_BASE_URL), status);
}
