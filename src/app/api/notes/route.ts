import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";

export async function GET() {
  const user = await requireUser();
  const rows = await db.select({ id: notes.id, title: notes.title, slug: notes.slug, vaultPath: notes.vaultPath, type: notes.type, status: notes.status }).from(notes).where(visibleNotesFilter(canAccessRaw(user))).limit(200);
  return NextResponse.json({ notes: rows });
}
