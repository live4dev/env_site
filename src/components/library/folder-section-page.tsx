import Link from "next/link";
import { and, asc, ilike } from "drizzle-orm";
import { PageHeader, Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { visibleNotesFilter } from "@/lib/notes/access";

export async function FolderSectionPage({ folder, title, description, rawAllowed }: {
  folder: string;
  title: string;
  description: string;
  rawAllowed: boolean;
}) {
  const rows = await db.select().from(notes)
    .where(and(visibleNotesFilter(rawAllowed), ilike(notes.vaultPath, `${folder}/%`)))
    .orderBy(asc(notes.vaultPath)).limit(1000);
  const grouped = rows.reduce<Record<string, typeof rows>>((acc, note) => {
    const relative = note.folder.replace(new RegExp(`^${folder}/?`, "i"), "") || folder;
    acc[relative] = [...(acc[relative] ?? []), note];
    return acc;
  }, {});

  return <>
    <PageHeader title={title} description={description} />
    <div className="grid gap-4">
      {Object.entries(grouped).map(([group, items]) => <Panel key={group}>
        <h2 className="mb-3 text-lg font-semibold">{group}</h2>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {items.map((note) => <Link key={note.id} href={`/notes/${note.slug}`} className="rounded-md border border-[var(--line)] bg-[var(--background)] p-3 hover:no-underline">
            <div className="font-medium text-[var(--foreground)]">{note.title}</div>
            <div className="mt-1 text-xs text-[var(--muted)]">{note.vaultPath}</div>
          </Link>)}
        </div>
      </Panel>)}
      {rows.length === 0 ? <p className="text-sm text-[var(--muted)]">В папке пока нет опубликованных заметок.</p> : null}
    </div>
  </>;
}
