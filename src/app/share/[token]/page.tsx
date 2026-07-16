import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MermaidRenderer } from "@/components/notes/mermaid-renderer";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { isPublicShareToken } from "@/lib/notes/sharing";

export const dynamic = "force-dynamic";

export default async function PublicNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isPublicShareToken(token)) notFound();

  const [note] = await db
    .select({
      title: notes.title,
      renderedHtml: notes.renderedHtml,
      frontmatterJson: notes.frontmatterJson,
    })
    .from(notes)
    .where(and(eq(notes.publicShareToken, token), eq(notes.published, true)))
    .limit(1);

  if (!note) notFound();
  const description = frontmatterDescription(note.frontmatterJson);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <article className="mx-auto max-w-4xl">
        <header className="mb-6 border-b border-[var(--line)] pb-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent)]">Публичная статья</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">{note.title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">{description}</p> : null}
        </header>
        <div className="prose max-w-none rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-7">
          <div dangerouslySetInnerHTML={{ __html: note.renderedHtml }} />
          <MermaidRenderer />
        </div>
        <footer className="mt-5 text-sm text-[var(--muted)]">
          Доступ предоставлен по публичной ссылке и может быть отозван владельцем.
        </footer>
      </article>
    </div>
  );
}

function frontmatterDescription(frontmatter: Record<string, unknown>) {
  const description = frontmatter.description;
  return typeof description === "string" && description.trim() ? description.trim() : null;
}
