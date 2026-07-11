import { PageHeader, Panel } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";

export default async function SettingsPage() {
  const user = await getSessionUser();
  return (
    <>
      <PageHeader title="Настройки" />
      <Panel>
        <p className="mb-3">Пользователь: {user?.displayName} ({user?.email})</p>
        <div className="flex gap-2">
          <span className="rounded-md border border-[var(--line)] px-3 py-2">Тема переключается в шапке или клавишей t</span>
          <form action="/api/auth/logout" method="post"><button className="rounded-md bg-[var(--accent-2)] px-3 py-2 text-white">Выйти</button></form>
        </div>
      </Panel>
    </>
  );
}
