import { describe, expect, it } from "vitest";
import { encodeChatStreamEvent, parseChatEventStream, type ChatStreamEvent } from "@/lib/chat/stream";

function streamFromChunks(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

describe("chat event stream", () => {
  it("parses events split across arbitrary transport chunks", async () => {
    const events: ChatStreamEvent[] = [
      { type: "meta", sessionId: "session-1", sources: [{ title: "Заметка", url: "/notes/note" }], model: "test-model" },
      { type: "delta", text: "Первая строка\n" },
      { type: "delta", text: "вторая строка" },
      { type: "done" },
    ];
    const bytes = events.map(encodeChatStreamEvent);
    const combined = new Uint8Array(bytes.reduce((size, chunk) => size + chunk.length, 0));
    let offset = 0;
    for (const chunk of bytes) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const transportChunks = [combined.slice(0, 7), combined.slice(7, 31), combined.slice(31, 84), combined.slice(84)];
    const parsed: ChatStreamEvent[] = [];
    for await (const event of parseChatEventStream(streamFromChunks(transportChunks))) parsed.push(event);

    expect(parsed).toEqual(events);
  });

  it("ignores SSE comments and event labels", async () => {
    const payload = new TextEncoder().encode(': keepalive\nevent: delta\ndata: {"type":"delta","text":"ok"}\n\n');
    const parsed: ChatStreamEvent[] = [];
    for await (const event of parseChatEventStream(streamFromChunks([payload]))) parsed.push(event);

    expect(parsed).toEqual([{ type: "delta", text: "ok" }]);
  });
});
