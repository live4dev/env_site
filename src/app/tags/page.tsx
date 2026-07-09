import Link from "next/link";
import { eq } from "drizzle-orm";
import { PageHeader, Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";

export default async function TagsPage() {
  const rows = await db.select().from(notes).where(eq(notes.published, true)).limit(3000);
  const tags = new Map<string, typeof rows>();
  for (const note of rows) for (const tag of note.tags ?? []) tags.set(tag, [...(tags.get(tag) ?? []), note]);
  return (
    <>
      <PageHeader title="Теги" />
      <div className="grid gap-3 md:grid-cols-2">
        {[...tags.entries()].map(([tag, items]) => (
          <Panel key={tag}>
            <h2 className="mb-2 font-semibold">#{tag}</h2>
            <div className="grid gap-1 text-sm">{items.slice(0, 12).map((note) => <Link key={note.id} href={`/notes/${note.slug}`}>{note.title}</Link>)}</div>
          </Panel>
        ))}
      </div>
    </>
  );
}
