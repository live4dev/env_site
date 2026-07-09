import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/vault_site"),
  VAULT_ROOT: z.string().default("/Users/legonaut/Documents/Obsidian/Environment"),
  VAULT_INCLUDE_GLOBS: z.string().default("wiki/**/*.md,inputs/**/*.md,outputs/**/*.md,index.md,log.md"),
  VAULT_EXCLUDE_GLOBS: z.string().default("raw/**,Clippings/**,.git/**,.obsidian/**,.trash/**,node_modules/**,10_Я/**,40_Люди/**"),
  AUTH_SECRET: z.string().default("dev-secret-change-me"),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  VSELLM_BASE_URL: z.string().optional(),
  VSELLM_API_KEY: z.string().optional(),
  CHAT_MODEL: z.string().default("gpt-4.1-mini"),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),
  MAX_CHAT_CONTEXT_CHUNKS: z.coerce.number().default(8),
  AUTH_COOKIE_SECURE: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  NODE_ENV: z.string().default("development"),
});

export const env = envSchema.parse(process.env);

export function csv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
