import { promises as fs } from "node:fs";
import path from "node:path";
import { queryClient } from "@/lib/db";

async function main() {
  await queryClient`CREATE EXTENSION IF NOT EXISTS vector`;
  await queryClient`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  const migrationsDir = path.join(process.cwd(), "drizzle");
  try {
    const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
    await queryClient`CREATE TABLE IF NOT EXISTS __drizzle_migrations (id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now())`;
    for (const file of files) {
      const [seen] = await queryClient`SELECT id FROM __drizzle_migrations WHERE id = ${file}`;
      if (seen) continue;
      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      await queryClient.unsafe(sql);
      await queryClient`INSERT INTO __drizzle_migrations (id) VALUES (${file})`;
      console.log(`applied ${file}`);
    }
  } finally {
    await queryClient.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
