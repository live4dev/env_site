import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { chatMessages, chatSessions } from "@/lib/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [session] = await db.select().from(chatSessions).where(and(eq(chatSessions.id, id), eq(chatSessions.userId, user.id))).limit(1);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const messages = await db.select().from(chatMessages).where(eq(chatMessages.sessionId, id));
  return NextResponse.json({ session, messages });
}
