import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewItemsTable = pgTable("review_items", {
  id: serial("id").primaryKey(),
  journalNo: text("journal_no").notNull(),
  journalDate: text("journal_date"),
  applicationNo: text("application_no").notNull(),
  caseNo: text("case_no"),
  title: text("title"),
  classNo: text("class_no"),
  applicant: text("applicant"),
  agent: text("agent"),
  filingDate: text("filing_date"),
  matchedTerm: text("matched_term"),
  matchType: text("match_type"),
  status: text("status").notNull().default("REVIEW"),
  generatedDoc: text("generated_doc"),
  generatedPdf: text("generated_pdf"),
  generatedAt: text("generated_at"),
  notes: text("notes"),
  uniqueKey: text("unique_key").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewItemSchema = createInsertSchema(reviewItemsTable).omit({ id: true, createdAt: true });
export type InsertReviewItem = z.infer<typeof insertReviewItemSchema>;
export type ReviewItem = typeof reviewItemsTable.$inferSelect;
