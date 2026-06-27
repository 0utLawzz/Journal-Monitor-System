import { Router, type IRouter } from "express";
import { ilike, or, eq } from "drizzle-orm";
import { db, tmRecordsTable } from "@workspace/db";
import {
  GetRecordsQueryParams,
  GetRecordsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/records", async (req, res): Promise<void> => {
  const parsed = GetRecordsQueryParams.safeParse(req.query);
  const filters = parsed.success ? parsed.data : {};

  let query = db.select().from(tmRecordsTable);

  const conditions = [];
  if (filters.journalNo) conditions.push(eq(tmRecordsTable.journalNo, filters.journalNo));
  if (filters.search) {
    const like = `%${filters.search}%`;
    conditions.push(or(
      ilike(tmRecordsTable.applicationNo, like),
      ilike(tmRecordsTable.title, like),
      ilike(tmRecordsTable.applicant, like),
      ilike(tmRecordsTable.caseNo, like),
    ));
  }

  if (conditions.length > 0) {
    if (conditions.length === 1) {
      query = query.where(conditions[0]) as typeof query;
    }
  }

  const records = await query.orderBy(tmRecordsTable.createdAt);
  res.json(GetRecordsResponse.parse(records.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }))));
});

export default router;
