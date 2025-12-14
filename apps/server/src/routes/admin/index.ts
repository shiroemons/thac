import { Hono } from "hono";
import {
	type AdminContext,
	adminAuthMiddleware,
} from "../../middleware/admin-auth";
import { masterRouter } from "./master";

const adminRouter = new Hono<AdminContext>();

// 管理者認証ミドルウェアを適用
adminRouter.use("/*", adminAuthMiddleware);

// マスタデータ管理ルート
adminRouter.route("/master", masterRouter);

export { adminRouter };
