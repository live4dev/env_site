import argon2 from "argon2";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const createUserSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(1),
  password: z.string().min(8),
  role: z.enum(["admin", "user"]).default("user"),
});

export async function GET() {
  await requireAdmin();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
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
    return redirectWithError(request, "forbidden", 303);
  }

  const payload = await parsePayload(request);
  const parsed = createUserSchema.safeParse(payload);
  if (!parsed.success) return redirectWithError(request, "invalid", 303);

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing) return redirectWithError(request, "duplicate", 303);

  const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id });
  await db.insert(users).values({
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    role: parsed.data.role,
    passwordHash,
  });

  return NextResponse.redirect(new URL("/admin/users?created=1", request.url), 303);
}

async function parsePayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return request.json();
  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

function redirectWithError(request: Request, error: string, status = 303) {
  return NextResponse.redirect(new URL(`/admin/users?error=${encodeURIComponent(error)}`, request.url), status);
}
