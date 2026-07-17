import OpenAI from "openai";
import { env } from "@/lib/config";

export async function embedText(input: string): Promise<number[] | null> {
  if (!env.OPENAI_BASE_URL || !env.OPENAI_API_KEY || !env.EMBEDDING_MODEL) return null;
  const client = new OpenAI({ baseURL: env.OPENAI_BASE_URL, apiKey: env.OPENAI_API_KEY });
  const response = await client.embeddings.create({
    model: env.EMBEDDING_MODEL,
    input,
    dimensions: env.EMBEDDING_DIMENSIONS,
  });
  return response.data[0]?.embedding ?? null;
}
