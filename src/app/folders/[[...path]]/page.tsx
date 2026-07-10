import Link from "next/link";
import { and, asc, eq, ilike } from "drizzle-orm";
import { PageHeader, Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { slugFromRouteSegments } from "@/lib/notes/slug";

export default async function FolderPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const folder = slugFromRouteSegments(path);
  const title = folder || "Все папки";
  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      slug: notes.slug,
      vaultPath: notes.vaultPath,
      folder: notes.folder,
      type: notes.type,
      status: notes.status,
      updatedDate: notes.updatedDate,
    })
    .from(notes)
    .where(and(eq(notes.published, true), folder ? ilike(notes.vaultPath, `${folder}/%`) : undefined))
    .orderBy(asc(notes.vaultPath))
    .limit(1000);

  const childFolders = [...new Set(rows.map((note) => nextFolder(folder, note.vaultPath)).filter((item): item is string => Boolean(item)))].sort();
  const directNotes = rows.filter((note) => note.folder === folder);

  return (
    <>
      <PageHeader title={title} description={<FolderBreadcrumbs folder={folder} />} />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel>
          <h2 className="mb-3 font-semibold">Подпапки</h2>
          <div className="grid gap-1 text-sm">
            {childFolders.map((child) => (
              <Link key={child} href={`/folders/${encodePath(child)}`}>
                {child.split("/").at(-1)}
              </Link>
            ))}
            {childFolders.length === 0 ? <span className="text-[var(--muted)]">Нет подпапок</span> : null}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-3 font-semibold">Заметки</h2>
          <div className="grid gap-2">
            {directNotes.map((note) => (
              <Link key={note.id} href={`/notes/${note.slug}`} className="rounded-md border border-[var(--line)] bg-[var(--background)] p-3 hover:no-underline">
                <div className="font-medium text-[var(--foreground)]">{note.title}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">{note.vaultPath}</div>
              </Link>
            ))}
            {directNotes.length === 0 ? <span className="text-sm text-[var(--muted)]">В этой папке нет заметок напрямую.</span> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}

function nextFolder(base: string, vaultPath: string) {
  const withoutFile = vaultPath.split("/").slice(0, -1).join("/");
  if (withoutFile === base) return undefined;
  if (!base) return withoutFile.split("/")[0];
  if (!withoutFile.startsWith(`${base}/`)) return undefined;
  const next = withoutFile.slice(base.length + 1).split("/")[0];
  return next ? `${base}/${next}` : undefined;
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function FolderBreadcrumbs({ folder }: { folder: string }) {
  if (!folder) return <span className="mt-2 block text-sm text-[var(--muted)]">Все опубликованные папки хранилища.</span>;
  const parts = folder.split("/");
  return (
    <nav aria-label="Путь папки" className="mt-2 flex flex-wrap items-center gap-1 text-sm text-[var(--muted)]">
      <Link href="/folders" className="rounded px-1 py-0.5 text-[var(--accent)] hover:bg-[var(--line)] hover:no-underline">
        root
      </Link>
      {parts.map((part, index) => {
        const current = parts.slice(0, index + 1).join("/");
        return (
          <span key={current} className="inline-flex items-center gap-1">
            <span className="text-[var(--line)]">/</span>
            <Link href={`/folders/${encodePath(current)}`} className="rounded px-1 py-0.5 text-[var(--accent)] hover:bg-[var(--line)] hover:no-underline">
              {part}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
