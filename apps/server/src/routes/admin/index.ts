import { Hono } from "hono";
import {
	type AdminContext,
	adminAuthMiddleware,
} from "../../middleware/admin-auth";
import { masterRouter } from "./master";
import { statsRouter } from "./stats";

const adminRouter = new Hono<AdminContext>();

// 管理者認証ミドルウェアを適用
adminRouter.use("/*", adminAuthMiddleware);

// 統計情報ルート
adminRouter.route("/stats", statsRouter);

// マスタデータ管理ルート
adminRouter.route("/master", masterRouter);

export { adminRouter };
