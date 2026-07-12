import { isNotNull } from "drizzle-orm";
import { GraphClient } from "@/components/graph/graph-client";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { noteLinks, notes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";

export default async function GraphPage() {
  const user = await requireUser();
  const nodeRows = await db.select({ id: notes.id, label: notes.title, slug: notes.slug }).from(notes).where(visibleNotesFilter(canAccessRaw(user))).limit(3000);
  const edgeRows = await db.select({ source: noteLinks.sourceNoteId, target: noteLinks.targetNoteId }).from(noteLinks).where(isNotNull(noteLinks.targetNoteId)).limit(6000);
  return (
    <>
      <PageHeader title="Граф" description="Связи между опубликованными заметками. Нажатие на узел открывает заметку." />
      <GraphClient nodes={nodeRows} edges={edgeRows.filter((edge): edge is { source: string; target: string } => Boolean(edge.target) && nodeRows.some((node) => node.id === edge.source) && nodeRows.some((node) => node.id === edge.target))} />
    </>
  );
}
