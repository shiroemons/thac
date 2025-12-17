import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { songsRouter } from "./songs";
import { worksRouter } from "./works";

const officialRouter = new Hono<AdminContext>();

// CRUDルート
officialRouter.route("/works", worksRouter);
officialRouter.route("/songs", songsRouter);

export { officialRouter };
