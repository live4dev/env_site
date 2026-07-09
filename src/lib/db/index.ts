import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/config";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  queryClient?: postgres.Sql;
};

export const queryClient = globalForDb.queryClient ?? postgres(env.DATABASE_URL, {
  max: 10,
  prepare: false,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
