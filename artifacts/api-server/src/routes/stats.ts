import { Router, type IRouter } from "express";
import { db, journalEntriesTable, reviewItemsTable, tmRecordsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { GetStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const [journalCount, reviewCount, recordsCount, statusCounts] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(journalEntriesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(reviewItemsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(tmRecordsTable),
    db
      .select({
        status: reviewItemsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(reviewItemsTable)
      .groupBy(reviewItemsTable.status),
  ]);

  const totalJournalEntries = journalCount[0]?.count ?? 0;
  const totalReviewItems = reviewCount[0]?.count ?? 0;
  const totalRecords = recordsCount[0]?.count ?? 0;

  const statusMap = Object.fromEntries(statusCounts.map(s => [s.status, s.count]));

  const pendingReview = statusMap["REVIEW"] ?? 0;
  const approvedForMerge = statusMap["MAILMERGE"] ?? 0;
  const generated = statusMap["GENERATED"] ?? 0;

  const [kwMatchCount, tmMatchCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(reviewItemsTable)
      .where(sql`match_type = 'KEYWORD'`),
    db.select({ count: sql<number>`count(*)::int` }).from(reviewItemsTable)
      .where(sql`match_type = 'TM'`),
  ]);

  res.json(GetStatsResponse.parse({
    totalJournalEntries,
    totalReviewItems,
    totalRecords,
    pendingReview,
    approvedForMerge,
    generated,
    keywordMatches: kwMatchCount[0]?.count ?? 0,
    tmMatches: tmMatchCount[0]?.count ?? 0,
    reviewByStatus: statusCounts,
  }));
});

export default router;
