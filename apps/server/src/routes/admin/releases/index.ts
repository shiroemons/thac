import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { discsRouter } from "./discs";
import { releaseCirclesRouter } from "./release-circles";
import { releasesRouter } from "./releases";
import { trackCreditRolesRouter } from "./track-credit-roles";
import { trackCreditsRouter } from "./track-credits";
import { tracksRouter } from "./tracks";

// 統合されたリリース管理ルーター
const releasesAdminRouter = new Hono<AdminContext>();

// リリースルートにディスク・サークル・トラック・クレジットエンドポイントをマウント
releasesAdminRouter.route("/", releasesRouter);
releasesAdminRouter.route("/", discsRouter);
releasesAdminRouter.route("/", releaseCirclesRouter);
releasesAdminRouter.route("/", tracksRouter);
releasesAdminRouter.route("/", trackCreditsRouter);
releasesAdminRouter.route("/", trackCreditRolesRouter);

export { releasesAdminRouter };
