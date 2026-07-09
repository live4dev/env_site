import { and, eq, ne, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [note] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  if (!note) return NextResponse.json({ similar: [] });
  const similar = await db.select().from(notes).where(and(eq(notes.published, true), ne(notes.id, id), or(eq(notes.type, note.type ?? ""), eq(notes.status, note.status ?? "")))).limit(10);
  return NextResponse.json({ similar });
}
