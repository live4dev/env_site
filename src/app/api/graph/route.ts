import { isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { noteLinks, notes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";

export async function GET() {
  const user = await requireUser();
  const nodes = await db.select({ id: notes.id, label: notes.title, slug: notes.slug, type: notes.type, status: notes.status, folder: notes.folder }).from(notes).where(visibleNotesFilter(canAccessRaw(user))).limit(3000);
  const edges = await db.select({ source: noteLinks.sourceNoteId, target: noteLinks.targetNoteId }).from(noteLinks).where(isNotNull(noteLinks.targetNoteId)).limit(6000);
  const nodeIds = new Set(nodes.map((node) => node.id));
  return NextResponse.json({ nodes, edges: edges.filter((edge) => edge.target && nodeIds.has(edge.source) && nodeIds.has(edge.target)) });
}
