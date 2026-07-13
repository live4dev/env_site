import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, vector } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  canAccessRaw: boolean("can_access_raw").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  vaultPath: text("vault_path").notNull().unique(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  folder: text("folder").notNull().default(""),
  contentHash: text("content_hash").notNull(),
  frontmatterJson: jsonb("frontmatter_json").$type<Record<string, unknown>>().notNull().default({}),
  type: text("type"),
  status: text("status"),
  createdDate: timestamp("created_date", { withTimezone: true }),
  updatedDate: timestamp("updated_date", { withTimezone: true }),
  sourcesJson: jsonb("sources_json").$type<unknown[]>().notNull().default([]),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  bodyMarkdown: text("body_markdown").notNull(),
  bodyText: text("body_text").notNull(),
  renderedHtml: text("rendered_html").notNull(),
  published: boolean("published").notNull().default(true),
  indexedAt: timestamp("indexed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  notesSearchIdx: index("notes_search_idx").using("gin", sql`to_tsvector('simple', ${table.bodyText})`),
}));

export const noteLinks = pgTable("note_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceNoteId: uuid("source_note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  targetNoteId: uuid("target_note_id").references(() => notes.id, { onDelete: "set null" }),
  targetRaw: text("target_raw").notNull(),
  label: text("label"),
  heading: text("heading"),
  isResolved: boolean("is_resolved").notNull().default(false),
});

export const userNoteStates = pgTable("user_note_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  noteId: uuid("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  saved: boolean("saved").notNull().default(false),
  readLater: boolean("read_later").notNull().default(false),
  lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userNoteIdx: uniqueIndex("user_note_states_user_note_idx").on(table.userId, table.noteId),
  userSavedIdx: index("user_note_states_user_saved_idx").on(table.userId, table.saved),
  userReadLaterIdx: index("user_note_states_user_read_later_idx").on(table.userId, table.readLater),
}));

export const noteChunks = pgTable("note_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  noteId: uuid("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  headingPath: text("heading_path"),
  headingAnchor: text("heading_anchor"),
  content: text("content").notNull(),
  tokenCount: integer("token_count").notNull().default(0),
  embedding: vector("embedding", { dimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 1536) }),
  metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  chunkSearchIdx: index("note_chunks_search_idx").using("gin", sql`to_tsvector('simple', ${table.content})`),
}));

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  retrievalJson: jsonb("retrieval_json").$type<Record<string, unknown>>(),
  model: text("model"),
  tokenUsageJson: jsonb("token_usage_json").$type<Record<string, unknown>>(),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const indexRuns = pgTable("index_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status", { enum: ["running", "succeeded", "failed"] }).notNull(),
  startedByUserId: uuid("started_by_user_id").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  notesSeen: integer("notes_seen").notNull().default(0),
  notesAdded: integer("notes_added").notNull().default(0),
  notesUpdated: integer("notes_updated").notNull().default(0),
  notesDeleted: integer("notes_deleted").notNull().default(0),
  chunksIndexed: integer("chunks_indexed").notNull().default(0),
  errorsJson: jsonb("errors_json").$type<unknown[]>().notNull().default([]),
});

export type User = typeof users.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type UserNoteState = typeof userNoteStates.$inferSelect;
