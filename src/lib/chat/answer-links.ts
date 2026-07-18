import type { ChatSource } from "@/lib/chat/stream";

export type ChatAnswerToken =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

const siteOrigin = "https://env.live4.dev";
const answerLinkPattern = /\[([^\]\n]+)\]\(([^)\n]+)\)|\[(\d+)\]|https:\/\/env\.live4\.dev\/notes\/[^\s<>\]]+|\/notes\/[^\s<>\]]+/g;

function articleHref(rawHref: string, sources: ChatSource[]) {
  let candidate: URL;

  try {
    candidate = new URL(rawHref, siteOrigin);
  } catch {
    return null;
  }

  if (candidate.origin !== siteOrigin || !candidate.pathname.startsWith("/notes/")) return null;

  const matchesSource = sources.some((source) => {
    try {
      return new URL(source.url, siteOrigin).pathname === candidate.pathname;
    } catch {
      return false;
    }
  });

  if (!matchesSource) return null;
  return `${candidate.pathname}${candidate.search}${candidate.hash}`;
}

function splitBareLinkSuffix(value: string) {
  let href = value;
  let suffix = "";

  while (/[.,;:!?…]$/.test(href)) {
    suffix = href.slice(-1) + suffix;
    href = href.slice(0, -1);
  }

  while (href.endsWith(")") && (href.match(/\)/g)?.length ?? 0) > (href.match(/\(/g)?.length ?? 0)) {
    suffix = `)${suffix}`;
    href = href.slice(0, -1);
  }

  return { href, suffix };
}

function pushText(tokens: ChatAnswerToken[], text: string) {
  if (!text) return;
  const previous = tokens.at(-1);
  if (previous?.type === "text") previous.text += text;
  else tokens.push({ type: "text", text });
}

export function tokenizeChatAnswer(answer: string, sources: ChatSource[]): ChatAnswerToken[] {
  const tokens: ChatAnswerToken[] = [];
  let cursor = 0;

  for (const match of answer.matchAll(answerLinkPattern)) {
    const index = match.index ?? 0;
    pushText(tokens, answer.slice(cursor, index));

    const [raw, markdownLabel, markdownHref, citationNumber] = match;
    if (markdownLabel && markdownHref) {
      const href = articleHref(markdownHref.trim(), sources);
      if (href) tokens.push({ type: "link", text: markdownLabel, href });
      else pushText(tokens, raw);
    } else if (citationNumber) {
      const source = sources[Number(citationNumber) - 1];
      if (source) tokens.push({ type: "link", text: raw, href: source.url });
      else pushText(tokens, raw);
    } else {
      if (answer.slice(Math.max(0, index - 2), index) === "](") {
        pushText(tokens, raw);
        cursor = index + raw.length;
        continue;
      }

      const { href: bareHref, suffix } = splitBareLinkSuffix(raw);
      const href = articleHref(bareHref, sources);
      if (href) {
        tokens.push({ type: "link", text: bareHref, href });
        pushText(tokens, suffix);
      } else {
        pushText(tokens, raw);
      }
    }

    cursor = index + raw.length;
  }

  pushText(tokens, answer.slice(cursor));
  return tokens;
}
