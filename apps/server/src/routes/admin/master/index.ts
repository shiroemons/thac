import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { aliasTypesRouter } from "./alias-types";
import { creditRolesRouter } from "./credit-roles";
import { importRouter } from "./import";
import { officialWorkCategoriesRouter } from "./official-work-categories";
import { platformsRouter } from "./platforms";

const masterRouter = new Hono<AdminContext>();

// CRUDルート
masterRouter.route("/platforms", platformsRouter);
masterRouter.route("/alias-types", aliasTypesRouter);
masterRouter.route("/credit-roles", creditRolesRouter);
masterRouter.route("/official-work-categories", officialWorkCategoriesRouter);

// インポートルート
masterRouter.route("/", importRouter);

export { masterRouter };
