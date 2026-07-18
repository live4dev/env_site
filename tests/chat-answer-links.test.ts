import { describe, expect, it } from "vitest";
import { tokenizeChatAnswer } from "@/lib/chat/answer-links";
import type { ChatSource } from "@/lib/chat/stream";

const sources: ChatSource[] = [
  { title: "Первая статья", url: "/notes/Первая-статья#раздел" },
  { title: "Second", url: "/notes/folder/second" },
];

describe("chat answer links", () => {
  it("turns Markdown source links into internal article links", () => {
    expect(tokenizeChatAnswer("Читайте [первую статью](/notes/Первая-статья#раздел).", sources)).toEqual([
      { type: "text", text: "Читайте " },
      { type: "link", text: "первую статью", href: "/notes/%D0%9F%D0%B5%D1%80%D0%B2%D0%B0%D1%8F-%D1%81%D1%82%D0%B0%D1%82%D1%8C%D1%8F#%D1%80%D0%B0%D0%B7%D0%B4%D0%B5%D0%BB" },
      { type: "text", text: "." },
    ]);
  });

  it("maps numbered citations and bare URLs to retrieved sources", () => {
    expect(tokenizeChatAnswer("См. [2] и https://env.live4.dev/notes/folder/second.", sources)).toEqual([
      { type: "text", text: "См. " },
      { type: "link", text: "[2]", href: "/notes/folder/second" },
      { type: "text", text: " и " },
      { type: "link", text: "https://env.live4.dev/notes/folder/second", href: "/notes/folder/second" },
      { type: "text", text: "." },
    ]);
  });

  it("leaves unknown, external, and incomplete links as plain text", () => {
    const answer = "[404](/notes/missing), [внешняя](https://example.com), [незаконченная](/notes/folder/second";
    expect(tokenizeChatAnswer(answer, sources)).toEqual([{ type: "text", text: answer }]);
  });
});
