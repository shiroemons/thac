import { Hono } from "hono";
import { artistsRouter } from "./artists";
import { categoriesRouter } from "./categories";
import { circlesRouter } from "./circles";
import { eventsRouter } from "./events";
import { officialWorksRouter } from "./official-works";
import { originalSongsRouter } from "./original-songs";
import { releasesRouter } from "./releases";
import { statsRouter } from "./stats";
import { tracksRouter } from "./tracks";

const publicRouter = new Hono();

// 公開API（認証不要）
publicRouter.route("/official-work-categories", categoriesRouter);
publicRouter.route("/official-works", officialWorksRouter);
publicRouter.route("/original-songs", originalSongsRouter);
publicRouter.route("/circles", circlesRouter);
publicRouter.route("/artists", artistsRouter);
publicRouter.route("/events", eventsRouter);
publicRouter.route("/releases", releasesRouter);
publicRouter.route("/tracks", tracksRouter);
publicRouter.route("/stats", statsRouter);

export { publicRouter };
