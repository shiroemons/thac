import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { discsRouter } from "./discs";
import { releaseCirclesRouter } from "./release-circles";
import { releasesRouter } from "./releases";

// 統合されたリリース管理ルーター
const releasesAdminRouter = new Hono<AdminContext>();

// リリースルートにディスク・サークルエンドポイントをマウント
releasesAdminRouter.route("/", releasesRouter);
releasesAdminRouter.route("/", discsRouter);
releasesAdminRouter.route("/", releaseCirclesRouter);

export { releasesAdminRouter };
