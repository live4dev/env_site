import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { noteLinks, notes } from "@/lib/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const backlinks = await db.select({ link: noteLinks, source: notes }).from(noteLinks).innerJoin(notes, eq(noteLinks.sourceNoteId, notes.id)).where(eq(noteLinks.targetNoteId, id));
  return NextResponse.json({ backlinks });
}
