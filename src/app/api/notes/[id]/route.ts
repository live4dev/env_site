import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [note] = await db.select().from(notes).where(and(eq(notes.id, id), visibleNotesFilter(canAccessRaw(user)))).limit(1);
  return note ? NextResponse.json({ note }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
