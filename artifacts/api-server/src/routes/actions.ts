import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, dashboardTable, journalEntriesTable, reviewItemsTable, keywordsTable, tmNumbersTable, tmRecordsTable } from "@workspace/db";
import {
  RunScanResponse,
  GenerateDocsResponse,
  ExportDataResponse,
} from "@workspace/api-zod";
import { generateDocument, isGoogleConnected } from "../lib/google-docs";

const router: IRouter = Router();

// ===== SCAN =====
router.post("/actions/scan", async (req, res): Promise<void> => {
  const dashboards = await db.select().from(dashboardTable).limit(1);
  const dashboard = dashboards[0];
  if (!dashboard || !dashboard.journalNo) {
    res.status(400).json({ error: "Journal No not set in dashboard" });
    return;
  }

  const journalNo = dashboard.journalNo;
  const journalDate = dashboard.journalDate ?? "";
  const matchMode = dashboard.keywordMatchMode ?? "word";

  const [keywords, tmNumbers] = await Promise.all([
    db.select().from(keywordsTable),
    db.select().from(tmNumbersTable),
  ]);

  if (keywords.length === 0 && tmNumbers.length === 0) {
    res.status(400).json({ error: "No keywords or TM numbers configured" });
    return;
  }

  const tmSet = new Set(tmNumbers.map(t => t.value.trim()));
  const kwList = keywords.map(k => k.value.trim()).filter(Boolean);

  const entries = await db.select().from(journalEntriesTable);
  if (entries.length === 0) {
    res.status(400).json({ error: "No journal entries to scan" });
    return;
  }

  const existingReview = await db.select({ uniqueKey: reviewItemsTable.uniqueKey }).from(reviewItemsTable);
  const existingKeys = new Set(existingReview.map(r => r.uniqueKey).filter(Boolean) as string[]);

  let matched = 0;
  let skipped = 0;
  const newRows = [];

  for (const entry of entries) {
    const applicationNo = (entry.applicationNo ?? "").trim();
    let matchType = "";
    let matchedTerm = "";

    if (tmSet.has(applicationNo)) {
      matchType = "TM";
      matchedTerm = applicationNo;
    } else {
      const fields = [entry.title, entry.applicant, entry.agent, entry.applicationNo, entry.classNo];
      const hit = findKeywordHit(kwList, fields, matchMode);
      if (hit) {
        matchType = "KEYWORD";
        matchedTerm = hit;
      }
    }

    if (!matchType) continue;

    const uniqueKey = `${journalNo}|${applicationNo}|${matchType}|${matchedTerm}`;
    if (existingKeys.has(uniqueKey)) {
      skipped++;
      continue;
    }
    existingKeys.add(uniqueKey);

    newRows.push({
      journalNo,
      journalDate: journalDate || null,
      applicationNo,
      caseNo: null,
      title: entry.title ?? null,
      classNo: entry.classNo ?? null,
      applicant: entry.applicant ?? null,
      agent: entry.agent ?? null,
      filingDate: entry.filingDate ?? null,
      matchedTerm,
      matchType,
      status: "REVIEW",
      generatedDoc: null,
      generatedPdf: null,
      generatedAt: null,
      notes: null,
      uniqueKey,
    });

    matched++;
  }

  if (newRows.length > 0) {
    await db.insert(reviewItemsTable).values(newRows);
  }

  res.json(RunScanResponse.parse({
    matched,
    skipped,
    total: entries.length,
    journalNo,
    message: `Scan complete. Journal: ${journalNo}. Published rows: ${entries.length}. New matches: ${matched}. Skipped (duplicate): ${skipped}.`,
  }));
});

function findKeywordHit(keywords: string[], fields: (string | null | undefined)[], mode: string): string {
  for (const kw of keywords) {
    if (!kw) continue;
    const kwLower = kw.toLowerCase();
    for (const field of fields) {
      if (!field) continue;
      const text = field.toLowerCase();
      if (mode === "contains") {
        if (text.includes(kwLower)) return kw;
      } else {
        const escaped = kwLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
        if (re.test(text)) return kw;
      }
    }
  }
  return "";
}

// ===== GENERATE DOCS =====
router.post("/actions/generate-docs", async (_req, res): Promise<void> => {
  const items = await db.select().from(reviewItemsTable);
  const toGenerate = items.filter(r => r.status === "MAILMERGE" && !r.generatedDoc);

  if (toGenerate.length === 0) {
    res.json(GenerateDocsResponse.parse({
      success: true,
      message: "No items with status MAILMERGE found (or already generated). Set review items to MAILMERGE status first.",
      count: 0,
    }));
    return;
  }

  // Check Google is connected before starting
  const googleConnected = await isGoogleConnected();
  if (!googleConnected) {
    res.status(503).json({
      error: "Google account not connected. Please connect Google Drive in the Replit Integrations panel, then try again.",
    });
    return;
  }

  const dashboard = (await db.select().from(dashboardTable).limit(1))[0];
  const journalNo = dashboard?.journalNo ?? "000";
  const journalDate = dashboard?.journalDate ?? "";

  const existingRecords = await db.select().from(tmRecordsTable);
  let serialStart = existingRecords.length + 1;
  let processed = 0;
  let failed = 0;
  const now = new Date().toISOString();
  const errors: string[] = [];

  for (const item of toGenerate) {
    const serialNo = `PUB-${String(serialStart).padStart(3, "0")}`;
    serialStart++;

    try {
      const docUrl = await generateDocument({
        serialNo,
        caseNo: item.caseNo ?? item.applicationNo ?? "",
        applicationNo: item.applicationNo ?? "",
        classNo: item.classNo ?? "",
        title: item.title ?? "",
        journalNo,
      });

      await db.update(reviewItemsTable)
        .set({ status: "GENERATED", generatedDoc: docUrl, generatedAt: now })
        .where(eq(reviewItemsTable.id, item.id));

      await db.insert(tmRecordsTable).values({
        journalNo,
        journalDate: journalDate || null,
        tmNo: item.applicationNo,
        caseNo: item.caseNo ?? null,
        classNo: item.classNo ?? null,
        applicant: item.applicant ?? null,
        title: item.title ?? null,
        agent: item.agent ?? null,
        applicationNo: item.applicationNo,
        filingDate: item.filingDate ?? null,
        matchedTerm: item.matchedTerm ?? null,
        matchType: item.matchType ?? null,
        remarks: null,
        docUrl,
        pdfUrl: null,
      });

      processed++;
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${item.applicationNo}: ${msg}`);
    }
  }

  const parts = [`Generated ${processed} Google Doc(s).`];
  if (failed > 0) parts.push(`${failed} failed.`);
  if (errors.length > 0) parts.push(errors.join("; "));

  res.json(GenerateDocsResponse.parse({
    success: processed > 0,
    message: parts.join(" "),
    count: processed,
  }));
});

// ===== EXPORT =====
router.post("/actions/export", async (_req, res): Promise<void> => {
  const [entries, reviewItems, records] = await Promise.all([
    db.select().from(journalEntriesTable),
    db.select().from(reviewItemsTable),
    db.select().from(tmRecordsTable),
  ]);

  res.json(ExportDataResponse.parse({
    success: true,
    message: `Export summary — Journal: ${entries.length} entries, Review: ${reviewItems.length} items, Records: ${records.length} records. Google Drive export requires the Apps Script integration.`,
    files: [
      `journal_entries_${entries.length}_rows`,
      `review_items_${reviewItems.length}_rows`,
      `tm_records_${records.length}_rows`,
    ],
  }));
});

export default router;
