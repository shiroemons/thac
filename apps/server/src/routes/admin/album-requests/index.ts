import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { albumRequestsAdminRouter } from "./album-requests";

const albumRequestsRouter = new Hono<AdminContext>();

albumRequestsRouter.route("/", albumRequestsAdminRouter);

export { albumRequestsRouter };
