import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { chatSessions } from "@/lib/db/schema";

export async function GET() {
  const user = await requireUser();
  const sessions = await db.select().from(chatSessions).where(eq(chatSessions.userId, user.id)).orderBy(desc(chatSessions.updatedAt)).limit(50);
  return NextResponse.json({ sessions });
}
