import { eq } from "drizzle-orm";
import { PageHeader, Panel } from "@/components/ui";
import { db } from "@/lib/db";
import { indexRuns, notes } from "@/lib/db/schema";

export default async function StatusPage() {
  const rows = await db.select().from(notes).where(eq(notes.published, true)).limit(5000);
  const runs = await db.select().from(indexRuns).limit(10);
  const byStatus = rows.reduce<Record<string, number>>((acc, note) => {
    const key = note.status ?? "без статуса";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <>
      <PageHeader title="Статус" description="Обзор индекса и последних запусков." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 font-semibold">Заметки по статусам</h2>
          <div className="grid gap-2">{Object.entries(byStatus).map(([status, count]) => <div key={status}>{status}: {count}</div>)}</div>
        </Panel>
        <Panel>
          <h2 className="mb-3 font-semibold">Индексация</h2>
          <div className="grid gap-2 text-sm">{runs.map((run) => <div key={run.id}>{run.status} · {run.notesSeen} заметок · {run.startedAt.toLocaleString("ru-RU")}</div>)}</div>
        </Panel>
      </div>
    </>
  );
}
