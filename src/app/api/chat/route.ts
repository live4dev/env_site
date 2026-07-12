import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages, chatSessions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { answerFromVault } from "@/lib/rag/chat";
import { canAccessRaw } from "@/lib/notes/access";

export async function POST(request: Request) {
  const user = await requireUser();
  const { question, sessionId } = await request.json();
  if (!question) return NextResponse.json({ error: "Missing question" }, { status: 400 });
  const started = Date.now();
  const [session] = sessionId
    ? [{ id: sessionId }]
    : await db.insert(chatSessions).values({ userId: user.id, title: String(question).slice(0, 80) }).returning({ id: chatSessions.id });

  await db.insert(chatMessages).values({ sessionId: session.id, userId: user.id, role: "user", content: String(question) });
  const result = await answerFromVault(String(question), canAccessRaw(user));
  await db.insert(chatMessages).values({
    sessionId: session.id,
    userId: user.id,
    role: "assistant",
    content: result.answer,
    retrievalJson: { sources: result.sources },
    model: result.model,
    tokenUsageJson: result.tokenUsage as Record<string, unknown> | undefined,
    latencyMs: Date.now() - started,
  });
  return NextResponse.json({ ...result, sessionId: session.id });
}
