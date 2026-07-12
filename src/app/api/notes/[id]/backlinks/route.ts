import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { noteLinks, notes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const backlinks = await db.select({ link: noteLinks, source: notes }).from(noteLinks).innerJoin(notes, eq(noteLinks.sourceNoteId, notes.id)).where(and(eq(noteLinks.targetNoteId, id), visibleNotesFilter(canAccessRaw(user))));
  return NextResponse.json({ backlinks });
}
