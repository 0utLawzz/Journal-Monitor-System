import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, dashboardTable, keywordsTable, tmNumbersTable } from "@workspace/db";
import {
  GetDashboardResponse,
  UpdateDashboardBody,
  UpdateDashboardResponse,
  GetKeywordsResponse,
  AddKeywordBody,
  AddKeywordResponse,
  DeleteKeywordParams,
  GetTmNumbersResponse,
  AddTmNumberBody,
  AddTmNumberResponse,
  DeleteTmNumberParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateDashboard() {
  const existing = await db.select().from(dashboardTable).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(dashboardTable).values({}).returning();
  return created;
}

router.get("/dashboard", async (req, res): Promise<void> => {
  const dashboard = await getOrCreateDashboard();
  res.json(GetDashboardResponse.parse(dashboard));
});

router.put("/dashboard", async (req, res): Promise<void> => {
  const parsed = UpdateDashboardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const dashboard = await getOrCreateDashboard();
  const [updated] = await db
    .update(dashboardTable)
    .set(parsed.data)
    .where(eq(dashboardTable.id, dashboard.id))
    .returning();
  res.json(UpdateDashboardResponse.parse(updated));
});

router.get("/dashboard/keywords", async (_req, res): Promise<void> => {
  const keywords = await db.select().from(keywordsTable);
  res.json(GetKeywordsResponse.parse(keywords));
});

router.post("/dashboard/keywords", async (req, res): Promise<void> => {
  const parsed = AddKeywordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [keyword] = await db.insert(keywordsTable).values({ value: parsed.data.value }).returning();
  res.status(201).json(AddKeywordResponse.parse(keyword));
});

router.delete("/dashboard/keywords/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteKeywordParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(keywordsTable).where(eq(keywordsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/dashboard/tm-numbers", async (_req, res): Promise<void> => {
  const tmNumbers = await db.select().from(tmNumbersTable);
  res.json(GetTmNumbersResponse.parse(tmNumbers));
});

router.post("/dashboard/tm-numbers", async (req, res): Promise<void> => {
  const parsed = AddTmNumberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tmNumber] = await db.insert(tmNumbersTable).values({ value: parsed.data.value }).returning();
  res.status(201).json(AddTmNumberResponse.parse(tmNumber));
});

router.delete("/dashboard/tm-numbers/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteTmNumberParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(tmNumbersTable).where(eq(tmNumbersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
