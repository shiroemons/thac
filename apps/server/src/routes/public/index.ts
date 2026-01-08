import { Hono } from "hono";
import { categoriesRouter } from "./categories";
import { circlesRouter } from "./circles";
import { officialWorksRouter } from "./official-works";
import { originalSongsRouter } from "./original-songs";

const publicRouter = new Hono();

// 公開API（認証不要）
publicRouter.route("/official-work-categories", categoriesRouter);
publicRouter.route("/official-works", officialWorksRouter);
publicRouter.route("/original-songs", originalSongsRouter);
publicRouter.route("/circles", circlesRouter);

export { publicRouter };
