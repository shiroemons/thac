/**
 * インポート管理ルート
 */
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { legacyImportRouter } from "./legacy";

const importRouter = new Hono<AdminContext>();

// レガシーCSVインポートルート
importRouter.route("/legacy", legacyImportRouter);

export { importRouter };
