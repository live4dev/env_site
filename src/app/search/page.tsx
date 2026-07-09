import { searchNotes } from "@/lib/search";
import { NoteLink, PageHeader, Panel } from "@/components/ui";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const results = await searchNotes({
    q: params.q,
    mode: (params.mode as "keyword" | "semantic" | "hybrid") ?? "hybrid",
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    sources: params.sources,
  });

  return (
    <>
      <PageHeader title="Поиск" description="Полнотекстовый, семантический и гибридный поиск по опубликованным заметкам." />
      <Panel className="mb-4">
        <form className="grid gap-3 md:grid-cols-[1fr_160px_140px_140px_120px]">
          <input data-global-search name="q" defaultValue={params.q ?? ""} className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2" placeholder="Запрос" />
          <select name="mode" defaultValue={params.mode ?? "hybrid"} className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2">
            <option value="hybrid">Гибридный</option>
            <option value="keyword">Ключевой</option>
            <option value="semantic">Семантический</option>
          </select>
          <input name="status" defaultValue={params.status ?? ""} className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2" placeholder="Статус" />
          <input name="dateFrom" defaultValue={params.dateFrom ?? ""} type="date" className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2" />
          <button className="rounded-md bg-[var(--accent)] px-4 py-2 text-white">Искать</button>
        </form>
      </Panel>
      <div className="grid gap-3">
        {results.map((result) => (
          <NoteLink key={result.id} href={result.url} title={result.title} meta={`${result.vaultPath} · ${result.status ?? "без статуса"} · ${result.snippet}`} />
        ))}
        {results.length === 0 ? <p className="text-sm text-[var(--muted)]">Ничего не найдено.</p> : null}
      </div>
    </>
  );
}
