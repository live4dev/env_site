import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";

export async function GET() {
  const rows = await db.select({ id: notes.id, title: notes.title, slug: notes.slug, vaultPath: notes.vaultPath, type: notes.type, status: notes.status }).from(notes).where(eq(notes.published, true)).limit(200);
  return NextResponse.json({ notes: rows });
}
