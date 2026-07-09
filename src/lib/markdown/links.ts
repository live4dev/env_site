export type WikiLink = {
  raw: string;
  target: string;
  heading?: string;
  label?: string;
};

const wikiLinkPattern = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

export function extractWikiLinks(markdown: string): WikiLink[] {
  return [...markdown.matchAll(wikiLinkPattern)].map((match) => ({
    raw: match[0],
    target: match[1].trim(),
    heading: match[2]?.trim(),
    label: match[3]?.trim(),
  }));
}

export function replaceWikiLinks(markdown: string, resolver: (link: WikiLink) => string) {
  return markdown.replace(wikiLinkPattern, (...args) => {
    const link: WikiLink = {
      raw: args[0],
      target: String(args[1]).trim(),
      heading: args[2]?.trim(),
      label: args[3]?.trim(),
    };
    return resolver(link);
  });
}
