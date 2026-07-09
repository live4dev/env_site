import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, queryClient } from "@/lib/db";
import { users } from "@/lib/db/schema";

function arg(name: string, fallback?: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const email = arg("email")?.toLowerCase();
  const role = arg("role", "user") as "admin" | "user";
  const displayName = arg("display-name", email);
  const password = arg("password") ?? process.env.USER_PASSWORD;
  if (!email || !password) throw new Error("Usage: npm run user:create -- --email user@example.com --password 'secret' --role user");
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    await db.update(users).set({ passwordHash, role, displayName: displayName ?? email, updatedAt: new Date() }).where(eq(users.id, existing.id));
    console.log(`updated ${email}`);
  } else {
    await db.insert(users).values({ email, passwordHash, role, displayName: displayName ?? email });
    console.log(`created ${email}`);
  }
  await queryClient.end();
}

main().catch(async (error) => {
  console.error(error);
  await queryClient.end();
  process.exit(1);
});
