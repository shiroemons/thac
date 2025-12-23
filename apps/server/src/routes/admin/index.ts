import { Hono } from "hono";
import {
	type AdminContext,
	adminAuthMiddleware,
} from "../../middleware/admin-auth";
import { artistAliasesRouter } from "./artist-aliases";
import { artistsRouter } from "./artists";
import { circlesRouter } from "./circles";
import { eventSeriesRouter, eventsAdminRouter } from "./events";
import { importRouter } from "./import";
import { masterRouter } from "./master";
import { officialRouter } from "./official";
import { releasesAdminRouter } from "./releases";
import { statsRouter } from "./stats";
import { tracksAdminRouter } from "./tracks";

const adminRouter = new Hono<AdminContext>();

// 管理者認証ミドルウェアを適用
adminRouter.use("/*", adminAuthMiddleware);

// 統計情報ルート
adminRouter.route("/stats", statsRouter);

// マスタデータ管理ルート
adminRouter.route("/master", masterRouter);

// 公式作品・楽曲管理ルート
adminRouter.route("/official", officialRouter);

// アーティスト管理ルート
adminRouter.route("/artists", artistsRouter);

// アーティスト別名義管理ルート
adminRouter.route("/artist-aliases", artistAliasesRouter);

// サークル管理ルート
adminRouter.route("/circles", circlesRouter);

// イベントシリーズ管理ルート
adminRouter.route("/event-series", eventSeriesRouter);

// イベント管理ルート
adminRouter.route("/events", eventsAdminRouter);

// リリース管理ルート
adminRouter.route("/releases", releasesAdminRouter);

// トラック管理ルート
adminRouter.route("/tracks", tracksAdminRouter);

// インポートルート
adminRouter.route("/import", importRouter);

export { adminRouter };
