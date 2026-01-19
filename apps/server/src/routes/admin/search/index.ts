import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { healthRouter } from "./health";
import { reindexRouter } from "./reindex";
import { settingsRouter } from "./settings";
import { statusRouter } from "./status";

const searchRouter = new Hono<AdminContext>();

searchRouter.route("/health", healthRouter);
searchRouter.route("/status", statusRouter);
searchRouter.route("/reindex", reindexRouter);
searchRouter.route("/settings", settingsRouter);

export { searchRouter };
