import { and, eq, ne, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const visible = visibleNotesFilter(canAccessRaw(user));
  const [note] = await db.select().from(notes).where(and(eq(notes.id, id), visible)).limit(1);
  if (!note) return NextResponse.json({ similar: [] });
  const similar = await db.select().from(notes).where(and(visible, ne(notes.id, id), or(eq(notes.type, note.type ?? ""), eq(notes.status, note.status ?? "")))).limit(10);
  return NextResponse.json({ similar });
}
