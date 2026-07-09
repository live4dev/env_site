import { eq, isNotNull } from "drizzle-orm";
import { GraphClient } from "@/components/graph/graph-client";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { noteLinks, notes } from "@/lib/db/schema";

export default async function GraphPage() {
  const nodeRows = await db.select({ id: notes.id, label: notes.title, slug: notes.slug }).from(notes).where(eq(notes.published, true)).limit(3000);
  const edgeRows = await db.select({ source: noteLinks.sourceNoteId, target: noteLinks.targetNoteId }).from(noteLinks).where(isNotNull(noteLinks.targetNoteId)).limit(6000);
  return (
    <>
      <PageHeader title="Граф" description="Связи между опубликованными заметками. Нажатие на узел открывает заметку." />
      <GraphClient nodes={nodeRows} edges={edgeRows.filter((edge): edge is { source: string; target: string } => Boolean(edge.target))} />
    </>
  );
}
