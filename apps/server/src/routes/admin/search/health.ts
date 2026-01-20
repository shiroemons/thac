import { checkHealth } from "@thac/search";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const healthRouter = new Hono<AdminContext>();

/**
 * GET /api/admin/search/health
 * Check Meilisearch connection status
 */
healthRouter.get("/", async (c) => {
	try {
		const health = await checkHealth();
		return c.json({
			success: true,
			...health,
		});
	} catch (error) {
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Connection failed",
			},
			503,
		);
	}
});

export { healthRouter };
