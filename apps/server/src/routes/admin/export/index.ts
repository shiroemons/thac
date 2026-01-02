import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { artistExportRouter } from "./artists";
import { circleExportRouter } from "./circles";
import { eventExportRouter } from "./events";
import { officialExportRouter } from "./official";
import { releaseExportRouter } from "./releases";
import { trackExportRouter } from "./tracks";

const exportRouter = new Hono<AdminContext>();

// 各エンティティのエクスポートルーターをマウント
exportRouter.route("/artists", artistExportRouter);
exportRouter.route("/circles", circleExportRouter);
exportRouter.route("/events", eventExportRouter);
exportRouter.route("/releases", releaseExportRouter);
exportRouter.route("/tracks", trackExportRouter);
exportRouter.route("/official", officialExportRouter);

export { exportRouter };
