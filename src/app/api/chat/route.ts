import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages, chatSessions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { streamAnswerFromVault } from "@/lib/rag/chat";
import { canAccessRaw } from "@/lib/notes/access";
import { encodeChatStreamEvent } from "@/lib/chat/stream";

export async function POST(request: Request) {
  const user = await requireUser();
  const { question, sessionId } = await request.json();
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const normalizedQuestion = question.trim();
  const started = Date.now();
  const [session] = sessionId
    ? [{ id: sessionId }]
    : await db.insert(chatSessions).values({ userId: user.id, title: normalizedQuestion.slice(0, 80) }).returning({ id: chatSessions.id });

  await db.insert(chatMessages).values({ sessionId: session.id, userId: user.id, role: "user", content: normalizedQuestion });

  const abortController = new AbortController();
  const abortUpstream = () => abortController.abort(request.signal.reason);
  if (request.signal.aborted) abortUpstream();
  else request.signal.addEventListener("abort", abortUpstream, { once: true });

  let result: Awaited<ReturnType<typeof streamAnswerFromVault>>;
  try {
    result = await streamAnswerFromVault(normalizedQuestion, canAccessRaw(user), abortController.signal);
  } catch (error) {
    request.signal.removeEventListener("abort", abortUpstream);
    throw error;
  }

  let cancelled = false;
  const responseStream = new ReadableStream<Uint8Array>({
    start(controller) {
      async function pump() {
        let answer = "";
        let tokenUsage: Record<string, unknown> | undefined;

        try {
          controller.enqueue(encodeChatStreamEvent({
            type: "meta",
            sessionId: session.id,
            sources: result.sources,
            model: result.model,
          }));

          for await (const chunk of result.answerStream) {
            if (cancelled) return;
            if (chunk.text) {
              answer += chunk.text;
              controller.enqueue(encodeChatStreamEvent({ type: "delta", text: chunk.text }));
            }
            if (chunk.tokenUsage) tokenUsage = chunk.tokenUsage as Record<string, unknown>;
          }

          if (!answer) {
            answer = "Не удалось сформировать ответ.";
            controller.enqueue(encodeChatStreamEvent({ type: "delta", text: answer }));
          }

          await db.insert(chatMessages).values({
            sessionId: session.id,
            userId: user.id,
            role: "assistant",
            content: answer,
            retrievalJson: { sources: result.sources },
            model: result.model,
            tokenUsageJson: tokenUsage,
            latencyMs: Date.now() - started,
          });

          if (!cancelled) {
            controller.enqueue(encodeChatStreamEvent({ type: "done" }));
            controller.close();
          }
        } catch (error) {
          console.error("Chat stream failed", error);
          if (!cancelled) {
            controller.enqueue(encodeChatStreamEvent({
              type: "error",
              message: "Не удалось завершить ответ. Попробуйте ещё раз.",
            }));
            controller.close();
          }
        } finally {
          request.signal.removeEventListener("abort", abortUpstream);
        }
      }

      void pump();
    },
    cancel() {
      cancelled = true;
      abortController.abort();
      request.signal.removeEventListener("abort", abortUpstream);
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
