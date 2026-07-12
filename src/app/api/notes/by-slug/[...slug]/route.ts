import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { slugFromRouteSegments } from "@/lib/notes/slug";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const [note] = await db.select().from(notes).where(and(eq(notes.slug, slugFromRouteSegments(slug)), visibleNotesFilter(canAccessRaw(user)))).limit(1);
  return note ? NextResponse.json({ note }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
