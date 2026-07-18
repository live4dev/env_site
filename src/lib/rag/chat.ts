import OpenAI from "openai";
import { env } from "@/lib/config";
import { retrieveChunks } from "@/lib/search";
import type { ChatSource } from "@/lib/chat/stream";

const systemPrompt = `You are a private knowledge-base assistant for an Obsidian vault.

Answer only using the provided vault context. Do not use outside knowledge unless the user explicitly asks for general reasoning and the answer clearly marks it as not sourced from the vault.

If the provided context is insufficient, say that the vault does not contain enough information to answer reliably.

Write in Russian by default.

End every answer based on vault context with an "Источники" section containing 1-3 Markdown links to the most relevant notes.

Use only the exact note URLs supplied in the context. Format every source as [Название статьи](/notes/...). Never invent a URL, link to an external site, output a bare URL, or use a citation like [1] without a URL.

Do not claim that a source says something unless the supplied context supports it.

Be concise, structured, and practical.`;

type VaultAnswerChunk = {
  text?: string;
  tokenUsage?: object;
};

async function* answerText(text: string): AsyncGenerator<VaultAnswerChunk> {
  yield { text };
}

export async function streamAnswerFromVault(question: string, rawAllowed = false, signal?: AbortSignal) {
  const chunks = await retrieveChunks(question, env.MAX_CHAT_CONTEXT_CHUNKS, rawAllowed);
  const sources: ChatSource[] = chunks.map((chunk) => ({
    id: chunk.id,
    title: chunk.title,
    url: `/notes/${chunk.slug}${chunk.headingAnchor ? `#${chunk.headingAnchor}` : ""}`,
    heading: chunk.headingPath,
    excerpt: chunk.content.slice(0, 500),
  }));

  if (chunks.length === 0) {
    return {
      answerStream: answerText("В хранилище нет достаточно информации, чтобы надежно ответить на этот вопрос."),
      sources,
      model: env.CHAT_MODEL,
    };
  }

  if (!env.OPENAI_BASE_URL || !env.OPENAI_API_KEY) {
    const answer = `Найден релевантный контекст, но OPENAI_BASE_URL/OPENAI_API_KEY не настроены. Ближайшие источники:\n\n${sources.map((source) => `- [${source.title}](${source.url})`).join("\n")}`;
    return {
      answerStream: answerText(answer),
      sources,
      model: env.CHAT_MODEL,
    };
  }

  const client = new OpenAI({ baseURL: env.OPENAI_BASE_URL, apiKey: env.OPENAI_API_KEY });
  const context = chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.title}\nURL: /notes/${chunk.slug}${chunk.headingAnchor ? `#${chunk.headingAnchor}` : ""}\n${chunk.content}`)
    .join("\n\n---\n\n");

  const completion = await client.chat.completions.create(
    {
      model: env.CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Вопрос: ${question}\n\nКонтекст хранилища:\n${context}` },
      ],
      temperature: 0.2,
      stream: true,
      stream_options: { include_usage: true },
    },
    { signal },
  );

  async function* streamCompletion(): AsyncGenerator<VaultAnswerChunk> {
    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta.content ?? chunk.choices[0]?.delta.refusal ?? "";
      if (text) yield { text };
      if (chunk.usage) yield { tokenUsage: chunk.usage };
    }
  }

  return {
    answerStream: streamCompletion(),
    sources,
    model: env.CHAT_MODEL,
  };
}
