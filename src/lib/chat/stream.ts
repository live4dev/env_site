export type ChatSource = {
  id?: string;
  title: string;
  url: string;
  heading?: string | null;
  excerpt?: string;
};

export type ChatStreamEvent =
  | { type: "meta"; sessionId: string; sources: ChatSource[]; model: string }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

const encoder = new TextEncoder();

export function encodeChatStreamEvent(event: ChatStreamEvent) {
  return encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

function parseEventBlock(block: string): ChatStreamEvent | null {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  if (!data) return null;

  const event = JSON.parse(data) as Partial<ChatStreamEvent>;
  if (!event || typeof event !== "object" || typeof event.type !== "string") {
    throw new Error("Некорректное событие в потоке ответа.");
  }

  return event as ChatStreamEvent;
}

export async function* parseChatEventStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replaceAll("\r\n", "\n");

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseEventBlock(block);
        if (event) yield event;
        boundary = buffer.indexOf("\n\n");
      }

      if (done) break;
    }

    const finalEvent = parseEventBlock(buffer.trim());
    if (finalEvent) yield finalEvent;
  } finally {
    reader.releaseLock();
  }
}
