import Link from "next/link";
import { eq } from "drizzle-orm";
import { PageHeader, Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";

export default async function SourcesPage() {
  const rows = await db.select().from(notes).where(eq(notes.published, true)).limit(3000);
  const sources = new Map<string, typeof rows>();
  for (const note of rows) {
    const list = Array.isArray(note.sourcesJson) ? note.sourcesJson : [];
    for (const source of list) {
      const key = String(source);
      sources.set(key, [...(sources.get(key) ?? []), note]);
    }
  }
  return (
    <>
      <PageHeader title="Источники" description="Индекс заметок, сгруппированный по frontmatter sources." />
      <div className="grid gap-3">
        {[...sources.entries()].map(([source, items]) => (
          <Panel key={source}>
            <h2 className="mb-2 font-semibold">{source}</h2>
            <div className="grid gap-1 text-sm">{items.map((note) => <Link key={note.id} href={`/notes/${note.slug}`}>{note.title}</Link>)}</div>
          </Panel>
        ))}
      </div>
    </>
  );
}
