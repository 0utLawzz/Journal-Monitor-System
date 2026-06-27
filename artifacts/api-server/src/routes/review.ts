import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, reviewItemsTable } from "@workspace/db";
import {
  GetReviewItemsQueryParams,
  GetReviewItemsResponse,
  UpdateReviewItemParams,
  UpdateReviewItemBody,
  UpdateReviewItemResponse,
  DeleteReviewItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/review", async (req, res): Promise<void> => {
  const parsed = GetReviewItemsQueryParams.safeParse(req.query);
  const filters = parsed.success ? parsed.data : {};

  let query = db.select().from(reviewItemsTable);

  const conditions = [];
  if (filters.status) conditions.push(eq(reviewItemsTable.status, filters.status));
  if (filters.journalNo) conditions.push(eq(reviewItemsTable.journalNo, filters.journalNo));
  if (filters.matchType) conditions.push(eq(reviewItemsTable.matchType, filters.matchType));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const items = await query.orderBy(reviewItemsTable.createdAt);
  res.json(GetReviewItemsResponse.parse(items.map(item => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }))));
});

router.delete("/review", async (_req, res): Promise<void> => {
  await db.delete(reviewItemsTable);
  res.sendStatus(204);
});

router.patch("/review/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateReviewItemParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateReviewItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(reviewItemsTable)
    .set(parsed.data)
    .where(eq(reviewItemsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Review item not found" });
    return;
  }

  res.json(UpdateReviewItemResponse.parse({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  }));
});

router.delete("/review/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteReviewItemParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(reviewItemsTable).where(eq(reviewItemsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
