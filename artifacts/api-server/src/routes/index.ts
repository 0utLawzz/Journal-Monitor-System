import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import journalRouter from "./journal";
import reviewRouter from "./review";
import recordsRouter from "./records";
import actionsRouter from "./actions";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(journalRouter);
router.use(reviewRouter);
router.use(recordsRouter);
router.use(actionsRouter);
router.use(statsRouter);

export default router;
