import { Panel } from "@/components/ui";
import type { ActivityDay } from "@/lib/dashboard";

const monthNames = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function ActivityMap({ activity, today: todayKey }: { activity: ActivityDay[]; today: string }) {
  const countByDay = new Map(activity.map((item) => [item.day, item.count]));
  const today = new Date(`${todayKey}T00:00:00Z`);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay() - 52 * 7);
  const days = Array.from({ length: 53 * 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date, key, count: countByDay.get(key) ?? 0, future: date > today };
  });
  const weeks = Array.from({ length: 53 }, (_, index) => days.slice(index * 7, index * 7 + 7));
  const max = Math.max(1, ...activity.map((item) => item.count));

  return (
    <Panel className="overflow-hidden">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Активность хранилища</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Добавления и обновления за последние 12 месяцев.</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--muted)]" aria-label="Шкала активности">
          <span className="mr-1">Меньше</span>
          {[0, 0.18, 0.38, 0.62, 0.9].map((value) => <span key={value} className="size-3 rounded-[3px] border border-[var(--line)]" style={cellStyle(value)} />)}
          <span className="ml-1">Больше</span>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-max">
          <div className="mb-1 ml-8 grid grid-flow-col grid-cols-[repeat(53,12px)] gap-1 text-[10px] text-[var(--muted)]" aria-hidden="true">
            {weeks.map((week, index) => {
              const firstWeekDay = week.find((day) => day.date.getUTCDate() <= 7);
              return <span key={index} className="w-3 whitespace-nowrap">{firstWeekDay ? monthNames[firstWeekDay.date.getUTCMonth()] : ""}</span>;
            })}
          </div>
          <div className="flex gap-2">
            <div className="grid grid-rows-7 gap-1 pt-0 text-[10px] leading-3 text-[var(--muted)]" aria-hidden="true">
              <span />
              <span>пн</span>
              <span />
              <span>ср</span>
              <span />
              <span>пт</span>
              <span />
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-1" role="img" aria-label="Карта активности по дням">
              {days.map((day) => {
                const level = day.future || day.count === 0 ? 0 : Math.max(0.18, day.count / max);
                const label = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(day.date);
                return <span key={day.key} title={`${label}: ${day.count}`} className="size-3 rounded-[3px] border border-[var(--line)]" style={cellStyle(level, day.future)} />;
              })}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function cellStyle(level: number, future = false): React.CSSProperties {
  if (future) return { background: "transparent", opacity: 0.35 };
  if (level === 0) return { background: "var(--background)" };
  return { background: `color-mix(in srgb, var(--accent) ${Math.round(22 + level * 72)}%, var(--background))` };
}
