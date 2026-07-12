import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { and } from "drizzle-orm";
import { noteLinks, notes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [source] = await db.select({ id: notes.id }).from(notes).where(and(eq(notes.id, id), visibleNotesFilter(canAccessRaw(user)))).limit(1);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ outgoing: await db.select().from(noteLinks).where(eq(noteLinks.sourceNoteId, id)) });
}
