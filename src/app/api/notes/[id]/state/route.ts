import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notes, userNoteStates } from "@/lib/db/schema";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";

const statePatch = z.object({
  saved: z.boolean().optional(),
  readLater: z.boolean().optional(),
}).refine((value) => value.saved !== undefined || value.readLater !== undefined, {
  message: "At least one state value is required",
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const noteId = z.uuid().safeParse(id);
  const body = statePatch.safeParse(await request.json());

  if (!noteId.success || !body.success) {
    return Response.json({ error: "Некорректное состояние заметки." }, { status: 400 });
  }

  const [note] = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.id, noteId.data), visibleNotesFilter(canAccessRaw(user))))
    .limit(1);

  if (!note) {
    return Response.json({ error: "Заметка не найдена." }, { status: 404 });
  }

  const now = new Date();
  const update = {
    ...(body.data.saved !== undefined ? { saved: body.data.saved } : {}),
    ...(body.data.readLater !== undefined ? { readLater: body.data.readLater } : {}),
    updatedAt: now,
  };

  const [state] = await db
    .insert(userNoteStates)
    .values({
      userId: user.id,
      noteId: note.id,
      saved: body.data.saved ?? false,
      readLater: body.data.readLater ?? false,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userNoteStates.userId, userNoteStates.noteId],
      set: update,
    })
    .returning({ saved: userNoteStates.saved, readLater: userNoteStates.readLater });

  revalidatePath("/");
  return Response.json({ state });
}
