import Link from "next/link";
import { ActivityMap } from "@/components/dashboard/activity-map";
import { FeedCard } from "@/components/dashboard/feed-card";
import { PageHeader, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData, type DashboardNote, type DashboardPeriod } from "@/lib/dashboard";
import { canAccessRaw } from "@/lib/notes/access";

const periods: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "saved", label: "Сохранённое" },
  { value: "queue", label: "Очередь" },
];

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const period = dashboardPeriod(params.period);
  const { items, stats, activity, today } = await getDashboardData({ userId: user.id, period, rawAllowed: canAccessRaw(user) });
  const flows = dashboardFlows(items, period);

  return (
    <>
      <PageHeader title={pageTitle(period)} description="Лента главных изменений, входящих материалов и результатов — с быстрым доступом к тому, что требует внимания." />

      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1" aria-label="Период ленты">
        {periods.map((item) => (
          <Link key={item.value} href={item.value === "today" ? "/" : `/?period=${item.value}`} aria-current={period === item.value ? "page" : undefined} className={`shrink-0 rounded-md px-3.5 py-2 text-sm font-medium hover:no-underline ${period === item.value ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"}`}>
            {item.label}
            {item.value === "saved" && stats.saved > 0 ? <span className="ml-1.5 opacity-75">{stats.saved}</span> : null}
            {item.value === "queue" && stats.queued > 0 ? <span className="ml-1.5 opacity-75">{stats.queued}</span> : null}
          </Link>
        ))}
      </nav>

      <Panel className="mb-6 overflow-hidden border-[color-mix(in_srgb,var(--accent)_34%,var(--line))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_10%,var(--panel)),var(--panel)_62%)]">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]"><BriefIcon /> Daily Brief</div>
            <h2 className="text-xl font-semibold leading-snug">{briefTitle(stats.addedToday, stats.updatedToday)}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              {stats.saved > 0 || stats.queued > 0
                ? `У вас ${plural(stats.saved, "сохранённая заметка", "сохранённые заметки", "сохранённых заметок")} и ${plural(stats.queued, "материал", "материала", "материалов")} в очереди на чтение.`
                : "Сохраняйте важные заметки и отправляйте материалы в очередь прямо из карточек ленты."}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <BriefStat value={stats.addedToday} label="добавлено" />
            <BriefStat value={stats.updatedToday} label="обновлено" />
            <BriefStat value={stats.saved} label="сохранено" />
            <BriefStat value={stats.queued} label="в очереди" />
          </dl>
        </div>
      </Panel>

      <div className="grid gap-7">
        {flows.map((flow) => (
          <section key={flow.key}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{flow.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{flow.description}</p>
              </div>
              {flow.href ? <Link href={flow.href} className="shrink-0 text-sm">Открыть все</Link> : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {flow.items.map((item) => <FeedCard key={item.id} item={item} />)}
            </div>
          </section>
        ))}
        {flows.length === 0 ? (
          <Panel className="py-10 text-center">
            <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-[var(--background)] text-[var(--muted)]"><EmptyIcon /></div>
            <h2 className="font-semibold">В этой ленте пока ничего нет</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Попробуйте другой период или добавьте заметки в сохранённое и очередь.</p>
          </Panel>
        ) : null}
      </div>

      <div className="mt-7"><ActivityMap activity={activity} today={today} /></div>
    </>
  );
}

function dashboardPeriod(value: string | string[] | undefined): DashboardPeriod {
  const candidate = Array.isArray(value) ? value[0] : value;
  return periods.some((item) => item.value === candidate) ? candidate as DashboardPeriod : "today";
}

function pageTitle(period: DashboardPeriod) {
  if (period === "saved") return "Сохранённое";
  if (period === "queue") return "Очередь чтения";
  if (period === "week") return "Главное за неделю";
  if (period === "month") return "Главное за месяц";
  return "Сегодня в хранилище";
}

function dashboardFlows(items: DashboardNote[], period: DashboardPeriod) {
  if (period === "saved") return items.length ? [{ key: "saved", title: "Ваша коллекция", description: "Важные заметки, которые вы решили сохранить.", items, href: undefined }] : [];
  if (period === "queue") return items.length ? [{ key: "queue", title: "Прочитать позже", description: "Материалы в вашей персональной очереди.", items, href: undefined }] : [];

  const used = new Set<string>();
  const take = (filter: (item: DashboardNote) => boolean, limit: number) => items.filter((item) => !used.has(item.id) && filter(item)).slice(0, limit).map((item) => { used.add(item.id); return item; });
  const inputs = take((item) => item.vaultPath.toLocaleLowerCase().startsWith("inputs/"), 9);
  const outputs = take((item) => item.vaultPath.toLocaleLowerCase().startsWith("outputs/"), 9);
  const focus = take((item) => Boolean(item.status) && !isFinished(item.status), 9);
  const knowledge = take(() => true, 12);

  return [
    inputs.length ? { key: "inputs", title: "Новые входящие", description: "Источники и материалы, появившиеся в выбранный период.", items: inputs, href: "/inputs" } : null,
    focus.length ? { key: "focus", title: "Требуют внимания", description: "Активные заметки и материалы с незавершённым статусом.", items: focus, href: "/search" } : null,
    outputs.length ? { key: "outputs", title: "Свежие результаты", description: "Новые и обновлённые результаты работы.", items: outputs, href: "/outputs" } : null,
    knowledge.length ? { key: "knowledge", title: "Обновления базы", description: "Остальные изменения в картах и заметках хранилища.", items: knowledge, href: "/search" } : null,
  ].filter((flow): flow is NonNullable<typeof flow> => flow !== null);
}

function isFinished(status: string | null) {
  if (!status) return false;
  return ["done", "completed", "complete", "closed", "archived", "published", "готово", "завершено", "закрыто", "архив"].includes(status.toLocaleLowerCase());
}

function briefTitle(added: number, updated: number) {
  if (added === 0 && updated === 0) return "Сегодня хранилище спокойно — новых изменений пока нет.";
  if (added > 0 && updated > 0) return `Сегодня добавлено ${plural(added, "заметка", "заметки", "заметок")} и обновлено ${plural(updated, "заметка", "заметки", "заметок")}.`;
  if (added > 0) return `Сегодня добавлено ${plural(added, "новая заметка", "новые заметки", "новых заметок")}.`;
  return `Сегодня обновлено ${plural(updated, "заметка", "заметки", "заметок")}.`;
}

function plural(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  const word = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
  return `${value} ${word}`;
}

function BriefStat({ value, label }: { value: number; label: string }) {
  return <div className="min-w-16 rounded-lg border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel)_82%,transparent)] px-3 py-2.5 text-center"><dt className="text-[10px] text-[var(--muted)]">{label}</dt><dd className="mt-0.5 text-xl font-semibold text-[var(--foreground)]">{value}</dd></div>;
}

const Icon = ({ children }: { children: React.ReactNode }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">{children}</svg>;
const BriefIcon = () => <Icon><path d="M4 5h16v14H4zM8 9h8M8 13h5" /></Icon>;
const EmptyIcon = () => <Icon><path d="M4 7h16v12H4zM8 7V5h8v2M9 12h6" /></Icon>;
