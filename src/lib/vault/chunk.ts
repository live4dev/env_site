import { extractHeadings, toPlainText } from "@/lib/markdown/render";
import { headingAnchor } from "@/lib/markdown/slug";

export type NoteChunkInput = {
  chunkIndex: number;
  headingPath?: string;
  headingAnchor?: string;
  content: string;
  tokenCount: number;
};

export function chunkMarkdown(markdown: string): NoteChunkInput[] {
  const lines = markdown.split(/\r?\n/);
  const chunks: NoteChunkInput[] = [];
  let currentHeading: string | undefined;
  let buffer: string[] = [];

  function flush() {
    const content = toPlainText(buffer.join("\n"));
    if (!content) return;
    const words = content.split(/\s+/);
    const size = 750;
    const overlap = 80;
    for (let start = 0; start < words.length; start += size - overlap) {
      const slice = words.slice(start, start + size).join(" ");
      chunks.push({
        chunkIndex: chunks.length,
        headingPath: currentHeading,
        headingAnchor: currentHeading ? headingAnchor(currentHeading) : undefined,
        content: slice,
        tokenCount: Math.ceil(slice.length / 4),
      });
      if (start + size >= words.length) break;
    }
    buffer = [];
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      currentHeading = heading[2].trim();
    }
    buffer.push(line);
  }
  flush();

  if (chunks.length === 0) {
    const text = toPlainText(markdown);
    if (text) chunks.push({ chunkIndex: 0, content: text, tokenCount: Math.ceil(text.length / 4) });
  }

  extractHeadings(markdown);
  return chunks;
}
