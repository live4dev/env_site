import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";

export default async function SourcesPage() {
  const user = await requireUser();
  const rows = await db.select().from(notes).where(visibleNotesFilter(canAccessRaw(user))).limit(3000);
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
