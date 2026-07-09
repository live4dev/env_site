import Link from "next/link";
import { and, desc, eq, ilike } from "drizzle-orm";
import { PageHeader, Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";

export default async function InputsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const q = params.q?.trim();
  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.published, true), ilike(notes.vaultPath, "inputs/%"), q ? ilike(notes.bodyText, `%${q}%`) : undefined))
    .orderBy(desc(notes.updatedDate), desc(notes.indexedAt))
    .limit(500);

  const grouped = rows.reduce<Record<string, typeof rows>>((acc, note) => {
    const group = note.folder.replace(/^inputs\/?/, "") || "inputs";
    acc[group] = [...(acc[group] ?? []), note];
    return acc;
  }, {});

  return (
    <>
      <PageHeader title="Inputs" description="Входные источники и материалы из папки inputs." />
      <Panel className="mb-4">
        <form className="flex gap-2">
          <input data-global-search name="q" defaultValue={q ?? ""} className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2" placeholder="Искать в inputs..." />
          <button className="rounded-md bg-[var(--accent)] px-4 py-2 text-white">Искать</button>
        </form>
      </Panel>
      <div className="grid gap-4">
        {Object.entries(grouped).map(([group, items]) => (
          <Panel key={group}>
            <h2 className="mb-3 text-lg font-semibold">{group}</h2>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {items.map((note) => (
                <Link key={note.id} href={`/notes/${note.slug}`} className="rounded-md border border-[var(--line)] bg-[var(--background)] p-3 hover:no-underline">
                  <div className="font-medium text-[var(--foreground)]">{note.title}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{inputMeta(note.frontmatterJson)}</div>
                </Link>
              ))}
            </div>
          </Panel>
        ))}
        {rows.length === 0 ? <p className="text-sm text-[var(--muted)]">Inputs не найдены.</p> : null}
      </div>
    </>
  );
}

function inputMeta(frontmatter: Record<string, unknown>) {
  const parts = [
    typeof frontmatter.username === "string" ? `@${frontmatter.username}` : undefined,
    typeof frontmatter.subscribers === "number" ? `${frontmatter.subscribers.toLocaleString("ru-RU")} подписчиков` : undefined,
    typeof frontmatter.visibility === "string" ? frontmatter.visibility : undefined,
  ].filter(Boolean);
  return parts.join(" · ") || "без атрибутов";
}
