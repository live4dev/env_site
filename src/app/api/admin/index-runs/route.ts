import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { indexRuns } from "@/lib/db/schema";

export async function GET() {
  await requireAdmin();
  return NextResponse.json({ runs: await db.select().from(indexRuns).orderBy(desc(indexRuns.startedAt)).limit(50) });
}
