import { eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { noteLinks, notes } from "@/lib/db/schema";

export async function GET() {
  const nodes = await db.select({ id: notes.id, label: notes.title, slug: notes.slug, type: notes.type, status: notes.status, folder: notes.folder }).from(notes).where(eq(notes.published, true)).limit(3000);
  const edges = await db.select({ source: noteLinks.sourceNoteId, target: noteLinks.targetNoteId }).from(noteLinks).where(isNotNull(noteLinks.targetNoteId)).limit(6000);
  return NextResponse.json({ nodes, edges });
}
