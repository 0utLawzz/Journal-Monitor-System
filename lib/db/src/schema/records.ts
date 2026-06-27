import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tmRecordsTable = pgTable("tm_records", {
  id: serial("id").primaryKey(),
  journalNo: text("journal_no").notNull(),
  journalDate: text("journal_date"),
  tmNo: text("tm_no"),
  caseNo: text("case_no"),
  classNo: text("class_no"),
  applicant: text("applicant"),
  title: text("title"),
  agent: text("agent"),
  applicationNo: text("application_no").notNull(),
  filingDate: text("filing_date"),
  matchedTerm: text("matched_term"),
  matchType: text("match_type"),
  remarks: text("remarks"),
  docUrl: text("doc_url"),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTmRecordSchema = createInsertSchema(tmRecordsTable).omit({ id: true, createdAt: true });
export type InsertTmRecord = z.infer<typeof insertTmRecordSchema>;
export type TmRecord = typeof tmRecordsTable.$inferSelect;
