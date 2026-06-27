import { Router, type IRouter } from "express";
import { ilike, or, sql } from "drizzle-orm";
import { db, journalEntriesTable } from "@workspace/db";
import {
  GetJournalEntriesQueryParams,
  GetJournalEntriesResponse,
  ImportJournalEntriesBody,
  ImportJournalEntriesResponse,
  NormalizeDatesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/journal", async (req, res): Promise<void> => {
  const parsed = GetJournalEntriesQueryParams.safeParse(req.query);
  const page = parsed.success && parsed.data.page ? Number(parsed.data.page) : 1;
  const limit = parsed.success && parsed.data.limit ? Number(parsed.data.limit) : 50;
  const search = parsed.success ? parsed.data.search : undefined;

  const offset = (page - 1) * limit;

  let query = db.select().from(journalEntriesTable);
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(journalEntriesTable);

  if (search) {
    const like = `%${search}%`;
    const condition = or(
      ilike(journalEntriesTable.applicationNo, like),
      ilike(journalEntriesTable.title, like),
      ilike(journalEntriesTable.applicant, like),
      ilike(journalEntriesTable.agent, like),
    );
    query = query.where(condition) as typeof query;
    countQuery = countQuery.where(condition) as typeof countQuery;
  }

  const [entries, countResult] = await Promise.all([
    query.limit(limit).offset(offset),
    countQuery,
  ]);

  const total = countResult[0]?.count ?? 0;

  res.json(GetJournalEntriesResponse.parse({ entries, total, page, limit }));
});

router.post("/journal", async (req, res): Promise<void> => {
  const parsed = ImportJournalEntriesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const entries = parsed.data.entries;
  if (entries.length === 0) {
    res.status(201).json(ImportJournalEntriesResponse.parse({ imported: 0, skipped: 0, message: "No entries to import" }));
    return;
  }

  const rows = entries.map((e) => ({
    applicationNo: e.applicationNo,
    title: e.title ?? null,
    classNo: e.classNo ?? null,
    applicant: e.applicant ?? null,
    agent: e.agent ?? null,
    filingDate: e.filingDate ?? null,
  }));

  await db.insert(journalEntriesTable).values(rows);
  res.status(201).json(ImportJournalEntriesResponse.parse({
    imported: rows.length,
    skipped: 0,
    message: `Imported ${rows.length} journal entries`,
  }));
});

router.delete("/journal", async (_req, res): Promise<void> => {
  await db.delete(journalEntriesTable);
  res.sendStatus(204);
});

router.post("/journal/normalize-dates", async (_req, res): Promise<void> => {
  const entries = await db.select().from(journalEntriesTable);
  let changed = 0;
  let failed = 0;

  for (const entry of entries) {
    if (!entry.filingDate) continue;
    const normalized = tryNormalizeDate(entry.filingDate);
    if (!normalized) { failed++; continue; }
    if (normalized !== entry.filingDate) {
      await db.update(journalEntriesTable)
        .set({ filingDate: normalized })
        .where(sql`id = ${entry.id}`);
      changed++;
    }
  }

  res.json(NormalizeDatesResponse.parse({
    success: true,
    message: `Normalized ${changed} dates, failed ${failed}`,
    count: changed,
  }));
});

function tryNormalizeDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;

  // Try native parse
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return formatDate(d);
  }

  // Handle dd-MMM-yy or dd-MMM-yyyy
  const m = raw.trim().match(/^(\d{1,2})[-\/]([A-Za-z]{3}|\d{1,2})[-\/](\d{2,4})$/);
  if (!m) return null;

  const dd = parseInt(m[1], 10);
  const mid = m[2];
  const yyRaw = m[3];

  let mm: number;
  if (/^\d+$/.test(mid)) {
    mm = parseInt(mid, 10);
  } else {
    const months: Record<string, number> = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    mm = months[mid.toLowerCase()] ?? 0;
  }
  if (!mm || mm < 1 || mm > 12) return null;

  let yyyy: number;
  if (yyRaw.length === 4) {
    yyyy = parseInt(yyRaw, 10);
  } else {
    const yy = parseInt(yyRaw, 10);
    yyyy = yy <= 49 ? 2000 + yy : 1900 + yy;
  }

  const date = new Date(yyyy, mm - 1, dd);
  if (isNaN(date.getTime())) return null;
  return formatDate(date);
}

function formatDate(d: Date): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = months[d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mmm}-${yy}`;
}

export default router;
