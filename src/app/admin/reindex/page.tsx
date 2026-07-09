import { PageHeader, Panel } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";

export default async function ReindexPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Переиндексация" description="Запускает npm run index:vault внутри приложения. На продакшене лучше выполнять команду через Docker Compose." />
      <Panel>
        <form action="/api/admin/reindex" method="post">
          <button className="rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-white">Запустить переиндексацию</button>
        </form>
      </Panel>
    </>
  );
}
