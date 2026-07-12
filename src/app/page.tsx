import Link from "next/link";
import { and, desc, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { NoteLink, PageHeader, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw, visibleNotesFilter } from "@/lib/notes/access";

export default async function Dashboard() {
  const user = await requireUser();
  const visible = visibleNotesFilter(canAccessRaw(user));
  const recent = await db.select().from(notes).where(visible).orderBy(desc(notes.updatedDate), desc(notes.indexedAt)).limit(10);
  const maps = await db.select().from(notes).where(and(visible, ilike(notes.vaultPath, "%Map%"))).limit(6);
  const counts = await db.select({ type: notes.type }).from(notes).where(visible).limit(5000);
  const byType = counts.reduce<Record<string, number>>((acc, item) => {
    const key = item.type ?? "без типа";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader title="Рабочая карта хранилища" description="Быстрый вход в заметки, поиск, граф и вопросы по индексированному Obsidian vault." />
      <form action="/search" className="mb-6 flex gap-2">
        <input data-global-search name="q" className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-4 py-3" placeholder="Искать по хранилищу..." />
        <button className="rounded-md bg-[var(--accent)] px-4 py-3 font-medium text-white">Искать</button>
      </form>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Недавно обновлено</h2>
            <Link href="/search" className="text-sm">Все заметки</Link>
          </div>
          <div className="grid gap-2">
            {recent.map((note) => <NoteLink key={note.id} href={`/notes/${note.slug}`} title={note.title} meta={`${note.vaultPath} · ${note.status ?? "без статуса"}`} />)}
          </div>
        </Panel>
        <div className="grid gap-4">
          <Panel>
            <h2 className="mb-3 text-lg font-semibold">Действия</h2>
            <div className="grid gap-2">
              <Link className="rounded-md border border-[var(--line)] p-3 hover:no-underline" href="/chat">Задать вопрос по базе</Link>
              <Link className="rounded-md border border-[var(--line)] p-3 hover:no-underline" href="/graph">Открыть граф связей</Link>
              <Link className="rounded-md border border-[var(--line)] p-3 hover:no-underline" href="/admin/reindex">Переиндексировать</Link>
            </div>
          </Panel>
          <Panel>
            <h2 className="mb-3 text-lg font-semibold">Типы</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(byType).slice(0, 12).map(([type, count]) => <div key={type} className="rounded-md bg-[var(--background)] p-2">{type}: {count}</div>)}
            </div>
          </Panel>
        </div>
      </div>
      <Panel className="mt-4">
        <h2 className="mb-3 text-lg font-semibold">Карты</h2>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {maps.map((note) => <NoteLink key={note.id} href={`/notes/${note.slug}`} title={note.title} meta={note.vaultPath} />)}
        </div>
      </Panel>
    </>
  );
}
