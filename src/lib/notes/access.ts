import { and, eq, sql, type SQL } from "drizzle-orm";
import { notes } from "@/lib/db/schema";

export function canAccessRaw(user: { role: string; canAccessRaw: boolean }) {
  return user.role === "admin" || user.canAccessRaw;
}

export function visibleNotesFilter(rawAllowed: boolean): SQL {
  const published = eq(notes.published, true);
  if (rawAllowed) return published;
  return and(
    published,
    sql`lower(${notes.vaultPath}) <> 'raw'`,
    sql`lower(${notes.vaultPath}) not like 'raw/%'`,
  )!;
}

export function isRawPath(vaultPath: string) {
  return /^raw(?:\/|$)/i.test(vaultPath);
}
