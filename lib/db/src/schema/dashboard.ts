import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dashboardTable = pgTable("dashboard", {
  id: serial("id").primaryKey(),
  journalNo: text("journal_no"),
  journalDate: text("journal_date"),
  keywordMatchMode: text("keyword_match_mode").notNull().default("word"),
});

export const insertDashboardSchema = createInsertSchema(dashboardTable).omit({ id: true });
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;
export type Dashboard = typeof dashboardTable.$inferSelect;

export const keywordsTable = pgTable("keywords", {
  id: serial("id").primaryKey(),
  value: text("value").notNull(),
});

export const insertKeywordSchema = createInsertSchema(keywordsTable).omit({ id: true });
export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type Keyword = typeof keywordsTable.$inferSelect;

export const tmNumbersTable = pgTable("tm_numbers", {
  id: serial("id").primaryKey(),
  value: text("value").notNull(),
});

export const insertTmNumberSchema = createInsertSchema(tmNumbersTable).omit({ id: true });
export type InsertTmNumber = z.infer<typeof insertTmNumberSchema>;
export type TmNumber = typeof tmNumbersTable.$inferSelect;
