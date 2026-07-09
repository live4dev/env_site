import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { replaceWikiLinks, type WikiLink } from "./links";
import { headingAnchor, noteSlug, titleFromPath } from "./slug";

export type ParsedMarkdown = {
  frontmatter: Record<string, unknown>;
  bodyMarkdown: string;
  bodyText: string;
  renderedHtml: string;
  headings: { depth: number; text: string; anchor: string }[];
};

export async function parseMarkdown(markdown: string, resolveLink?: (link: WikiLink) => string): Promise<ParsedMarkdown> {
  const parsed = matter(markdown);
  const headings = extractHeadings(parsed.content);
  const linkedMarkdown = replaceWikiLinks(parsed.content, (link) => {
    if (resolveLink) return `[${link.label ?? link.target}](${resolveLink(link)})`;
    const slug = noteSlug(link.target);
    return `[${link.label ?? link.target}](/notes/${slug}${link.heading ? `#${headingAnchor(link.heading)}` : ""})`;
  });

  const file = await unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: { className: ["heading-link"], ariaLabel: "Скопировать ссылку на раздел" },
      content: { type: "text", value: " #" },
    })
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(linkedMarkdown);

  return {
    frontmatter: parsed.data,
    bodyMarkdown: parsed.content,
    bodyText: toPlainText(parsed.content),
    renderedHtml: String(file),
    headings,
  };
}

export function extractTitle(vaultPath: string, markdown: string, frontmatter: Record<string, unknown>) {
  if (typeof frontmatter.title === "string" && frontmatter.title.trim()) return frontmatter.title.trim();
  const firstHeading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return firstHeading ?? titleFromPath(vaultPath);
}

export function extractHeadings(markdown: string) {
  return [...markdown.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({
    depth: match[1].length,
    text: match[2].replace(/#+$/, "").trim(),
    anchor: headingAnchor(match[2].replace(/#+$/, "").trim()),
  }));
}

export function toPlainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => label ?? target)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
