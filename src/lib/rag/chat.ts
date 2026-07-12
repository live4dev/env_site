import OpenAI from "openai";
import { env } from "@/lib/config";
import { retrieveChunks } from "@/lib/search";

const systemPrompt = `You are a private knowledge-base assistant for an Obsidian vault.

Answer only using the provided vault context. Do not use outside knowledge unless the user explicitly asks for general reasoning and the answer clearly marks it as not sourced from the vault.

If the provided context is insufficient, say that the vault does not contain enough information to answer reliably.

Write in Russian by default.

When useful, cite relevant notes using Markdown links supplied in the context.

Do not claim that a source says something unless the supplied context supports it.

Be concise, structured, and practical.`;

export async function answerFromVault(question: string, rawAllowed = false) {
  const chunks = await retrieveChunks(question, env.MAX_CHAT_CONTEXT_CHUNKS, rawAllowed);
  const sources = chunks.map((chunk) => ({
    id: chunk.id,
    title: chunk.title,
    url: `/notes/${chunk.slug}${chunk.headingAnchor ? `#${chunk.headingAnchor}` : ""}`,
    heading: chunk.headingPath,
    excerpt: chunk.content.slice(0, 500),
  }));

  if (chunks.length === 0) {
    return {
      answer: "В хранилище нет достаточно информации, чтобы надежно ответить на этот вопрос.",
      sources,
      model: env.CHAT_MODEL,
      tokenUsage: undefined,
    };
  }

  if (!env.VSELLM_BASE_URL || !env.VSELLM_API_KEY) {
    return {
      answer: `Найден релевантный контекст, но VSELLM_BASE_URL/VSELLM_API_KEY не настроены. Ближайшие источники:\n\n${sources.map((source) => `- [${source.title}](${source.url})`).join("\n")}`,
      sources,
      model: env.CHAT_MODEL,
      tokenUsage: undefined,
    };
  }

  const client = new OpenAI({ baseURL: env.VSELLM_BASE_URL, apiKey: env.VSELLM_API_KEY });
  const context = chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.title}\nURL: /notes/${chunk.slug}${chunk.headingAnchor ? `#${chunk.headingAnchor}` : ""}\n${chunk.content}`)
    .join("\n\n---\n\n");

  const completion = await client.chat.completions.create({
    model: env.CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Вопрос: ${question}\n\nКонтекст хранилища:\n${context}` },
    ],
    temperature: 0.2,
  });

  return {
    answer: completion.choices[0]?.message.content ?? "Не удалось сформировать ответ.",
    sources,
    model: env.CHAT_MODEL,
    tokenUsage: completion.usage,
  };
}
