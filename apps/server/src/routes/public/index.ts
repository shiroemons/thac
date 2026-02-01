import { Hono } from "hono";
import { artistsRouter } from "./artists";
import { categoriesRouter } from "./categories";
import { circlesRouter } from "./circles";
import { eventSeriesRouter } from "./event-series";
import { eventsRouter } from "./events";
import { genresRouter } from "./genres";
import { officialWorksRouter } from "./official-works";
import { originalSongsRouter } from "./original-songs";
import { releasesRouter } from "./releases";
import { searchRouter } from "./search";
import { statsRouter } from "./stats";
import { tagsRouter } from "./tags";
import { tracksRouter } from "./tracks";

const publicRouter = new Hono();

// 公開API（認証不要）
publicRouter.route("/genres", genresRouter);
publicRouter.route("/official-work-categories", categoriesRouter);
publicRouter.route("/official-works", officialWorksRouter);
publicRouter.route("/original-songs", originalSongsRouter);
publicRouter.route("/circles", circlesRouter);
publicRouter.route("/artists", artistsRouter);
publicRouter.route("/event-series", eventSeriesRouter);
publicRouter.route("/events", eventsRouter);
publicRouter.route("/releases", releasesRouter);
publicRouter.route("/tracks", tracksRouter);
publicRouter.route("/tags", tagsRouter);
publicRouter.route("/stats", statsRouter);
publicRouter.route("/search", searchRouter);

export { publicRouter };
