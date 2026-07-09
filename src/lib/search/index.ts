import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { noteChunks, notes } from "@/lib/db/schema";
import { embedText } from "@/lib/rag/embeddings";

export type SearchMode = "keyword" | "semantic" | "hybrid";

export async function searchNotes(params: {
  q?: string;
  mode?: SearchMode;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sources?: string;
  limit?: number;
}) {
  const limit = params.limit ?? 20;
  const filters = [
    eq(notes.published, true),
    params.status ? eq(notes.status, params.status) : undefined,
    params.dateFrom ? gte(notes.updatedDate, new Date(params.dateFrom)) : undefined,
    params.dateTo ? lte(notes.updatedDate, new Date(params.dateTo)) : undefined,
    params.sources ? sql`${notes.sourcesJson}::text ILIKE ${`%${params.sources}%`}` : undefined,
  ].filter(Boolean);

  const query = params.q?.trim();
  const where = query
    ? and(...filters, or(ilike(notes.title, `%${query}%`), ilike(notes.bodyText, `%${query}%`)))
    : and(...filters);

  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      slug: notes.slug,
      vaultPath: notes.vaultPath,
      type: notes.type,
      status: notes.status,
      updatedDate: notes.updatedDate,
      bodyText: notes.bodyText,
    })
    .from(notes)
    .where(where)
    .orderBy(desc(notes.updatedDate), desc(notes.indexedAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    snippet: makeSnippet(row.bodyText, query),
    url: `/notes/${row.slug}`,
  }));
}

export async function retrieveChunks(question: string, limit = 8) {
  const q = question.trim();
  const embedding = await embedText(q);
  if (embedding) {
    const vector = `[${embedding.join(",")}]`;
    return db
      .select({
        id: noteChunks.id,
        content: noteChunks.content,
        headingPath: noteChunks.headingPath,
        headingAnchor: noteChunks.headingAnchor,
        noteId: notes.id,
        title: notes.title,
        slug: notes.slug,
        vaultPath: notes.vaultPath,
      })
      .from(noteChunks)
      .innerJoin(notes, eq(noteChunks.noteId, notes.id))
      .where(and(eq(notes.published, true), sql`${noteChunks.embedding} IS NOT NULL`))
      .orderBy(sql`${noteChunks.embedding} <-> ${vector}::vector`)
      .limit(limit);
  }
  const rows = await db
    .select({
      id: noteChunks.id,
      content: noteChunks.content,
      headingPath: noteChunks.headingPath,
      headingAnchor: noteChunks.headingAnchor,
      noteId: notes.id,
      title: notes.title,
      slug: notes.slug,
      vaultPath: notes.vaultPath,
    })
    .from(noteChunks)
    .innerJoin(notes, eq(noteChunks.noteId, notes.id))
    .where(and(eq(notes.published, true), q ? sql`to_tsvector('simple', ${noteChunks.content}) @@ plainto_tsquery('simple', ${q})` : undefined))
    .limit(limit);

  if (rows.length > 0 || !q) return rows;

  return db
    .select({
      id: noteChunks.id,
      content: noteChunks.content,
      headingPath: noteChunks.headingPath,
      headingAnchor: noteChunks.headingAnchor,
      noteId: notes.id,
      title: notes.title,
      slug: notes.slug,
      vaultPath: notes.vaultPath,
    })
    .from(noteChunks)
    .innerJoin(notes, eq(noteChunks.noteId, notes.id))
    .where(and(eq(notes.published, true), ilike(noteChunks.content, `%${q}%`)))
    .limit(limit);
}

function makeSnippet(text: string, query?: string) {
  if (!query) return text.slice(0, 240);
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  const start = Math.max(0, index - 90);
  return text.slice(start, start + 260);
}
