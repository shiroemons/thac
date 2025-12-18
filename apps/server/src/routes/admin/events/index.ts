import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { eventDaysRouter } from "./event-days";
import { eventSeriesRouter } from "./event-series";
import { eventsRouter } from "./events";

// 統合されたイベント管理ルーター
const eventsAdminRouter = new Hono<AdminContext>();

// イベントルートに開催日エンドポイントをマウント
eventsAdminRouter.route("/", eventsRouter);
eventsAdminRouter.route("/", eventDaysRouter);

export { eventSeriesRouter, eventsAdminRouter };
