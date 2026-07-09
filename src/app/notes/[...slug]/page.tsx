import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { noteChunks, noteLinks, notes } from "@/lib/db/schema";
import { PageHeader, Panel } from "@/components/ui";
import { slugFromRouteSegments } from "@/lib/notes/slug";

export default async function NotePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const normalizedSlug = slugFromRouteSegments(slug);
  const [note] = await db.select().from(notes).where(and(eq(notes.slug, normalizedSlug), eq(notes.published, true))).limit(1);
  if (!note) notFound();

  const outgoing = await db.select().from(noteLinks).where(eq(noteLinks.sourceNoteId, note.id)).limit(50);
  const backlinks = await db
    .select({ link: noteLinks, source: notes })
    .from(noteLinks)
    .innerJoin(notes, eq(noteLinks.sourceNoteId, notes.id))
    .where(eq(noteLinks.targetNoteId, note.id))
    .limit(50);
  const similar = await db.select().from(notes).where(and(eq(notes.published, true), or(eq(notes.type, note.type ?? ""), eq(notes.status, note.status ?? "")))).limit(6);
  const chunks = await db.select().from(noteChunks).where(eq(noteChunks.noteId, note.id)).limit(20);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <article>
        <PageHeader title={note.title} description={note.vaultPath} action={<button className="rounded-md border border-[var(--line)] px-3 py-2 text-sm" data-copy-url>Скопировать ссылку</button>} />
        <div className="prose max-w-none rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5" dangerouslySetInnerHTML={{ __html: note.renderedHtml }} />
      </article>
      <aside className="grid content-start gap-4">
        <Panel>
          <h2 className="mb-3 font-semibold">Метаданные</h2>
          <dl className="grid gap-2 text-sm">
            <div><dt className="text-[var(--muted)]">Тип</dt><dd>{note.type ?? "не указан"}</dd></div>
            <div><dt className="text-[var(--muted)]">Статус</dt><dd>{note.status ?? "не указан"}</dd></div>
            <div><dt className="text-[var(--muted)]">Обновлено</dt><dd>{note.updatedDate?.toLocaleDateString("ru-RU") ?? "не указано"}</dd></div>
            <div><dt className="text-[var(--muted)]">Теги</dt><dd>{note.tags?.join(", ") || "нет"}</dd></div>
          </dl>
        </Panel>
        {note.vaultPath.startsWith("inputs/") ? (
          <Panel>
            <h2 className="mb-3 font-semibold">Атрибуты</h2>
            <dl className="grid gap-2 text-sm">
              {frontmatterEntries(note.frontmatterJson).map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="text-[var(--muted)]">{attributeLabel(key)}</dt>
                  <dd className="break-words">{formatAttributeValue(value)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        ) : null}
        <Panel>
          <h2 className="mb-3 font-semibold">Оглавление</h2>
          <div className="grid gap-1 text-sm">
            {chunks.filter((chunk) => chunk.headingPath).map((chunk) => <a key={chunk.id} href={`#${chunk.headingAnchor}`}>{chunk.headingPath}</a>)}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-3 font-semibold">Исходящие</h2>
          <div className="grid gap-1 text-sm">
            {outgoing.map((link) => <span key={link.id}>{link.label ?? link.targetRaw}{link.isResolved ? "" : " (не найдено)"}</span>)}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-3 font-semibold">Обратные ссылки</h2>
          <div className="grid gap-1 text-sm">
            {backlinks.map(({ source }) => <Link key={source.id} href={`/notes/${source.slug}`}>{source.title}</Link>)}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-3 font-semibold">Похожие</h2>
          <div className="grid gap-1 text-sm">
            {similar.filter((item) => item.id !== note.id).map((item) => <Link key={item.id} href={`/notes/${item.slug}`}>{item.title}</Link>)}
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function frontmatterEntries(frontmatter: Record<string, unknown>) {
  const hidden = new Set(["tags", "sources", "published", "created", "updated", "source_path", "ingested"]);
  return Object.entries(frontmatter).filter(([key, value]) => !hidden.has(key) && value !== null && value !== undefined && value !== "");
}

function attributeLabel(key: string) {
  const labels: Record<string, string> = {
    id: "ID",
    url: "URL",
    name: "Название",
    type: "Тип",
    username: "Username",
    visibility: "Видимость",
    subscribers: "Подписчики",
    author: "Автор",
    confidence: "Достоверность",
    status: "Статус",
  };
  return labels[key] ?? key.replaceAll("_", " ");
}

function formatAttributeValue(value: unknown): React.ReactNode {
  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    return <a href={value} target="_blank" rel="noreferrer">{value}</a>;
  }
  if (typeof value === "number") {
    return value.toLocaleString("ru-RU");
  }
  if (typeof value === "boolean") {
    return value ? "да" : "нет";
  }
  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }
  if (typeof value === "object" && value) {
    return JSON.stringify(value);
  }
  return String(value);
}
