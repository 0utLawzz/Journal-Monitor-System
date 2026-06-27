import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const journalEntriesTable = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  applicationNo: text("application_no").notNull(),
  title: text("title"),
  classNo: text("class_no"),
  applicant: text("applicant"),
  agent: text("agent"),
  filingDate: text("filing_date"),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntriesTable).omit({ id: true });
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntriesTable.$inferSelect;
