import { asc } from "drizzle-orm";
import { PageHeader, Panel } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      canAccessRaw: users.canAccessRaw,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .orderBy(asc(users.email));

  return (
    <>
      <PageHeader title="Пользователи" description="Создание учетных записей и список пользователей приложения." />
      {params.created ? <StatusMessage tone="ok">Пользователь создан.</StatusMessage> : null}
      {params.updated ? <StatusMessage tone="ok">Доступ к Raw обновлён.</StatusMessage> : null}
      {params.error ? <StatusMessage tone="error">{decodeError(params.error)}</StatusMessage> : null}
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Panel>
          <h2 className="mb-4 text-lg font-semibold">Создать пользователя</h2>
          <form action="/api/admin/users" method="post" className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Email</span>
              <input name="email" type="email" required className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2" placeholder="user@example.com" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="canAccessRaw" type="checkbox" value="true" />
              <span>Разрешить доступ к Raw</span>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Имя</span>
              <input name="displayName" required className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2" placeholder="Имя пользователя" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Роль</span>
              <select name="role" defaultValue="user" className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2">
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Пароль</span>
              <input name="password" type="password" minLength={8} required className="rounded-md border border-[var(--line)] bg-[var(--background)] px-3 py-2" placeholder="Минимум 8 символов" />
            </label>
            <button className="rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-white">Создать</button>
          </form>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-lg font-semibold">Список пользователей</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Имя</th>
                  <th className="py-2 pr-3 font-medium">Роль</th>
                  <th className="py-2 pr-3 font-medium">Raw</th>
                  <th className="py-2 pr-3 font-medium">Создан</th>
                  <th className="py-2 pr-3 font-medium">Последний вход</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--line)]">
                    <td className="py-2 pr-3">{user.email}</td>
                    <td className="py-2 pr-3">{user.displayName}</td>
                    <td className="py-2 pr-3">{user.role}</td>
                    <td className="py-2 pr-3">
                      {user.role === "admin" ? <span>Всегда</span> : (
                        <form action="/api/admin/users" method="post" className="flex items-center gap-2">
                          <input type="hidden" name="action" value="raw-access" />
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="canAccessRaw" value={user.canAccessRaw ? "false" : "true"} />
                          <button className="rounded-md border border-[var(--line)] px-2 py-1">
                            {user.canAccessRaw ? "Разрешён" : "Запрещён"}
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="py-2 pr-3">{formatDate(user.createdAt)}</td>
                    <td className="py-2 pr-3">{formatDate(user.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}

function StatusMessage({ children, tone }: { children: React.ReactNode; tone: "ok" | "error" }) {
  return (
    <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${tone === "ok" ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--accent-2)] text-[var(--accent-2)]"}`}>
      {children}
    </div>
  );
}

function decodeError(error: string) {
  const messages: Record<string, string> = {
    duplicate: "Пользователь с таким email уже существует.",
    invalid: "Проверьте email, имя, роль и пароль.",
    forbidden: "Недостаточно прав.",
  };
  return messages[error] ?? "Не удалось создать пользователя.";
}

function formatDate(date: Date | null) {
  return date ? date.toLocaleString("ru-RU") : "—";
}
