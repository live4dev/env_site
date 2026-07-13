import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { notes, userNoteStates } from "@/lib/db/schema";
import { visibleNotesFilter } from "@/lib/notes/access";
import { env } from "@/lib/config";

export type DashboardPeriod = "today" | "week" | "month" | "saved" | "queue";

export type DashboardNote = {
  id: string;
  title: string;
  slug: string;
  vaultPath: string;
  type: string | null;
  status: string | null;
  summary: string;
  sourceUrl: string | null;
  updatedAt: string;
  saved: boolean;
  readLater: boolean;
  reason: string;
};

export type DashboardStats = {
  addedToday: number;
  updatedToday: number;
  saved: number;
  queued: number;
};

export type ActivityDay = { day: string; count: number };

export async function getDashboardData(params: {
  userId: string;
  period: DashboardPeriod;
  rawAllowed: boolean;
}) {
  const changedAt = sql<Date>`coalesce(${notes.updatedDate}, ${notes.indexedAt})`;
  const todayStart = sql<Date>`date_trunc('day', now() at time zone ${env.APP_TIMEZONE}) at time zone ${env.APP_TIMEZONE}`;
  const periodFilter = dashboardPeriodFilter(params.period, changedAt, todayStart);
  const stateJoin = and(eq(userNoteStates.noteId, notes.id), eq(userNoteStates.userId, params.userId));

  const [rows, noteStats, stateStats, activity] = await Promise.all([
    db
      .select({
        id: notes.id,
        title: notes.title,
        slug: notes.slug,
        vaultPath: notes.vaultPath,
        type: notes.type,
        status: notes.status,
        bodyText: notes.bodyText,
        frontmatter: notes.frontmatterJson,
        sources: notes.sourcesJson,
        updatedAt: changedAt,
        saved: userNoteStates.saved,
        readLater: userNoteStates.readLater,
      })
      .from(notes)
      .leftJoin(userNoteStates, stateJoin)
      .where(and(visibleNotesFilter(params.rawAllowed), periodFilter))
      .orderBy(desc(changedAt))
      .limit(72),
    db
      .select({
        addedToday: sql<number>`count(*) filter (where coalesce(${notes.createdDate}, ${notes.indexedAt}) >= ${todayStart})::int`,
        updatedToday: sql<number>`count(*) filter (where ${changedAt} >= ${todayStart})::int`,
      })
      .from(notes)
      .where(visibleNotesFilter(params.rawAllowed)),
    db
      .select({
        saved: sql<number>`count(*) filter (where ${userNoteStates.saved})::int`,
        queued: sql<number>`count(*) filter (where ${userNoteStates.readLater})::int`,
      })
      .from(userNoteStates)
      .innerJoin(notes, eq(userNoteStates.noteId, notes.id))
      .where(and(eq(userNoteStates.userId, params.userId), visibleNotesFilter(params.rawAllowed))),
    getActivity(params.rawAllowed),
  ]);

  const items = rows.map((row): DashboardNote => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    vaultPath: row.vaultPath,
    type: row.type,
    status: row.status,
    summary: summarize(row.bodyText),
    sourceUrl: sourceUrl(row.frontmatter, row.sources),
    updatedAt: row.updatedAt.toISOString(),
    saved: row.saved ?? false,
    readLater: row.readLater ?? false,
    reason: signalReason(row.vaultPath, row.type, row.status, row.updatedAt),
  }));

  return {
    items,
    stats: {
      addedToday: noteStats[0]?.addedToday ?? 0,
      updatedToday: noteStats[0]?.updatedToday ?? 0,
      saved: stateStats[0]?.saved ?? 0,
      queued: stateStats[0]?.queued ?? 0,
    } satisfies DashboardStats,
    activity,
    today: dayKeyInTimeZone(new Date(), env.APP_TIMEZONE),
  };
}

function dashboardPeriodFilter(period: DashboardPeriod, changedAt: SQL<Date>, todayStart: SQL<Date>) {
  if (period === "saved") return eq(userNoteStates.saved, true);
  if (period === "queue") return eq(userNoteStates.readLater, true);
  if (period === "week") return sql`${changedAt} >= now() - interval '7 days'`;
  if (period === "month") return sql`${changedAt} >= now() - interval '30 days'`;
  return sql`${changedAt} >= ${todayStart}`;
}

async function getActivity(rawAllowed: boolean): Promise<ActivityDay[]> {
  const changedAt = sql<Date>`coalesce(${notes.updatedDate}, ${notes.indexedAt})`;
  const day = sql<string>`date_trunc('day', ${changedAt})::date`.as("day");
  const rows = await db
    .select({ day, count: sql<number>`count(*)::int` })
    .from(notes)
    .where(and(visibleNotesFilter(rawAllowed), gte(changedAt, sql`now() - interval '371 days'`)))
    .groupBy(day)
    .orderBy(day);
  return rows.map((row) => ({ day: normalizeDay(row.day), count: row.count }));
}

function normalizeDay(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function summarize(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 180) return clean;
  return `${clean.slice(0, 177).trimEnd()}…`;
}

function sourceUrl(frontmatter: Record<string, unknown>, sources: unknown[]) {
  if (typeof frontmatter.url === "string" && /^https?:\/\//.test(frontmatter.url)) return frontmatter.url;
  for (const source of sources) {
    if (typeof source === "string" && /^https?:\/\//.test(source)) return source;
    if (source && typeof source === "object") {
      const candidate = "url" in source ? source.url : "link" in source ? source.link : undefined;
      if (typeof candidate === "string" && /^https?:\/\//.test(candidate)) return candidate;
    }
  }
  return null;
}

function signalReason(vaultPath: string, type: string | null, status: string | null, updatedAt: Date) {
  const path = vaultPath.toLocaleLowerCase();
  if (path.startsWith("inputs/")) return "Новый входящий материал";
  if (path.startsWith("outputs/")) return "Свежий результат";
  if (type?.toLocaleLowerCase().includes("map") || path.includes("map")) return "Обновлена карта знаний";
  if (status) return `Статус: ${status}`;
  return `Обновлено ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(updatedAt)}`;
}

function dayKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
