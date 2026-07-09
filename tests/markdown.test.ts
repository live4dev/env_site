import { describe, expect, it } from "vitest";
import { extractWikiLinks } from "@/lib/markdown/links";
import { headingAnchor, noteSlug } from "@/lib/markdown/slug";
import { parseMarkdown } from "@/lib/markdown/render";
import { chunkMarkdown } from "@/lib/vault/chunk";

describe("vault markdown helpers", () => {
  it("generates stable readable slugs", () => {
    expect(noteSlug("wiki/Concepts/Когнитивный иммунитет.md")).toBe("wiki/Concepts/Когнитивный-иммунитет");
  });

  it("extracts Obsidian links with aliases and headings", () => {
    expect(extractWikiLinks("[[Note Name#Heading|visible label]]")).toEqual([
      { raw: "[[Note Name#Heading|visible label]]", target: "Note Name", heading: "Heading", label: "visible label" },
    ]);
  });

  it("renders wiki links as web links", async () => {
    const parsed = await parseMarkdown("---\ntype: concept\n---\n# Title\nSee [[Other Note#Part|source]].");
    expect(parsed.frontmatter.type).toBe("concept");
    expect(parsed.renderedHtml).toContain('href="/notes/Other-Note#part"');
  });

  it("creates deterministic heading anchors", () => {
    expect(headingAnchor("My Heading")).toBe("my-heading");
  });

  it("chunks markdown by headings", () => {
    const chunks = chunkMarkdown("# A\nAlpha beta\n## B\nGamma delta");
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].headingPath).toBe("A");
    expect(chunks[1].headingPath).toBe("B");
  });
});
