import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { visibleNotesFilter } from "@/lib/notes/access";
import { createPublicShareToken } from "@/lib/notes/sharing";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Публичные ссылки доступны только администратору." }, { status: 403 });
  }

  const id = await noteId(params);
  if (!id) {
    return Response.json({ error: "Некорректный идентификатор статьи." }, { status: 400 });
  }

  const [note] = await db
    .select({ id: notes.id, publicShareToken: notes.publicShareToken })
    .from(notes)
    .where(and(eq(notes.id, id), visibleNotesFilter(true)))
    .limit(1);

  if (!note) {
    return Response.json({ error: "Статья не найдена." }, { status: 404 });
  }

  if (note.publicShareToken) {
    return Response.json({ sharePath: `/share/${note.publicShareToken}` });
  }

  const token = createPublicShareToken();
  const [shared] = await db
    .update(notes)
    .set({ publicShareToken: token, publicSharedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notes.id, note.id), isNull(notes.publicShareToken), visibleNotesFilter(true)))
    .returning({ publicShareToken: notes.publicShareToken });

  if (shared?.publicShareToken) {
    return Response.json({ sharePath: `/share/${shared.publicShareToken}` });
  }

  const [concurrentShare] = await db
    .select({ publicShareToken: notes.publicShareToken })
    .from(notes)
    .where(and(eq(notes.id, note.id), visibleNotesFilter(true)))
    .limit(1);

  return concurrentShare?.publicShareToken
    ? Response.json({ sharePath: `/share/${concurrentShare.publicShareToken}` })
    : Response.json({ error: "Не удалось открыть публичный доступ." }, { status: 409 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Публичные ссылки доступны только администратору." }, { status: 403 });
  }

  const id = await noteId(params);
  if (!id) {
    return Response.json({ error: "Некорректный идентификатор статьи." }, { status: 400 });
  }

  const [note] = await db
    .update(notes)
    .set({ publicShareToken: null, publicSharedAt: null, updatedAt: new Date() })
    .where(and(eq(notes.id, id), visibleNotesFilter(true)))
    .returning({ id: notes.id });

  if (!note) {
    return Response.json({ error: "Статья не найдена." }, { status: 404 });
  }

  return Response.json({ shared: false });
}

async function isAdmin() {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

async function noteId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  return parsed.success ? parsed.data : null;
}
