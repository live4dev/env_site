import crypto from "node:crypto";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import { db, queryClient } from "@/lib/db";
import { indexRuns, noteChunks, noteLinks, notes } from "@/lib/db/schema";
import { extractWikiLinks } from "@/lib/markdown/links";
import { extractTitle, parseMarkdown } from "@/lib/markdown/render";
import { noteSlug, titleFromPath, headingAnchor } from "@/lib/markdown/slug";
import { chunkMarkdown } from "@/lib/vault/chunk";
import { listVaultMarkdownFiles, readVaultFile } from "@/lib/vault/files";
import { embedText } from "@/lib/rag/embeddings";

function hash(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function asArray(value: unknown): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

async function main() {
  const [run] = await db.insert(indexRuns).values({ status: "running" }).returning();
  const errors: unknown[] = [];
  let notesAdded = 0;
  let notesUpdated = 0;
  let chunksIndexed = 0;

  try {
    const files = await listVaultMarkdownFiles();
    const existing = await db.select().from(notes);
    const byPath = new Map(existing.map((note) => [note.vaultPath, note]));
    const slugByTitle = new Map<string, string>();
    for (const file of files) {
      slugByTitle.set(titleFromPath(file).toLocaleLowerCase(), noteSlug(file));
      slugByTitle.set(file.replace(/\.md$/i, "").toLocaleLowerCase(), noteSlug(file));
    }

    for (const vaultPath of files) {
      try {
        const markdown = await readVaultFile(vaultPath);
        const contentHash = hash(markdown);
        const current = byPath.get(vaultPath);
        if (current?.contentHash === contentHash) continue;

        const parsed = await parseMarkdown(markdown, (link) => {
          const targetSlug = slugByTitle.get(link.target.toLocaleLowerCase()) ?? noteSlug(link.target);
          return `/notes/${targetSlug}${link.heading ? `#${headingAnchor(link.heading)}` : ""}`;
        });
        const title = extractTitle(vaultPath, parsed.bodyMarkdown, parsed.frontmatter);
        const folder = path.dirname(vaultPath) === "." ? "" : path.dirname(vaultPath).replace(/\\/g, "/");
        const values = {
          vaultPath,
          slug: noteSlug(vaultPath),
          title,
          folder,
          contentHash,
          frontmatterJson: parsed.frontmatter,
          type: typeof parsed.frontmatter.type === "string" ? parsed.frontmatter.type : null,
          status: typeof parsed.frontmatter.status === "string" ? parsed.frontmatter.status : null,
          createdDate: asDate(parsed.frontmatter.created),
          updatedDate: asDate(parsed.frontmatter.updated),
          sourcesJson: asArray(parsed.frontmatter.sources),
          tags: asArray(parsed.frontmatter.tags),
          bodyMarkdown: parsed.bodyMarkdown,
          bodyText: parsed.bodyText,
          renderedHtml: parsed.renderedHtml,
          published: parsed.frontmatter.published === false ? false : true,
          indexedAt: new Date(),
          updatedAt: new Date(),
        };

        const [note] = current
          ? await db.update(notes).set(values).where(eq(notes.id, current.id)).returning()
          : await db.insert(notes).values(values).returning();
        if (current) notesUpdated++;
        else notesAdded++;

        await db.delete(noteLinks).where(eq(noteLinks.sourceNoteId, note.id));
        await db.delete(noteChunks).where(eq(noteChunks.noteId, note.id));

        const links = extractWikiLinks(parsed.bodyMarkdown);
        for (const link of links) {
          const targetSlug = slugByTitle.get(link.target.toLocaleLowerCase());
          let targetId: string | null = null;
          if (targetSlug) {
            const [target] = await db.select({ id: notes.id }).from(notes).where(eq(notes.slug, targetSlug)).limit(1);
            targetId = target?.id ?? null;
          }
          await db.insert(noteLinks).values({
            sourceNoteId: note.id,
            targetNoteId: targetId,
            targetRaw: link.target,
            label: link.label,
            heading: link.heading,
            isResolved: Boolean(targetId),
          });
        }

        const chunks = chunkMarkdown(parsed.bodyMarkdown);
        if (chunks.length) {
          const chunkValues = [];
          for (const chunk of chunks) {
            const embedding = await embedText(chunk.content);
            chunkValues.push({
            noteId: note.id,
            chunkIndex: chunk.chunkIndex,
            headingPath: chunk.headingPath,
            headingAnchor: chunk.headingAnchor,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            embedding,
            metadataJson: { vaultPath, slug: note.slug, title },
            });
          }
          await db.insert(noteChunks).values(chunkValues);
          chunksIndexed += chunks.length;
        }
      } catch (error) {
        errors.push({ vaultPath, error: error instanceof Error ? error.message : String(error) });
      }
    }

    const missing = existing.filter((note) => !files.includes(note.vaultPath));
    if (missing.length) {
      await db.update(notes).set({ published: false, updatedAt: new Date() }).where(inArray(notes.id, missing.map((note) => note.id)));
    }

    await db.update(indexRuns).set({
      status: errors.length ? "failed" : "succeeded",
      finishedAt: new Date(),
      notesSeen: files.length,
      notesAdded,
      notesUpdated,
      notesDeleted: missing.length,
      chunksIndexed,
      errorsJson: errors,
    }).where(eq(indexRuns.id, run.id));

    console.log(`indexed ${files.length} files, added ${notesAdded}, updated ${notesUpdated}, chunks ${chunksIndexed}, errors ${errors.length}`);
    if (errors.length) process.exitCode = 1;
  } catch (error) {
    await db.update(indexRuns).set({
      status: "failed",
      finishedAt: new Date(),
      errorsJson: [{ error: error instanceof Error ? error.message : String(error) }],
    }).where(eq(indexRuns.id, run.id));
    throw error;
  } finally {
    await queryClient.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
