import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { discsRouter } from "./discs";
import { releasesRouter } from "./releases";

// 統合されたリリース管理ルーター
const releasesAdminRouter = new Hono<AdminContext>();

// リリースルートにディスクエンドポイントをマウント
releasesAdminRouter.route("/", releasesRouter);
releasesAdminRouter.route("/", discsRouter);

export { releasesAdminRouter };
