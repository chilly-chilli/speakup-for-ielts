import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const banks = sqliteTable("speaking_banks", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), name: text("name").notNull(),
  version: text("version").notNull(), status: text("status").notNull(), questions: text("questions").notNull(), createdAt: text("created_at").notNull(),
});
export const sessions = sqliteTable("speaking_sessions", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), requestKey: text("request_key").notNull(),
  config: text("config").notNull(), plan: text("plan").notNull(), bank: text("bank").notNull(),
  status: text("status").notNull(), report: text("report"), createdAt: text("created_at").notNull(),
}, t => [uniqueIndex("speaking_session_request").on(t.owner, t.requestKey)]);
export const turns = sqliteTable("speaking_turns", {
  id: text("id").primaryKey(), session: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  eventKey: text("event_key").notNull(), payload: text("payload").notNull(), createdAt: text("created_at").notNull(),
}, t => [uniqueIndex("speaking_turn_event").on(t.session, t.eventKey)]);
